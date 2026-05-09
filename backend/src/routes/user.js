const express = require('express');
const { body } = require('express-validator');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/errorHandler');
const ctrl = require('../controllers/userAppController');
const { upload } = require('../utils/upload');

const router = express.Router();
router.use(protect);

router.get('/profile',        ctrl.getProfile);
router.get('/vehicles',       ctrl.getVehicles);
router.get('/my-documents',   ctrl.getMyDocuments);
router.post('/my-documents',  upload.single('file'), ctrl.uploadMyDocument);
router.delete('/my-documents/:docId', ctrl.deleteMyDocument);
router.get('/vehicle-documents', ctrl.getVehicleDocuments);

router.get('/fuel-logs',  ctrl.listFuelLogs);
router.post('/fuel-logs',
  [
    body('vehicleId').notEmpty().withMessage('Vehicle is required'),
    body('litres').isFloat({ min: 0.1 }).withMessage('Litres must be > 0'),
    body('costPerLitre').isFloat({ min: 0.01 }).withMessage('Cost per litre must be > 0'),
    body('odometer').isFloat({ min: 0 }).withMessage('Odometer must be >= 0'),
  ],
  validate,
  ctrl.createFuelLog
);

router.get('/service-logs',    ctrl.listServiceLogs);
router.post('/service-logs',   ctrl.createServiceLog);
router.get('/service-alerts',  ctrl.getServiceAlerts);

module.exports = router;
