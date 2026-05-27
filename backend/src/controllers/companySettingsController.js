const Company = require('../models/Company');

// ── Helpers ───────────────────────────────────────────────────────────────────
function normaliseTiming(ot) {
  const overrides =
    ot.overrides instanceof Map
      ? Object.fromEntries(ot.overrides)
      : (ot.overrides || {});

  return {
    enabled:             !!ot.enabled,
    startTime:           ot.startTime           || '09:00',
    endTime:             ot.endTime             || '18:00',
    trackingIntervalMin: ot.trackingIntervalMin  ?? 30,
    bufferBeforeMin:     ot.bufferBeforeMin      ?? 60,
    bufferAfterMin:      ot.bufferAfterMin       ?? 60,
    bufferIntervalMin:   ot.bufferIntervalMin    ?? 10,
    overrides,
  };
}

// ── GET /admin/company-settings ───────────────────────────────────────────────
exports.getCompanySettings = async (req, res) => {
  try {
    const company = await Company.findById(req.user.companyId).lean();
    if (!company) return res.status(404).json({ message: 'Company not found' });

    res.json({ officeTiming: normaliseTiming(company.officeTiming || {}) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── PUT /admin/company-settings ───────────────────────────────────────────────
exports.updateCompanySettings = async (req, res) => {
  try {
    const company = await Company.findById(req.user.companyId);
    if (!company) return res.status(404).json({ message: 'Company not found' });

    const { officeTiming } = req.body;

    if (officeTiming !== undefined) {
      const {
        startTime, endTime, overrides,
        trackingIntervalMin, bufferBeforeMin, bufferAfterMin, bufferIntervalMin,
      } = officeTiming;

      if (startTime && endTime && startTime >= endTime) {
        return res.status(400).json({ message: 'End time must be after start time' });
      }

      // Validate intervals
      const tInterval = Number(trackingIntervalMin ?? 30);
      const bInterval = Number(bufferIntervalMin   ?? 10);
      const bBefore   = Number(bufferBeforeMin     ?? 60);
      const bAfter    = Number(bufferAfterMin      ?? 60);

      if (tInterval < 5 || tInterval > 120) {
        return res.status(400).json({ message: 'Tracking interval must be 5–120 minutes' });
      }
      if (bInterval < 5 || bInterval > 60) {
        return res.status(400).json({ message: 'Buffer interval must be 5–60 minutes' });
      }
      if (bBefore < 0 || bBefore > 240) {
        return res.status(400).json({ message: 'Buffer before must be 0–240 minutes' });
      }
      if (bAfter < 0 || bAfter > 240) {
        return res.status(400).json({ message: 'Buffer after must be 0–240 minutes' });
      }

      company.officeTiming = {
        enabled:             true,
        startTime:           startTime || '09:00',
        endTime:             endTime   || '18:00',
        trackingIntervalMin: tInterval,
        bufferBeforeMin:     bBefore,
        bufferAfterMin:      bAfter,
        bufferIntervalMin:   bInterval,
        overrides:           overrides || {},
      };
    }

    await company.save();

    res.json({
      ok:           true,
      officeTiming: normaliseTiming(company.officeTiming),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
