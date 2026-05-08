const mongoose = require('mongoose');
const { Vehicle, User, FuelLog } = require('../models');
const { fetchFastagBalance } = require('../utils/fastagService');

const toOid = id => new mongoose.Types.ObjectId(String(id));

// ── GET /api/admin/vehicles ───────────────────────────────────────
exports.listVehicles = async (req, res, next) => {
  try {
    const cid   = req.user.companyId;
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 10);
    const skip  = (page - 1) * limit;

    const filter = { companyId: cid };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.search) {
      const re = new RegExp(req.query.search, 'i');
      filter.$or = [{ plateNumber: re }, { make: re }, { model: re }];
    }

    const [vehicles, total] = await Promise.all([
      Vehicle.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Vehicle.countDocuments(filter),
    ]);

    const vehicleIds = vehicles.map(v => v._id);
    const stats = await FuelLog.aggregate([
      { $match: { vehicleId: { $in: vehicleIds }, companyId: toOid(cid) } },
      { $sort: { filledAt: -1 } },
      { $group: { _id: '$vehicleId', lastOdometer: { $first: '$odometer' }, totalFills: { $sum: 1 }, totalKm: { $sum: { $ifNull: ['$kmDriven', 0] } }, totalCost: { $sum: '$totalCost' }, totalLitres: { $sum: '$litres' } } },
    ]);
    const logMap = {};
    stats.forEach(l => { logMap[l._id.toString()] = l; });

    res.json({
      data: vehicles.map(v => ({
        id: v._id, plateNumber: v.plateNumber, make: v.make, model: v.model,
        year: v.year, status: v.status, fuelType: v.fuelType, assignedUserId: v.assignedUserId,
        pollutionExpiry: v.pollutionExpiry ?? null,
        insuranceExpiry: v.insuranceExpiry ?? null,
        fastagId:          v.fastagId ?? '',
        fastagBalance:     v.fastagBalance ?? null,
        fastagLastUpdated: v.fastagLastUpdated ?? null,
        lastOdometer:  logMap[v._id.toString()]?.lastOdometer  ?? null,
        totalKmDriven: logMap[v._id.toString()]?.totalKm       ?? 0,
        totalFills:    logMap[v._id.toString()]?.totalFills     ?? 0,
        totalFuelCost: logMap[v._id.toString()]?.totalCost      ?? 0,
        totalLitres:   logMap[v._id.toString()]?.totalLitres    ?? 0,
      })),
      total, page, limit,
    });
  } catch (err) { next(err); }
};

// ── POST /api/admin/vehicles ──────────────────────────────────────
exports.createVehicle = async (req, res, next) => {
  try {
    const { plateNumber, make, model, year, assignedUserId, fuelType, status, pollutionExpiry, insuranceExpiry, fastagId } = req.body;
    const cid = req.user.companyId;

    const exists = await Vehicle.findOne({ plateNumber: plateNumber.toUpperCase(), companyId: cid });
    if (exists) return res.status(409).json({ message: 'Vehicle with this plate already exists in company' });

    const vehicle = await Vehicle.create({
      plateNumber, make, model, year,
      fuelType: fuelType || 'Diesel', status: status || 'active',
      assignedUserId: assignedUserId || null, companyId: cid,
      pollutionExpiry: pollutionExpiry || null,
      insuranceExpiry: insuranceExpiry || null,
      fastagId: fastagId || '',
    });

    if (assignedUserId) {
      await User.findOneAndUpdate(
        { _id: assignedUserId, companyId: cid },
        { $addToSet: { assignedVehicleIds: vehicle._id }, $set: { assignedVehicleId: vehicle._id } }
      );
    }

    res.status(201).json({
      id: vehicle._id, plateNumber: vehicle.plateNumber, make: vehicle.make, model: vehicle.model,
      year: vehicle.year, status: vehicle.status, fuelType: vehicle.fuelType,
      pollutionExpiry: vehicle.pollutionExpiry ?? null,
      insuranceExpiry: vehicle.insuranceExpiry ?? null,
      fastagId: vehicle.fastagId ?? '',
      fastagBalance: null, fastagLastUpdated: null,
      lastOdometer: null, totalKmDriven: 0, totalFills: 0, totalFuelCost: 0, totalLitres: 0,
    });
  } catch (err) { next(err); }
};

