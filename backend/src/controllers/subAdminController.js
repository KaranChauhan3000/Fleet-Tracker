const { Admin, Company } = require('../models');

// ── List all admins in the caller's company ───────────────────────────────────
exports.listSubAdmins = async (req, res, next) => {
  try {
    const admins = await Admin.find({ companyId: req.user.companyId })
      .select('-otpCode -otpExpiry -otpAttempts -otpLastRequest')
      .sort({ createdAt: 1 });

    const company = await Company.findById(req.user.companyId).select('ownerId');

    const result = admins.map(a => ({
      id:          a._id,
      name:        a.name,
      email:       a.email,
      phone:       a.phone,
      designation: a.designation,
      isActive:    a.isActive,
      createdAt:   a.createdAt,
      isOwner:     company?.ownerId?.toString() === a._id.toString(),
    }));

    res.json(result);
  } catch (err) { next(err); }
};

// ── Create a new admin in the same company ────────────────────────────────────
exports.createSubAdmin = async (req, res, next) => {
  try {
    const { name, email, phone, designation } = req.body;
    const companyId = req.user.companyId;

    if (!name?.trim() || !email?.trim() || !phone?.trim()) {
      return res.status(400).json({ message: 'Name, email and phone are required' });
    }

    const [existingPhone, existingEmail] = await Promise.all([
      Admin.findOne({ phone: phone.trim(), companyId }),
      Admin.findOne({ email: email.toLowerCase().trim() }),
    ]);
    if (existingPhone) return res.status(409).json({ message: 'An admin with this phone already exists in your company' });
    if (existingEmail) return res.status(409).json({ message: 'An admin with this email already exists' });

    const admin = await Admin.create({
      name:        name.trim(),
      email:       email.toLowerCase().trim(),
      phone:       phone.trim(),
      designation: designation?.trim() || '',
      companyId,
      createdBy:   req.user.id,   // track who created it
      isActive:    true,
    });

    res.status(201).json({
      id:          admin._id,
      name:        admin.name,
      email:       admin.email,
      phone:       admin.phone,
      designation: admin.designation,
      isActive:    admin.isActive,
      createdAt:   admin.createdAt,
      isOwner:     false,
    });
  } catch (err) { next(err); }
};

// ── Update an admin in the same company ───────────────────────────────────────
exports.updateSubAdmin = async (req, res, next) => {
  try {
    const admin = await Admin.findOne({ _id: req.params.id, companyId: req.user.companyId });
    if (!admin) return res.status(404).json({ message: 'Admin not found' });

    const company = await Company.findById(req.user.companyId).select('ownerId');
    const isOwnerRecord = company?.ownerId?.toString() === admin._id.toString();

    // Block changing the owner record's active status to false
    const { name, email, phone, designation, isActive } = req.body;
    if (name        != null) admin.name        = name.trim();
    if (email       != null) admin.email       = email.toLowerCase().trim();
    if (phone       != null) admin.phone       = phone.trim();
    if (designation != null) admin.designation = designation.trim();
    if (isActive    != null && !isOwnerRecord) admin.isActive = isActive;

    await admin.save();
    res.json({
      id:          admin._id,
      name:        admin.name,
      email:       admin.email,
      phone:       admin.phone,
      designation: admin.designation,
      isActive:    admin.isActive,
      isOwner:     isOwnerRecord,
    });
  } catch (err) { next(err); }
};

// ── Delete (deactivate) an admin — cannot delete yourself or the owner ────────
exports.deleteSubAdmin = async (req, res, next) => {
  try {
    const admin = await Admin.findOne({ _id: req.params.id, companyId: req.user.companyId });
    if (!admin) return res.status(404).json({ message: 'Admin not found' });

    // Cannot delete yourself
    if (admin._id.toString() === req.user.id) {
      return res.status(400).json({ message: 'You cannot remove yourself' });
    }

    // Cannot delete the company owner
    const company = await Company.findById(req.user.companyId).select('ownerId');
    if (company?.ownerId?.toString() === admin._id.toString()) {
      return res.status(400).json({ message: 'Cannot remove the company owner' });
    }

    await Admin.findByIdAndDelete(admin._id);
    res.json({ message: 'Admin removed successfully' });
  } catch (err) { next(err); }
};
