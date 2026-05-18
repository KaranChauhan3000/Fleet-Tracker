/**
 * authController.js
 * ─────────────────
 * Password = last 4 digits of the user's/admin's registered mobile number.
 * No OTP, no SMS, no external service.
 *
 * Admin flow
 *   POST /api/auth/register          — register new company + owner admin
 *   POST /api/auth/admin/login       — phone + last-4-digits password
 *
 * User flow
 *   POST /api/auth/user/login        — employeeId + last-4-digits of their phone
 *
 * Shared
 *   POST /api/auth/logout            — (protected) client drops token
 *   GET  /api/auth/me                — (protected) returns current user profile
 */

const { Admin, User, Company } = require('../models');
const { signToken }            = require('../utils/jwt');

// ── Slug helpers ──────────────────────────────────────────────────────────────
function makeSlug(name) {
  return name.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 40);
}
async function uniqueSlug(base) {
  let slug = base, counter = 2;
  while (await Company.exists({ slug })) slug = `${base}-${counter++}`;
  return slug;
}

// ── Password helper ───────────────────────────────────────────────────────────
// Password = last 4 digits of the phone number (digits only, strip prefix)
function getPassword(phone) {
  const digits = (phone || '').replace(/\D/g, '');
  return digits.slice(-4);
}
function checkPassword(inputPassword, phone) {
  const expected = getPassword(phone);
  if (expected.length < 4) return false;
  return String(inputPassword).trim() === expected;
}

// ── Safe response payloads ────────────────────────────────────────────────────
function adminPayload(admin, company) {
  return {
    id:          admin._id,
    name:        admin.name,
    phone:       admin.phone,
    email:       admin.email,
    designation: admin.designation,
    role:        'admin',
    companyId:   company._id,
    companyName: company.name,
    isOwner:     company.ownerId?.toString() === admin._id.toString(),
  };
}
function userPayload(user, company) {
  return {
    id:          user._id,
    name:        user.name,
    phone:       user.phone,
    employeeId:  user.employeeId,
    role:        'user',
    companyId:   company._id,
    companyName: company.name,
  };
}

// ════════════════════════════════════════════════════════════════════════════
//  ADMIN — REGISTRATION
//  POST /api/auth/register
//  Body: { companyName, name, email, phone, designation? }
// ════════════════════════════════════════════════════════════════════════════
exports.register = async (req, res, next) => {
  try {
    const { companyName, name, email, phone, designation } = req.body;

    if (!companyName?.trim() || !name?.trim() || !email?.trim() || !phone?.trim()) {
      return res.status(400).json({ message: 'Company name, your name, email and phone are required' });
    }

    const rawPhone = phone.trim();
    const password = getPassword(rawPhone);
    if (password.length < 4) {
      return res.status(400).json({ message: 'Phone number must have at least 4 digits' });
    }

    // Company name uniqueness (case-insensitive, active only)
    const nameRegex = new RegExp(
      '^' + companyName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i'
    );
    if (await Company.findOne({ name: nameRegex, isActive: true })) {
      return res.status(409).json({ message: 'A company with this name already exists' });
    }
    if (await Admin.findOne({ email: email.toLowerCase().trim(), isActive: true })) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }
    if (await Admin.findOne({ phone: rawPhone, isActive: true })) {
      return res.status(409).json({ message: 'An account with this phone number already exists' });
    }

    const slug    = await uniqueSlug(makeSlug(companyName.trim()));
    const company = await Company.create({
      name: companyName.trim(), slug, isActive: true, createdBy: 'self-registered',
    });

    const admin = await Admin.create({
      name:        name.trim(),
      email:       email.toLowerCase().trim(),
      phone:       rawPhone,
      designation: (designation || '').trim(),
      companyId:   company._id,
      isActive:    true,
      createdBy:   'self-registered',
    });

    await Company.findByIdAndUpdate(company._id, { ownerId: admin._id });
    const updatedCompany = await Company.findById(company._id);

    const token = signToken({ id: admin._id, role: 'admin', companyId: company._id });
    return res.status(201).json({
      message: 'Registration successful',
      token,
      user: adminPayload(admin, updatedCompany),
    });
  } catch (err) { next(err); }
};

