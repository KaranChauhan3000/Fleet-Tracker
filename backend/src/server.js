require('dotenv').config();

const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const morgan    = require('morgan');
const rateLimit = require('express-rate-limit');
const path      = require('path');
const fs        = require('fs');
const mongoose  = require('mongoose');

const connectDB        = require('./config/db');
const { errorHandler } = require('./middleware/errorHandler');

const authRoutes       = require('./routes/auth');
const adminRoutes      = require('./routes/admin');
const userRoutes       = require('./routes/user');
const membershipRoutes = require('./routes/membership');
const familyRoutes     = require('./routes/family');
const membershipCtrl   = require('./controllers/membershipController');

// Drop stale indexes from old schema versions on startup
connectDB().then(async () => {
  try {
    await mongoose.connection.collection('admins').dropIndex('username_1');
    console.log('✓  Dropped stale admin username_1 index');
  } catch {
    // Index didn't exist — that's fine
  }
});

const app = express();

// ── Trust proxy ───────────────────────────────────────────────────
// Render/Heroku/Vercel sit one hop in front of the app and add
// X-Forwarded-For. Trusting 1 hop tells express-rate-limit (and
// req.ip) to use the real client IP without allowing spoofing.
app.set('trust proxy', 1);

// ── Security ──────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));

// ── CORS ──────────────────────────────────────────────────────────
// Capacitor APK sends requests from capacitor://localhost or https://localhost
// These must always be allowed regardless of FRONTEND_URL setting
const CAPACITOR_ORIGINS = [
  'capacitor://localhost',
  'ionic://localhost',
  'https://localhost',
  'http://localhost',
];

const rawOrigins = (process.env.FRONTEND_URL || '*').split(',').map(s => s.trim());
const allowAll   = rawOrigins.includes('*');

app.use(cors({
  origin: (origin, cb) => {
    if (!origin)                            return cb(null, true);
    if (allowAll)                           return cb(null, true);
    if (CAPACITOR_ORIGINS.includes(origin)) return cb(null, true);
    if (rawOrigins.includes(origin))        return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

// ── Rate Limiting ─────────────────────────────────────────────────
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000, max: 500,
  standardHeaders: true, legacyHeaders: false,
  message: { message: 'Too many requests, try again later.' },
}));
app.use('/api/auth/', rateLimit({
  windowMs: 15 * 60 * 1000, max: 50,
  message: { message: 'Too many attempts. Try again in 15 minutes.' },
}));

// ── Body Parsing ──────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ── Health ────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'FleetPro API v3', env: process.env.NODE_ENV || 'development', time: new Date().toISOString() });
});

// ── API Routes ────────────────────────────────────────────────────
app.use('/api/auth',             authRoutes);
app.use('/api/admin',            adminRoutes);
app.use('/api/user',             userRoutes);
app.use('/api/admin/membership', membershipRoutes);
app.use('/api/family',           familyRoutes);

// ── Razorpay Webhook (no auth — validated by signature inside handler) ────
// Must use raw body for signature verification
app.post('/webhook/razorpay',
  express.json({ type: '*/*' }),
  membershipCtrl.handleWebhook
);

// ── Serve Frontend Static Files ───────────────────────────────────
// ── Single unified frontend served at root ────────────────────────────────────
const devHtml = (appName, port) => `
<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>FleetPro — ${appName}</title>
<style>body{font-family:system-ui,sans-serif;background:#0a0f1e;color:#e2ebf8;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
.box{text-align:center;padding:40px;border:1px solid #1e293b;border-radius:16px;background:#111827}
h2{font-size:22px;margin-bottom:8px}p{color:#64748b;margin:6px 0}
a{color:#60a5fa;text-decoration:none;font-weight:600}
.tip{margin-top:20px;background:#1e293b;border-radius:10px;padding:16px;font-size:13px;color:#94a3b8;text-align:left}
code{background:#0a0f1e;padding:3px 8px;border-radius:4px;font-family:monospace;color:#38bdf8}
</style></head><body>
<div class="box">
  <h2>⛽ Fleet Tracker — ${appName}</h2>
  <p>The React build is not available yet.</p>
  <div class="tip">
    <strong style="color:#e2ebf8">Development mode:</strong><br><br>
    Run the frontend dev server in a separate terminal:<br>
    <code>cd frontend-${appName.toLowerCase().replace(/ /g, '-')} &amp;&amp; npm install &amp;&amp; npm run dev</code><br><br>
    Then open: <a href="http://localhost:${port}">http://localhost:${port}</a><br><br>
    <strong style="color:#e2ebf8">Production mode:</strong><br><br>
    Build all frontends first:<br>
    <code>npm run build:all</code><br>
    Then restart the backend.
  </div>
</div></body></html>`;

function serveSPA(prefix, distPath, appName, devPort) {
  const indexFile = path.join(distPath, 'index.html');
  const isBuilt   = fs.existsSync(indexFile);

  if (isBuilt) {
    if (prefix) {
      app.use(prefix, express.static(distPath));
      app.get(prefix,       (_req, res) => res.sendFile(indexFile));
      app.get(`${prefix}/*`, (_req, res) => res.sendFile(indexFile));
    } else {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => res.sendFile(indexFile));
    }
  } else {
    const hint = devHtml(appName, devPort);
    if (prefix) {
      app.get(prefix,        (_req, res) => res.send(hint));
      app.get(`${prefix}/*`, (_req, res) => res.send(hint));
    } else {
      app.get('*', (_req, res) => res.send(hint));
    }
  }
}

// ── Single unified frontend served at root ────────────────────────────────────
const appFrontend = path.join(__dirname, '../../frontend-admin/dist');
serveSPA('', appFrontend, 'Fleet Tracker', 3002);

// ── Error Handler ─────────────────────────────────────────────────
app.use(errorHandler);

const PORT = process.env.PORT || 8000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀  FleetPro API v3`);
  console.log(`    URL    : http://0.0.0.0:${PORT}`);
  console.log(`    Health : http://localhost:${PORT}/health`);
  console.log(`    Env    : ${process.env.NODE_ENV || 'development'}\n`);
  console.log('📱  Single App (after React build):');
  console.log(`    Fleet Tracker App : http://localhost:${PORT}/`);
  console.log('\n🔑  Login URL examples:');
  console.log(`    Admin : http://localhost:${PORT}/?company=YOUR_SLUG`);
  console.log(`    User  : http://localhost:${PORT}/?company=YOUR_SLUG\n`);
});

module.exports = app;