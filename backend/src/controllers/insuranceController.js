const InsurancePolicy = require('../models/InsurancePolicy');
const Vehicle         = require('../models/Vehicle');

// ── Helper: sync vehicle.insuranceExpiry from the latest active policy ───────
async function syncVehicleInsuranceExpiry(vehicleId) {
  // Find the most recent active policy by expiryDate desc
  const latest = await InsurancePolicy.findOne(
    { vehicleId, isActive: true },
    { expiryDate: 1 }
  ).sort({ expiryDate: -1 });

  await Vehicle.findByIdAndUpdate(vehicleId, {
    insuranceExpiry: latest ? latest.expiryDate : null,
  });
}

// ── List policies ─────────────────────────────────────────────────────────────
exports.listPolicies = async (req, res, next) => {
  try {
    const { vehicleId } = req.query;
    const filter = { companyId: req.user.companyId };
    if (vehicleId) filter.vehicleId = vehicleId;

    const policies = await InsurancePolicy.find(filter)
      .populate('vehicleId', 'plateNumber make model year')
      .sort({ expiryDate: -1 })
      .lean();

    res.json({ data: policies.map(p => ({ ...p, id: p._id })) });
  } catch (err) { next(err); }
};

// ── Create policy ─────────────────────────────────────────────────────────────
exports.createPolicy = async (req, res, next) => {
  try {
    const { vehicleId, provider, policyNumber, coverageType, startDate, expiryDate, premiumAmount, insuredValue, notes } = req.body;

    // Verify vehicle belongs to this company
    const vehicle = await Vehicle.findOne({ _id: vehicleId, companyId: req.user.companyId });
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });

    const policy = await InsurancePolicy.create({
      vehicleId,
      companyId: req.user.companyId,
      provider,
      policyNumber: policyNumber || '',
      coverageType: coverageType || 'Comprehensive',
      startDate: new Date(startDate),
      expiryDate: new Date(expiryDate),
      premiumAmount: parseFloat(premiumAmount),
      insuredValue: insuredValue ? parseFloat(insuredValue) : null,
      notes: notes || '',
      isActive: true,
    });

    // Sync vehicle insuranceExpiry
    await syncVehicleInsuranceExpiry(vehicleId);

    const populated = await InsurancePolicy.findById(policy._id)
      .populate('vehicleId', 'plateNumber make model year')
      .lean();

    res.status(201).json({ ...populated, id: populated._id });
  } catch (err) { next(err); }
};

// ── Update policy ─────────────────────────────────────────────────────────────
exports.updatePolicy = async (req, res, next) => {
  try {
    const policy = await InsurancePolicy.findOne({ _id: req.params.id, companyId: req.user.companyId });
    if (!policy) return res.status(404).json({ message: 'Policy not found' });

    const { provider, policyNumber, coverageType, startDate, expiryDate, premiumAmount, insuredValue, notes, isActive } = req.body;

    if (provider !== undefined)       policy.provider       = provider;
    if (policyNumber !== undefined)   policy.policyNumber   = policyNumber;
    if (coverageType !== undefined)   policy.coverageType   = coverageType;
    if (startDate !== undefined)      policy.startDate      = new Date(startDate);
    if (expiryDate !== undefined)     policy.expiryDate     = new Date(expiryDate);
    if (premiumAmount !== undefined)  policy.premiumAmount  = parseFloat(premiumAmount);
    if (insuredValue !== undefined)   policy.insuredValue   = insuredValue ? parseFloat(insuredValue) : null;
    if (notes !== undefined)          policy.notes          = notes;
    if (isActive !== undefined)       policy.isActive       = isActive;

    await policy.save();

    // Sync vehicle insuranceExpiry
    await syncVehicleInsuranceExpiry(policy.vehicleId);

    const populated = await InsurancePolicy.findById(policy._id)
      .populate('vehicleId', 'plateNumber make model year')
      .lean();

    res.json({ ...populated, id: populated._id });
  } catch (err) { next(err); }
};

// ── Delete policy ─────────────────────────────────────────────────────────────
exports.deletePolicy = async (req, res, next) => {
  try {
    const policy = await InsurancePolicy.findOne({ _id: req.params.id, companyId: req.user.companyId });
    if (!policy) return res.status(404).json({ message: 'Policy not found' });

    const vehicleId = policy.vehicleId;
    await policy.deleteOne();

    // Sync vehicle insuranceExpiry after deletion
    await syncVehicleInsuranceExpiry(vehicleId);

    res.json({ message: 'Policy deleted' });
  } catch (err) { next(err); }
};
