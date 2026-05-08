const { User, Vehicle, FuelLog, Challan, ServiceLog } = require('../models');
const { recalcVehicleLogs } = require('../utils/fuelCalc');

// ── GET /api/user/profile ─────────────────────────────────────────
exports.getProfile = async (req, res, next) => {
  try {
    if (req.user.role !== 'user') return res.status(403).json({ message: 'User only' });
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const ids = user.assignedVehicleIds?.length
      ? user.assignedVehicleIds
      : (user.assignedVehicleId ? [user.assignedVehicleId] : []);
    const vehicles = ids.length ? await Vehicle.find({ _id: { $in: ids }, companyId: user.companyId }) : [];

    const [stats, challanAlerts] = await Promise.all([
      FuelLog.aggregate([
        { $match: { userId: user._id, companyId: user.companyId } },
        { $group: { _id: null, totalFills: { $sum: 1 }, totalSpend: { $sum: '$totalCost' }, totalLitres: { $sum: '$litres' } } },
      ]),
      (async () => {
        const vehicleIds = vehicles.map(v => v._id);
        if (!vehicleIds.length) return [];
        const challans = await Challan.find({
          companyId: user.companyId,
          vehicleId: { $in: vehicleIds },
          status: { $in: ['unpaid', 'disputed'] },
        }).populate('vehicleId', 'plateNumber make model').sort({ dueDate: 1 });
        return challans.map(c => ({
          id: c._id, challanNo: c.challanNo, offence: c.offence, amount: c.amount,
          dueDate: c.dueDate, status: c.status,
          plateNumber: c.vehicleId?.plateNumber, make: c.vehicleId?.make, model: c.vehicleId?.model,
        }));
      })(),
    ]);

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const makeAlerts = (arr, dateKey) => arr.filter(v => v[dateKey]).map(v => {
      const exp = new Date(v[dateKey]); exp.setHours(0, 0, 0, 0);
      const diff = Math.round((exp - today) / 86400000);
      if (diff > 10 || diff < -5) return null;
      return { id: v._id, plateNumber: v.plateNumber, make: v.make, model: v.model, [dateKey]: v[dateKey], daysLeft: diff };
    }).filter(Boolean);

    res.json({
      id: user._id, name: user.name, employeeId: user.employeeId, phone: user.phone,
      licenseNumber: user.licenseNumber, isActive: user.isActive,
      assignedVehicles: vehicles.map(v => ({
        id: v._id, plateNumber: v.plateNumber, make: v.make, model: v.model,
        fuelType: v.fuelType, status: v.status,
        pollutionExpiry: v.pollutionExpiry ?? null, insuranceExpiry: v.insuranceExpiry ?? null,
        fastagBalance: v.fastagBalance ?? null, fastagStatus: v.fastagStatus ?? null, fastagLastUpdated: v.fastagLastUpdated ?? null,
      })),
      totalFills:  stats[0]?.totalFills  ?? 0,
      totalSpend:  stats[0]?.totalSpend  ?? 0,
      totalLitres: stats[0]?.totalLitres ?? 0,
      pollutionAlerts: makeAlerts(vehicles, 'pollutionExpiry'),
      insuranceAlerts: makeAlerts(vehicles, 'insuranceExpiry'),
      challanAlerts,
      fastagAlerts: vehicles.filter(v => v.fastagBalance != null && v.fastagBalance < 200).map(v => ({
        id: v._id, plateNumber: v.plateNumber, make: v.make, model: v.model,
        balance: v.fastagBalance, status: v.fastagStatus, lastUpdated: v.fastagLastUpdated,
      })),
    });
  } catch (err) { next(err); }
};

