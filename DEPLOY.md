# 🚀 FleetPro Deployment Guide (Render + MongoDB Atlas)

## URLs After Deploy
| Panel | URL |
|-------|-----|
| User App | `https://your-app.onrender.com/` |
| Admin Panel | `https://your-app.onrender.com/admin?company=SLUG` |
| Super Admin | `https://your-app.onrender.com/superadmin` |

---

## Step 1 — MongoDB Atlas (Free)

1. Go to https://cloud.mongodb.com → Create free account
2. Create a **free M0 cluster**
3. Database Access → Add user → note the username & password
4. Network Access → Allow from anywhere: `0.0.0.0/0`
5. Connect → **Drivers** → copy the connection string  
   It looks like: `mongodb+srv://user:pass@cluster.mongodb.net/fleetpro?retryWrites=true&w=majority`

---

## Step 2 — Push to GitHub

```bash
git init
git add .
git commit -m "Initial FleetPro deploy"
git remote add origin https://github.com/YOUR_USER/fleetpro.git
git push -u origin main
```

---

## Step 3 — Deploy on Render

1. Go to https://render.com → New → **Web Service**
2. Connect your GitHub repo
3. Configure:
   - **Name**: fleetpro-api (or anything)
   - **Root Directory**: `.` (leave empty)
   - **Build Command**: `bash build.sh`
   - **Start Command**: `cd backend && node src/server.js`
   - **Instance Type**: Free

4. **Environment Variables** (add these):

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `MONGODB_URI` | your Atlas connection string |
| `JWT_SECRET` | any long random string (e.g. 64 random chars) |
| `SUPER_ADMIN_USERNAME` | `superadmin` |
| `SUPER_ADMIN_PASSWORD` | `YourStrongPassword@2024` |
| `FRONTEND_URL` | `https://your-app.onrender.com` |

5. Click **Create Web Service** → Wait ~5 minutes for build

---

## Step 4 — Seed Demo Data (Optional)

After deploy, open Render's **Shell** tab and run:
```bash
cd backend && node src/utils/seed.js
```

This creates:
- Companies: `north`, `south`
- Super Admin login: `superadmin` / (your SUPER_ADMIN_PASSWORD)
- Admin logins via OTP at `/admin?company=north`

---

## Step 5 — Login Details

### Super Admin
- URL: `https://your-app.onrender.com/superadmin`
- Username: value of `SUPER_ADMIN_USERNAME` env var
- Password: value of `SUPER_ADMIN_PASSWORD` env var

### Admin Login (OTP-based)
1. Go to `https://your-app.onrender.com/admin?company=north`
2. Enter admin's phone number
3. Check Super Admin panel → OTP Requests to get the code
4. Enter the 6-digit OTP

### User Login (Employee ID only)
- URL: `https://your-app.onrender.com/?company=north`
- Enter Employee ID (e.g. `NF001`)

---

## Troubleshooting

**Blank white screen?**
- Check Render logs for build errors
- Make sure all 3 `dist/` folders were created in the build log
- Check browser console for 404 errors

**MongoDB connection failed?**
- Verify `MONGODB_URI` env var is set correctly
- Make sure Atlas network allows `0.0.0.0/0`

**Super Admin login fails?**
- `SUPER_ADMIN_USERNAME` and `SUPER_ADMIN_PASSWORD` must be set (not `SUPERADMIN_*`)

**Build times out?**
- Render free tier has a 15-min build limit; this build takes ~4-6 minutes normally
