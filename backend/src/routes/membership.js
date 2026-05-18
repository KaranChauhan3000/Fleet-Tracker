const express    = require('express');
const rateLimit  = require('express-rate-limit');
const { protect, adminOnly } = require('../middleware/auth');
const membershipCtrl = require('../controllers/membershipController');

const router = express.Router();

// Stricter rate limiting on payment endpoints
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 20,
  message: { message: 'Too many payment requests. Please wait.' },
});

// All membership routes require admin auth
router.use(protect, adminOnly);

router.get('/status',           membershipCtrl.getStatus);
router.post('/create-order',    paymentLimiter, membershipCtrl.createOrder);
router.post('/verify-payment',  paymentLimiter, membershipCtrl.verifyPayment);
router.post('/limit-request',   membershipCtrl.requestLimitIncrease);

module.exports = router;
