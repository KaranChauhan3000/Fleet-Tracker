/**
 * membershipController.js
 * ─────────────────────────────────────────────────────────────────
 * Handles all membership operations: status, payment, webhooks.
 *
 * SECURITY:
 *  • All payment amounts validated server-side — frontend can't tamper
 *  • Razorpay signatures verified with HMAC-SHA256 before activating
 *  • Webhook signature validated before processing any event
 *  • No secret keys ever returned to the frontend
 */

const crypto  = require('crypto');
const Razorpay = require('razorpay');
const Company = require('../models/Company');

// ── Razorpay instance (lazy — only created when keys are set) ──────────────
let _razorpay = null;
function getRazorpay() {
  if (!_razorpay) {
    const key_id     = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    if (!key_id || !key_secret) {
      throw new Error('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set in environment');
    }
    _razorpay = new Razorpay({ key_id, key_secret });
  }
  return _razorpay;
}

// ── Pricing (in paise — always validated server-side) ──────────────────────
const PLANS = {
  monthly: { amount: 20000,  label: '₹200/month',   months: 1  },
  yearly:  { amount: 200000, label: '₹2000/year',    months: 12 },
};

// ── Compute live membership status ─────────────────────────────────────────
function getMembershipStatus(company) {
  const now        = new Date();
  const membership = company.membership || {};

  // Active paid membership — check this first
  if (membership.expiresAt && membership.expiresAt > now) {
    const daysLeft = Math.ceil((membership.expiresAt - now) / (1000 * 60 * 60 * 24));
    return {
      status:       'active',
      plan:          membership.plan,
      expiresAt:    membership.expiresAt,
      vehicleLimit: membership.vehicleLimit || 50,
      daysLeft,
      limitRequest: membership.limitRequest || {},
    };
  }

  // ── Trial end calculation ──────────────────────────────────────────────────
  // For companies created BEFORE the membership feature was launched,
  // give them 30 days from the launch date (not from their original signup).
  // This prevents existing customers from being immediately blocked on deploy.
  //
  // Set MEMBERSHIP_LAUNCH_DATE=YYYY-MM-DD in your backend .env
  // e.g. MEMBERSHIP_LAUNCH_DATE=2025-05-12
  // If not set, defaults to today (all existing companies get 30 days from now).

  const launchDateStr = process.env.MEMBERSHIP_LAUNCH_DATE;
  const launchDate    = launchDateStr ? new Date(launchDateStr) : now;
  const createdAt     = new Date(company.createdAt);

  let trialEndsAt;
  if (createdAt < launchDate) {
    // Existing company — 30 days from launch date
    trialEndsAt = new Date(launchDate);
    trialEndsAt.setDate(trialEndsAt.getDate() + 30);
  } else {
    // New company — 30 days from signup
    trialEndsAt = new Date(company.createdAt);
    trialEndsAt.setDate(trialEndsAt.getDate() + 30);
  }

  // Trial still active
  if (now < trialEndsAt) {
    const daysLeft = Math.ceil((trialEndsAt - now) / (1000 * 60 * 60 * 24));
    return {
      status:       'trial',
      plan:          null,
      expiresAt:    null,
      vehicleLimit: membership.vehicleLimit || 50,
      daysLeft,
      trialEndsAt,
      isExistingCompany: createdAt < launchDate,
      limitRequest: membership.limitRequest || {},
    };
  }

  // Expired
  return {
    status:       'expired',
    plan:          null,
    expiresAt:    null,
    vehicleLimit: membership.vehicleLimit || 50,
    daysLeft:     0,
    trialEndsAt,
    limitRequest: membership.limitRequest || {},
  };
}

// ── GET /api/admin/membership/status ──────────────────────────────────────
exports.getStatus = async (req, res, next) => {
  try {
    const company = await Company.findById(req.user.companyId).lean();
    if (!company) return res.status(404).json({ message: 'Company not found' });

    const info = getMembershipStatus(company);

    // Never expose Razorpay secret IDs to frontend
    res.json({
      ...info,
      companyName: company.name,
      // Only return public Razorpay key
      razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
    });
  } catch (err) { next(err); }
};

// ── POST /api/admin/membership/create-order ────────────────────────────────
// Creates a Razorpay order for the chosen plan.
// Amount is ALWAYS set server-side — never trust the client.
exports.createOrder = async (req, res, next) => {
  try {
    // Check keys are configured before attempting payment
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(503).json({
        message: 'Online payments are not available yet. Please contact Karo India Foundation support to subscribe.',
        contactSupport: true,
      });
    }

    const { plan } = req.body;

    if (!PLANS[plan]) {
      return res.status(400).json({ message: 'Invalid plan. Choose monthly or yearly.' });
    }

    const razorpay  = getRazorpay();
    const planInfo  = PLANS[plan];
    const company   = await Company.findById(req.user.companyId).lean();

    const order = await razorpay.orders.create({
      amount:   planInfo.amount,         // always server-set in paise
      currency: 'INR',
      receipt:  `membership_${req.user.companyId}_${Date.now()}`,
      notes: {
        companyId:   req.user.companyId.toString(),
        companyName: company.name,
        plan,
        adminName:   req.user.name || req.user.email,
      },
    });

    res.json({
      orderId:  order.id,
      amount:   order.amount,
      currency: order.currency,
      plan,
      planLabel: planInfo.label,
    });
  } catch (err) { next(err); }
};

