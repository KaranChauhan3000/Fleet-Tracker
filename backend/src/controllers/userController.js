const mongoose = require('mongoose');
const { User, Vehicle, FuelLog, Company } = require('../models');

const toOid = id => new mongoose.Types.ObjectId(String(id));

// ── GET /api/admin/users ──────────────────────────────────────────
exports.listUsers = async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 10);
    const skip  = (page - 1) * limit;
    const cid = req.user.companyId;

    const filter = { companyId: cid };
    if (req.query.search) {
      const re = new RegExp(req.query.search, 'i');
      filter.$or = [{ name: re }, { employeeId: re }, { phone: re }];
    }
    if (req.query.isActive != null) filter.isActive = req.query.isActive === 'true';

    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(filter),
    ]);

    const userIds    = users.map(u => u._id);
    const vehicleIds = [...new Set(users.flatMap(u => u.assignedVehicleIds || []).filter(Boolean))];

    const [stats, vehicles] = await Promise.all([
      FuelLog.aggregate([
        { $match: { userId: { $in: userIds }, companyId: toOid(cid) } },
        { $group: { _id: '$userId', totalFills: { $sum: 1 }, totalSpend: { $sum: '$totalCost' } } },
      ]),
      vehicleIds.length ? Vehicle.find({ _id: { $in: vehicleIds }, companyId: cid }) : [],
    ]);

    const statsMap   = {};
    stats.forEach(s => { statsMap[s._id.toString()] = s; });
    const vehicleMap = {};
    vehicles.forEach(v => { vehicleMap[v._id.toString()] = { id: v._id, plateNumber: v.plateNumber, make: v.make, model: v.model }; });

    res.json({
      data: users.map(u => {
        const ids = u.assignedVehicleIds?.length ? u.assignedVehicleIds : (u.assignedVehicleId ? [u.assignedVehicleId] : []);
        return {
          id: u._id, name: u.name, employeeId: u.employeeId, phone: u.phone,
          licenseNumber: u.licenseNumber, assignedVehicleIds: ids,
          assignedVehicles: ids.map(id => vehicleMap[id.toString()]).filter(Boolean),
          isActive: u.isActive, createdAt: u.createdAt, lastLogin: u.lastLogin,
          totalFills: statsMap[u._id.toString()]?.totalFills ?? 0,
          totalSpend: statsMap[u._id.toString()]?.totalSpend ?? 0,
        };
      }),
      total, page, limit,
    });
  } catch (err) { next(err); }
};

// ── POST /api/admin/users ─────────────────────────────────────────
exports.createUser = async (req, res, next) => {
  try {
    const { name, employeeId, phone, licenseNumber, assignedVehicleIds } = req.body;
    const cid = req.user.companyId;

    const [existingEmp, existingPhone] = await Promise.all([
      User.findOne({ employeeId, companyId: cid }),
      User.findOne({ phone, companyId: cid }),
    ]);
    if (existingEmp)   return res.status(409).json({ message: 'Employee ID already exists in this company' });
    if (existingPhone) return res.status(409).json({ message: 'Phone number already registered in this company' });

    const vIds = Array.isArray(assignedVehicleIds) ? assignedVehicleIds : [];
    const user = await User.create({
      name, employeeId, phone, licenseNumber: licenseNumber || '',
      companyId: cid,
      assignedVehicleId: vIds[0] || null,
      assignedVehicleIds: vIds,
    });

    if (vIds.length) {
      await Vehicle.updateMany({ _id: { $in: vIds }, companyId: cid }, { assignedUserId: user._id });
    }

    const company = await Company.findById(cid);
    res.status(201).json({
      id: user._id, name: user.name, employeeId: user.employeeId, phone: user.phone,
      assignedVehicleIds: vIds, isActive: user.isActive, companySlug: company?.slug,
    });
  } catch (err) { next(err); }
};

// ── GET /api/admin/users/:id ──────────────────────────────────────
exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findOne({ _id: req.params.id, companyId: req.user.companyId });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const ids = user.assignedVehicleIds?.length ? user.assignedVehicleIds : (user.assignedVehicleId ? [user.assignedVehicleId] : []);
    const vehicles = ids.length ? await Vehicle.find({ _id: { $in: ids }, companyId: req.user.companyId }) : [];

    res.json({
      id: user._id, name: user.name, employeeId: user.employeeId, phone: user.phone,
      licenseNumber: user.licenseNumber, assignedVehicleIds: ids,
      assignedVehicles: vehicles.map(v => ({ id: v._id, plateNumber: v.plateNumber, make: v.make, model: v.model, fuelType: v.fuelType })),
      isActive: user.isActive, createdAt: user.createdAt, lastLogin: user.lastLogin,
    });
  } catch (err) { next(err); }
};

// ── PUT /api/admin/users/:id ──────────────────────────────────────
exports.updateUser = async (req, res, next) => {
  try {
    const user = await User.findOne({ _id: req.params.id, companyId: req.user.companyId });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { name, employeeId, phone, licenseNumber, assignedVehicleIds, isActive } = req.body;
    if (name        != null) user.name        = name;
    if (licenseNumber != null) user.licenseNumber = licenseNumber;
    if (isActive    != null) user.isActive    = isActive;

    if (employeeId != null && employeeId !== user.employeeId) {
      const exists = await User.findOne({ employeeId, companyId: req.user.companyId, _id: { $ne: user._id } });
      if (exists) return res.status(409).json({ message: 'Employee ID already in use' });
      user.employeeId = employeeId;
    }
    if (phone != null && phone !== user.phone) {
      const exists = await User.findOne({ phone, companyId: req.user.companyId, _id: { $ne: user._id } });
      if (exists) return res.status(409).json({ message: 'Phone number already in use' });
      user.phone = phone;
    }

    if (assignedVehicleIds !== undefined) {
      const vIds = Array.isArray(assignedVehicleIds) ? assignedVehicleIds : [];
      await Vehicle.updateMany({ assignedUserId: user._id, companyId: req.user.companyId }, { assignedUserId: null });
      if (vIds.length) await Vehicle.updateMany({ _id: { $in: vIds }, companyId: req.user.companyId }, { assignedUserId: user._id });
      user.assignedVehicleIds = vIds;
      user.assignedVehicleId  = vIds[0] || null;
    }

    await user.save();
    res.json({ id: user._id, name: user.name, employeeId: user.employeeId, phone: user.phone, assignedVehicleIds: user.assignedVehicleIds, isActive: user.isActive });
  } catch (err) { next(err); }
};

// ── DELETE /api/admin/users/:id ───────────────────────────────────
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findOneAndDelete({ _id: req.params.id, companyId: req.user.companyId });
    if (!user) return res.status(404).json({ message: 'User not found' });
    await Vehicle.updateMany({ assignedUserId: req.params.id, companyId: req.user.companyId }, { assignedUserId: null });
    res.json({ message: 'User deleted' });
  } catch (err) { next(err); }
};
