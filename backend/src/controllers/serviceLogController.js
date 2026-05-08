const mongoose = require('mongoose');
const { ServiceLog, Vehicle, User } = require('../models');

const toOid = id => new mongoose.Types.ObjectId(String(id));

function formatServiceLog(l) {
  return {
    id: l._id,
    vehicleId:      l.vehicleId?._id ?? l.vehicleId,
    plateNumber:    l.vehicleId?.plateNumber ?? '',
    vehicleMake:    l.vehicleId?.make        ?? '',
    vehicleModel:   l.vehicleId?.model       ?? '',
    userId:         l.userId?._id ?? l.userId,
    userName:       l.userId?.name ?? '',
    userEmployeeId: l.userId?.employeeId ?? '',
    serviceType: l.serviceType, description: l.description,
    currentKm: l.currentKm, cost: l.cost, vendor: l.vendor,
    nextServiceDate: l.nextServiceDate, nextServiceKm: l.nextServiceKm,
    notes: l.notes, servicedAt: l.servicedAt,
  };
}

// ── GET /api/admin/service-logs ───────────────────────────────────
exports.listServiceLogs = async (req, res, next) => {
  try {
    const cid = req.user.companyId;
    const { vehicleId, userId, page = 1, limit = 15 } = req.query;
    const filter = { companyId: toOid(cid) };
    if (vehicleId) filter.vehicleId = toOid(vehicleId);
    if (userId)    filter.userId    = toOid(userId);
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [logs, total] = await Promise.all([
      ServiceLog.find(filter)
        .populate('vehicleId', 'plateNumber make model')
        .populate('userId', 'name employeeId')
        .sort({ servicedAt: -1 })
        .skip(skip).limit(parseInt(limit)).lean(),
      ServiceLog.countDocuments(filter),
    ]);

    res.json({ data: logs.map(formatServiceLog), total });
  } catch (err) { next(err); }
};

// ── GET /api/admin/service-alerts ────────────────────────────────
exports.getServiceAlerts = async (req, res, next) => {
  try {
    const cid = req.user.companyId;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const in14  = new Date(today); in14.setDate(in14.getDate() + 14);
    const past5 = new Date(today); past5.setDate(past5.getDate() - 5);

    const alerts = await ServiceLog.aggregate([
      { $match: { companyId: toOid(cid), nextServiceDate: { $ne: null, $gte: past5, $lte: in14 } } },
      { $sort: { servicedAt: -1 } },
      { $group: { _id: '$vehicleId', doc: { $first: '$$ROOT' } } },
      { $replaceRoot: { newRoot: '$doc' } },
      { $lookup: { from: 'vehicles', localField: 'vehicleId', foreignField: '_id', as: 'v' } },
      { $unwind: '$v' },
      { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'u' } },
      { $unwind: { path: '$u', preserveNullAndEmpty: true } },
    ]);

    res.json(alerts.map(a => {
      const due = new Date(a.nextServiceDate); due.setHours(0, 0, 0, 0);
      const daysLeft = Math.round((due - today) / 86400000);
      return {
        id: a._id, vehicleId: a.vehicleId,
        plateNumber: a.v.plateNumber, make: a.v.make, model: a.v.model,
        serviceType: a.serviceType, nextServiceDate: a.nextServiceDate,
        nextServiceKm: a.nextServiceKm, daysLeft,
      };
    }));
  } catch (err) { next(err); }
};

// ── POST /api/admin/service-logs ──────────────────────────────────
exports.createServiceLog = async (req, res, next) => {
  try {
    const cid = req.user.companyId;
    const { vehicleId, userId, serviceType, description, currentKm, cost, vendor, nextServiceDate, nextServiceKm, notes, servicedAt } = req.body;
    if (!vehicleId || !userId || !serviceType || currentKm == null) {
      return res.status(400).json({ message: 'vehicleId, userId, serviceType and currentKm are required' });
    }

    const [vehicle, user] = await Promise.all([
      Vehicle.findOne({ _id: toOid(vehicleId), companyId: toOid(cid) }),
      User.findOne({ _id: toOid(userId), companyId: toOid(cid) }),
    ]);
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });
    if (!user)    return res.status(404).json({ message: 'User not found' });

    const log = await ServiceLog.create({
      vehicleId: toOid(vehicleId), userId: toOid(userId), companyId: toOid(cid),
      serviceType,
      description: description || '',
      currentKm: parseFloat(currentKm),
      cost: cost != null ? parseFloat(cost) : null,
      vendor: vendor || '',
      nextServiceDate: nextServiceDate ? new Date(nextServiceDate) : null,
      nextServiceKm:   nextServiceKm  != null ? parseFloat(nextServiceKm)  : null,
      notes: notes || '',
      servicedAt: servicedAt ? new Date(servicedAt) : new Date(),
    });
    res.status(201).json({ id: log._id, serviceType: log.serviceType });
  } catch (err) { next(err); }
};

// ── PUT /api/admin/service-logs/:id ──────────────────────────────
exports.updateServiceLog = async (req, res, next) => {
  try {
    const cid = req.user.companyId;
    const existing = await ServiceLog.findOne({ _id: req.params.id, companyId: toOid(cid) });
    if (!existing) return res.status(404).json({ message: 'Service log not found' });

    const { serviceType, description, currentKm, cost, vendor, nextServiceDate, nextServiceKm, notes, servicedAt } = req.body;
    const update = {};
    if (serviceType      != null) update.serviceType      = serviceType;
    if (description      != null) update.description      = description;
    if (currentKm        != null) update.currentKm        = parseFloat(currentKm);
    if (cost             != null) update.cost             = parseFloat(cost);
    if (vendor           != null) update.vendor           = vendor;
    if (nextServiceDate  != null) update.nextServiceDate  = nextServiceDate ? new Date(nextServiceDate) : null;
    if (nextServiceKm    != null) update.nextServiceKm    = parseFloat(nextServiceKm);
    if (notes            != null) update.notes            = notes;
    if (servicedAt       != null) update.servicedAt       = new Date(servicedAt);

    const updated = await ServiceLog.findByIdAndUpdate(req.params.id, update, { new: true });
    res.json({ id: updated._id, serviceType: updated.serviceType, success: true });
  } catch (err) { next(err); }
};

// ── DELETE /api/admin/service-logs/:id ───────────────────────────
exports.deleteServiceLog = async (req, res, next) => {
  try {
    const cid = req.user.companyId;
    const result = await ServiceLog.findOneAndDelete({ _id: req.params.id, companyId: toOid(cid) });
    if (!result) return res.status(404).json({ message: 'Not found' });
    res.json({ success: true });
  } catch (err) { next(err); }
};
