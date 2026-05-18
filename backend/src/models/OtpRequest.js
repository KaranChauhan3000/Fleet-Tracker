const mongoose = require('mongoose');

const otpRequestSchema = new mongoose.Schema({
  role:        { type: String, enum: ['admin', 'user', 'pending-registration'], required: true },
  entityId:    { type: mongoose.Schema.Types.ObjectId, default: null },
  entityName:  { type: String, required: true },
  companyId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Company', default: null },
  companyName: { type: String, required: true },
  phone:       { type: String, required: true },
  otpCode:     { type: String, required: true },
  isUsed:      { type: Boolean, default: false },
  usedAt:      { type: Date, default: null },
  expiresAt:   { type: Date, required: true },
  // Stores pending registration data BEFORE OTP verification — no DB records created yet
  pendingData: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true });

otpRequestSchema.index({ createdAt: 1 }, { expireAfterSeconds: 600 });

module.exports = mongoose.model('OtpRequest', otpRequestSchema);
