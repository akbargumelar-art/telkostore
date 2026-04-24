#!/bin/bash
# ==============================
# Telko.Store — ONE-TIME Migration Script
# Migrasi dari SQLite → MySQL
#
# SEBELUM jalankan script ini:
#   1. MySQL sudah terinstall & running
#   2. Buat database & user MANUAL:
#      mysql -u root -p
#      CREATE DATABASE telkostore CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
#      CREATE USER 'telkostore'@'localhost' IDENTIFIED BY 'PASSWORD_KUAT';
#      GRANT ALL PRIVILEGES ON telkostore.* TO 'telkostore'@'localhost';
#      FLUSH PRIVILEGES;
#      EXIT;
#   3. Edit .env.local → DATABASE_URL, AUTH_SECRET, ADMIN_SECRET
#
# Jalankan: bash deploy-migrate.sh
# ==============================

set -e

APP_DIR="/var/www/telkostore"
BRANCH="main"
PRIMARY_PM2_APP="telkostore"
LEGACY_PM2_APP="telkostore-app"
PM2_APP_NAME=""

echo ""
echo "🔄 Telko.Store — Migration Deploy (SQLite → MySQL)"
echo "===================================================="
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

# ===== PRE-CHECK =====
echo "🔍 Pre-flight checks..."

# Check MySQL is running
if ! systemctl is-active --quiet mysql 2>/dev/null && ! systemctl is-active --quiet mariadb 2>/dev/null; then
  echo "❌ MySQL/MariaDB is not running!"
  echo "   Fix: sudo systemctl start mysql"
  exit 1
fi
echo "   ✅ MySQL is running"

cd "$APP_DIR"

# Check .env.local exists
if [ ! -f ".env.local" ]; then
  echo "❌ .env.local not found!"
  echo "   Fix: Create .env.local with DATABASE_URL, AUTH_SECRET, etc."
  exit 1
fi

# Check DATABASE_URL is set and points to MySQL
if ! grep -q "^DATABASE_URL=mysql://" .env.local; then
  echo "❌ DATABASE_URL in .env.local is not set to MySQL!"
  echo "   Fix: DATABASE_URL=mysql://telkostore:PASSWORD@localhost:3306/telkostore"
  exit 1
fi
echo "   ✅ .env.local configured with MySQL"

# Check AUTH_SECRET is not default
if grep -q "ganti-dengan-random" .env.local; then
  echo "❌ AUTH_SECRET masih placeholder! Generate dulu:"
  echo "   openssl rand -base64 32"
  exit 1
fi
echo "   ✅ AUTH_SECRET configured"

# Load .env.local into shell environment
# (Node scripts like seed.mjs don't auto-load .env.local — that's a Next.js feature)
echo "   📄 Loading .env.local into environment..."
set -a
source <(grep -v '^\s*#' .env.local | grep -v '^\s*$')
set +a
echo "   ✅ Environment variables loaded"

echo ""

# ===== STEP 1: BACKUP =====
echo "💾 Step 1: Backup data lama..."
BACKUP_DIR="$APP_DIR/backup/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

if [ -f "telko.db" ]; then
  cp telko.db "$BACKUP_DIR/telko.db"
  echo "   ✅ SQLite database backed up → $BACKUP_DIR/telko.db"
else
  echo "   ⚠️  telko.db not found (skip backup)"
fi

if [ -f ".env.local.backup" ]; then
  cp .env.local.backup "$BACKUP_DIR/"
fi
echo ""

# ===== STEP 2: PULL LATEST =====
echo "📥 Step 2: Pull latest from GitHub ($BRANCH)..."
git fetch origin
git reset --hard origin/$BRANCH
echo "   ✅ Pull complete"
echo ""

# ===== STEP 3: INSTALL DEPENDENCIES =====
echo "📦 Step 3: Installing dependencies..."
npm install --production=false
echo "   ✅ Dependencies installed"
echo ""

# ===== STEP 4: CREATE MYSQL TABLES + SEED =====
echo "🗄️ Step 4: Creating MySQL tables & seeding data..."
npm run db:seed
echo "   ✅ Tables created & data seeded"
echo ""

