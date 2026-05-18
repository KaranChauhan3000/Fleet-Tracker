const mongoose = require('mongoose');

const serviceLogSchema = new mongoose.Schema({
  vehicleId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle',  required: true },
  userId:          { type: mongoose.Schema.Types.ObjectId, ref: 'User',     required: true },
  companyId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Company',  required: true },
  serviceType:     { type: String, required: true, trim: true },
  description:     { type: String, trim: true, default: '' },
  currentKm:       { type: Number, required: true, min: 0 },
  cost:            { type: Number, default: null },
  vendor:          { type: String, trim: true, default: '' },
  nextServiceDate: { type: Date, default: null },
  nextServiceKm:   { type: Number, default: null },
  notes:           { type: String, trim: true, default: '' },
  servicedAt:      { type: Date, default: Date.now },
}, { timestamps: true });

serviceLogSchema.index({ vehicleId: 1, servicedAt: -1 });
serviceLogSchema.index({ userId:    1, servicedAt: -1 });
serviceLogSchema.index({ companyId: 1, servicedAt: -1 });
serviceLogSchema.index({ companyId: 1, nextServiceDate: 1 });

module.exports = mongoose.model('ServiceLog', serviceLogSchema);
