const mongoose = require('mongoose');
const { Company, Admin, User, Vehicle, FuelLog, OtpRequest } = require('../models');

// ── GET /api/superadmin/stats ─────────────────────────────────────
exports.getStats = async (req, res, next) => {
  try {
    const [companies, admins, users, vehicles, fuelLogs, activeCompanies, activeAdmins, activeUsers] = await Promise.all([
      Company.countDocuments(), Admin.countDocuments(), User.countDocuments(),
      Vehicle.countDocuments(), FuelLog.countDocuments(),
      Company.countDocuments({ isActive: true }),
      Admin.countDocuments({ isActive: true }),
      User.countDocuments({ isActive: true }),
    ]);

    const [totalSpend, recentLogs, pendingOtps] = await Promise.all([
      FuelLog.aggregate([{ $group: { _id: null, total: { $sum: '$totalCost' }, litres: { $sum: '$litres' } } }]),
      FuelLog.find()
        .populate('vehicleId', 'plateNumber').populate('userId', 'name').populate('companyId', 'name')
        .sort({ createdAt: -1 }).limit(10),
      OtpRequest.find({ isUsed: false, expiresAt: { $gt: new Date() } }).sort({ createdAt: -1 }).limit(20),
    ]);

    res.json({
      totals: { companies, admins, users, vehicles, fuelLogs },
      active: { companies: activeCompanies, admins: activeAdmins, users: activeUsers },
      financial: { totalSpend: totalSpend[0]?.total ?? 0, totalLitres: totalSpend[0]?.litres ?? 0 },
      recentLogs: recentLogs.map(l => ({
        id: l._id, companyName: l.companyId?.name ?? '', userName: l.userId?.name ?? '',
        vehiclePlate: l.vehicleId?.plateNumber ?? '', litres: l.litres, totalCost: l.totalCost,
        filledAt: l.filledAt, createdAt: l.createdAt,
      })),
      pendingOtps: pendingOtps.map(o => ({
        id: o._id, role: o.role, entityName: o.entityName, companyName: o.companyName,
        phone: o.phone, otpCode: o.otpCode, expiresAt: o.expiresAt, createdAt: o.createdAt,
      })),
    });
  } catch (err) { next(err); }
};

// ── GET /api/superadmin/otp-requests ─────────────────────────────
exports.getOtpRequests = async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const skip  = (page - 1) * limit;
    const filter = { isUsed: false, expiresAt: { $gt: new Date() } };
    const [requests, total] = await Promise.all([
      OtpRequest.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      OtpRequest.countDocuments(filter),
    ]);
    res.json({
      data: requests.map(o => ({
        id: o._id, role: o.role, entityName: o.entityName, companyName: o.companyName,
        phone: o.phone, otpCode: o.otpCode, expiresAt: o.expiresAt, createdAt: o.createdAt,
      })),
      total, page, limit,
    });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────
// COMPANY CRUD
// ─────────────────────────────────────────────────────────────────
exports.listCompanies = async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 10);
    const skip  = (page - 1) * limit;
    const filter = {};
    if (req.query.search) {
      const re = new RegExp(req.query.search, 'i');
      filter.$or = [{ name: re }, { slug: re }];
    }
    const [companies, total] = await Promise.all([
      Company.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Company.countDocuments(filter),
    ]);
    const companyIds = companies.map(c => c._id);
    const [adminCounts, userCounts, vehicleCounts, spendAgg] = await Promise.all([
      Admin.aggregate([{ $match: { companyId: { $in: companyIds } } }, { $group: { _id: '$companyId', count: { $sum: 1 } } }]),
      User.aggregate([{ $match: { companyId: { $in: companyIds } } }, { $group: { _id: '$companyId', count: { $sum: 1 } } }]),
      Vehicle.aggregate([{ $match: { companyId: { $in: companyIds } } }, { $group: { _id: '$companyId', count: { $sum: 1 } } }]),
      FuelLog.aggregate([{ $match: { companyId: { $in: companyIds } } }, { $group: { _id: '$companyId', totalSpend: { $sum: '$totalCost' } } }]),
    ]);
    const toMap = (arr, key = 'count') => { const m = {}; arr.forEach(x => { m[x._id.toString()] = x[key]; }); return m; };
    const am = toMap(adminCounts), um = toMap(userCounts), vm = toMap(vehicleCounts), sm = toMap(spendAgg, 'totalSpend');
    res.json({
      data: companies.map(c => ({
        id: c._id, name: c.name, slug: c.slug, isActive: c.isActive, createdAt: c.createdAt,
        adminCount: am[c._id.toString()] ?? 0, userCount: um[c._id.toString()] ?? 0,
        vehicleCount: vm[c._id.toString()] ?? 0, totalSpend: sm[c._id.toString()] ?? 0,
      })),
      total, page, limit,
    });
  } catch (err) { next(err); }
};

