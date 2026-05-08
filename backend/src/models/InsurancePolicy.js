const mongoose = require('mongoose');

const insurancePolicySchema = new mongoose.Schema({
  vehicleId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
  companyId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  policyNumber:   { type: String, trim: true, default: '' },
  provider:       { type: String, trim: true, required: true },
  coverageType:   { type: String, enum: ['Comprehensive', 'Third Party', 'Own Damage', 'Other'], default: 'Comprehensive' },
  startDate:      { type: Date, required: true },
  expiryDate:     { type: Date, required: true },
  premiumAmount:  { type: Number, required: true, min: 0 },
  insuredValue:   { type: Number, default: null },   // IDV
  notes:          { type: String, trim: true, default: '' },
  isActive:       { type: Boolean, default: true },
}, { timestamps: true });

insurancePolicySchema.index({ vehicleId: 1 });
insurancePolicySchema.index({ companyId: 1 });

module.exports = mongoose.model('InsurancePolicy', insurancePolicySchema);
