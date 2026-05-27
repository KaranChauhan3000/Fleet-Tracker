const LocationLog = require('../models/LocationLog');
const User        = require('../models/User');
const Company     = require('../models/Company');

// ─── Time-window helpers ──────────────────────────────────────────────────────
// All times are UTC-based. The tzOffset (minutes east of UTC) converts local
// office hours → UTC for comparison.

/**
 * Parse "HH:MM" → total minutes from midnight.
 */
function hmToMin(hm) {
  const [h, m] = hm.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Determine which tracking window `now` falls in, given the company config.
 * Returns one of:
 *   'office'  – inside office hours      → use trackingIntervalMin
 *   'before'  – inside buffer-before     → use bufferIntervalMin
 *   'after'   – inside buffer-after      → use bufferIntervalMin
 *   'off'     – outside all windows      → reject / skip
 *
 * @param {Date}   now       – current UTC time
 * @param {object} ot        – company.officeTiming plain object
 * @param {number} tzOffset  – minutes east of UTC (e.g. 330 for IST)
 */
function resolveWindow(now, ot, tzOffset) {
  if (!ot?.enabled) return { zone: 'off' };

  // Current time in local minutes-since-midnight
  const localMin = ((now.getUTCHours() * 60 + now.getUTCMinutes()) + tzOffset + 1440) % 1440;

  const officeStart  = hmToMin(ot.startTime || '09:00');
  const officeEnd    = hmToMin(ot.endTime   || '18:00');
  const bufferBefore = ot.bufferBeforeMin ?? 60;
  const bufferAfter  = ot.bufferAfterMin  ?? 60;

  const windowStart  = officeStart - bufferBefore; // may go negative → handled via mod
  const windowEnd    = officeEnd   + bufferAfter;

  // Normalise negative starts
  const normStart    = (windowStart + 1440) % 1440;

  // Zones (non-wrapping — office hours never cross midnight in practice)
  if (localMin >= officeStart && localMin < officeEnd) {
    return { zone: 'office', intervalMin: ot.trackingIntervalMin ?? 30 };
  }
  if (bufferBefore > 0 && localMin >= (windowStart < 0 ? 0 : windowStart) && localMin < officeStart) {
    return { zone: 'before', intervalMin: ot.bufferIntervalMin ?? 10 };
  }
  if (bufferAfter > 0 && localMin >= officeEnd && localMin < Math.min(windowEnd, 1440)) {
    return { zone: 'after',  intervalMin: ot.bufferIntervalMin ?? 10 };
  }
  return { zone: 'off' };
}

// ── GET /user/tracking-config ─────────────────────────────────────────────────
// Mobile app fetches this on login and caches it so the background task
// knows the correct intervals and window boundaries without needing React.
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
      enabled:             !!ot.enabled,
      startTime:           ot.startTime           || '09:00',
      endTime:             ot.endTime             || '18:00',
      trackingIntervalMin: ot.trackingIntervalMin  ?? 30,
      bufferBeforeMin:     ot.bufferBeforeMin      ?? 60,
      bufferAfterMin:      ot.bufferAfterMin       ?? 60,
      bufferIntervalMin:   ot.bufferIntervalMin    ?? 10,
      overrides,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── POST /user/location ────────────────────────────────────────────────────────
// Called from the user's app according to the tracking window schedule.
// The backend validates the time window and deduplicates based on the
// interval appropriate for that window.
exports.logLocation = async (req, res) => {
  try {
    const { lat, lng, accuracy, address } = req.body;

    if (lat == null || lng == null) {
      return res.status(400).json({ message: 'lat and lng are required' });
    }

    // Load company timing config
    const company = await Company.findById(req.user.companyId).lean();
    const ot = company?.officeTiming || {};

    // tz offset sent by mobile app (minutes east of UTC). Default IST.
    const tzOffset = parseInt(req.body.tz ?? req.query.tz) || 330;

    // Resolve which window we're currently in
    const now    = new Date();
    const window = resolveWindow(now, ot, tzOffset);

    // If outside all tracking windows → acknowledge but don't save
    if (window.zone === 'off') {
      return res.json({ ok: true, skipped: true, reason: 'outside-window' });
    }

    // ── Deduplication guard ───────────────────────────────────────────────────
    // Allow a ping if the last saved ping for this user is older than
    // (intervalMin - 5) minutes. The -5 gives a small grace for scheduling jitter.
    const intervalMin   = window.intervalMin ?? 30;
    const dedupMinutes  = Math.max(intervalMin - 5, 5);
    const cutoff        = new Date(now.getTime() - dedupMinutes * 60 * 1000);

    const recent = await LocationLog.findOne({
      userId:     req.user.id,
      companyId:  req.user.companyId,
      recordedAt: { $gte: cutoff },
    }).select('_id').lean();

    if (recent) {
      return res.json({ ok: true, id: recent._id, skipped: true, reason: 'too-soon' });
    }
    // ─────────────────────────────────────────────────────────────────────────

    const log = await LocationLog.create({
      userId:     req.user.id,
      companyId:  req.user.companyId,
      lat:        parseFloat(lat),
      lng:        parseFloat(lng),
      accuracy:   accuracy != null ? parseFloat(accuracy) : null,
      address:    address   || '',
      recordedAt: now,
    });

    res.json({ ok: true, id: log._id, zone: window.zone });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── GET /admin/users/:id/location-timeline?date=YYYY-MM-DD ───────────────────
// Returns all location pings for a user on a given day. The timeline now
// includes buffer pings (before/after office) in addition to office pings,
// so we query from bufferStart → bufferEnd instead of just officeStart → officeEnd.
exports.getTimeline = async (req, res) => {
  try {
    const { id }  = req.params;
    const dateStr = req.query.date || new Date().toISOString().slice(0, 10);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return res.status(400).json({ message: 'date must be YYYY-MM-DD' });
    }

    const user = await User.findOne({ _id: id, companyId: req.user.companyId }).lean();
    if (!user) return res.status(404).json({ message: 'User not found' });

    const company = await Company.findById(req.user.companyId).lean();
    const ot      = company?.officeTiming || {};

    const dayIndex  = new Date(dateStr + 'T12:00:00').getDay().toString();
    const overrides = ot.overrides instanceof Map
      ? Object.fromEntries(ot.overrides)
      : (ot.overrides || {});
    const override  = overrides[dayIndex];

    let activeTiming = null;
    let isHoliday    = false;

    if (override?.holiday) {
      isHoliday = true;
    } else if (override?.enabled) {
      activeTiming = override;
    } else if (ot.enabled) {
      activeTiming = {
        enabled:             true,
        startTime:           ot.startTime,
        endTime:             ot.endTime,
        trackingIntervalMin: ot.trackingIntervalMin ?? 30,
        bufferBeforeMin:     ot.bufferBeforeMin     ?? 60,
        bufferAfterMin:      ot.bufferAfterMin      ?? 60,
        bufferIntervalMin:   ot.bufferIntervalMin   ?? 10,
      };
    }

    const tzOffset = parseInt(req.query.tz) || 330;

    function localToUTC(dateStr, timeStr) {
      const [h, m] = timeStr.split(':').map(Number);
      return new Date(Date.parse(`${dateStr}T00:00:00Z`) + (h * 60 + m - tzOffset) * 60000);
    }

    let start, end;
    if (activeTiming) {
      // Extend window to include buffer periods
      const officeStartMin = hmToMin(activeTiming.startTime);
      const officeEndMin   = hmToMin(activeTiming.endTime);
      const bufBefore      = activeTiming.bufferBeforeMin ?? 60;
      const bufAfter       = activeTiming.bufferAfterMin  ?? 60;

      const bufStartMin    = officeStartMin - bufBefore;
      const bufEndMin      = officeEndMin   + bufAfter;

      // Convert to HH:MM strings (clamp to 00:00–23:59)
      const toHHMM = (min) => {
        const clamped = Math.max(0, Math.min(1439, min));
        return `${String(Math.floor(clamped / 60)).padStart(2, '0')}:${String(clamped % 60).padStart(2, '0')}`;
      };

      start = localToUTC(dateStr, toHHMM(bufStartMin));
      end   = localToUTC(dateStr, toHHMM(bufEndMin));
    } else {
      start = localToUTC(dateStr, '00:00');
      end   = localToUTC(dateStr, '23:59');
    }

    const logs = await LocationLog.find({
      userId:     id,
      companyId:  req.user.companyId,
      recordedAt: { $gte: start, $lte: end },
    }).sort({ recordedAt: 1 }).lean();

    // Tag each log with which zone it was in (for the admin timeline view)
    const taggedLogs = logs.map(l => {
      let zone = 'office';
      if (activeTiming) {
        const localMin = ((l.recordedAt.getUTCHours() * 60 + l.recordedAt.getUTCMinutes()) + tzOffset + 1440) % 1440;
        const oStart   = hmToMin(activeTiming.startTime);
        const oEnd     = hmToMin(activeTiming.endTime);
        if      (localMin < oStart) zone = 'before';
        else if (localMin >= oEnd)  zone = 'after';
        else                        zone = 'office';
      }
      return {
        id:         l._id,
        lat:        l.lat,
        lng:        l.lng,
        accuracy:   l.accuracy,
        address:    l.address,
        recordedAt: l.recordedAt,
        zone,                        // 'before' | 'office' | 'after'
      };
    });

    res.json({
      user: {
        id:         user._id,
        name:       user.name,
        employeeId: user.employeeId,
        phone:      user.phone,
      },
      date:   dateStr,
      timing: {
        enabled:             !!activeTiming,
        isHoliday:           isHoliday,
        startTime:           activeTiming?.startTime           || null,
        endTime:             activeTiming?.endTime             || null,
        trackingIntervalMin: activeTiming?.trackingIntervalMin ?? 30,
        bufferBeforeMin:     activeTiming?.bufferBeforeMin     ?? 60,
        bufferAfterMin:      activeTiming?.bufferAfterMin      ?? 60,
        bufferIntervalMin:   activeTiming?.bufferIntervalMin   ?? 10,
        isOverride:          !!(override?.enabled),
      },
      totalPings:        taggedLogs.length,
      officePings:       taggedLogs.filter(l => l.zone === 'office').length,
      bufferBeforePings: taggedLogs.filter(l => l.zone === 'before').length,
      bufferAfterPings:  taggedLogs.filter(l => l.zone === 'after').length,
      logs:              taggedLogs,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