exports.createCompany = async (req, res, next) => {
  try {
    const { name, slug } = req.body;
    const exists = await Company.findOne({ slug: slug.toLowerCase() });
    if (exists) return res.status(409).json({ message: 'This slug is already taken. Choose a different one.' });
    const company = await Company.create({ name, slug: slug.toLowerCase(), createdBy: 'superadmin' });
    res.status(201).json({ id: company._id, name: company.name, slug: company.slug, isActive: company.isActive, createdAt: company.createdAt });
  } catch (err) { next(err); }
};

exports.updateCompany = async (req, res, next) => {
  try {
    const { name, isActive } = req.body;
    const update = {};
    if (name     != null) update.name     = name;
    if (isActive != null) update.isActive = isActive;
    const company = await Company.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!company) return res.status(404).json({ message: 'Company not found' });
    res.json({ id: company._id, name: company.name, slug: company.slug, isActive: company.isActive });
  } catch (err) { next(err); }
};

exports.deleteCompany = async (req, res, next) => {
  try {
    const company = await Company.findByIdAndDelete(req.params.id);
    if (!company) return res.status(404).json({ message: 'Company not found' });
    await Promise.all([
      Admin.deleteMany({ companyId: req.params.id }),
      User.deleteMany({ companyId: req.params.id }),
      Vehicle.deleteMany({ companyId: req.params.id }),
      FuelLog.deleteMany({ companyId: req.params.id }),
    ]);
    res.json({ message: 'Company and all data deleted' });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────
// ADMIN CRUD
// ─────────────────────────────────────────────────────────────────
exports.listAdmins = async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 10);
    const skip  = (page - 1) * limit;
    const filter = {};
    if (req.query.companyId && mongoose.isValidObjectId(req.query.companyId)) filter.companyId = req.query.companyId;
    if (req.query.search) { const re = new RegExp(req.query.search, 'i'); filter.$or = [{ name: re }, { email: re }, { phone: re }]; }
    const [admins, total] = await Promise.all([
      Admin.find(filter).populate('companyId', 'name slug').sort({ createdAt: -1 }).skip(skip).limit(limit),
      Admin.countDocuments(filter),
    ]);
    res.json({
      data: admins.map(a => ({
        id: a._id, name: a.name, email: a.email, phone: a.phone, designation: a.designation,
        isActive: a.isActive, createdAt: a.createdAt, lastLogin: a.lastLogin,
        companyId: a.companyId?._id, companyName: a.companyId?.name, companySlug: a.companyId?.slug,
      })),
      total, page, limit,
    });
  } catch (err) { next(err); }
};

exports.createAdmin = async (req, res, next) => {
  try {
    const { name, email, phone, designation, companyId } = req.body;
    const company = await Company.findById(companyId);
    if (!company) return res.status(404).json({ message: 'Company not found' });
    const [existingPhone, existingEmail] = await Promise.all([
      Admin.findOne({ phone, companyId }),
      Admin.findOne({ email: email.toLowerCase() }),
    ]);
    if (existingPhone) return res.status(409).json({ message: 'An admin with this phone already exists in this company' });
    if (existingEmail) return res.status(409).json({ message: 'An admin with this email already exists' });
    const admin = await Admin.create({ name, email: email.toLowerCase(), phone, designation: designation || '', companyId, createdBy: 'superadmin' });
    res.status(201).json({
      id: admin._id, name: admin.name, email: admin.email, phone: admin.phone,
      designation: admin.designation, isActive: admin.isActive, createdAt: admin.createdAt,
      companyId: company._id, companyName: company.name, companySlug: company.slug,
    });
  } catch (err) { next(err); }
};

exports.updateAdmin = async (req, res, next) => {
  try {
    const { name, email, phone, designation, isActive } = req.body;
    const admin = await Admin.findById(req.params.id);
    if (!admin) return res.status(404).json({ message: 'Admin not found' });
    if (name        != null) admin.name        = name;
    if (email       != null) admin.email       = email.toLowerCase();
    if (phone       != null) admin.phone       = phone;
    if (designation != null) admin.designation = designation;
    if (isActive    != null) admin.isActive    = isActive;
    await admin.save();
    const pop = await Admin.findById(admin._id).populate('companyId', 'name slug');
    res.json({
      id: admin._id, name: admin.name, email: admin.email, phone: admin.phone,
      designation: admin.designation, isActive: admin.isActive,
      companyId: pop.companyId?._id, companyName: pop.companyId?.name, companySlug: pop.companyId?.slug,
    });
  } catch (err) { next(err); }
};

