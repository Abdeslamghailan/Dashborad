#!/bin/bash

# VPS Setup Script for Entity Dashboard
# Usage: ./vps-setup.sh

set -e

echo "🚀 Starting VPS Setup..."

# 1. Update System
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# 2. Install Essentials
echo "🛠️ Installing essential tools..."
sudo apt install -y curl git ufw build-essential

# 3. Setup Firewall
echo "🛡️ Configuring firewall..."
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# 4. Install Node.js 20 (LTS)
echo "🟢 Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v
npm -v

# 5. Install PM2
echo "Process Manager Installing PM2..."
sudo npm install -g pm2

# 6. Install Nginx
echo "🌐 Installing Nginx..."
sudo apt install -y nginx

# 7. Install PostgreSQL 16
echo "🐘 Installing PostgreSQL..."
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql.service
sudo systemctl enable postgresql.service

echo "✅ System setup complete!"
echo "👉 Next steps:"
echo "1. Configure Database: sudo -i -u postgres psql"
echo "2. Clone App: git clone https://github.com/Abdeslamghailan/Dashborad.git"