// ── PUT /api/admin/vehicles/:id ───────────────────────────────────
exports.updateVehicle = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findOne({ _id: req.params.id, companyId: req.user.companyId });
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });

    const { plateNumber, make, model, year, assignedUserId, status, fuelType, pollutionExpiry, insuranceExpiry, fastagId } = req.body;
    if (plateNumber      != null) vehicle.plateNumber = plateNumber;
    if (make             != null) vehicle.make        = make;
    if (model            != null) vehicle.model       = model;
    if (year             != null) vehicle.year        = year;
    if (status           != null) vehicle.status      = status;
    if (fuelType         != null) vehicle.fuelType    = fuelType;
    if (pollutionExpiry !== undefined) vehicle.pollutionExpiry = pollutionExpiry || null;
    if (insuranceExpiry !== undefined) vehicle.insuranceExpiry = insuranceExpiry || null;
    if (fastagId        !== undefined) vehicle.fastagId        = fastagId || '';

    if (assignedUserId !== undefined) {
      if (vehicle.assignedUserId && vehicle.assignedUserId.toString() !== (assignedUserId || '')) {
        await User.findOneAndUpdate(
          { _id: vehicle.assignedUserId, companyId: req.user.companyId },
          { $pull: { assignedVehicleIds: vehicle._id } }
        );
      }
      vehicle.assignedUserId = assignedUserId || null;
      if (assignedUserId) {
        await User.findOneAndUpdate(
          { _id: assignedUserId, companyId: req.user.companyId },
          { $addToSet: { assignedVehicleIds: vehicle._id }, $set: { assignedVehicleId: vehicle._id } }
        );
      }
    }

    await vehicle.save();
    res.json({
      id: vehicle._id, plateNumber: vehicle.plateNumber, make: vehicle.make, model: vehicle.model,
      year: vehicle.year, status: vehicle.status, fuelType: vehicle.fuelType,
      pollutionExpiry: vehicle.pollutionExpiry ?? null,
      insuranceExpiry: vehicle.insuranceExpiry ?? null,
    });
  } catch (err) { next(err); }
};

// ── DELETE /api/admin/vehicles/:id ───────────────────────────────
exports.deleteVehicle = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findOneAndDelete({ _id: req.params.id, companyId: req.user.companyId });
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });
    await User.updateMany({ companyId: req.user.companyId }, { $pull: { assignedVehicleIds: vehicle._id } });
    res.json({ message: 'Vehicle deleted' });
  } catch (err) { next(err); }
};

// ── PATCH /api/admin/vehicles/:id/fastag ─────────────────────────
exports.refreshFastag = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findOne({ _id: req.params.id, companyId: req.user.companyId });
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });

    const result = await fetchFastagBalance(vehicle.plateNumber);

    vehicle.fastagBalance      = result.balance;
    vehicle.fastagStatus       = result.status;
    vehicle.fastagLastRecharge = result.lastRecharge;
    vehicle.fastagCardValidity = result.cardValidity;
    vehicle.fastagLastUpdated  = new Date();
    await vehicle.save();

    res.json({
      balance:      vehicle.fastagBalance,
      status:       vehicle.fastagStatus,
      lastRecharge: vehicle.fastagLastRecharge,
      cardValidity: vehicle.fastagCardValidity,
      lastUpdated:  vehicle.fastagLastUpdated,
    });
  } catch (err) {
    if (err.message && !err.status) return res.status(502).json({ message: err.message });
    next(err);
  }
};