exports.deleteAdmin = async (req, res, next) => {
  try {
    const admin = await Admin.findByIdAndDelete(req.params.id);
    if (!admin) return res.status(404).json({ message: 'Admin not found' });
    res.json({ message: 'Admin deleted' });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────
// USER CRUD (superadmin scope)
// ─────────────────────────────────────────────────────────────────
exports.listUsers = async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 10);
    const skip  = (page - 1) * limit;
    const filter = {};
    if (req.query.companyId && mongoose.isValidObjectId(req.query.companyId)) filter.companyId = req.query.companyId;
    if (req.query.search) { const re = new RegExp(req.query.search, 'i'); filter.$or = [{ name: re }, { employeeId: re }, { phone: re }]; }
    const [users, total] = await Promise.all([
      User.find(filter).populate('companyId', 'name slug').sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(filter),
    ]);
    const allVehicleIds = [...new Set(users.flatMap(u => u.assignedVehicleIds || []).map(id => id.toString()))];
    const vehicles = allVehicleIds.length ? await Vehicle.find({ _id: { $in: allVehicleIds } }, 'plateNumber make model') : [];
    const vehicleMap = {};
    vehicles.forEach(v => { vehicleMap[v._id.toString()] = { id: v._id, plateNumber: v.plateNumber, make: v.make, model: v.model }; });
    res.json({
      data: users.map(u => {
        const vIds = u.assignedVehicleIds?.length ? u.assignedVehicleIds : (u.assignedVehicleId ? [u.assignedVehicleId] : []);
        return {
          id: u._id, name: u.name, employeeId: u.employeeId, phone: u.phone, licenseNumber: u.licenseNumber,
          isActive: u.isActive, createdAt: u.createdAt, lastLogin: u.lastLogin,
          companyId: u.companyId?._id, companyName: u.companyId?.name, companySlug: u.companyId?.slug,
          assignedVehicleIds: vIds, assignedVehicles: vIds.map(id => vehicleMap[id.toString()]).filter(Boolean),
        };
      }),
      total, page, limit,
    });
  } catch (err) { next(err); }
};

exports.createUser = async (req, res, next) => {
  try {
    const { name, employeeId, phone, licenseNumber, companyId, assignedVehicleIds } = req.body;
    const company = await Company.findById(companyId);
    if (!company) return res.status(404).json({ message: 'Company not found' });
    const [existingEmp, existingPhone] = await Promise.all([
      User.findOne({ employeeId, companyId }),
      User.findOne({ phone, companyId }),
    ]);
    if (existingEmp)   return res.status(409).json({ message: 'This User ID already exists in this company' });
    if (existingPhone) return res.status(409).json({ message: 'This phone number is already registered in this company' });
    const vIds = Array.isArray(assignedVehicleIds) ? assignedVehicleIds : [];
    const user = await User.create({ name, employeeId, phone, licenseNumber: licenseNumber || '', companyId, assignedVehicleId: vIds[0] || null, assignedVehicleIds: vIds });
    if (vIds.length) await Vehicle.updateMany({ _id: { $in: vIds }, companyId }, { assignedUserId: user._id });
    res.status(201).json({
      id: user._id, name: user.name, employeeId: user.employeeId, phone: user.phone,
      licenseNumber: user.licenseNumber, assignedVehicleIds: vIds,
      isActive: user.isActive, createdAt: user.createdAt,
      companyId: company._id, companyName: company.name, companySlug: company.slug,
    });
  } catch (err) { next(err); }
};

exports.updateUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const { name, phone, licenseNumber, assignedVehicleIds, isActive } = req.body;
    if (name          != null) user.name          = name;
    if (licenseNumber != null) user.licenseNumber = licenseNumber;
    if (isActive      != null) user.isActive      = isActive;
    if (phone != null && phone !== user.phone) {
      const exists = await User.findOne({ phone, companyId: user.companyId, _id: { $ne: user._id } });
      if (exists) return res.status(409).json({ message: 'Phone number already in use' });
      user.phone = phone;
    }
    if (assignedVehicleIds !== undefined) {
      const vIds = Array.isArray(assignedVehicleIds) ? assignedVehicleIds : [];
      await Vehicle.updateMany({ assignedUserId: user._id }, { assignedUserId: null });
      if (vIds.length) await Vehicle.updateMany({ _id: { $in: vIds } }, { assignedUserId: user._id });
      user.assignedVehicleIds = vIds;
      user.assignedVehicleId  = vIds[0] || null;
    }
    await user.save();
    res.json({ id: user._id, name: user.name, employeeId: user.employeeId, phone: user.phone, isActive: user.isActive });
  } catch (err) { next(err); }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    await Vehicle.updateMany({ assignedUserId: req.params.id }, { assignedUserId: null });
    res.json({ message: 'User deleted' });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────
