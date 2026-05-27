const mongoose = require('mongoose');

const locationLogSchema = new mongoose.Schema({
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true, index: true },
  companyId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  lat:        { type: Number, required: true },
  lng:        { type: Number, required: true },
  accuracy:   { type: Number, default: null },   // metres, from Geolocation API
  address:    { type: String, default: '' },      // optional reverse-geocoded label
  battery:    { type: Number, default: null },     // 0–100 percentage, null if unavailable
  recordedAt: { type: Date,   required: true, index: true },
}, { timestamps: false });

// Compound index for fast per-user date range queries
locationLogSchema.index({ userId: 1, recordedAt: 1 });
locationLogSchema.index({ companyId: 1, userId: 1, recordedAt: 1 });

// Auto-delete logs older than 90 days (TTL index)
locationLogSchema.index({ recordedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

module.exports = mongoose.model('LocationLog', locationLogSchema);
