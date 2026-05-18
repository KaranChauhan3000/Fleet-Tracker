/**
 * checkMembership.js
 * Applied to all admin routes AFTER protect + adminOnly.
 * Returns 403 with { membershipExpired: true } when trial/membership is expired.
 * Frontend catches this and shows the membership gate.
 */
const Company = require('../models/Company');
const { getMembershipStatus } = require('../controllers/membershipController');

module.exports = async (req, res, next) => {
  try {
    // These routes are always allowed (needed to check status & pay)
    const always = ['/membership/status', '/membership/create-order', '/membership/verify-payment', '/membership/limit-request', '/company-settings'];
    if (always.some(p => req.path.endsWith(p))) return next();

    const company = await Company.findById(req.user.companyId).select('createdAt membership').lean();
    if (!company) return next(); // company not found, let other middleware handle

    const { status } = getMembershipStatus(company);

    if (status === 'expired') {
      return res.status(403).json({
        membershipExpired: true,
        message: 'Your trial or membership has expired. Please subscribe to continue.',
      });
    }

    next();
  } catch (err) {
    // Never block the request if membership check fails — fail open
    console.error('[checkMembership] Error:', err.message);
    next();
  }
};