// ── GET /api/user/vehicles ────────────────────────────────────────
exports.getVehicles = async (req, res, next) => {
  try {
    if (req.user.role !== 'user') return res.status(403).json({ message: 'User only' });
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const ids = user.assignedVehicleIds?.length
      ? user.assignedVehicleIds
      : (user.assignedVehicleId ? [user.assignedVehicleId] : []);
    const vehicles = ids.length ? await Vehicle.find({ _id: { $in: ids }, companyId: user.companyId }) : [];

    res.json(vehicles.map(v => ({
      id: v._id, plateNumber: v.plateNumber, make: v.make, model: v.model,
      fuelType: v.fuelType, status: v.status, pollutionExpiry: v.pollutionExpiry ?? null,
    })));
  } catch (err) { next(err); }
};

// ── GET /api/user/fuel-logs ───────────────────────────────────────
exports.listFuelLogs = async (req, res, next) => {
  try {
    if (req.user.role !== 'user') return res.status(403).json({ message: 'User only' });
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 10);
    const skip  = (page - 1) * limit;

    const filter = { userId: req.user.id, companyId: req.user.companyId };
    if (req.query.from || req.query.to) {
      filter.filledAt = {};
      if (req.query.from) filter.filledAt.$gte = new Date(req.query.from);
      if (req.query.to)   filter.filledAt.$lte = new Date(req.query.to + 'T23:59:59');
    }

    const [logs, total] = await Promise.all([
      FuelLog.find(filter).populate('vehicleId', 'plateNumber make model fuelType').sort({ filledAt: -1 }).skip(skip).limit(limit),
      FuelLog.countDocuments(filter),
    ]);

    res.json({
      data: logs.map(l => ({
        id: l._id, vehiclePlate: l.vehicleId?.plateNumber ?? '', vehicleMake: l.vehicleId?.make ?? '',
        litres: l.litres, costPerLitre: l.costPerLitre, totalCost: l.totalCost,
        odometer: l.odometer, kmDriven: l.kmDriven, efficiency: l.efficiency,
        fuelType: l.fuelType, fuelStation: l.fuelStation, notes: l.notes,
        filledAt: l.filledAt, createdAt: l.createdAt,
      })),
      total, page, limit,
    });
  } catch (err) { next(err); }
};

// ── POST /api/user/fuel-logs ──────────────────────────────────────
exports.createFuelLog = async (req, res, next) => {
  try {
    if (req.user.role !== 'user') return res.status(403).json({ message: 'User only' });
    const { vehicleId, litres, costPerLitre, odometer, fuelStation, notes, filledAt } = req.body;
    const cid = req.user.companyId;

    const vehicle = await Vehicle.findOne({ _id: vehicleId, companyId: cid });
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });

    const litresNum = parseFloat(litres), rateNum = parseFloat(costPerLitre), odoNum = parseFloat(odometer);
    const totalCost = parseFloat((litresNum * rateNum).toFixed(2));
    const fillDate  = filledAt ? new Date(filledAt) : new Date();

    await FuelLog.create({
      vehicleId, userId: req.user.id, companyId: cid,
      litres: litresNum, costPerLitre: rateNum, totalCost, odometer: odoNum,
      fuelType: vehicle.fuelType || 'Diesel',
      fuelStation: fuelStation || '', notes: notes || '', filledAt: fillDate,
    });

    await recalcVehicleLogs(vehicleId);

    const saved = await FuelLog
      .findOne({ vehicleId, userId: req.user.id, companyId: cid, filledAt: fillDate })
      .populate('vehicleId', 'plateNumber make model fuelType');

    res.status(201).json({
      id: saved._id, vehiclePlate: saved.vehicleId?.plateNumber ?? '',
      litres: saved.litres, costPerLitre: saved.costPerLitre, totalCost: saved.totalCost,
      odometer: saved.odometer, kmDriven: saved.kmDriven, efficiency: saved.efficiency,
      fuelType: saved.fuelType, fuelStation: saved.fuelStation, notes: saved.notes,
      filledAt: saved.filledAt, createdAt: saved.createdAt,
    });
  } catch (err) { next(err); }
};