# ===== STEP 5: MIGRATE SQLITE DATA =====
if [ -f "telko.db" ] || [ -f "$BACKUP_DIR/telko.db" ]; then
  echo "🔄 Step 5: Migrating SQLite data → MySQL..."

  # Ensure telko.db is in project root for migration script
  if [ ! -f "telko.db" ] && [ -f "$BACKUP_DIR/telko.db" ]; then
    cp "$BACKUP_DIR/telko.db" ./telko.db
  fi

  # Install better-sqlite3 temporarily
  npm install better-sqlite3 --save-dev --no-audit --no-fund 2>/dev/null
  
  # Run migration
  npm run db:migrate-data
  
  # Remove better-sqlite3
  npm uninstall better-sqlite3 --no-audit --no-fund 2>/dev/null
  
  echo "   ✅ Data migration complete"
else
  echo "⏭️ Step 5: No SQLite database found, skipping migration"
fi
echo ""

# ===== STEP 6: BUILD =====
echo "🗄️ Step 6: Running admin password migration..."
npm run db:migrate-admin-password
echo "   ✅ Admin password migration complete"
echo ""

echo "🗄️ Step 7: Running site banner migration..."
npm run db:migrate-site-banners
echo "   ✅ Site banner migration complete"
echo ""

echo "🔨 Step 8: Building Next.js..."
npm run build
echo "   ✅ Build complete"
echo ""

# ===== STEP 9: RESTART PM2 =====
echo "🔄 Step 9: Restarting application..."
if command -v pm2 &> /dev/null; then
  restart_pm2_app
  pm2 save 2>/dev/null
  echo "   ✅ PM2 restarted ($PM2_APP_NAME)"
else
  echo "   ⚠️  PM2 not found. Install: npm install -g pm2"
  echo "   Manual start: pm2 start npm --name $PRIMARY_PM2_APP -- start"
fi
echo ""

# Resolve health check target from env when possible
APP_PORT="${PORT:-}"
BASE_URL="${NEXT_PUBLIC_BASE_URL:-}"

if [ -z "$APP_PORT" ] && [ -f ".env.local" ]; then
  APP_PORT=$(awk -F= '/^PORT=/{print $2}' .env.local | tail -n 1 | tr -d '"' | tr -d "'")
fi

if [ -z "$BASE_URL" ] && [ -f ".env.local" ]; then
  BASE_URL=$(awk -F= '/^NEXT_PUBLIC_BASE_URL=/{print substr($0, index($0, "=") + 1)}' .env.local | tail -n 1 | tr -d '"' | tr -d "'")
fi

if [ -n "$APP_PORT" ]; then
  HEALTH_URL="http://127.0.0.1:${APP_PORT}/api/health"
elif [ -n "$BASE_URL" ]; then
  HEALTH_URL="${BASE_URL%/}/api/health"
else
  HEALTH_URL="http://127.0.0.1:3000/api/health"
fi

# ===== STEP 10: HEALTH CHECK =====
echo "🏥 Step 10: Health check..."
sleep 3  # Wait for app to start

echo "   Checking: $HEALTH_URL"
HEALTH=$(curl -fsS --max-time 10 "$HEALTH_URL" 2>/dev/null || echo '{"status":"unreachable"}')
echo "   Response: $HEALTH"

if echo "$HEALTH" | grep -q '"status":"ok"'; then
  echo "   ✅ Application is healthy!"
else
  echo "   ⚠️  Health check failed — check: pm2 logs ${PM2_APP_NAME:-$PRIMARY_PM2_APP}"
fi
echo ""

# ===== DONE =====
echo "===================================================="
echo "🎉 Migration deploy complete!"
echo ""
echo "📋 Checklist manual setelah ini:"
echo "   1. Buka https://telko.store/ → pastikan produk muncul"
echo "   2. Login admin → /control/login"
echo "   3. Update Midtrans Dashboard webhook URL:"
echo "      → https://telko.store/api/webhook/midtrans"
echo "   4. Test checkout end-to-end"
echo ""
echo "💾 Backup SQLite tersimpan di: $BACKUP_DIR"
echo "===================================================="
echo ""
