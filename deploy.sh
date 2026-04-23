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

# Load .env.local into shell environment so PM2 receives the latest runtime vars
if [ -f ".env.local" ]; then
  echo "📄 Loading .env.local into environment..."
  set -a
  source <(grep -v '^\s*#' .env.local | grep -v '^\s*$')
  set +a
  echo "✅ Environment loaded"
  echo ""
else
  echo "⚠️  .env.local not found. PM2 will use existing environment."
  echo ""
fi

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

# Resolve health check target from env when possible
APP_PORT="${PORT:-}"
BASE_URL=""

if [ -z "$APP_PORT" ] && [ -f ".env.local" ]; then
  APP_PORT=$(awk -F= '/^PORT=/{print $2}' .env.local | tail -n 1 | tr -d '"' | tr -d "'")
fi

if [ -f ".env.local" ]; then
  BASE_URL=$(awk -F= '/^NEXT_PUBLIC_BASE_URL=/{print substr($0, index($0, "=") + 1)}' .env.local | tail -n 1 | tr -d '"' | tr -d "'")
fi

if [ -n "$APP_PORT" ]; then
  HEALTH_URL="http://127.0.0.1:${APP_PORT}/api/health"
elif [ -n "$BASE_URL" ]; then
  HEALTH_URL="${BASE_URL%/}/api/health"
else
  HEALTH_URL="http://127.0.0.1:3000/api/health"
fi

# 5. Health check
echo "🏥 Health check..."
sleep 3

echo "   Checking: $HEALTH_URL"
HEALTH=$(curl -fsS --max-time 10 "$HEALTH_URL" 2>/dev/null || echo '{"status":"unreachable"}')

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
