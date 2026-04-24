#!/bin/bash
# ==============================
# Telko.Store — Deploy Script (Regular Updates)
# Jalankan: bash deploy.sh
# ==============================

set -e

APP_DIR="/var/www/telkostore"
BRANCH="main"
PRIMARY_PM2_APP="telkostore"
LEGACY_PM2_APP="telkostore-app"
PM2_APP_NAME=""

echo ""
echo "🚀 Telko.Store — Deploy"
echo "========================"
echo ""

restart_pm2_app() {
  if pm2 describe "$PRIMARY_PM2_APP" >/dev/null 2>&1; then
    PM2_APP_NAME="$PRIMARY_PM2_APP"
    pm2 restart "$PM2_APP_NAME" --update-env
  elif pm2 describe "$LEGACY_PM2_APP" >/dev/null 2>&1; then
    PM2_APP_NAME="$LEGACY_PM2_APP"
    pm2 restart "$PM2_APP_NAME" --update-env
  else
    PM2_APP_NAME="$PRIMARY_PM2_APP"
    pm2 start npm --name "$PM2_APP_NAME" -- start
  fi
}

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
npm install --production=false --legacy-peer-deps
echo "✅ Dependencies updated"
echo ""

# 2.5. Run lightweight DB migrations needed by runtime auth
echo "🗄️ Running database migrations..."
npm run db:migrate-admin-password
npm run db:migrate-site-banners
npm run db:migrate-referral
npm run db:migrate-user-activation
echo "✅ Database migration selesai"
echo ""

# 3. Build Next.js
echo "🔨 Building Next.js..."
npm run build
echo "✅ Build selesai"
echo ""

# 4. Restart aplikasi (PM2)
if command -v pm2 &> /dev/null; then
  echo "🔄 Restarting PM2 process..."
  restart_pm2_app
  pm2 save 2>/dev/null
  echo "✅ PM2 restarted ($PM2_APP_NAME)"
else
  echo "⚠️  PM2 tidak terdeteksi. Restart manual diperlukan."
  echo "   Install PM2: npm install -g pm2"
  echo "   Start: pm2 start npm --name $PRIMARY_PM2_APP -- start"
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
  echo "   Cek logs: pm2 logs ${PM2_APP_NAME:-$PRIMARY_PM2_APP} --lines 30"
fi

echo ""
echo "🎉 Deploy selesai!"
echo "========================"
echo ""