// ── GET /api/admin/vehicles/:id/analytics ────────────────────────
exports.getVehicleAnalytics = async (req, res, next) => {
  try {
    const cid = req.user.companyId;
    const vehicle = await Vehicle.findOne({ _id: req.params.id, companyId: cid });
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });

    const vid = vehicle._id;
    const allLogs = await FuelLog.find({ vehicleId: vid, companyId: cid })
      .populate('userId', 'name employeeId')
      .sort({ filledAt: 1 })
      .lean();

    const totalFills   = allLogs.length;
    const totalCost    = allLogs.reduce((s, l) => s + l.totalCost, 0);
    const totalLitres  = allLogs.reduce((s, l) => s + l.litres, 0);
    const totalKm      = allLogs.reduce((s, l) => s + (l.kmDriven || 0), 0);
    const lastOdometer = allLogs.length ? allLogs[allLogs.length - 1].odometer : null;
    const latestEffLog  = [...allLogs].reverse().find(l => l.efficiency != null && l.efficiency > 0);
    const avgEfficiency = latestEffLog ? parseFloat(latestEffLog.efficiency.toFixed(2)) : null;
    const burnedFuelCost = allLogs.length > 1 ? allLogs.slice(0, -1).reduce((s, l) => s + l.totalCost, 0) : 0;
    const avgCostPerKm   = totalKm > 0 ? parseFloat((burnedFuelCost / totalKm).toFixed(2)) : null;

    const now = new Date();
    const thirtyDaysAgo = new Date(now); thirtyDaysAgo.setDate(now.getDate() - 30);
    const sixtyDaysAgo  = new Date(now); sixtyDaysAgo.setDate(now.getDate() - 60);
    const recentLogs = allLogs.filter(l => new Date(l.filledAt) >= thirtyDaysAgo);
    const prevLogs   = allLogs.filter(l => { const d = new Date(l.filledAt); return d >= sixtyDaysAgo && d < thirtyDaysAgo; });

    const recentCost = recentLogs.reduce((s, l) => s + l.totalCost, 0);
    const recentKm   = recentLogs.reduce((s, l) => s + (l.kmDriven || 0), 0);
    const prevLatestEffLog = [...prevLogs].reverse().find(l => l.efficiency != null && l.efficiency > 0);
    const prevAvgEff       = prevLatestEffLog ? parseFloat(prevLatestEffLog.efficiency.toFixed(2)) : null;

    // Monthly buckets — last 6 months
    const monthlyMap = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const spansTwoYears = new Date(now.getFullYear(), now.getMonth() - 5, 1).getFullYear() !== now.getFullYear();
      const label = spansTwoYears
        ? d.toLocaleString('en-IN', { month: 'short' }) + " '" + String(d.getFullYear()).slice(2)
        : d.toLocaleString('en-IN', { month: 'short' });
      monthlyMap[key] = { key, label, totalCost: 0, totalKm: 0, totalLitres: 0, effValues: [], fills: 0, costPerKmValues: [] };
    }

    allLogs.forEach((l, idx) => {
      const d = new Date(l.filledAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyMap[key]) return;
      const m = monthlyMap[key];
      m.totalCost   += l.totalCost;
      m.totalLitres += l.litres;
      m.fills       += 1;
      if (l.kmDriven && l.kmDriven > 0) {
        m.totalKm += l.kmDriven;
        if (l.efficiency && l.efficiency > 0) m.effValues.push(l.efficiency);
        if (idx > 0) m.costPerKmValues.push(allLogs[idx - 1].totalCost / l.kmDriven);
      }
    });

    const monthly = Object.values(monthlyMap).map(m => ({
      key: m.key, label: m.label, fills: m.fills,
      totalCost: parseFloat(m.totalCost.toFixed(2)),
      totalKm: parseFloat(m.totalKm.toFixed(1)),
      totalLitres: parseFloat(m.totalLitres.toFixed(2)),
      avgEfficiency: m.effValues.length
        ? parseFloat((m.effValues.reduce((s, v) => s + v, 0) / m.effValues.length).toFixed(2)) : null,
      avgCostPerKm: m.costPerKmValues.length
        ? parseFloat((m.costPerKmValues.reduce((s, v) => s + v, 0) / m.costPerKmValues.length).toFixed(2)) : null,
    }));

    const perFill = allLogs.slice(-20).map(l => ({
      id: l._id, filledAt: l.filledAt, odometer: l.odometer, litres: l.litres,
      totalCost: l.totalCost, costPerLitre: l.costPerLitre, kmDriven: l.kmDriven,
      efficiency: l.efficiency, fuelStation: l.fuelStation, userName: l.userId?.name || '',
    }));

    res.json({
      vehicle: {
        id: vehicle._id, plateNumber: vehicle.plateNumber, make: vehicle.make,
        model: vehicle.model, year: vehicle.year, fuelType: vehicle.fuelType, status: vehicle.status,
        pollutionExpiry:    vehicle.pollutionExpiry    ?? null,
        insuranceExpiry:    vehicle.insuranceExpiry    ?? null,
        fastagBalance:      vehicle.fastagBalance      ?? null,
        fastagStatus:       vehicle.fastagStatus       ?? null,
        fastagLastRecharge: vehicle.fastagLastRecharge ?? null,
        fastagCardValidity: vehicle.fastagCardValidity ?? null,
        fastagLastUpdated:  vehicle.fastagLastUpdated  ?? null,
      },
      summary: {
        totalFills, totalCost: parseFloat(totalCost.toFixed(2)),
        totalLitres: parseFloat(totalLitres.toFixed(2)),
        totalKm: parseFloat(totalKm.toFixed(1)),
        lastOdometer, avgEfficiency, avgCostPerKm,
        recentCost: parseFloat(recentCost.toFixed(2)),
        recentKm: parseFloat(recentKm.toFixed(1)),
        recentFills: recentLogs.length,
        prevAvgEfficiency: prevAvgEff,
        efficiencyTrend: avgEfficiency != null && prevAvgEff != null
          ? parseFloat((avgEfficiency - prevAvgEff).toFixed(2)) : null,
      },
      monthly,
      perFill,
    });
  } catch (err) { next(err); }
};
