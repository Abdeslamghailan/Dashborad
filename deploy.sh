#!/bin/bash

# Deployment Script for Entity Dashboard
# Usage: ./deploy.sh

set -e

APP_DIR="/root/Dashborad"
ECOSYSTEM_FILE="ecosystem.config.js"

echo "🚀 Starting Deployment..."

# 1. Pull latest code
if [ -d "$APP_DIR" ]; then
  echo "📥 Pulling latest code..."
  cd $APP_DIR
  git pull origin main
else
  echo "📥 Cloning repository..."
  git clone https://github.com/Abdeslamghailan/Dashborad.git $APP_DIR
  cd $APP_DIR
fi

# 2. Install Dependencies
echo "📦 Installing dependencies..."
npm install

# 3. Build Application
echo "🏗️ Building application..."
npm run build

# 4. Run Migrations
echo "🐘 Running database migrations..."
npx prisma migrate deploy

# 5. Start/Restart Application
echo "🔄 Restarting application..."
if pm2 list | grep -q "dashboard"; then
    pm2 reload dashboard
else
    pm2 start dist/server/src/index.js --name "dashboard"
fi

echo "✅ Deployment complete!"
