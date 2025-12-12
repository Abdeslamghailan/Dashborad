# 🚀 Deployment Guide - Railway

This guide will help you deploy your Entity Dashboard to Railway for **free hosting**.

## Prerequisites

1. A [GitHub account](https://github.com) (to store your code)
2. A [Railway account](https://railway.app) (free tier available)

---

## ⚠️ IMPORTANT: Backup Your Data First!

Before deploying, make sure you have backed up your local SQLite database. Your backups are located at:

- **Desktop**: `C:\Users\admin_1\Desktop\FULL_BACKUP_2025-12-12_15-33-37\`
- **Server backups**: `c:\Users\admin_1\Desktop\dashboard\server\backups\`

### Create Additional Backup (Optional)
```powershell
# Run in server directory
Copy-Item "prisma\dev.db" -Destination "backups\pre_deploy_backup.db"
```

---

## Step 1: Push Your Code to GitHub

If you haven't already, create a GitHub repository and push your code:

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Prepare for Railway deployment"

# Add your GitHub repository as remote (replace with your repo URL)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git

# Push to GitHub
git push -u origin main
```

---

## Step 2: Sign Up for Railway

1. Go to [railway.app](https://railway.app)
2. Click **"Login"** and sign in with your GitHub account
3. Authorize Railway to access your repositories

---

## Step 3: Create a New Project

1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Choose your repository from the list
4. Click **"Deploy Now"**

---

## Step 4: Add PostgreSQL Database

1. In your Railway project, click **"+ New"**
2. Select **"Database"** → **"Add PostgreSQL"**
3. A PostgreSQL instance will be created for you

---

## Step 5: Connect Database and Configure Environment

1. Click on your **main service** (the one from GitHub)
2. Go to the **"Variables"** tab
3. Click **"+ New Variable"** and add the following:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Click "Add Reference" → Select PostgreSQL → `DATABASE_URL` |
| `JWT_SECRET` | `your-super-secret-jwt-key-replace-this-in-prod` |
| `NODE_ENV` | `production` |
| `PORT` | `3002` |

> ⚠️ **Important**: Generate a strong random JWT_SECRET for production! You can use: `openssl rand -base64 32`

---

## Step 6: Configure Build Settings

1. Click on your service (the GitHub repo)
2. Go to **"Settings"** tab
3. Under **"Build & Deploy"**:
   - **Build Command**: 
     ```
     npm install && npm run build && cd server && npm install && npm run build
     ```
   - **Start Command**:
     ```
     cd server && npx prisma migrate deploy && npm run start
     ```

---

## Step 7: Deploy!

Railway will automatically deploy when you push to GitHub. You can also:

1. Click **"Deploy"** to trigger a manual deployment
2. Watch the deployment logs for any errors
3. Once complete, click on your service to find your app URL

---

## 🎉 Your App is Live!

Your app will be available at a URL like:
```
https://your-app-name.up.railway.app
```

---

## Troubleshooting

### Database Connection Errors
- Make sure `DATABASE_URL` is properly set as a reference to the PostgreSQL service
- Check that migrations ran successfully in the build logs

### CORS Errors
- The server is configured to accept Railway domains automatically
- Check the browser console for specific CORS errors

### Build Failures
- Check the build logs in Railway for specific errors
- Make sure all dependencies are listed in `package.json`

### Static Files Not Loading
- Ensure the frontend build (`npm run build`) completed successfully
- Check that the `dist` folder was created

---

## Updating Your App

Any push to your GitHub `main` branch will automatically trigger a new deployment!

```bash
git add .
git commit -m "Update feature XYZ"
git push
```

---

## Alternative: Manual Database Migration

If you need to run migrations manually:

1. Open the Railway CLI or use the Railway shell
2. Run:
   ```bash
   cd server
   npx prisma migrate deploy
   ```

---

## Free Tier Limits

Railway's free tier includes:
- **$5 free credit per month**
- Enough for small projects and development
- Services may sleep after inactivity

For heavier usage, consider upgrading to a paid plan.

---

## Need Help?

- [Railway Documentation](https://docs.railway.app)
- [Prisma PostgreSQL Guide](https://www.prisma.io/docs/concepts/database-connectors/postgresql)
