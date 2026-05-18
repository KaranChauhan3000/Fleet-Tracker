const mongoose = require('mongoose');

const vehicleFinanceSchema = new mongoose.Schema({
  vehicleId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
  companyId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  lenderName:   { type: String, required: true, trim: true },
  loanAmount:   { type: Number, required: true, min: 0 },
  emiAmount:    { type: Number, required: true, min: 0 },
  emiDay:       { type: Number, required: true, min: 1, max: 31 }, // day of month EMI is due
  startDate:    { type: Date, required: true },
  endDate:      { type: Date, required: true },
  totalEmis:    { type: Number, required: true, min: 1 },
  emisPaid:     { type: Number, default: 0, min: 0 },
  emiPayments:  [{ // track each EMI payment with the date it was approved
    paidAt:     { type: Date, default: Date.now },
    amount:     { type: Number },
    status:     { type: String, enum: ['approved', 'disputed'], default: 'approved' },
  }],
  interestRate: { type: Number, default: null }, // annual %
  notes:        { type: String, trim: true, default: '' },
  isActive:     { type: Boolean, default: true },
}, { timestamps: true });

vehicleFinanceSchema.index({ vehicleId: 1 });
vehicleFinanceSchema.index({ companyId: 1, isActive: 1 });

module.exports = mongoose.model('VehicleFinance', vehicleFinanceSchema);