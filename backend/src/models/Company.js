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
    vehicleLimit: { type: Number, default: 50 },  // default 50, Karo India can increase
    // Razorpay records (never sent to frontend)
    razorpayPaymentId: { type: String, default: '' },
    razorpayOrderId:   { type: String, default: '' },
    // Limit increase request
    limitRequest: {
      pending:     { type: Boolean, default: false },
      requested:   { type: Number,  default: 0 },
      reason:      { type: String,  default: '' },
      contactName: { type: String,  default: '' },
      contactPhone:{ type: String,  default: '' },
      submittedAt: { type: Date,    default: null },
    },
  },

  // ── Company-wide Office Timing ─────────────────────────────────────────────
  // Default office hours for this company — applied to all users who do not
  // have their own per-user timing configured.
  officeTiming: {
    enabled:   { type: Boolean, default: false },
    startTime: { type: String, default: '09:00' },
    endTime:   { type: String, default: '18:00' },
    overrides: {           // per-day overrides, keys "0"–"6" (Sun=0)
      type: Map,
      of: dayTimingSchema,
      default: {},
    },
  },
}, { timestamps: true });

module.exports = mongoose.model('Company', companySchema);
