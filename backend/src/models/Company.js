const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  name:      { type: String, required: true, trim: true },
  slug:      { type: String, required: true, unique: true, lowercase: true, trim: true },
  isActive:  { type: Boolean, default: true },
  createdBy: { type: String, default: 'self-registered' },
  ownerId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
}, { timestamps: true });

module.exports = mongoose.model('Company', companySchema);
