const mongoose = require('mongoose');

const locationLogSchema = new mongoose.Schema({
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true, index: true },
  companyId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  lat:        { type: Number, required: true },
  lng:        { type: Number, required: true },
  accuracy:   { type: Number, default: null },
  address:    { type: String, default: '' },
  battery:    { type: Number, default: null },
  recordedAt: { type: Date,   required: true, index: true },
}, { timestamps: false });

// Compound indexes for fast per-user day queries
locationLogSchema.index({ userId: 1, recordedAt: 1 });
locationLogSchema.index({ companyId: 1, userId: 1, recordedAt: 1 });

// ─── 2-day rolling TTL ───────────────────────────────────────────────────────
// At 1 ping/min during office hours (e.g. 9h window) × 200 users
// = 108,000 docs/day max. Each doc ~220 bytes → ~24 MB/day → ~48 MB for 2 days.
// Well within 512 MB. MongoDB TTL reaper runs every ~60 s.
locationLogSchema.index({ recordedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 2 });

module.exports = mongoose.model('LocationLog', locationLogSchema);
