const mongoose = require('mongoose');
const { Vehicle, User } = require('../models');
const { uploadToCloudinary } = require('../utils/upload');
const cloudinary = require('../config/cloudinary');

const toOid = id => new mongoose.Types.ObjectId(String(id));

// ══════════════════════════════════════════════════════════════════
// Vehicle Documents
// ══════════════════════════════════════════════════════════════════

// GET /api/admin/vehicles/:id/documents
exports.getVehicleDocuments = async (req, res, next) => {
  try {
    const cid = req.user.companyId;
    const vehicle = await Vehicle.findOne({ _id: req.params.id, companyId: toOid(cid) }).select('plateNumber documents');
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });
    res.json({ documents: vehicle.documents || [] });
  } catch (err) { next(err); }
};

// POST /api/admin/vehicles/:id/documents
exports.uploadVehicleDocument = async (req, res, next) => {
  try {
    const cid = req.user.companyId;
    const vehicle = await Vehicle.findOne({ _id: req.params.id, companyId: toOid(cid) });
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const folder = `fleetpro/${cid}/vehicles/${vehicle._id}`;
    const result = await uploadToCloudinary(req.file.buffer, req.file.originalname, folder);

    const doc = {
      docType:  req.body.docType || 'other',
      label:    req.body.label   || req.body.docType || 'Document',
      url:      result.secure_url,
      publicId: result.public_id,
      fileType: result.resource_type === 'image' ? 'image' : 'pdf',
    };

    vehicle.documents = vehicle.documents || [];
    vehicle.documents.push(doc);
    await vehicle.save();

    res.status(201).json({ document: vehicle.documents[vehicle.documents.length - 1] });
  } catch (err) { next(err); }
};

// DELETE /api/admin/vehicles/:id/documents/:docId
exports.deleteVehicleDocument = async (req, res, next) => {
  try {
    const cid = req.user.companyId;
    const vehicle = await Vehicle.findOne({ _id: req.params.id, companyId: toOid(cid) });
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });

    const doc = vehicle.documents?.id(req.params.docId);
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    try { await cloudinary.uploader.destroy(doc.publicId, { resource_type: doc.fileType === 'pdf' ? 'raw' : 'image' }); } catch {}

    vehicle.documents.pull({ _id: req.params.docId });
    await vehicle.save();
    res.json({ success: true });
  } catch (err) { next(err); }
};

// ══════════════════════════════════════════════════════════════════
// User Documents
// ══════════════════════════════════════════════════════════════════

// GET /api/admin/users/:id/documents
exports.getUserDocuments = async (req, res, next) => {
  try {
    const cid = req.user.companyId;
    const user = await User.findOne({ _id: req.params.id, companyId: toOid(cid) }).select('name documents');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ documents: user.documents || [] });
  } catch (err) { next(err); }
};

// POST /api/admin/users/:id/documents
exports.uploadUserDocument = async (req, res, next) => {
  try {
    const cid = req.user.companyId;
    const user = await User.findOne({ _id: req.params.id, companyId: toOid(cid) });
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const folder = `fleetpro/${cid}/users/${user._id}`;
    const result = await uploadToCloudinary(req.file.buffer, req.file.originalname, folder);

    const doc = {
      docType:  req.body.docType || 'other',
      label:    req.body.label   || req.body.docType || 'Document',
      url:      result.secure_url,
      publicId: result.public_id,
      fileType: result.resource_type === 'image' ? 'image' : 'pdf',
    };

    user.documents = user.documents || [];
    user.documents.push(doc);
    await user.save();

    res.status(201).json({ document: user.documents[user.documents.length - 1] });
  } catch (err) { next(err); }
};

// DELETE /api/admin/users/:id/documents/:docId
exports.deleteUserDocument = async (req, res, next) => {
  try {
    const cid = req.user.companyId;
    const user = await User.findOne({ _id: req.params.id, companyId: toOid(cid) });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const doc = user.documents?.id(req.params.docId);
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    try { await cloudinary.uploader.destroy(doc.publicId, { resource_type: doc.fileType === 'pdf' ? 'raw' : 'image' }); } catch {}

    user.documents.pull({ _id: req.params.docId });
    await user.save();
    res.json({ success: true });
  } catch (err) { next(err); }
};
