const mongoose = require('mongoose');

const challanSchema = new mongoose.Schema({
  vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  driverId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  challanNo: { type: String, trim: true, default: '' },
  offence:   { type: String, required: true, trim: true },
  amount:    { type: Number, required: true, min: 0 },
  location:  { type: String, trim: true, default: '' },
  issuedAt:  { type: Date, default: Date.now },
  dueDate:   { type: Date, default: null },
  status:    { type: String, enum: ['unpaid', 'paid', 'disputed'], default: 'unpaid' },
  notes:     { type: String, trim: true, default: '' },
}, { timestamps: true });

challanSchema.index({ vehicleId: 1, issuedAt: -1 });
challanSchema.index({ companyId: 1, status: 1 });
challanSchema.index({ companyId: 1, issuedAt: -1 });

module.exports = mongoose.model('Challan', challanSchema);
