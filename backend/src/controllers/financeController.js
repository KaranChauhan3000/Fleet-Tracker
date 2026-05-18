const mongoose = require('mongoose');
const { VehicleFinance, Vehicle } = require('../models');

const toOid = id => new mongoose.Types.ObjectId(String(id));

// ── GET /api/admin/finance ────────────────────────────────────────
exports.listFinance = async (req, res, next) => {
  try {
    const cid = req.user.companyId;
    const entries = await VehicleFinance.find({ companyId: toOid(cid) })
      .populate('vehicleId', 'plateNumber make model year')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ entries });
  } catch (err) { next(err); }
};

// ── POST /api/admin/finance ───────────────────────────────────────
exports.createFinance = async (req, res, next) => {
  try {
    const cid = req.user.companyId;
    const { vehicleId, lenderName, loanAmount, emiAmount, emiDay, startDate, endDate, totalEmis, emisPaid, interestRate, notes } = req.body;

    const vehicle = await Vehicle.findOne({ _id: vehicleId, companyId: toOid(cid) });
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });

    const entry = await VehicleFinance.create({
      vehicleId, companyId: toOid(cid), lenderName, loanAmount, emiAmount, emiDay,
      startDate: new Date(startDate), endDate: new Date(endDate),
      totalEmis, emisPaid: emisPaid || 0,
      interestRate: interestRate || null, notes: notes || '', isActive: true,
    });

    const populated = await VehicleFinance.findById(entry._id).populate('vehicleId', 'plateNumber make model year').lean();
    res.status(201).json({ entry: populated });
  } catch (err) { next(err); }
};

// ── PATCH /api/admin/finance/:id ─────────────────────────────────
exports.updateFinance = async (req, res, next) => {
  try {
    const cid = req.user.companyId;
    const entry = await VehicleFinance.findOne({ _id: req.params.id, companyId: toOid(cid) });
    if (!entry) return res.status(404).json({ message: 'Finance entry not found' });

    const allowed = ['lenderName', 'loanAmount', 'emiAmount', 'emiDay', 'startDate', 'endDate', 'totalEmis', 'emisPaid', 'interestRate', 'notes', 'isActive'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        if (key === 'startDate' || key === 'endDate') entry[key] = new Date(req.body[key]);
        else entry[key] = req.body[key];
      }
    }

    await entry.save();
    const populated = await VehicleFinance.findById(entry._id).populate('vehicleId', 'plateNumber make model year').lean();
    res.json({ entry: populated });
  } catch (err) { next(err); }
};

// ── POST /api/admin/finance/:id/emi-action ───────────────────────
// action: 'approved' | 'rejected' | 'disputed'
exports.emiAction = async (req, res, next) => {
  try {
    const cid = req.user.companyId;
    const entry = await VehicleFinance.findOne({ _id: req.params.id, companyId: toOid(cid) });
    if (!entry) return res.status(404).json({ message: 'Finance entry not found' });

    const { action } = req.body;
    if (!['approved', 'rejected', 'disputed'].includes(action)) {
      return res.status(400).json({ message: 'action must be approved, rejected, or disputed' });
    }

    if (action === 'approved') {
      const newPaid = Math.min(entry.emisPaid + 1, entry.totalEmis);
      entry.emisPaid = newPaid;
      entry.emiPayments.push({ paidAt: new Date(), amount: entry.emiAmount, status: 'approved' });
      await entry.save();
      const populated = await VehicleFinance.findById(entry._id).populate('vehicleId', 'plateNumber make model year').lean();
      return res.json({ entry: populated, action, message: 'EMI approved and recorded' });
    }

    if (action === 'disputed') {
      entry.emiPayments.push({ paidAt: new Date(), amount: entry.emiAmount, status: 'disputed' });
      await entry.save();
      const populated = await VehicleFinance.findById(entry._id).populate('vehicleId', 'plateNumber make model year').lean();
      return res.json({ entry: populated, action, message: 'EMI marked as disputed' });
    }

    // rejected — do nothing to counts
    return res.json({ action, message: 'EMI payment rejected, no changes made' });
  } catch (err) { next(err); }
};

// ── DELETE /api/admin/finance/:id ────────────────────────────────
exports.deleteFinance = async (req, res, next) => {
  try {
    const cid = req.user.companyId;
    const entry = await VehicleFinance.findOneAndDelete({ _id: req.params.id, companyId: toOid(cid) });
    if (!entry) return res.status(404).json({ message: 'Finance entry not found' });
    res.json({ success: true });
  } catch (err) { next(err); }
};