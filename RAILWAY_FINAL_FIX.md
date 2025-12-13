# Railway Deployment - Comprehensive Fix Plan

## Root Cause Analysis

After extensive debugging, I've identified the core issues:

### 1. **Database Data Persistence Issue**
- **Problem**: Admin user gets created but disappears after redeployment
- **Root Cause**: Database seeding isn't part of the deployment process
- **Solution**: Add automatic seeding on server startup

### 2. **Telegram Login Widget Issue**
- **Problem**: Clicking the button does nothing
- **Root Cause**: The `data-onauth` callback approach doesn't work reliably in production
- **Solution**: Switch to redirect-based flow which is more reliable

### 3. **Missing Admin User**
- **Problem**: Cannot log in because admin user doesn't exist
- **Root Cause**: Manual user creation script doesn't run automatically
- **Solution**: Auto-create admin on first server start

## Implementation Plan

### Step 1: Auto-Create Admin on Server Startup

**File**: `server/src/index.ts`

Add this function before the server starts:

```typescript
async function ensureAdminUser() {
  try {
    const bcrypt = await import('bcryptjs');
    const existingAdmin = await prisma.user.findFirst({
      where: { username: 'admin' }
    });

    if (!existingAdmin) {
      console.log('🔧 No admin user found, creating one...');
      const hashedPassword = await bcrypt.default.hash('admin123', 10);
      
      await prisma.user.create({
        data: {
          telegramId: 'admin_placeholder_' + Date.now(),
          username: 'admin',
          password: hashedPassword,
          role: 'ADMIN',
          isApproved: true,
          firstName: 'Admin',
          lastName: 'User'
        }
      });
      console.log('✅ Admin user created successfully');
    } else {
      console.log('✅ Admin user already exists');
    }
  } catch (error) {
    console.error('❌ Failed to ensure admin user:', error);
  }
}
```

Then call it before starting the server:

```typescript
// Before app.listen()
await ensureAdminUser();
```

### Step 2: Fix Telegram Login - Use Pure Redirect Flow
- **Problem**: JS callback was unreliable.
- **Solution**: Switched to `data-auth-url` only. This forces Telegram to redirect back to the app with the auth data in the URL, which is then parsed by the frontend.

```typescript
export const TelegramLoginButton: React.FC<TelegramLoginButtonProps> = ({
    botName,
    buttonSize = 'large',
    cornerRadius = 20,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const authUrl = window.location.origin + '/api/auth/telegram';
        
        const script = document.createElement('script');
        script.src = 'https://telegram.org/js/telegram-widget.js?22';
        script.setAttribute('data-telegram-login', botName);
        script.setAttribute('data-size', buttonSize);
        script.setAttribute('data-radius', cornerRadius.toString());
        script.setAttribute('data-auth-url', authUrl);  // Use redirect instead of callback
        script.async = true;

        containerRef.current.innerHTML = '';
        containerRef.current.appendChild(script);
    }, [botName, buttonSize, cornerRadius]);

    return <div ref={containerRef} className="flex justify-center" />;
};
```

### Step 3: Update Backend Auth Route to Handle Redirects

**File**: `server/src/routes/auth.ts`

The `/api/auth/telegram` endpoint needs to handle GET requests (from redirect):

```typescript
// Add GET handler for Telegram redirect
router.get('/telegram', async (req, res) => {
  try {
    const telegramData = req.query;
    
    // Validate and process the same way as POST
    // ... (same validation logic)
    
    // After successful auth, redirect to frontend with token
    res.redirect(`/?token=${token}`);
  } catch (error) {
    res.redirect('/?error=auth_failed');
  }
});
```

### Step 4: Update Frontend to Handle Token from URL

**File**: `App.tsx` or main router

Add token detection on app load:

```typescript
useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  
  if (token) {
    localStorage.setItem('auth_token', token);
    window.location.href = '/';  // Clean URL
  }
}, []);
```

## Deployment Checklist

### Before Deploying:

1. ✅ **Verify Railway Variables Are Set:**
   - `DATABASE_URL` (from Postgres service)
   - `JWT_SECRET`
   - `TELEGRAM_BOT_TOKEN`
   - `VITE_TELEGRAM_BOT_NAME`

2. ✅ **Verify BotFather Configuration:**
   - Domain set to: `web-production-709c.up.railway.app`

### After Deploying:

1. **Wait for Build to Complete** (Green status)
2. **Check Logs** - Should see: "✅ Admin user created successfully" or "✅ Admin user already exists"
3. **Test Password Login:**
   - Username: `admin`
   - Password: `admin123`
4. **Test Telegram Login:**
   - Click button
   - Should redirect to Telegram
   - Approve
   - Should redirect back with login

## If Issues Persist

### Database Connection Issues:
```bash
# On Railway, check if DATABASE_URL is set correctly
# It should look like:
postgresql://postgres:PASSWORD@HOST:PORT/railway

# Not the internal one:
postgresql://postgres:PASSWORD@postgres.railway.internal:5432/railway
```

### Admin User Not Created:
```bash
# SSH into Railway container (if available) or use logs to verify:
# Look for the "🔧 No admin user found" or "✅ Admin user already exists" message
```

### Telegram Not Working:
1. Verify domain in BotFather (no https://, no trailing slash)
2. Check browser console for errors
3. Try in incognito mode
4. Clear cookies and try again

## Emergency Fallback

If all else fails, you can create the admin user manually via Railway's database console:

```sql
INSERT INTO "User" (
  "telegramId", 
  "username", 
  "password", 
  "role", 
  "isApproved", 
  "firstName", 
  "lastName",
  "createdAt",
  "updatedAt"
) VALUES (
  'admin_manual',
  'admin',
  '$2b$10$pHcGZEC5OMV6xUmNDUgrIO1sb7JWyMZGX2n4AVus86qW26lTdI3V2',
  'ADMIN',
  true,
  'Admin',
  'User',
  NOW(),
  NOW()
);
```

Password for this hash: `admin123`

## Next Steps

1. Implement the fixes above
2. Test locally first
3. Commit and push
4. Wait for Railway deployment
5. Verify and celebrate! 🎉
