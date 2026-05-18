/**
 * notificationService.js
 *
 * Sends push notifications to user devices via Firebase Cloud Messaging (FCM).
 *
 * SETUP REQUIRED:
 * 1. Create a Firebase project at console.firebase.google.com
 * 2. Add Android app with package ID: com.biofleet.tracker
 * 3. Project Settings → Service Accounts → Generate new private key
 * 4. Copy the JSON content into your .env as:
 *    FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":...}
 * 5. npm install firebase-admin  (in backend folder)
 */

let _admin    = null;
let _ready    = false;
let _initErr  = null;

function getAdmin() {
  if (_admin)   return _admin;
  if (_initErr) return null;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    _initErr = 'FIREBASE_SERVICE_ACCOUNT not set — push notifications disabled';
    console.warn('[Notify]', _initErr);
    return null;
  }

  try {
    const admin          = require('firebase-admin');
    const serviceAccount = JSON.parse(raw);

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }

    _admin = admin;
    _ready = true;
    console.log('[Notify] Firebase Admin SDK initialised ✅');
    return _admin;
  } catch (err) {
    _initErr = err.message;
    console.error('[Notify] Firebase init error:', err.message);
    return null;
  }
}

/**
 * sendPush — send a push notification to a single device
 *
 * @param {string} fcmToken   — the device token from User.fcmToken
 * @param {string} title      — notification title
 * @param {string} body       — notification body
 * @param {object} data       — optional key-value data (must be strings)
 */
async function sendPush(fcmToken, title, body, data = {}) {
  if (!fcmToken) return;
  const admin = getAdmin();
  if (!admin)   return;

  // Stringify all data values (FCM requirement)
  const stringData = {};
  for (const [k, v] of Object.entries(data)) {
    stringData[k] = String(v);
  }

  try {
    await admin.messaging().send({
      token: fcmToken,
      notification: { title, body },
      data: stringData,
      android: {
        priority: 'high',
        notification: {
          sound:     'default',
          channelId: 'fleet_pro_alerts',
          icon:      'ic_notification',
          color:     '#F97316',
        },
      },
    });
  } catch (err) {
    // Token expired / unregistered — clear it from DB
    if (
      err.code === 'messaging/registration-token-not-registered' ||
      err.code === 'messaging/invalid-registration-token'
    ) {
      try {
        const User = require('../models/User');
        await User.findOneAndUpdate({ fcmToken }, { fcmToken: null });
      } catch { /* ignore */ }
    } else {
      console.error('[Notify] sendPush error:', err.message);
    }
  }
}

// ── Convenience helpers ───────────────────────────────────────────────────────

async function notifyFuelLogPaid(userId, vehiclePlate, amount, paymentMethod, txnPart = '') {
  const User = require('../models/User');
  const user = await User.findById(userId).select('fcmToken').lean();
  if (!user?.fcmToken) return;
  const methodLabel = paymentMethod === 'upi' ? 'UPI'
    : paymentMethod === 'bank_transfer' ? 'Bank Transfer'
    : paymentMethod === 'cash' ? 'Cash' : '';
  const via = methodLabel ? ` via ${methodLabel}` : '';
  await sendPush(
    user.fcmToken,
    '✅ Reimbursement Confirmed',
    `₹${amount} for ${vehiclePlate} has been reimbursed${via}${txnPart}. Tap to view receipt.`,
    { type: 'fuel_paid', vehiclePlate }
  );
}

async function notifyChallanPaid(userId, vehiclePlate) {
  const User = require('../models/User');
  const user = await User.findById(userId).select('fcmToken').lean();
  if (!user?.fcmToken) return;
  await sendPush(
    user.fcmToken,
    '✅ Challan Paid',
    `Your challan for ${vehiclePlate} has been marked as Paid.`,
    { type: 'challan_paid', vehiclePlate }
  );
}

async function notifyFuelLogDisputed(userId, vehiclePlate) {
  const User = require('../models/User');
  const user = await User.findById(userId).select('fcmToken').lean();
  if (!user?.fcmToken) return;
  await sendPush(
    user.fcmToken,
    '⚠️ Fuel Entry Disputed',
    `Your fuel entry for ${vehiclePlate} has been marked as disputed. Please contact your admin.`,
    { type: 'fuel_disputed', vehiclePlate }
  );
}

module.exports = {
  sendPush,
  notifyFuelLogPaid,
  notifyFuelLogDisputed,
  notifyChallanPaid,
};
