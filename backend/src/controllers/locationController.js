const LocationLog = require('../models/LocationLog');
const User        = require('../models/User');
const Company     = require('../models/Company');

// ── POST /user/location ────────────────────────────────────────────────────────
// Called from the user's app every 30 minutes to record current position.
exports.logLocation = async (req, res) => {
  try {
    const { lat, lng, accuracy, address } = req.body;

    if (lat == null || lng == null) {
      return res.status(400).json({ message: 'lat and lng are required' });
    }

    // ── Deduplication guard ───────────────────────────────────────────────────
    // If this user already sent a ping within the last 8 minutes, skip saving.
    // This protects against React double-effects, rapid remounts, and any other
    // frontend edge cases that might fire ping() more than once.
    const cutoff = new Date(Date.now() - 8 * 60 * 1000);
    const recent = await LocationLog.findOne({
      userId:     req.user.id,
      companyId:  req.user.companyId,
      recordedAt: { $gte: cutoff },
    }).select('_id').lean();

    if (recent) {
      // Already have a recent ping — silently acknowledge without saving
      return res.json({ ok: true, id: recent._id, skipped: true });
    }
    // ─────────────────────────────────────────────────────────────────────────

    const log = await LocationLog.create({
      userId:     req.user.id,
      companyId:  req.user.companyId,
      lat:        parseFloat(lat),
      lng:        parseFloat(lng),
      accuracy:   accuracy != null ? parseFloat(accuracy) : null,
      address:    address   || '',
      recordedAt: new Date(),
    });

    res.json({ ok: true, id: log._id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── GET /admin/users/:id/location-timeline?date=YYYY-MM-DD ───────────────────
// Returns all location pings for a user on a given day, filtered to the
// company-wide office timing window set by the admin.
exports.getTimeline = async (req, res) => {
  try {
    const { id }  = req.params;
    const dateStr = req.query.date || new Date().toISOString().slice(0, 10);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return res.status(400).json({ message: 'date must be YYYY-MM-DD' });
    }

    // Verify user belongs to this admin's company
    const user = await User.findOne({ _id: id, companyId: req.user.companyId }).lean();
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Load company-wide office timing (set by admin in Settings)
    const company = await Company.findById(req.user.companyId).lean();
    const ot = company?.officeTiming || {};

    // day = "0" (Sun) … "6" (Sat)
    const dayIndex  = new Date(dateStr + 'T12:00:00').getDay().toString();
    const overrides = ot.overrides instanceof Map
      ? Object.fromEntries(ot.overrides)
      : (ot.overrides || {});
    const override  = overrides[dayIndex];

    // Pick the most specific applicable timing
    let activeTiming = null;
    let isHoliday    = false;

    if (override?.holiday) {
      isHoliday = true; // show full day but mark as holiday
    } else if (override?.enabled) {
      activeTiming = override;
    } else if (ot.enabled) {
      activeTiming = { enabled: true, startTime: ot.startTime, endTime: ot.endTime };
    }

    // Convert local office hours → UTC using timezone offset sent by frontend
    // tz = minutes east of UTC (e.g. 330 for IST UTC+5:30, -300 for EST UTC-5)
    const tzOffset = parseInt(req.query.tz) || 330; // default IST

    function localToUTC(dateStr, timeStr) {
      const [h, m] = timeStr.split(':').map(Number);
      return new Date(Date.parse(`${dateStr}T00:00:00Z`) + (h * 60 + m - tzOffset) * 60000);
    }

    let start, end;
    if (activeTiming) {
      start = localToUTC(dateStr, activeTiming.startTime);
      end   = localToUTC(dateStr, activeTiming.endTime);
    } else {
      // No office timing — return full local day (midnight to midnight)
      start = localToUTC(dateStr, '00:00');
      end   = localToUTC(dateStr, '23:59');
    }

    const logs = await LocationLog.find({
      userId:     id,
      companyId:  req.user.companyId,
      recordedAt: { $gte: start, $lte: end },
    }).sort({ recordedAt: 1 }).lean();

    res.json({
      user: {
        id:         user._id,
        name:       user.name,
        employeeId: user.employeeId,
        phone:      user.phone,
      },
      date:   dateStr,
      timing: {
        enabled:   !!activeTiming,
        isHoliday: isHoliday,
        startTime: activeTiming?.startTime || null,
        endTime:   activeTiming?.endTime   || null,
        isOverride: !!(override?.enabled),
      },
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
