const mongoose = require('mongoose');

// Sub-schema for a single day timing window
const dayTimingSchema = new mongoose.Schema({
  enabled:   { type: Boolean, default: false },
  holiday:   { type: Boolean, default: false },
  startTime: { type: String, default: '09:00' }, // "HH:MM" 24-hour
  endTime:   { type: String, default: '18:00' }, // "HH:MM" 24-hour
}, { _id: false });

const companySchema = new mongoose.Schema({
  name:      { type: String, required: true, trim: true },
  slug:      { type: String, required: true, unique: true, lowercase: true, trim: true },
  isActive:  { type: Boolean, default: true },
  createdBy: { type: String, default: 'self-registered' },
  ownerId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },

  // ── Membership ────────────────────────────────────────────────────────────
  membership: {
    plan:         { type: String, enum: ['monthly', 'yearly', null], default: null },
    expiresAt:    { type: Date,   default: null },
    vehicleLimit: { type: Number, default: 50 },
    razorpayPaymentId: { type: String, default: '' },
    razorpayOrderId:   { type: String, default: '' },
    limitRequest: {
      pending:     { type: Boolean, default: false },
      requested:   { type: Number,  default: 0 },
      reason:      { type: String,  default: '' },
      contactName: { type: String,  default: '' },
      contactPhone:{ type: String,  default: '' },
      submittedAt: { type: Date,    default: null },
    },
  },

  // ── Company-wide Office Timing & Tracking Config ───────────────────────────
  // Admin sets the office window + buffer windows + intervals.
  // The mobile app fetches this config and uses it to decide WHEN to ping.
  officeTiming: {
    enabled:   { type: Boolean, default: false },
    startTime: { type: String,  default: '09:00' }, // "HH:MM" 24-hour
    endTime:   { type: String,  default: '18:00' }, // "HH:MM" 24-hour

    // ── Tracking intervals ──────────────────────────────────────────────────
    // How often to record location during office hours (in minutes).
    // Default: 30 min  →  2 pings/hour during work time.
    trackingIntervalMin: { type: Number, default: 30, min: 5, max: 120 },

    // ── Buffer windows ──────────────────────────────────────────────────────
    // Grace period BEFORE office start where we ping more often (e.g. commute).
    // bufferBeforeMin = 60  →  tracking starts 1 hour before office start.
    bufferBeforeMin:    { type: Number, default: 60, min: 0, max: 240 },
    // Grace period AFTER office end.
    bufferAfterMin:     { type: Number, default: 60, min: 0, max: 240 },
    // Ping interval during BOTH buffer windows (should be < trackingIntervalMin).
    // Default: 10 min  →  6 pings/hour during buffer.
    bufferIntervalMin:  { type: Number, default: 10, min: 5, max: 60  },

    // Per-day overrides, keys "0"–"6" (Sun=0)
    overrides: {
      type: Map,
      of: dayTimingSchema,
      default: {},
    },
  },
}, { timestamps: true });

module.exports = mongoose.model('Company', companySchema);
