const express = require('express');
const { body } = require('express-validator');
const { protect, superAdminOnly } = require('../middleware/auth');
const { validate } = require('../middleware/errorHandler');
const ctrl = require('../controllers/superadminController');

const router = express.Router();
router.use(protect, superAdminOnly);

// ── Dashboard ─────────────────────────────────────────────────────
router.get('/stats',        ctrl.getStats);
router.get('/otp-requests', ctrl.getOtpRequests);

// ── Companies ─────────────────────────────────────────────────────
router.get('/companies',     ctrl.listCompanies);
router.post('/companies',
  [body('name').trim().notEmpty(), body('slug').trim().notEmpty().matches(/^[a-z0-9-]+$/)],
  validate,
  ctrl.createCompany
);
router.put('/companies/:id',    ctrl.updateCompany);
router.delete('/companies/:id', ctrl.deleteCompany);

// ── Admins ────────────────────────────────────────────────────────
router.get('/admins',     ctrl.listAdmins);
router.post('/admins',
  [body('name').trim().notEmpty(), body('email').isEmail(), body('phone').trim().notEmpty(), body('companyId').notEmpty()],
  validate,
  ctrl.createAdmin
);
router.put('/admins/:id',    ctrl.updateAdmin);
router.delete('/admins/:id', ctrl.deleteAdmin);

// ── Users ─────────────────────────────────────────────────────────
router.get('/users',     ctrl.listUsers);
router.post('/users',
  [body('name').trim().notEmpty(), body('employeeId').trim().notEmpty(), body('phone').trim().notEmpty(), body('companyId').notEmpty()],
  validate,
  ctrl.createUser
);
router.put('/users/:id',    ctrl.updateUser);
router.delete('/users/:id', ctrl.deleteUser);

// ── Users sub-resources ───────────────────────────────────────────
router.get('/users/:id/fuel-logs', ctrl.getUserFuelLogs);

// ── Vehicles ──────────────────────────────────────────────────────
router.get('/vehicles',     ctrl.listVehicles);
router.post('/vehicles',
  [body('plateNumber').trim().notEmpty(), body('make').trim().notEmpty(), body('model').trim().notEmpty(), body('year').isInt({ min: 1990, max: 2050 }), body('companyId').notEmpty()],
  validate,
  ctrl.createVehicle
);
router.put('/vehicles/:id',    ctrl.updateVehicle);
router.delete('/vehicles/:id', ctrl.deleteVehicle);

// ── Vehicle sub-resources ─────────────────────────────────────────
router.get('/vehicles/:id/fuel-logs', ctrl.getVehicleFuelLogs);

// ── Fuel Logs (read-only) ─────────────────────────────────────────
router.get('/fuel-logs', ctrl.listFuelLogs);

// ── Reports ───────────────────────────────────────────────────────
router.get('/reports/monthly-comparison', ctrl.monthlyComparison);
router.get('/reports/summary',            ctrl.reportSummary);

// ── Analytics ─────────────────────────────────────────────────────
router.get('/analytics/overview',          ctrl.analyticsOverview);
router.get('/analytics/registrations',     ctrl.registrationTimeSeries);
router.get('/analytics/membership',        ctrl.membershipAnalytics);
router.get('/analytics/vehicle-breakdown', ctrl.vehicleBreakdown);

// ── Memberships ───────────────────────────────────────────────────
router.get('/memberships',                  ctrl.listMemberships);
router.put('/companies/:id/membership',     ctrl.updateMembership);
router.post('/companies/:id/approve-limit', ctrl.approveLimitRequest);
router.post('/companies/:id/reject-limit',  ctrl.rejectLimitRequest);

// ── Activity Log ──────────────────────────────────────────────────
router.get('/activity-log', ctrl.activityLog);

module.exports = router;
