# Fleet Pro Membership Setup

## 1. Backend .env — Add these variables

```
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_here

# Set this to TODAY'S DATE when you first deploy the membership feature
# Existing companies will get 30 days from this date (not from their original signup)
# New companies always get 30 days from their signup date
MEMBERSHIP_LAUNCH_DATE=2025-05-12
```

Get from: razorpay.com → Settings → API Keys

## 2. Frontend .env — Add this variable

Create file: `frontend-admin/.env`

```
VITE_RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxxxxx
```

This is the PUBLIC key only — safe to expose in frontend.

## 3. Backend — Install razorpay package

```bash
cd backend
npm install razorpay
```

## 4. Razorpay Webhook Setup

1. Go to razorpay.com → Settings → Webhooks
2. Add webhook URL: `https://fleetpro.duckdns.org/webhook/razorpay`
3. Select events: `payment.captured`, `subscription.charged`
4. Copy the webhook secret → add to backend .env as RAZORPAY_WEBHOOK_SECRET

## 5. Update Support Contact

In MembershipGate.jsx and MembershipSettings.jsx, replace:
```
https://wa.me/919999999999
```
With your actual Karo India Foundation WhatsApp number.

## How It Works

- New company → 30-day free trial starts automatically
- Trial banner shows in dashboard with days remaining
- After 30 days → full screen gate blocks the app
- Admin selects Monthly (₹200) or Yearly (₹2000) → Razorpay opens
- Payment verified on backend with HMAC-SHA256 signature
- App unlocks immediately after payment
- Settings → Membership shows full membership details
- Vehicle limit: 50 by default, admin can request increase via form

## Security Notes

- Payment amount ALWAYS set server-side (₹200/₹2000 in paise)
- Razorpay signature verified before activating any membership
- Frontend only has the public key — never the secret
- Rate limiting on payment endpoints (20 requests per 15 min)
- Webhook signature validated before processing events
