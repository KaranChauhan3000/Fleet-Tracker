const crypto = require('crypto');
const https  = require('https');

exports.generateOTP = () => crypto.randomInt(100000, 999999).toString();

exports.otpExpiry = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() + 10);
  return d;
};

exports.isOtpValid = (expiry) => expiry && new Date() < new Date(expiry);

// ── Send OTP via 2Factor.in ───────────────────────────────────────────────────
exports.sendOTP = async (phone, otp, type = 'default') => {
  const apiKey = process.env.TWOFACTOR_API_KEY;

  const cleanPhone = phone.replace(/\D/g, '').replace(/^91/, '').slice(-10);

  if (!apiKey) {
    console.warn(`[OTP-${type.toUpperCase()}] No API key. OTP for ${cleanPhone}: ${otp}`);
    return { success: true, dev: true };
  }

  if (!/^\d{10}$/.test(cleanPhone)) {
    console.error(`[OTP] Invalid phone: ${phone}`);
    return { success: false, error: 'Invalid phone number' };
  }

  // 2Factor.in OTP API: POST https://2factor.in/API/V1/{api_key}/SMS/{phone}/{otp}
  const path = `/API/V1/${apiKey}/SMS/${cleanPhone}/${otp}`;

  return new Promise((resolve) => {
    const options = {
      hostname: '2factor.in',
      path,
      method:   'POST',
      headers:  { 'Content-Length': 0 },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.Status === 'Success') {
            console.log(`[OTP-${type.toUpperCase()}] Sent to ${cleanPhone} ✓`);
            resolve({ success: true });
          } else {
            console.error(`[OTP] 2Factor error:`, parsed);
            resolve({ success: false, error: parsed.Details || 'SMS failed' });
          }
        } catch (e) {
          resolve({ success: false, error: 'SMS parse error' });
        }
      });
    });

    req.on('error', (e) => {
      console.error(`[OTP] Network error:`, e.message);
      resolve({ success: false, error: e.message });
    });

    req.end();
  });
};
