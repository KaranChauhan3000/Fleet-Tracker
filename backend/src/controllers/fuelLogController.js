const mongoose = require('mongoose');
const { FuelLog, Vehicle, User } = require('../models');
const { recalcVehicleLogs } = require('../utils/fuelCalc');

const toOid = id => new mongoose.Types.ObjectId(String(id));

function formatLog(log) {
  const o = log.toObject ? log.toObject() : log;
  return {
    id: o._id,
    vehicleId:    o.vehicleId?._id ?? o.vehicleId,
    vehiclePlate: o.vehicleId?.plateNumber ?? '',
    vehicleMake:  o.vehicleId?.make        ?? '',
    vehicleModel: o.vehicleId?.model       ?? '',
    userId:       o.userId?._id ?? o.userId,
    userName:     o.userId?.name ?? '',
    litres: o.litres, costPerLitre: o.costPerLitre, totalCost: o.totalCost,
    odometer: o.odometer, kmDriven: o.kmDriven, efficiency: o.efficiency,
    fuelType: o.fuelType, fuelStation: o.fuelStation, notes: o.notes,
    filledAt: o.filledAt, createdAt: o.createdAt,
  };
}

// ── GET /api/admin/fuel-logs/stats ───────────────────────────────
// Returns whole-range totals (spend / litres / fills) via aggregation.
// Used by MonthlyFuelLogs to show accurate stats across all pages.
exports.getFuelLogStats = async (req, res, next) => {
  try {
    const cid = req.user.companyId;
    const filter = { companyId: toOid(cid) };
    if (req.query.from || req.query.to) {
      filter.filledAt = {};
      if (req.query.from) filter.filledAt.$gte = new Date(req.query.from);
      if (req.query.to)   filter.filledAt.$lte = new Date(req.query.to + 'T23:59:59');
    }
    const [result] = await FuelLog.aggregate([
      { $match: filter },
      { $group: { _id: null, spend: { $sum: '$totalCost' }, litres: { $sum: '$litres' }, fills: { $sum: 1 } } },
    ]);
    res.json(result
      ? { spend: result.spend, litres: result.litres, fills: result.fills }
      : { spend: 0, litres: 0, fills: 0 });
  } catch (err) { next(err); }
};

// ── GET /api/admin/fuel-logs ──────────────────────────────────────
exports.listFuelLogs = async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 10);
    const skip  = (page - 1) * limit;
    const cid = req.user.companyId;

    const filter = { companyId: cid };
    if (req.query.vehicleId) filter.vehicleId = req.query.vehicleId;
    if (req.query.userId)    filter.userId    = req.query.userId;
    if (req.query.from || req.query.to) {
      filter.filledAt = {};
      if (req.query.from) filter.filledAt.$gte = new Date(req.query.from);
      if (req.query.to)   filter.filledAt.$lte = new Date(req.query.to + 'T23:59:59');
    }

    const [logs, total] = await Promise.all([
      FuelLog.find(filter)
        .populate('vehicleId', 'plateNumber make model fuelType')
        .populate('userId', 'name employeeId')
        .sort({ filledAt: -1 }).skip(skip).limit(limit),
      FuelLog.countDocuments(filter),
    ]);

    res.json({ data: logs.map(formatLog), total, page, limit });
  } catch (err) { next(err); }
};

// ── POST /api/admin/fuel-logs ─────────────────────────────────────
exports.createFuelLog = async (req, res, next) => {
  try {
    const { vehicleId, userId, litres, costPerLitre, odometer, fuelStation, notes, filledAt } = req.body;
    const cid = req.user.companyId;

    const vehicle = await Vehicle.findOne({ _id: vehicleId, companyId: cid });
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });

    const litresNum = parseFloat(litres), rateNum = parseFloat(costPerLitre), odoNum = parseFloat(odometer);
    const totalCost = parseFloat((litresNum * rateNum).toFixed(2));
    const fillDate  = filledAt ? new Date(filledAt) : new Date();

    const log = await FuelLog.create({
      vehicleId, userId, companyId: cid,
      litres: litresNum, costPerLitre: rateNum, totalCost, odometer: odoNum,
      fuelType: vehicle.fuelType || 'Diesel',
      fuelStation: fuelStation || '', notes: notes || '', filledAt: fillDate,
    });

    await recalcVehicleLogs(vehicleId);

    const populated = await FuelLog.findById(log._id)
      .populate('vehicleId', 'plateNumber make model fuelType')
      .populate('userId', 'name employeeId');
    res.status(201).json(formatLog(populated));
  } catch (err) { next(err); }
};

