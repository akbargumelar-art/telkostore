#!/bin/bash
# ==============================
# Telko.Store — Deploy Script (Regular Updates)
# Jalankan: bash deploy.sh
# ==============================

set -e

APP_DIR="/var/www/telkostore"
BRANCH="main"

echo ""
echo "🚀 Telko.Store — Deploy"
echo "========================"
echo ""

cd "$APP_DIR"

# 1. Pull latest dari GitHub
echo "📥 Pulling latest from GitHub ($BRANCH)..."
git fetch origin
git reset --hard origin/$BRANCH
echo "✅ Pull selesai"
echo ""

# 2. Install dependencies
echo "📦 Installing dependencies..."
npm install --production=false
echo "✅ Dependencies updated"
echo ""

# 3. Build Next.js
echo "🔨 Building Next.js..."
npm run build
echo "✅ Build selesai"
echo ""

# 4. Restart aplikasi (PM2)
if command -v pm2 &> /dev/null; then
  echo "🔄 Restarting PM2 process..."
  pm2 restart telkostore-app --update-env 2>/dev/null || pm2 start npm --name "telkostore-app" -- start
  pm2 save 2>/dev/null
  echo "✅ PM2 restarted"
else
  echo "⚠️  PM2 tidak terdeteksi. Restart manual diperlukan."
  echo "   Install PM2: npm install -g pm2"
  echo "   Start: pm2 start npm --name telkostore-app -- start"
fi

echo ""

# 5. Health check
echo "🏥 Health check..."
sleep 3

HEALTH=$(curl -s http://localhost:3000/api/health 2>/dev/null || echo '{"status":"unreachable"}')

if echo "$HEALTH" | grep -q '"status":"ok"'; then
  echo "✅ Application is healthy!"
else
  echo "⚠️  Health check: $HEALTH"
  echo "   Cek logs: pm2 logs telkostore-app --lines 30"
fi

echo ""
echo "🎉 Deploy selesai!"
echo "========================"
echo ""

