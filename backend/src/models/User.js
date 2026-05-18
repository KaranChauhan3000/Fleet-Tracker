const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name:               { type: String, required: true, trim: true },
  employeeId:         { type: String, required: true, trim: true },
  phone:              { type: String, required: true, trim: true },
  licenseNumber:      { type: String, trim: true, default: '' },
  companyId:          { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  assignedVehicleId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', default: null },
  assignedVehicleIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' }],
  isActive:           { type: Boolean, default: true },
  fcmToken:           { type: String, default: null }, // Firebase push notification token
  phoneVerified:      { type: Boolean, default: false },
  lastLogin:          { type: Date, default: null },
  familyMembers: [{
    name:    { type: String, required: true, trim: true },
    phone:   { type: String, required: true, trim: true },
    addedAt: { type: Date,   default: Date.now },
  }],
  documents: [{
    docType:    { type: String, enum: ['aadhar', 'license', 'other'], default: 'other' },
    label:      { type: String, default: '' },
    url:        { type: String, required: true },
    publicId:   { type: String, required: true },
    fileType:   { type: String, enum: ['image', 'pdf'], default: 'image' },
    uploadedAt: { type: Date, default: Date.now },
  }],
}, { timestamps: true });

userSchema.index({ employeeId: 1, companyId: 1 }, { unique: true });
userSchema.index({ phone: 1, companyId: 1 }, { unique: true });

module.exports = mongoose.model('User', userSchema);