// ── PUT /api/admin/fuel-logs/:id ──────────────────────────────────
exports.updateFuelLog = async (req, res, next) => {
  try {
    const existing = await FuelLog.findOne({ _id: req.params.id, companyId: req.user.companyId });
    if (!existing) return res.status(404).json({ message: 'Fuel log not found' });

    const { litres, costPerLitre, odometer, fuelStation, notes, filledAt } = req.body;
    const update = {};
    if (litres       != null) update.litres       = parseFloat(litres);
    if (costPerLitre != null) update.costPerLitre = parseFloat(costPerLitre);
    if (odometer     != null) update.odometer     = parseFloat(odometer);
    if (fuelStation  != null) update.fuelStation  = fuelStation;
    if (notes        != null) update.notes        = notes;
    if (filledAt     != null) update.filledAt     = new Date(filledAt);
    if (update.litres != null || update.costPerLitre != null) {
      update.totalCost = parseFloat(((update.litres ?? existing.litres) * (update.costPerLitre ?? existing.costPerLitre)).toFixed(2));
    }

    await FuelLog.findByIdAndUpdate(req.params.id, update, { new: true });
    await recalcVehicleLogs(existing.vehicleId.toString());

    const refreshed = await FuelLog.findById(req.params.id)
      .populate('vehicleId', 'plateNumber make model fuelType')
      .populate('userId', 'name employeeId');
    res.json(formatLog(refreshed));
  } catch (err) { next(err); }
};

// ── DELETE /api/admin/fuel-logs/:id ──────────────────────────────
exports.deleteFuelLog = async (req, res, next) => {
  try {
    const log = await FuelLog.findOneAndDelete({ _id: req.params.id, companyId: req.user.companyId });
    if (!log) return res.status(404).json({ message: 'Fuel log not found' });
    await recalcVehicleLogs(log.vehicleId.toString());
    res.json({ message: 'Fuel log deleted' });
  } catch (err) { next(err); }
};

// ── GET /api/admin/users/:id/fuel-logs ───────────────────────────
exports.getFuelLogsByUser = async (req, res, next) => {
  try {
    const cid = req.user.companyId;
    const user = await User.findOne({ _id: req.params.id, companyId: cid });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const [logs, stats] = await Promise.all([
      FuelLog.find({ userId: req.params.id, companyId: cid })
        .populate('vehicleId', 'plateNumber make model fuelType')
        .sort({ filledAt: -1 }).limit(limit),
      FuelLog.aggregate([
        { $match: { userId: user._id, companyId: toOid(cid) } },
        { $group: { _id: null, totalFills: { $sum: 1 }, totalCost: { $sum: '$totalCost' }, totalLitres: { $sum: '$litres' }, totalKm: { $sum: { $ifNull: ['$kmDriven', 0] } }, lastOdometer: { $max: '$odometer' } } },
      ]),
    ]);

    res.json({
      logs: logs.map(formatLog),
      stats: stats[0] || { totalFills: 0, totalCost: 0, totalLitres: 0, totalKm: 0, lastOdometer: null },
    });
  } catch (err) { next(err); }
};

// ── GET /api/admin/vehicles/:id/fuel-logs ────────────────────────
exports.getFuelLogsByVehicle = async (req, res, next) => {
  try {
    const cid = req.user.companyId;
    const vehicle = await Vehicle.findOne({ _id: req.params.id, companyId: cid });
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });

    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const [logs, stats] = await Promise.all([
      FuelLog.find({ vehicleId: req.params.id, companyId: cid })
        .populate('userId', 'name employeeId')
        .sort({ filledAt: -1 }).limit(limit),
      FuelLog.aggregate([
        { $match: { vehicleId: vehicle._id, companyId: toOid(cid) } },
        { $group: { _id: null, totalFills: { $sum: 1 }, totalCost: { $sum: '$totalCost' }, totalLitres: { $sum: '$litres' }, totalKm: { $sum: { $ifNull: ['$kmDriven', 0] } }, lastOdometer: { $max: '$odometer' } } },
      ]),
    ]);

    res.json({
      logs: logs.map(formatLog),
      stats: stats[0] || { totalFills: 0, totalCost: 0, totalLitres: 0, totalKm: 0, lastOdometer: null },
    });
  } catch (err) { next(err); }
};

// ── POST /api/admin/recalc-all ────────────────────────────────────
exports.recalcAll = async (req, res, next) => {
  try {
    const cid = req.user.companyId;
    const vehicles = await Vehicle.find({ companyId: cid });
    let totalFixed = 0;
    for (const v of vehicles) {
      await recalcVehicleLogs(v._id);
      const count = await FuelLog.countDocuments({ vehicleId: v._id });
      totalFixed += count;
    }
    res.json({ message: `Recalculated ${totalFixed} fuel logs across ${vehicles.length} vehicles.` });
  } catch (err) { next(err); }
};
