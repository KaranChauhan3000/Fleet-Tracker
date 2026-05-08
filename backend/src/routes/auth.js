/**
 * auth.js (routes)
 * ─────────────────
 * Password-based auth — no OTP, no SMS.
 * Password = last 4 digits of mobile number.
 */
const express = require('express');
const { body } = require('express-validator');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/errorHandler');
const ctrl = require('../controllers/authController');

const router = express.Router();

// ── Admin Registration ────────────────────────────────────────────────────────
router.post('/register',
  [
    body('companyName').trim().notEmpty().withMessage('Company name is required'),
    body('name').trim().notEmpty().withMessage('Your name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('phone').trim().notEmpty().withMessage('Phone number is required'),
  ],
  validate,
  ctrl.register
);

// ── Admin Login ───────────────────────────────────────────────────────────────
router.post('/admin/login',
  [
    body('phone').trim().notEmpty().withMessage('Phone number is required'),
    body('password').trim().isLength({ min: 4, max: 4 }).withMessage('Password must be 4 digits'),
  ],
  validate,
  ctrl.adminLogin
);

// ── User Login ────────────────────────────────────────────────────────────────
router.post('/user/login',
  [
    body('employeeId').trim().notEmpty().withMessage('Employee ID is required'),
    body('password').trim().isLength({ min: 4, max: 4 }).withMessage('Password must be 4 digits'),
  ],
  validate,
  ctrl.userLogin
);

// ── Shared ────────────────────────────────────────────────────────────────────
router.post('/logout', protect, ctrl.logout);
router.get('/me',      protect, ctrl.me);

module.exports = router;
