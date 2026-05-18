const mongoose = require('mongoose');

const fuelLogSchema = new mongoose.Schema({
  vehicleId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle',  required: true },
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User',     required: true },
  companyId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Company',  required: true },
  litres:       { type: Number, required: true, min: 0 },
  costPerLitre: { type: Number, required: true, min: 0 },
  totalCost:    { type: Number, required: true },
  odometer:     { type: Number, required: true, min: 0 },
  kmDriven:     { type: Number, default: null },
  efficiency:   { type: Number, default: null },
  fuelType:     { type: String, enum: ['Diesel', 'Petrol', 'CNG', 'Electric', 'Other'], default: 'Diesel' },
  fuelStation:  { type: String, trim: true, default: '' },
  notes:        { type: String, trim: true, default: '' },
  status:       { type: String, enum: ['unpaid', 'paid', 'disputed'], default: 'unpaid' },
  filledAt:     { type: Date, default: Date.now },

  // ── Reimbursement proof fields ────────────────────────────────────────────────
  paymentMethod:    { type: String, enum: ['upi', 'bank_transfer', 'cash', null], default: null },
  transactionId:    { type: String, trim: true, default: '' },
  paymentNote:      { type: String, trim: true, default: '' },
  paymentProofUrl:  { type: String, trim: true, default: '' },  // Cloudinary URL
  paymentProofPublicId: { type: String, trim: true, default: '' }, // for deletion
  paidAt:           { type: Date, default: null },
  paidByAdminName:  { type: String, trim: true, default: '' },
}, { timestamps: true });

fuelLogSchema.index({ vehicleId: 1, filledAt: -1 });
fuelLogSchema.index({ userId:    1, filledAt: -1 });
fuelLogSchema.index({ companyId: 1, filledAt: -1 });

module.exports = mongoose.model('FuelLog', fuelLogSchema);