// VEHICLE CRUD (superadmin scope)
// ─────────────────────────────────────────────────────────────────
exports.listVehicles = async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 10);
    const skip  = (page - 1) * limit;
    const filter = {};
    if (req.query.companyId && mongoose.isValidObjectId(req.query.companyId)) filter.companyId = req.query.companyId;
    if (req.query.search) { const re = new RegExp(req.query.search, 'i'); filter.$or = [{ plateNumber: re }, { make: re }, { model: re }]; }
    const [vehicles, total] = await Promise.all([
      Vehicle.find(filter).populate('companyId', 'name slug').populate('assignedUserId', 'name employeeId').sort({ createdAt: -1 }).skip(skip).limit(limit),
      Vehicle.countDocuments(filter),
    ]);
    const vehicleIds = vehicles.map(v => v._id);
    const stats = await FuelLog.aggregate([
      { $match: { vehicleId: { $in: vehicleIds } } },
      { $sort: { filledAt: -1 } },
      { $group: { _id: '$vehicleId', lastOdometer: { $first: '$odometer' }, totalFills: { $sum: 1 }, totalKm: { $sum: { $ifNull: ['$kmDriven', 0] } }, totalCost: { $sum: '$totalCost' } } },
    ]);
    const statMap = {};
    stats.forEach(s => { statMap[s._id.toString()] = s; });
    res.json({
      data: vehicles.map(v => ({
        id: v._id, plateNumber: v.plateNumber, make: v.make, model: v.model,
        year: v.year, fuelType: v.fuelType, status: v.status,
        companyId: v.companyId?._id, companyName: v.companyId?.name,
        assignedUserId: v.assignedUserId?._id, assignedUserName: v.assignedUserId?.name, assignedUserEmpId: v.assignedUserId?.employeeId,
        lastOdometer:  statMap[v._id.toString()]?.lastOdometer ?? null,
        totalFills:    statMap[v._id.toString()]?.totalFills   ?? 0,
        totalKmDriven: statMap[v._id.toString()]?.totalKm      ?? 0,
        totalFuelCost: statMap[v._id.toString()]?.totalCost    ?? 0,
      })),
      total, page, limit,
    });
  } catch (err) { next(err); }
};

exports.createVehicle = async (req, res, next) => {
  try {
    const { plateNumber, make, model, year, companyId, assignedUserId, fuelType, status } = req.body;
    const company = await Company.findById(companyId);
    if (!company) return res.status(404).json({ message: 'Company not found' });
    const exists = await Vehicle.findOne({ plateNumber: plateNumber.toUpperCase(), companyId });
    if (exists) return res.status(409).json({ message: 'Vehicle with this plate already exists in company' });
    const vehicle = await Vehicle.create({ plateNumber, make, model, year, fuelType: fuelType || 'Diesel', status: status || 'active', assignedUserId: assignedUserId || null, companyId });
    if (assignedUserId) {
      await User.findByIdAndUpdate(assignedUserId, { $addToSet: { assignedVehicleIds: vehicle._id }, $set: { assignedVehicleId: vehicle._id } });
    }
    res.status(201).json({ id: vehicle._id, plateNumber: vehicle.plateNumber, make: vehicle.make, model: vehicle.model, year: vehicle.year, fuelType: vehicle.fuelType, status: vehicle.status, companyId: company._id, companyName: company.name });
  } catch (err) { next(err); }
};

exports.updateVehicle = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });
    const { plateNumber, make, model, year, assignedUserId, status, fuelType } = req.body;
    if (plateNumber != null) vehicle.plateNumber = plateNumber;
    if (make        != null) vehicle.make        = make;
    if (model       != null) vehicle.model       = model;
    if (year        != null) vehicle.year        = year;
    if (status      != null) vehicle.status      = status;
    if (fuelType    != null) vehicle.fuelType    = fuelType;
    if (assignedUserId !== undefined) {
      if (vehicle.assignedUserId && vehicle.assignedUserId.toString() !== (assignedUserId || '')) {
        await User.findByIdAndUpdate(vehicle.assignedUserId, { $pull: { assignedVehicleIds: vehicle._id } });
      }
      vehicle.assignedUserId = assignedUserId || null;
      if (assignedUserId) {
        await User.findByIdAndUpdate(assignedUserId, { $addToSet: { assignedVehicleIds: vehicle._id }, $set: { assignedVehicleId: vehicle._id } });
      }
    }
    await vehicle.save();
    res.json({ id: vehicle._id, plateNumber: vehicle.plateNumber, make: vehicle.make, model: vehicle.model, year: vehicle.year, status: vehicle.status, fuelType: vehicle.fuelType });
  } catch (err) { next(err); }
};

exports.deleteVehicle = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findByIdAndDelete(req.params.id);
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });
    await User.updateMany({}, { $pull: { assignedVehicleIds: vehicle._id } });
    res.json({ message: 'Vehicle deleted' });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────
// FUEL LOGS (read-only, cross-company)
// ─────────────────────────────────────────────────────────────────
exports.listFuelLogs = async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 10);
    const skip  = (page - 1) * limit;
    const filter = {};
    if (req.query.companyId && mongoose.isValidObjectId(req.query.companyId)) filter.companyId = req.query.companyId;
    if (req.query.vehicleId && mongoose.isValidObjectId(req.query.vehicleId)) filter.vehicleId = req.query.vehicleId;
    if (req.query.userId    && mongoose.isValidObjectId(req.query.userId))    filter.userId    = req.query.userId;
    if (req.query.from || req.query.to) {
      filter.filledAt = {};
      if (req.query.from) filter.filledAt.$gte = new Date(req.query.from);
      if (req.query.to)   filter.filledAt.$lte = new Date(req.query.to + 'T23:59:59');
    }
    const [logs, total] = await Promise.all([
      FuelLog.find(filter)
        .populate('vehicleId', 'plateNumber make model').populate('userId', 'name employeeId').populate('companyId', 'name')
        .sort({ filledAt: -1 }).skip(skip).limit(limit),
      FuelLog.countDocuments(filter),
    ]);
    res.json({
      data: logs.map(l => ({
        id: l._id, companyName: l.companyId?.name ?? '', userName: l.userId?.name ?? '', userEmpId: l.userId?.employeeId ?? '',
        vehiclePlate: l.vehicleId?.plateNumber ?? '', vehicleMake: l.vehicleId?.make ?? '', vehicleModel: l.vehicleId?.model ?? '',
        litres: l.litres, costPerLitre: l.costPerLitre, totalCost: l.totalCost,
        odometer: l.odometer, kmDriven: l.kmDriven, efficiency: l.efficiency,
        fuelType: l.fuelType, fuelStation: l.fuelStation, notes: l.notes,
        filledAt: l.filledAt, createdAt: l.createdAt,
      })),
      total, page, limit,
    });
  } catch (err) { next(err); }
};

