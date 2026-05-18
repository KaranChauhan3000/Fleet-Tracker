# FleetPro — Fleet Fuel Tracker

A Karo India Foundation Initiative

## Quick Start (Local Development)

### 1. Install dependencies
```bash
npm run install:all
```

### 2. Start MongoDB
Make sure MongoDB is running locally on port 27017.

### 3. Seed the database
```bash
npm run seed
```

### 4. Start the backend
```bash
npm run dev:backend
# Runs on http://localhost:8000
```

### 5. Run frontends in separate terminals
```bash
npm run dev:user        # http://localhost:3001
npm run dev:admin       # http://localhost:3002
npm run dev:superadmin  # http://localhost:3003
```

---

## Production Build (All served from backend on port 8000)

```bash
npm run install:all
npm run build:all
npm run seed
npm start
```

Then open:
- User App:    http://localhost:8000/?company=north
- Admin App:   http://localhost:8000/admin?company=north
- Super Admin: http://localhost:8000/superadmin

---

## Login Credentials (after seed)

### Super Admin
- URL: http://localhost:8000/superadmin
- Username: `superadmin`
- Password: `SuperAdmin@2024!`

### Admin (OTP login — get OTP from Super Admin dashboard)
- North: http://localhost:8000/admin?company=north → phone `9810011001`
- South: http://localhost:8000/admin?company=south → phone `9840022002`

### Users (Employee ID only, no password)
- North: http://localhost:8000/?company=north → IDs: `NF001` `NF002` `NF003`
- South: http://localhost:8000/?company=south → IDs: `SF001` `SF002` `SF003`

---

## Features

- Super Admin: manage companies, admins, view OTPs, reports
- Admin: manage users & vehicles, view/add fuel logs, reports
  - Click ▼ on any user/vehicle to expand fuel log history + odometer data
- User (Driver): log fuel fills, view own history
