const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  plateNumber:     { type: String, required: true, uppercase: true, trim: true },
  make:            { type: String, required: true, trim: true },
  model:           { type: String, required: true, trim: true },
  year:            { type: Number, required: true },
  companyId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  assignedUserId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  status:          { type: String, enum: ['active', 'inactive', 'maintenance'], default: 'active' },
  fuelType:        { type: String, enum: ['Diesel', 'Petrol', 'CNG', 'Electric', 'Other'], default: 'Diesel' },
  pollutionExpiry:    { type: Date,   default: null },
  insuranceExpiry:    { type: Date,   default: null },
  fastagId:            { type: String, trim: true, default: '' },
  fastagBalance:       { type: Number, default: null },
  fastagStatus:        { type: String, default: null },
  fastagLastRecharge:  { type: String, default: null },
  fastagCardValidity:  { type: String, default: null },
  fastagLastUpdated:   { type: Date,   default: null },
  documents: [{
    docType:    { type: String, enum: ['rc', 'puc', 'insurance', 'other'], default: 'other' },
    label:      { type: String, default: '' },
    url:        { type: String, required: true },
    publicId:   { type: String, required: true },
    fileType:   { type: String, enum: ['image', 'pdf'], default: 'image' },
    uploadedAt: { type: Date, default: Date.now },
  }],
}, { timestamps: true });

vehicleSchema.index({ plateNumber: 1, companyId: 1 }, { unique: true });

module.exports = mongoose.model('Vehicle', vehicleSchema);