exports.getUserFuelLogs = async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const skip  = (page - 1) * limit;
    const [logs, total, user] = await Promise.all([
      FuelLog.find({ userId: req.params.id }).populate('vehicleId', 'plateNumber make model').sort({ filledAt: -1 }).skip(skip).limit(limit),
      FuelLog.countDocuments({ userId: req.params.id }),
      User.findById(req.params.id, 'name employeeId phone').populate('companyId', 'name'),
    ]);
    res.json({
      user: user ? { id: user._id, name: user.name, employeeId: user.employeeId, phone: user.phone, companyName: user.companyId?.name } : null,
      data: logs.map(l => ({
        id: l._id, vehiclePlate: l.vehicleId?.plateNumber ?? '', vehicleMake: l.vehicleId?.make ?? '', vehicleModel: l.vehicleId?.model ?? '',
        litres: l.litres, costPerLitre: l.costPerLitre, totalCost: l.totalCost,
        odometer: l.odometer, kmDriven: l.kmDriven, efficiency: l.efficiency,
        fuelType: l.fuelType, fuelStation: l.fuelStation, notes: l.notes, filledAt: l.filledAt, createdAt: l.createdAt,
      })),
      total, page, limit,
    });
  } catch (err) { next(err); }
};

exports.getVehicleFuelLogs = async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const skip  = (page - 1) * limit;
    const [logs, total, vehicle] = await Promise.all([
      FuelLog.find({ vehicleId: req.params.id }).populate('userId', 'name employeeId').sort({ filledAt: -1 }).skip(skip).limit(limit),
      FuelLog.countDocuments({ vehicleId: req.params.id }),
      Vehicle.findById(req.params.id, 'plateNumber make model year fuelType').populate('companyId', 'name'),
    ]);
    res.json({
      vehicle: vehicle ? { id: vehicle._id, plateNumber: vehicle.plateNumber, make: vehicle.make, model: vehicle.model, year: vehicle.year, fuelType: vehicle.fuelType, companyName: vehicle.companyId?.name } : null,
      data: logs.map(l => ({
        id: l._id, userName: l.userId?.name ?? '', userEmpId: l.userId?.employeeId ?? '',
        litres: l.litres, costPerLitre: l.costPerLitre, totalCost: l.totalCost,
        odometer: l.odometer, kmDriven: l.kmDriven, efficiency: l.efficiency,
        fuelType: l.fuelType, fuelStation: l.fuelStation, notes: l.notes, filledAt: l.filledAt, createdAt: l.createdAt,
      })),
      total, page, limit,
    });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────
// REPORTS (superadmin scope)
// ─────────────────────────────────────────────────────────────────
exports.monthlyComparison = async (req, res, next) => {
  try {
    const { month1, month2, companyId } = req.query;
    if (!month1 || !month2) return res.status(400).json({ message: 'month1 and month2 required (YYYY-MM)' });
    const today = new Date();
    const buildRange = (ym) => {
      const [y, m] = ym.split('-').map(Number);
      const start = new Date(y, m - 1, 1);
      const isCurrentMonth = today.getFullYear() === y && today.getMonth() + 1 === m;
      const end = isCurrentMonth ? new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59) : new Date(y, m, 0, 23, 59, 59);
      return { start, end };
    };
    const baseFilter = companyId && mongoose.isValidObjectId(companyId) ? { companyId: new mongoose.Types.ObjectId(companyId) } : {};
    const agg = async (range) => {
      const result = await FuelLog.aggregate([
        { $match: { ...baseFilter, filledAt: { $gte: range.start, $lte: range.end } } },
        { $group: { _id: null, totalFills: { $sum: 1 }, totalLitres: { $sum: '$litres' }, totalCost: { $sum: '$totalCost' }, avgCostPerLitre: { $avg: '$costPerLitre' }, avgEfficiency: { $avg: { $cond: [{ $ne: ['$efficiency', null] }, '$efficiency', '$$REMOVE'] } }, uniqueVehicles: { $addToSet: '$vehicleId' }, uniqueUsers: { $addToSet: '$userId' } } },
      ]);
      const r = result[0] || {};
      return { totalFills: r.totalFills || 0, totalLitres: parseFloat((r.totalLitres || 0).toFixed(2)), totalCost: parseFloat((r.totalCost || 0).toFixed(2)), avgCostPerLitre: r.avgCostPerLitre ? parseFloat(r.avgCostPerLitre.toFixed(2)) : 0, avgEfficiency: r.avgEfficiency ? parseFloat(r.avgEfficiency.toFixed(4)) : null, activeVehicles: r.uniqueVehicles?.length || 0, activeUsers: r.uniqueUsers?.length || 0, dateRange: { start: range.start, end: range.end } };
    };
    const [data1, data2] = await Promise.all([agg(buildRange(month1)), agg(buildRange(month2))]);
    res.json({ month1: { label: month1, ...data1 }, month2: { label: month2, ...data2 } });
  } catch (err) { next(err); }
};