// ════════════════════════════════════════════════════════════════════════════
//  ADMIN — LOGIN
//  POST /api/auth/admin/login
//  Body: { phone, password }
// ════════════════════════════════════════════════════════════════════════════
exports.adminLogin = async (req, res, next) => {
  try {
    const { phone, password } = req.body;
    if (!phone?.trim() || !password?.trim()) {
      return res.status(400).json({ message: 'Phone and password are required' });
    }

    const admin = await Admin.findOne({ phone: phone.trim(), isActive: true });
    if (!admin) {
      return res.status(404).json({ message: 'No admin account found with this phone number' });
    }
    const company = await Company.findOne({ _id: admin.companyId, isActive: true });
    if (!company) {
      return res.status(403).json({ message: 'Your company account is inactive. Contact support.' });
    }
    if (!checkPassword(password, admin.phone)) {
      return res.status(401).json({ message: 'Incorrect password' });
    }

    await Admin.findByIdAndUpdate(admin._id, { lastLogin: new Date() });
    const token = signToken({ id: admin._id, role: 'admin', companyId: company._id });
    return res.json({ token, user: adminPayload(admin, company) });
  } catch (err) { next(err); }
};

// ════════════════════════════════════════════════════════════════════════════
//  USER — LOGIN
//  POST /api/auth/user/login
//  Body: { phone, password, companyId? }
//  phone    = user's registered mobile number (full or partial — we match last 4)
//  password = last 4 digits of that same mobile number
// ════════════════════════════════════════════════════════════════════════════
exports.userLogin = async (req, res, next) => {
  try {
    const { phone, password, companyId } = req.body;
    if (!phone?.trim() || !password?.trim()) {
      return res.status(400).json({ message: 'Mobile number and password are required' });
    }

    // Normalise: strip non-digits, keep last 10
    const digitsInput = phone.trim().replace(/\D/g, '');

    // Find all active users whose phone ends with the supplied digits
    const query = { isActive: true, phone: { $regex: `${digitsInput}$` } };
    if (companyId) query.companyId = companyId;

    const users = await User.find(query).lean();

    if (users.length === 0) {
      return res.status(404).json({ message: 'No active user found with this mobile number' });
    }

    // Multiple companies share this number — ask to pick
    if (users.length > 1) {
      const companies = await Company.find(
        { _id: { $in: users.map(u => u.companyId) }, isActive: true },
        'name _id'
      ).lean();
      return res.status(300).json({
        requiresCompanySelection: true,
        companies: companies.map(c => ({ id: c._id, name: c.name })),
        message:   'Multiple companies found for this number. Please select yours.',
      });
    }

    const user    = users[0];
    const company = await Company.findOne({ _id: user.companyId, isActive: true });
    if (!company) {
      return res.status(403).json({ message: 'Company account inactive. Contact your admin.' });
    }

    if (!checkPassword(password, user.phone)) {
      return res.status(401).json({ message: 'Incorrect password. Enter the last 4 digits of your mobile.' });
    }

    // Mark phoneVerified on first login
    const updates = { lastLogin: new Date() };
    if (!user.phoneVerified) updates.phoneVerified = true;
    await User.findByIdAndUpdate(user._id, updates);

    const token = signToken({ id: user._id, role: 'user', companyId: company._id });
    return res.json({ token, user: userPayload(user, company) });
  } catch (err) { next(err); }
};

// ════════════════════════════════════════════════════════════════════════════
//  SHARED
// ════════════════════════════════════════════════════════════════════════════
exports.logout = (_req, res) => res.json({ message: 'Logged out successfully' });

exports.me = async (req, res, next) => {
  try {
    if (req.user.role === 'admin') {
      const admin = await Admin.findById(req.user.id).populate('companyId', 'name ownerId');
      if (!admin || !admin.isActive) return res.status(401).json({ message: 'Account inactive' });
      return res.json(adminPayload(admin, admin.companyId));
    }
    const user = await User.findById(req.user.id).populate('companyId', 'name');
    if (!user || !user.isActive) return res.status(401).json({ message: 'Account inactive' });
    return res.json(userPayload(user, user.companyId));
  } catch (err) { next(err); }
};
