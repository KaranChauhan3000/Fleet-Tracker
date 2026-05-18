#!/bin/bash
set -e

echo "=== FleetPro Build Script for Render ==="

echo "--- Installing backend deps ---"
cd backend && npm install && cd ..

echo "--- Installing & building frontend-user ---"
cd frontend-user && npm install && npm run build && cd ..

echo "--- Installing & building frontend-admin ---"
cd frontend-admin && npm install && npm run build && cd ..

echo "--- Installing & building frontend-superadmin ---"
cd frontend-superadmin && npm install && npm run build && cd ..

echo "=== Build complete! ==="
ls -la frontend-user/dist/ || echo "user dist missing!"
ls -la frontend-admin/dist/ || echo "admin dist missing!"
ls -la frontend-superadmin/dist/ || echo "superadmin dist missing!"