exports.reportSummary = async (req, res, next) => {
  try {
    const { from, to, companyId } = req.query;
    if (!from || !to) return res.status(400).json({ message: 'from and to required' });
    const filter = { filledAt: { $gte: new Date(from), $lte: new Date(to + 'T23:59:59') } };
    if (companyId && mongoose.isValidObjectId(companyId)) filter.companyId = new mongoose.Types.ObjectId(companyId);
    const [summary, byCompany, byVehicle, byUser, dailyTrend] = await Promise.all([
      FuelLog.aggregate([{ $match: filter }, { $group: { _id: null, totalFills: { $sum: 1 }, totalLitres: { $sum: '$litres' }, totalCost: { $sum: '$totalCost' }, avgEff: { $avg: { $cond: [{ $ne: ['$efficiency', null] }, '$efficiency', '$$REMOVE'] } } } }]),
      FuelLog.aggregate([{ $match: filter }, { $group: { _id: '$companyId', totalCost: { $sum: '$totalCost' }, totalLitres: { $sum: '$litres' }, fills: { $sum: 1 } } }, { $sort: { totalCost: -1 } }, { $limit: 10 }, { $lookup: { from: 'companies', localField: '_id', foreignField: '_id', as: 'company' } }, { $unwind: { path: '$company', preserveNullAndEmpty: true } }]),
      FuelLog.aggregate([{ $match: filter }, { $group: { _id: '$vehicleId', totalCost: { $sum: '$totalCost' }, totalLitres: { $sum: '$litres' }, fills: { $sum: 1 } } }, { $sort: { totalCost: -1 } }, { $limit: 10 }, { $lookup: { from: 'vehicles', localField: '_id', foreignField: '_id', as: 'vehicle' } }, { $unwind: { path: '$vehicle', preserveNullAndEmpty: true } }]),
      FuelLog.aggregate([{ $match: filter }, { $group: { _id: '$userId', totalCost: { $sum: '$totalCost' }, fills: { $sum: 1 } } }, { $sort: { totalCost: -1 } }, { $limit: 10 }, { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } }, { $unwind: { path: '$user', preserveNullAndEmpty: true } }]),
      FuelLog.aggregate([{ $match: filter }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$filledAt' } }, totalCost: { $sum: '$totalCost' }, fills: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
    ]);
    res.json({
      period: { from, to },
      summary: summary[0] || { totalFills: 0, totalLitres: 0, totalCost: 0 },
      byCompany: byCompany.map(c => ({ companyName: c.company?.name || 'Unknown', totalCost: c.totalCost, totalLitres: c.totalLitres, fills: c.fills })),
      byVehicle: byVehicle.map(v => ({ plateNumber: v.vehicle?.plateNumber || 'Unknown', totalCost: v.totalCost, totalLitres: v.totalLitres, fills: v.fills })),
      byUser:    byUser.map(u => ({ userName: u.user?.name || 'Unknown', totalCost: u.totalCost, fills: u.fills })),
      dailyTrend,
    });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────
// NEW ENDPOINTS — Analytics, Memberships, Activity Log
// Added for Super Admin Dashboard v5
// ─────────────────────────────────────────────────────────────────

const ActivityLog = require('../models/ActivityLog');

// Internal helper — logs any action silently, never crashes a request
async function logActivity({ action, entity, entityId, entityName, detail = '', companyName = '', performedBy = 'superadmin' }) {
  try {
    await ActivityLog.create({ action, entity, entityId, entityName, detail, companyName, performedBy });
  } catch (_) {}
}

// ── GET /api/superadmin/analytics/overview ────────────────────────
exports.analyticsOverview = async (req, res, next) => {
  try {
    const now        = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart  = new Date(todayStart); weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMEnd   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const [
      todayUsers, todayVehicles, todayCompanies, todayAdmins,
      weekUsers, weekVehicles, weekCompanies,
      monthUsers, monthVehicles, monthCompanies,
      prevUsers, prevVehicles, prevCompanies,
    ] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: todayStart } }),
      Vehicle.countDocuments({ createdAt: { $gte: todayStart } }),
      Company.countDocuments({ createdAt: { $gte: todayStart } }),
      Admin.countDocuments({ createdAt: { $gte: todayStart } }),
      User.countDocuments({ createdAt: { $gte: weekStart } }),
      Vehicle.countDocuments({ createdAt: { $gte: weekStart } }),
      Company.countDocuments({ createdAt: { $gte: weekStart } }),
      User.countDocuments({ createdAt: { $gte: monthStart } }),
      Vehicle.countDocuments({ createdAt: { $gte: monthStart } }),
      Company.countDocuments({ createdAt: { $gte: monthStart } }),
      User.countDocuments({ createdAt: { $gte: prevMStart, $lte: prevMEnd } }),
      Vehicle.countDocuments({ createdAt: { $gte: prevMStart, $lte: prevMEnd } }),
      Company.countDocuments({ createdAt: { $gte: prevMStart, $lte: prevMEnd } }),
    ]);

    const pct = (curr, prev) =>
      prev === 0 ? (curr > 0 ? 100 : 0) : Math.round(((curr - prev) / prev) * 100);

    res.json({
      today:  { users: todayUsers, vehicles: todayVehicles, companies: todayCompanies, admins: todayAdmins },
      week:   { users: weekUsers,  vehicles: weekVehicles,  companies: weekCompanies },
      month:  { users: monthUsers, vehicles: monthVehicles, companies: monthCompanies },
      growth: {
        users:     pct(monthUsers,     prevUsers),
        vehicles:  pct(monthVehicles,  prevVehicles),
        companies: pct(monthCompanies, prevCompanies),
      },
    });
  } catch (err) { next(err); }
};

