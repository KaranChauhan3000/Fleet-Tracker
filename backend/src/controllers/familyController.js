const User        = require('../models/User');
const LocationLog = require('../models/LocationLog');
const { signToken } = require('../utils/jwt');

// ── POST /api/family/login ────────────────────────────────────────────────────
// Family member enters their phone number.
// If it exists in any user's familyMembers list → issue a family JWT.
exports.login = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ message: 'Phone number is required' });

    const clean = phone.replace(/\D/g, '').slice(-10); // last 10 digits

    // Find a user who has added this phone as a family member
    const trackedUser = await User.findOne({
      'familyMembers.phone': { $regex: clean + '$' },
      isActive: true,
    }).lean();

    if (!trackedUser) {
      return res.status(404).json({
        message: 'No fleet user has added this phone number as a family member.',
      });
    }

    const member = trackedUser.familyMembers.find(m => m.phone.replace(/\D/g, '').slice(-10) === clean);

    const token = signToken({
      role:          'family',
      trackedUserId: trackedUser._id.toString(),
      companyId:     trackedUser.companyId.toString(),
      familyPhone:   phone,
      familyName:    member?.name || 'Family Member',
    });

    res.json({
      token,
      familyName:   member?.name || 'Family Member',
      trackedUser: {
        id:         trackedUser._id,
        name:       trackedUser.name,
        employeeId: trackedUser.employeeId,
        phone:      trackedUser.phone,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── GET /api/family/latest ────────────────────────────────────────────────────
// Returns the most recent location ping for the tracked user + basic user info.
exports.getLatest = async (req, res) => {
  try {
    const { trackedUserId, companyId } = req.family;

    const [user, latest] = await Promise.all([
      User.findById(trackedUserId).select('name employeeId phone').lean(),
      LocationLog.findOne({ userId: trackedUserId, companyId })
        .sort({ recordedAt: -1 })
        .lean(),
    ]);

    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({
      user: { id: user._id, name: user.name, employeeId: user.employeeId },
      latest: latest ? {
        lat:        latest.lat,
        lng:        latest.lng,
        accuracy:   latest.accuracy,
        address:    latest.address,
        recordedAt: latest.recordedAt,
      } : null,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── GET /api/family/timeline?date=YYYY-MM-DD ──────────────────────────────────
// Returns all location pings for the tracked user on a given day.
exports.getTimeline = async (req, res) => {
  try {
    const { trackedUserId, companyId } = req.family;
    const dateStr  = req.query.date || new Date().toISOString().slice(0, 10);
    const tzOffset = parseInt(req.query.tz) || 330; // default IST

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return res.status(400).json({ message: 'date must be YYYY-MM-DD' });
    }

    function localToUTC(ds, timeStr) {
      const [h, m] = timeStr.split(':').map(Number);
      return new Date(Date.parse(`${ds}T00:00:00Z`) + (h * 60 + m - tzOffset) * 60000);
    }

    const start = localToUTC(dateStr, '00:00');
    const end   = localToUTC(dateStr, '23:59');

    const [user, logs] = await Promise.all([
      User.findById(trackedUserId).select('name employeeId').lean(),
      LocationLog.find({
        userId:     trackedUserId,
        companyId,
        recordedAt: { $gte: start, $lte: end },
      }).sort({ recordedAt: 1 }).lean(),
    ]);

    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({
      user:       { id: user._id, name: user.name, employeeId: user.employeeId },
      date:       dateStr,
      totalPings: logs.length,
      logs: logs.map(l => ({
        id:         l._id,
        lat:        l.lat,
        lng:        l.lng,
        accuracy:   l.accuracy,
        address:    l.address,
        recordedAt: l.recordedAt,
      })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
