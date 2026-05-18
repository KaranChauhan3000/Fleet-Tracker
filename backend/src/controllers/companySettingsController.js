const Company = require('../models/Company');

// ── GET /admin/company-settings ───────────────────────────────────────────────
// Returns the company's current settings (office timing, etc.)
exports.getCompanySettings = async (req, res) => {
  try {
    const company = await Company.findById(req.user.companyId).lean();
    if (!company) return res.status(404).json({ message: 'Company not found' });

    // Normalise overrides Map → plain object for JSON serialisation
    const ot = company.officeTiming || {};
    const overrides =
      ot.overrides instanceof Map
        ? Object.fromEntries(ot.overrides)
        : (ot.overrides || {});

    res.json({
      officeTiming: {
        enabled:   !!ot.enabled,
        startTime: ot.startTime || '09:00',
        endTime:   ot.endTime   || '18:00',
        overrides,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── PUT /admin/company-settings ───────────────────────────────────────────────
// Admin saves company-wide office timing (and future settings fields).
exports.updateCompanySettings = async (req, res) => {
  try {
    const company = await Company.findById(req.user.companyId);
    if (!company) return res.status(404).json({ message: 'Company not found' });

    const { officeTiming } = req.body;

    if (officeTiming !== undefined) {
      const { startTime, endTime, overrides } = officeTiming;

      if (startTime && endTime && startTime >= endTime) {
        return res.status(400).json({ message: 'End time must be after start time' });
      }

      company.officeTiming = {
        enabled:   true, // always enabled when admin saves
        startTime: startTime || '09:00',
        endTime:   endTime   || '18:00',
        overrides: overrides || {},
      };
    }

    await company.save();

    // Return normalised data
    const ot = company.officeTiming;
    const overrides =
      ot.overrides instanceof Map
        ? Object.fromEntries(ot.overrides)
        : (ot.overrides || {});

    res.json({
      ok: true,
      officeTiming: {
        enabled:   !!ot.enabled,
        startTime: ot.startTime,
        endTime:   ot.endTime,
        overrides,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