// ── GET /api/superadmin/analytics/registrations?range=30 ──────────
exports.registrationTimeSeries = async (req, res, next) => {
  try {
    const days = Math.min(365, Math.max(7, parseInt(req.query.range) || 30));
    const from = new Date();
    from.setDate(from.getDate() - days);
    from.setHours(0, 0, 0, 0);

    const [users, vehicles, companies] = await Promise.all([
      User.aggregate([
        { $match: { createdAt: { $gte: from } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Vehicle.aggregate([
        { $match: { createdAt: { $gte: from } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Company.aggregate([
        { $match: { createdAt: { $gte: from } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const allDates = [];
    const cur = new Date(from);
    const end = new Date(); end.setHours(23, 59, 59, 999);
    while (cur <= end) { allDates.push(cur.toISOString().split('T')[0]); cur.setDate(cur.getDate() + 1); }

    const toMap = arr => { const m = {}; arr.forEach(x => { m[x._id] = x.count; }); return m; };
    const um = toMap(users), vm = toMap(vehicles), cm = toMap(companies);

    res.json({
      range: days,
      data: allDates.map(d => ({ date: d, users: um[d] || 0, vehicles: vm[d] || 0, companies: cm[d] || 0 })),
    });
  } catch (err) { next(err); }
};

// ── GET /api/superadmin/analytics/membership ──────────────────────
exports.membershipAnalytics = async (req, res, next) => {
  try {
    const now      = new Date();
    const in30Days = new Date(now); in30Days.setDate(in30Days.getDate() + 30);

    const [total, withPlan, monthly, yearly, expiringSoon, expired, pendingReqs] = await Promise.all([
      Company.countDocuments(),
      Company.countDocuments({ 'membership.plan': { $ne: null } }),
      Company.countDocuments({ 'membership.plan': 'monthly' }),
      Company.countDocuments({ 'membership.plan': 'yearly' }),
      Company.countDocuments({ 'membership.expiresAt': { $gte: now, $lte: in30Days } }),
      Company.countDocuments({ 'membership.expiresAt': { $lt: now }, 'membership.plan': { $ne: null } }),
      Company.countDocuments({ 'membership.limitRequest.pending': true }),
    ]);

    const [expiringSoonList, expiredList, pendingList] = await Promise.all([
      Company.find({ 'membership.expiresAt': { $gte: now, $lte: in30Days } }).select('name slug membership').sort({ 'membership.expiresAt': 1 }).limit(20),
      Company.find({ 'membership.expiresAt': { $lt: now }, 'membership.plan': { $ne: null } }).select('name slug membership').sort({ 'membership.expiresAt': -1 }).limit(20),
      Company.find({ 'membership.limitRequest.pending': true }).select('name slug membership').sort({ 'membership.limitRequest.submittedAt': -1 }),
    ]);

    const mapC = c => ({ id: c._id, name: c.name, slug: c.slug, plan: c.membership.plan, expiresAt: c.membership.expiresAt, vehicleLimit: c.membership.vehicleLimit });

    res.json({
      totals: { total, withPlan, monthly, yearly, expiringSoon, expired, pendingReqs, withoutPlan: total - withPlan },
      expiringSoon: expiringSoonList.map(mapC),
      expired:      expiredList.map(mapC),
      pendingLimitRequests: pendingList.map(c => ({ ...mapC(c), request: c.membership.limitRequest })),
    });
  } catch (err) { next(err); }
};

// ── GET /api/superadmin/analytics/vehicle-breakdown ───────────────
exports.vehicleBreakdown = async (req, res, next) => {
  try {
    const [byFuel, byStatus] = await Promise.all([
      Vehicle.aggregate([{ $group: { _id: '$fuelType', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      Vehicle.aggregate([{ $group: { _id: '$status',   count: { $sum: 1 } } }]),
    ]);
    res.json({
      byFuelType: byFuel.map(x => ({ name: x._id || 'Unknown', value: x.count })),
      byStatus:   byStatus.map(x => ({ name: x._id || 'Unknown', value: x.count })),
    });
  } catch (err) { next(err); }
};

// ── GET /api/superadmin/memberships ───────────────────────────────
exports.listMemberships = async (req, res, next) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(50, parseInt(req.query.limit) || 15);
    const skip   = (page - 1) * limit;
    const search = req.query.search?.trim();
    const filter = req.query.filter || 'all';

    const now      = new Date();
    const in30Days = new Date(now); in30Days.setDate(in30Days.getDate() + 30);

    const query = {};
    if (search) query.$or = [{ name: { $regex: search, $options: 'i' } }, { slug: { $regex: search, $options: 'i' } }];
    if (filter === 'expiring') query['membership.expiresAt'] = { $gte: now, $lte: in30Days };
    if (filter === 'expired')  { query['membership.expiresAt'] = { $lt: now }; query['membership.plan'] = { $ne: null }; }
    if (filter === 'pending')  query['membership.limitRequest.pending'] = true;

    const [companies, total] = await Promise.all([
      Company.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Company.countDocuments(query),
    ]);

    res.json({
      data: companies.map(c => ({ id: c._id, name: c.name, slug: c.slug, isActive: c.isActive, createdAt: c.createdAt, membership: c.membership || null })),
      total, page, limit,
    });
  } catch (err) { next(err); }
};

// ── PUT /api/superadmin/companies/:id/membership ──────────────────
exports.updateMembership = async (req, res, next) => {
  try {
    const { plan, vehicleLimit, expiresAt } = req.body;
    const update = {};
    if (plan         !== undefined) update['membership.plan']         = plan;
    if (vehicleLimit !== undefined) update['membership.vehicleLimit'] = parseInt(vehicleLimit);
    if (expiresAt    !== undefined) update['membership.expiresAt']    = expiresAt ? new Date(expiresAt) : null;

    const company = await Company.findByIdAndUpdate(req.params.id, { $set: update }, { new: true, runValidators: true });
    if (!company) return res.status(404).json({ message: 'Company not found' });

    await logActivity({ action: 'update', entity: 'membership', entityId: company._id, entityName: company.name, detail: `Plan: ${plan || 'unchanged'}, Limit: ${vehicleLimit || 'unchanged'}` });
    res.json({ success: true, membership: company.membership });
  } catch (err) { next(err); }
};

// ── POST /api/superadmin/companies/:id/approve-limit ─────────────
exports.approveLimitRequest = async (req, res, next) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) return res.status(404).json({ message: 'Company not found' });
    if (!company.membership?.limitRequest?.pending) return res.status(400).json({ message: 'No pending limit request' });

    const newLimit = company.membership.limitRequest.requested;
    company.membership.vehicleLimit             = newLimit;
    company.membership.limitRequest.pending     = false;
    company.membership.limitRequest.requested   = 0;
    company.membership.limitRequest.reason      = '';
    company.membership.limitRequest.submittedAt = null;
    await company.save();

    await logActivity({ action: 'approve', entity: 'membership', entityId: company._id, entityName: company.name, detail: `Vehicle limit approved: ${newLimit}` });
    res.json({ success: true, newLimit });
  } catch (err) { next(err); }
};

// ── POST /api/superadmin/companies/:id/reject-limit ──────────────
exports.rejectLimitRequest = async (req, res, next) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) return res.status(404).json({ message: 'Company not found' });
    if (!company.membership?.limitRequest?.pending) return res.status(400).json({ message: 'No pending limit request' });

    company.membership.limitRequest.pending     = false;
    company.membership.limitRequest.requested   = 0;
    company.membership.limitRequest.reason      = '';
    company.membership.limitRequest.submittedAt = null;
    await company.save();

    await logActivity({ action: 'reject', entity: 'membership', entityId: company._id, entityName: company.name, detail: 'Vehicle limit request rejected' });
    res.json({ success: true });
  } catch (err) { next(err); }
};

// ── GET /api/superadmin/activity-log ─────────────────────────────
exports.activityLog = async (req, res, next) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(100, parseInt(req.query.limit) || 25);
    const skip   = (page - 1) * limit;
    const search = req.query.search?.trim();
    const entity = req.query.entity;
    const action = req.query.action;

    const query = {};
    if (search) query.$or = [{ entityName: { $regex: search, $options: 'i' } }, { detail: { $regex: search, $options: 'i' } }, { performedBy: { $regex: search, $options: 'i' } }];
    if (entity) query.entity = entity;
    if (action) query.action = action;

    const [logs, total] = await Promise.all([
      ActivityLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      ActivityLog.countDocuments(query),
    ]);

    res.json({
      data: logs.map(l => ({ id: l._id, action: l.action, entity: l.entity, entityName: l.entityName, detail: l.detail, performedBy: l.performedBy, companyName: l.companyName, createdAt: l.createdAt })),
      total, page, limit,
    });
  } catch (err) { next(err); }
};
