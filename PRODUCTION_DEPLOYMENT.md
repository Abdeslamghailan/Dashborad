# Production Deployment Guide - Security Hardened
**Application:** Entity Dashboard  
**Target:** Netlify (https://cmhw.netlify.app)  
**Date:** 2026-01-21

---

## 🔐 Pre-Deployment Security Checklist

Before deploying, verify all security measures are in place:

### Environment Variables (Netlify)

Set these in Netlify Dashboard → Site Settings → Environment Variables:

```bash
# Required - Security Critical
JWT_SECRET=<generate-strong-secret-min-32-chars>
TELEGRAM_BOT_TOKEN=<your-telegram-bot-token>
DATABASE_URL=<your-postgresql-connection-string>

# Required - Application
NODE_ENV=production
VITE_API_URL=https://cmhw.netlify.app/.netlify/functions/api
VITE_TELEGRAM_BOT_NAME=<your-bot-username>

# Optional - Features
ENABLE_LOCAL_BACKUPS=false
ENABLE_STATIC_SERVE=false
```

### Generate Strong JWT Secret

```bash
# Use one of these methods to generate a secure JWT_SECRET:

# Method 1: OpenSSL
openssl rand -base64 32

# Method 2: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Method 3: PowerShell (Windows)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

---

## 🚀 Deployment Steps

### 1. Build the Application

```bash
# Install dependencies
npm install

# Build the client
npm run build

# Verify build output
ls dist/
```

### 2. Test Locally (Optional but Recommended)

```bash
# Preview the production build
npm run preview

# Test at http://localhost:4173
```

### 3. Deploy to Netlify

#### Option A: Git Push (Recommended)

```bash
# Commit all changes
git add .
git commit -m "Security hardening complete - production ready"

# Push to your repository
git push origin main

# Netlify will automatically deploy
```

#### Option B: Manual Deploy

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy
netlify deploy --prod
```

### 4. Verify Deployment

After deployment, test these critical endpoints:

1. **Health Check:**
   ```
   https://cmhw.netlify.app/.netlify/functions/api/health
   ```
   Expected: `{"status":"ok","env":"production","db":"connected"}`

2. **Login Page:**
   ```
   https://cmhw.netlify.app/#/login
   ```
   Expected: Login form loads without errors

3. **Security Headers:**
   ```bash
   curl -I https://cmhw.netlify.app
   ```
   Verify presence of:
   - `Strict-Transport-Security`
   - `X-Frame-Options`
   - `X-Content-Type-Options`
   - `Content-Security-Policy`

---

## 🔍 Post-Deployment Verification

### Security Tests

1. **Check Console Logs:**
   - Open browser DevTools → Console
   - Should see NO sensitive data logged
   - Should see NO debug messages in production

2. **Check Network Tab:**
   - Verify API calls use HTTPS
   - Verify no API keys in request headers
   - Verify proper CORS headers

3. **Test Rate Limiting:**
   - Attempt 6+ login failures
   - Should receive 429 error after 5 attempts

4. **Test CORS:**
   - Try accessing API from unauthorized origin
   - Should be blocked

### Functional Tests

1. **Admin Login:**
   ```
   Username: admin
   Password: admin123
   ```
   ⚠️ **IMPORTANT:** Change this password immediately after first login!

2. **Telegram Login:**
   - Click "Login with Telegram"
   - Verify redirect flow works
   - Verify user data is saved

3. **Dashboard Access:**
   - Verify all pages load
   - Verify data displays correctly
   - Verify no console errors

---

## 🛡️ Security Monitoring

### What to Monitor

1. **Failed Login Attempts:**
   - Check logs for repeated 401 errors
   - Look for rate limit violations

2. **CORS Violations:**
   - Monitor for blocked origins
   - Investigate unexpected sources

3. **Error Rates:**
   - Monitor 500 errors
   - Check database connection issues

4. **Performance:**
   - Monitor response times
   - Check for DoS patterns

### Recommended Tools

- **Netlify Analytics:** Built-in traffic monitoring
- **Sentry:** Error tracking and monitoring
- **LogRocket:** Session replay and debugging
- **Uptime Robot:** Uptime monitoring

---

## 🔧 Troubleshooting

### Issue: "Invalid credentials" for admin

**Solution:**
1. Check DATABASE_URL is correct
2. Verify admin user exists in database
3. Try resetting admin password using server script

### Issue: Telegram login not working

**Solution:**
1. Verify TELEGRAM_BOT_TOKEN is set
2. Check bot domain is configured correctly
3. Verify VITE_TELEGRAM_BOT_NAME matches your bot

### Issue: CORS errors

**Solution:**
1. Verify VITE_API_URL matches your Netlify URL
2. Check Netlify environment variables
3. Ensure production domain is whitelisted in server/src/app.ts

### Issue: Rate limiting too strict

**Solution:**
1. Adjust limits in `server/src/middleware/rateLimiter.ts`
2. Rebuild and redeploy

---

## 📊 Performance Optimization

### Netlify Configuration

The `netlify.toml` file is already configured with:
- Function timeout: 30s
- Redirects for SPA routing
- API proxy to serverless functions

### Build Optimization

Already configured in `vite.config.ts`:
- Minification enabled
- Source maps disabled
- Console statements removed
- Dead code elimination

---

## 🔄 Rollback Plan

If issues occur after deployment:

### Option 1: Netlify Dashboard
1. Go to Netlify Dashboard
2. Navigate to Deploys
3. Find previous working deploy
4. Click "Publish deploy"

### Option 2: Git Revert
```bash
# Find the last working commit
git log

# Revert to that commit
git revert <commit-hash>

# Push to trigger redeploy
git push origin main
```

---

## 📝 Post-Deployment Tasks

### Immediate (Within 24 hours)

- [ ] Change default admin password
- [ ] Test all critical user flows
- [ ] Monitor error logs
- [ ] Verify security headers
- [ ] Test rate limiting
- [ ] Backup database

### Short-term (Within 1 week)

- [ ] Set up monitoring alerts
- [ ] Configure error tracking (Sentry)
- [ ] Document any issues found
- [ ] Create user documentation
- [ ] Plan for httpOnly cookie migration

### Long-term (Within 1 month)

- [ ] Security audit review
- [ ] Performance optimization
- [ ] User feedback collection
- [ ] Plan feature updates
- [ ] Review and update dependencies

---

## 🆘 Support

If you encounter issues:

1. **Check Logs:**
   - Netlify Dashboard → Functions → View logs
   - Browser DevTools → Console

2. **Review Documentation:**
   - SECURITY_AUDIT_REPORT.md
   - SECURITY_CHECKLIST.md

3. **Common Issues:**
   - Environment variables not set
   - Database connection issues
   - CORS configuration
   - Rate limiting

---

## ✅ Deployment Complete

Once you've completed all steps:

1. ✅ Environment variables configured
2. ✅ Application built and deployed
3. ✅ Security tests passed
4. ✅ Functional tests passed
5. ✅ Monitoring configured
6. ✅ Admin password changed

**Your application is now secure and production-ready!** 🎉

---

**Deployment Guide Version:** 1.0  
**Last Updated:** 2026-01-21  
**Status:** Production Ready (with noted caveats)