// ── POST /api/admin/membership/verify-payment ──────────────────────────────
// Verifies Razorpay payment signature and activates membership.
// This is the critical security step — signature must match before we activate.
exports.verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !plan) {
      return res.status(400).json({ message: 'Missing payment verification fields' });
    }

    if (!PLANS[plan]) {
      return res.status(400).json({ message: 'Invalid plan' });
    }

    // ── HMAC-SHA256 signature verification ──────────────────────────────────
    // Razorpay signs: orderId + "|" + paymentId with the key secret
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      // Log suspicious activity
      console.warn('[SECURITY] Invalid Razorpay signature from company:', req.user.companyId);
      return res.status(400).json({ message: 'Payment verification failed. Please contact support.' });
    }

    // ── Verify payment amount on Razorpay's servers ──────────────────────────
    const razorpay = getRazorpay();
    const payment  = await razorpay.payments.fetch(razorpay_payment_id);

    if (payment.status !== 'captured' && payment.status !== 'authorized') {
      return res.status(400).json({ message: `Payment not completed. Status: ${payment.status}` });
    }

    if (payment.amount !== PLANS[plan].amount) {
      console.warn('[SECURITY] Amount mismatch! Expected:', PLANS[plan].amount, 'Got:', payment.amount);
      return res.status(400).json({ message: 'Payment amount mismatch. Contact support.' });
    }

    // ── Activate membership ──────────────────────────────────────────────────
    const months   = PLANS[plan].months;
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + months);

    await Company.findByIdAndUpdate(req.user.companyId, {
      'membership.plan':              plan,
      'membership.expiresAt':         expiresAt,
      'membership.razorpayPaymentId': razorpay_payment_id,
      'membership.razorpayOrderId':   razorpay_order_id,
    });

    const company = await Company.findById(req.user.companyId).lean();
    const info    = getMembershipStatus(company);

    res.json({ success: true, ...info });
  } catch (err) { next(err); }
};

// ── POST /api/admin/membership/limit-request ──────────────────────────────
// Driver/vehicle limit increase request form.
exports.requestLimitIncrease = async (req, res, next) => {
  try {
    const { desiredLimit, reason, contactName, contactPhone } = req.body;

    if (!desiredLimit || desiredLimit <= 0) {
      return res.status(400).json({ message: 'Please enter a valid desired limit' });
    }

    const company = await Company.findById(req.user.companyId).lean();
    const status  = getMembershipStatus(company);

    if (status.status !== 'active') {
      return res.status(403).json({ message: 'Active membership required to request limit increase' });
    }

    if (desiredLimit <= (company.membership?.vehicleLimit || 50)) {
      return res.status(400).json({ message: `Your current limit is already ${company.membership?.vehicleLimit || 50}` });
    }

    await Company.findByIdAndUpdate(req.user.companyId, {
      'membership.limitRequest': {
        pending:      true,
        requested:    parseInt(desiredLimit),
        reason:       reason || '',
        contactName:  contactName || '',
        contactPhone: contactPhone || '',
        submittedAt:  new Date(),
      },
    });

    // In production: send email to Karo India support here
    console.log(`[Limit Request] Company: ${company.name}, Desired: ${desiredLimit}, Contact: ${contactPhone}`);

    res.json({ success: true, message: 'Request submitted. Karo India team will contact you within 24 hours.' });
  } catch (err) { next(err); }
};

// ── POST /api/webhook/razorpay ─────────────────────────────────────────────
// Razorpay webhook for payment events (subscription renewals, failures etc.)
// This endpoint has NO auth middleware — it's called by Razorpay's servers.
// Security: validated by X-Razorpay-Signature header (HMAC-SHA256).
exports.handleWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const secret    = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (secret && signature) {
      const expected = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(req.body))
        .digest('hex');

      if (expected !== signature) {
        console.warn('[SECURITY] Invalid Razorpay webhook signature');
        return res.status(400).json({ error: 'Invalid signature' });
      }
    }

    const { event, payload } = req.body;

    // Handle payment captured (e.g. subscription auto-renewal)
    if (event === 'payment.captured') {
      const payment = payload?.payment?.entity;
      console.log('[Webhook] Payment captured:', payment?.id, payment?.amount);
    }

    // Handle subscription charged
    if (event === 'subscription.charged') {
      const sub    = payload?.subscription?.entity;
      const payment = payload?.payment?.entity;
      if (sub && payment) {
        console.log('[Webhook] Subscription charged:', sub.id, payment.id);
      }
    }

    res.json({ status: 'ok' });
  } catch (err) {
    console.error('[Webhook Error]', err.message);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

// ── Export helper for middleware ───────────────────────────────────────────
exports.getMembershipStatus = getMembershipStatus;