// ── GET /api/user/service-logs ────────────────────────────────────
exports.listServiceLogs = async (req, res, next) => {
  try {
    const uid = req.user.id;
    const cid = req.user.companyId;
    const { page = 1, limit = 15 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [logs, total] = await Promise.all([
      ServiceLog.find({ userId: uid, companyId: cid })
        .populate('vehicleId', 'plateNumber make model')
        .sort({ servicedAt: -1 })
        .skip(skip).limit(parseInt(limit)).lean(),
      ServiceLog.countDocuments({ userId: uid, companyId: cid }),
    ]);

    res.json({
      data: logs.map(l => ({
        id: l._id,
        vehicleId: l.vehicleId?._id ?? l.vehicleId,
        plateNumber: l.vehicleId?.plateNumber ?? '',
        vehicleMake: l.vehicleId?.make        ?? '',
        vehicleModel: l.vehicleId?.model      ?? '',
        serviceType: l.serviceType, description: l.description,
        currentKm: l.currentKm, cost: l.cost, vendor: l.vendor,
        nextServiceDate: l.nextServiceDate, nextServiceKm: l.nextServiceKm,
        notes: l.notes, servicedAt: l.servicedAt,
      })),
      total,
    });
  } catch (err) { next(err); }
};

// ── POST /api/user/service-logs ───────────────────────────────────
exports.createServiceLog = async (req, res, next) => {
  try {
    const uid = req.user.id;
    const cid = req.user.companyId;
    const { vehicleId, serviceType, description, currentKm, cost, vendor, nextServiceDate, nextServiceKm, notes, servicedAt } = req.body;
    if (!vehicleId || !serviceType || currentKm == null) {
      return res.status(400).json({ message: 'vehicleId, serviceType and currentKm are required' });
    }

    const vehicle = await Vehicle.findOne({ _id: vehicleId, companyId: cid });
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });

    const log = await ServiceLog.create({
      vehicleId, userId: uid, companyId: cid, serviceType,
      description: description || '',
      currentKm: parseFloat(currentKm),
      cost: cost != null ? parseFloat(cost) : null,
      vendor: vendor || '',
      nextServiceDate: nextServiceDate ? new Date(nextServiceDate) : null,
      nextServiceKm:   nextServiceKm  != null ? parseFloat(nextServiceKm) : null,
      notes: notes || '',
      servicedAt: servicedAt ? new Date(servicedAt) : new Date(),
    });
    res.status(201).json({ id: log._id, serviceType: log.serviceType });
  } catch (err) { next(err); }
};

// ── GET /api/user/service-alerts ─────────────────────────────────
exports.getServiceAlerts = async (req, res, next) => {
  try {
    const uid = req.user.id;
    const cid = req.user.companyId;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const in14  = new Date(today); in14.setDate(in14.getDate() + 14);
    const past5 = new Date(today); past5.setDate(past5.getDate() - 5);

    const alerts = await ServiceLog.aggregate([
      { $match: { companyId: cid, userId: uid, nextServiceDate: { $ne: null, $gte: past5, $lte: in14 } } },
      { $sort: { servicedAt: -1 } },
      { $group: { _id: '$vehicleId', doc: { $first: '$$ROOT' } } },
      { $replaceRoot: { newRoot: '$doc' } },
      { $lookup: { from: 'vehicles', localField: 'vehicleId', foreignField: '_id', as: 'v' } },
      { $unwind: '$v' },
    ]);

    res.json(alerts.map(a => {
      const due = new Date(a.nextServiceDate); due.setHours(0, 0, 0, 0);
      return {
        id: a._id, vehicleId: a.vehicleId,
        plateNumber: a.v.plateNumber, make: a.v.make, model: a.v.model,
        serviceType: a.serviceType, nextServiceDate: a.nextServiceDate,
        nextServiceKm: a.nextServiceKm, daysLeft: Math.round((due - today) / 86400000),
      };
    }));
  } catch (err) { next(err); }
};

// ── GET /api/user/my-documents ────────────────────────────────────
exports.getMyDocuments = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('documents');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ documents: user.documents || [] });
  } catch (err) { next(err); }
};
