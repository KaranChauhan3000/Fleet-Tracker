const LocationLog = require('../models/LocationLog');
const User        = require('../models/User');
const Company     = require('../models/Company');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Parse "HH:MM" → total minutes from midnight. */
function hmToMin(hm) {
  const [h, m] = (hm || '00:00').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Returns true if `now` (UTC) falls inside the office window defined by
 * `startTime`–`endTime` for the company, after converting to local time
 * using `tzOffset` (minutes east of UTC, e.g. 330 for IST).
 *
 * No buffers — strictly start → end as the admin configured.
 */
function isInsideOfficeWindow(now, ot, tzOffset) {
  if (!ot?.enabled) return false;

  const utcMin   = now.getUTCHours() * 60 + now.getUTCMinutes();
  const localMin = (utcMin + tzOffset + 1440) % 1440;

  const start = hmToMin(ot.startTime || '09:00');
  const end   = hmToMin(ot.endTime   || '18:00');

  return localMin >= start && localMin < end;
}

// ── GET /user/tracking-config ─────────────────────────────────────────────────
// Mobile fetches this on login and caches it so the background task knows
// the correct window boundaries without needing React context.
exports.getTrackingConfig = async (req, res) => {
  try {
    const company = await Company.findById(req.user.companyId).lean();
    if (!company) return res.status(404).json({ message: 'Company not found' });

    const ot = company.officeTiming || {};
    const overrides =
      ot.overrides instanceof Map
        ? Object.fromEntries(ot.overrides)
        : (ot.overrides || {});

    res.json({
      enabled:   !!ot.enabled,
      startTime: ot.startTime || '09:00',
      endTime:   ot.endTime   || '18:00',
      // Always 1-minute interval — no configurable interval exposed
      trackingIntervalMin: 1,
      overrides,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── POST /user/location ────────────────────────────────────────────────────────
// Called every minute from the background task when inside the office window.
// Server validates the window and deduplicates pings closer than 55 seconds
// (accounts for scheduling jitter on both Android and iOS).
exports.logLocation = async (req, res) => {
  try {
    const { lat, lng, accuracy, address, battery } = req.body;

    if (lat == null || lng == null) {
      return res.status(400).json({ message: 'lat and lng are required' });
    }

    const company = await Company.findById(req.user.companyId).lean();
    const ot      = company?.officeTiming || {};

    // tz offset sent by mobile (minutes east of UTC). Default IST (+05:30).
    const tzOffset = parseInt(req.body.tz ?? req.query.tz) || 330;

    const now = new Date();

    // ── Window guard ──────────────────────────────────────────────────────────
    // Strictly inside start→end, no buffers.
    if (!isInsideOfficeWindow(now, ot, tzOffset)) {
      return res.json({ ok: true, skipped: true, reason: 'outside-window' });
    }

    // ── Deduplication guard ───────────────────────────────────────────────────
    // Allow 1 ping per 55-second window to absorb scheduling jitter.
    const DEDUP_MS = 55 * 1000;
    const cutoff   = new Date(now.getTime() - DEDUP_MS);

    const recent = await LocationLog.findOne({
      userId:     req.user.id,
      companyId:  req.user.companyId,
      recordedAt: { $gte: cutoff },
    }).select('_id').lean();

    if (recent) {
      return res.json({ ok: true, id: recent._id, skipped: true, reason: 'too-soon' });
    }

    const log = await LocationLog.create({
      userId:     req.user.id,
      companyId:  req.user.companyId,
      lat:        parseFloat(lat),
      lng:        parseFloat(lng),
      accuracy:   accuracy != null ? parseFloat(accuracy) : null,
      address:    address   || '',
      battery:    battery   != null ? Math.round(parseFloat(battery)) : null,
      recordedAt: now,
    });

    res.json({ ok: true, id: log._id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── GET /admin/users/:id/location-timeline?date=YYYY-MM-DD ───────────────────
// Returns all pings for a driver on a given day. Queries the full day so even
// if the admin changes office hours mid-day, the history still shows all pings.
exports.getTimeline = async (req, res) => {
  try {
    const { id }  = req.params;
    const dateStr = req.query.date || new Date().toISOString().slice(0, 10);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return res.status(400).json({ message: 'date must be YYYY-MM-DD' });
    }

    // Only allow querying today or yesterday (2-day window)
    const today     = new Date();
    const todayYmd  = today.toISOString().slice(0, 10);
    const yesterday = new Date(today);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const yesterdayYmd = yesterday.toISOString().slice(0, 10);

    if (dateStr !== todayYmd && dateStr !== yesterdayYmd) {
      return res.status(400).json({
        message: 'Only today and yesterday are available (2-day retention policy)',
      });
    }

    const user = await User.findOne({ _id: id, companyId: req.user.companyId }).lean();
    if (!user) return res.status(404).json({ message: 'User not found' });

    const company = await Company.findById(req.user.companyId).lean();
    const ot      = company?.officeTiming || {};

    const tzOffset = parseInt(req.query.tz) || 330;

    // Resolve per-day override
    const dayIndex  = new Date(dateStr + 'T12:00:00').getDay().toString();
    const overrides = ot.overrides instanceof Map
      ? Object.fromEntries(ot.overrides)
      : (ot.overrides || {});
    const override = overrides[dayIndex];

    let activeTiming = null;
    let isHoliday    = false;

    if (override?.holiday) {
      isHoliday = true;
    } else if (override?.enabled) {
      activeTiming = override;
    } else if (ot.enabled) {
      activeTiming = {
        enabled:   true,
        startTime: ot.startTime || '09:00',
        endTime:   ot.endTime   || '18:00',
      };
    }

    function localToUTC(ds, timeStr) {
      const [h, m] = timeStr.split(':').map(Number);
      return new Date(Date.parse(`${ds}T00:00:00Z`) + (h * 60 + m - tzOffset) * 60000);
    }

    // Always query the full day so no pings are dropped if admin changed timings
    const start = localToUTC(dateStr, '00:00');
    const end   = localToUTC(dateStr, '23:59');

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
      date: dateStr,
      timing: {
        enabled:   !!activeTiming,
        isHoliday: isHoliday,
        startTime: activeTiming?.startTime || null,
        endTime:   activeTiming?.endTime   || null,
        isOverride: !!(override?.enabled),
      },
      totalPings:  logs.length,
      logs: logs.map(l => ({
        id:         l._id,
        lat:        l.lat,
        lng:        l.lng,
        accuracy:   l.accuracy,
        address:    l.address,
        battery:    l.battery ?? null,
        recordedAt: l.recordedAt,
      })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
