const express = require('express');
const { body } = require('express-validator');
const { protect, adminOnly } = require('../middleware/auth');
const { validate } = require('../middleware/errorHandler');
const { upload } = require('../utils/upload');

const userCtrl       = require('../controllers/userController');
const subAdminCtrl   = require('../controllers/subAdminController');
const vehicleCtrl    = require('../controllers/vehicleController');
const fuelLogCtrl    = require('../controllers/fuelLogController');
const challanCtrl    = require('../controllers/challanController');
const serviceCtrl    = require('../controllers/serviceLogController');
const documentCtrl   = require('../controllers/documentController');
const financeCtrl    = require('../controllers/financeController');
const dashboardCtrl  = require('../controllers/dashboardController');
const expenseCtrl    = require('../controllers/expenseBreakdownController');
const insuranceCtrl  = require('../controllers/insuranceController');

const router = express.Router();
router.use(protect, adminOnly);

// ── Sub-Admins (admin creating admins within same company) ───────────────────
router.get('/admins',     subAdminCtrl.listSubAdmins);
router.post('/admins',
  [body('name').trim().notEmpty(), body('email').isEmail(), body('phone').trim().notEmpty()],
  validate,
  subAdminCtrl.createSubAdmin
);
router.put('/admins/:id',    subAdminCtrl.updateSubAdmin);
router.delete('/admins/:id', subAdminCtrl.deleteSubAdmin);

// ── Dashboard ─────────────────────────────────────────────────────
router.get('/stats', dashboardCtrl.getStats);
router.get('/expense-breakdown', expenseCtrl.getExpenseBreakdown);

// ── Reports ───────────────────────────────────────────────────────
router.get('/reports/monthly-comparison', dashboardCtrl.monthlyComparison);
router.get('/reports/summary',            dashboardCtrl.reportSummary);

// ── Users ─────────────────────────────────────────────────────────
router.get('/users',     userCtrl.listUsers);
router.post('/users',
  [body('name').trim().notEmpty(), body('employeeId').trim().notEmpty(), body('phone').trim().notEmpty()],
  validate,
  userCtrl.createUser
);
router.get('/users/:id',    userCtrl.getUser);
router.put('/users/:id',    userCtrl.updateUser);
router.delete('/users/:id', userCtrl.deleteUser);

// ── User sub-resources ────────────────────────────────────────────
router.get('/users/:id/fuel-logs',               fuelLogCtrl.getFuelLogsByUser);
router.get('/users/:id/documents',               documentCtrl.getUserDocuments);
router.post('/users/:id/documents',              upload.single('file'), documentCtrl.uploadUserDocument);
router.delete('/users/:id/documents/:docId',     documentCtrl.deleteUserDocument);

// ── Vehicles ──────────────────────────────────────────────────────
router.get('/vehicles',     vehicleCtrl.listVehicles);
router.post('/vehicles',
  [body('plateNumber').trim().notEmpty(), body('make').trim().notEmpty(), body('model').trim().notEmpty(), body('year').isInt({ min: 1990, max: 2050 })],
  validate,
  vehicleCtrl.createVehicle
);
router.put('/vehicles/:id',    vehicleCtrl.updateVehicle);
router.delete('/vehicles/:id', vehicleCtrl.deleteVehicle);

// ── Vehicle sub-resources ─────────────────────────────────────────
router.patch('/vehicles/:id/fastag',             vehicleCtrl.refreshFastag);
router.get('/vehicles/:id/analytics',            vehicleCtrl.getVehicleAnalytics);
router.get('/vehicles/:id/fuel-logs',            fuelLogCtrl.getFuelLogsByVehicle);
router.get('/vehicles/:id/documents',            documentCtrl.getVehicleDocuments);
router.post('/vehicles/:id/documents',           upload.single('file'), documentCtrl.uploadVehicleDocument);
router.delete('/vehicles/:id/documents/:docId',  documentCtrl.deleteVehicleDocument);

// ── Fuel Logs ─────────────────────────────────────────────────────
router.get('/fuel-logs',     fuelLogCtrl.listFuelLogs);
router.post('/fuel-logs',
  [body('vehicleId').notEmpty(), body('userId').notEmpty(), body('litres').isFloat({ min: 0.1 }), body('costPerLitre').isFloat({ min: 0.01 }), body('odometer').isFloat({ min: 0 })],
  validate,
  fuelLogCtrl.createFuelLog
);
router.put('/fuel-logs/:id',    fuelLogCtrl.updateFuelLog);
router.delete('/fuel-logs/:id', fuelLogCtrl.deleteFuelLog);

// ── Recalc all (maintenance endpoint) ────────────────────────────
router.post('/recalc-all', fuelLogCtrl.recalcAll);

// ── Challans ──────────────────────────────────────────────────────
router.post('/challans/parse',      challanCtrl.parseChallan);
router.get('/challans/summary',     challanCtrl.getChallanSummary);
router.get('/challans',             challanCtrl.listChallans);
router.post('/challans',            challanCtrl.createChallan);
router.patch('/challans/:id',       challanCtrl.updateChallan);
router.delete('/challans/:id',      challanCtrl.deleteChallan);

// ── Service Logs ──────────────────────────────────────────────────
router.get('/service-alerts',       serviceCtrl.getServiceAlerts);
router.get('/service-logs',         serviceCtrl.listServiceLogs);
router.post('/service-logs',        serviceCtrl.createServiceLog);
router.put('/service-logs/:id',     serviceCtrl.updateServiceLog);
router.delete('/service-logs/:id',  serviceCtrl.deleteServiceLog);

// ── Finance / EMI ─────────────────────────────────────────────────
router.get('/finance',         financeCtrl.listFinance);
router.post('/finance',
  [body('vehicleId').notEmpty(), body('lenderName').trim().notEmpty(), body('loanAmount').isFloat({ min: 1 }), body('emiAmount').isFloat({ min: 1 }), body('emiDay').isInt({ min: 1, max: 31 }), body('startDate').isISO8601(), body('endDate').isISO8601(), body('totalEmis').isInt({ min: 1 })],
  validate,
  financeCtrl.createFinance
);
router.patch('/finance/:id',   financeCtrl.updateFinance);
router.delete('/finance/:id',  financeCtrl.deleteFinance);

// ── Insurance Policies ────────────────────────────────────────────
router.get('/insurance',        insuranceCtrl.listPolicies);
router.post('/insurance',
  [body('vehicleId').notEmpty(), body('provider').trim().notEmpty(), body('startDate').isISO8601(), body('expiryDate').isISO8601(), body('premiumAmount').isFloat({ min: 0 })],
  validate,
  insuranceCtrl.createPolicy
);
router.put('/insurance/:id',    insuranceCtrl.updatePolicy);
router.delete('/insurance/:id', insuranceCtrl.deletePolicy);

module.exports = router;