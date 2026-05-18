const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  email:       { type: String, required: true, trim: true, lowercase: true },
  phone:       { type: String, required: true, trim: true },
  designation: { type: String, trim: true, default: '' },
  companyId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  isActive:    { type: Boolean, default: true },
  createdBy:   { type: String, default: 'superadmin' },
  lastLogin:   { type: Date, default: null },
}, { timestamps: true });

adminSchema.index({ phone: 1, companyId: 1 }, { unique: true });
adminSchema.index({ email: 1 }, { unique: true });

module.exports = mongoose.model('Admin', adminSchema);
