# Final Fixes for Deployment

## 1. Fix "Bot domain invalid"
This error comes from Telegram, not your code.
1.  Open Telegram and search for **@BotFather**.
2.  Type `/mybots` and select your bot (`cmhw2_bot`).
3.  Go to **Bot Settings** -> **Domain**.
4.  Enter your Netlify URL: `https://cmhw.netlify.app` (or whatever your site URL is).
    *   **Important**: Do NOT put a trailing slash `/`. Just the domain.

## 2. Fix Admin Login
If the admin login is failing, it's likely because the database is empty or the API is not reachable.

### A. Check API Status
Visit `https://cmhw.netlify.app/api/health` in your browser.
*   If you see `{"status":"ok"}`, the API is working.
*   If you see a 404 or 500 error, check your Netlify Function logs.

### B. Ensure Admin User Exists
The system tries to create the admin user automatically. However, if the database connection failed initially, it might not exist.
You can force the creation by restarting the function (re-deploy) OR by running the seed script locally against the production DB:

```powershell
# Run this in your local terminal
$env:DATABASE_URL="<YOUR_NEON_OR_SUPABASE_URL>"
npm run seed
```

### C. Verify Frontend API URL
The frontend is configured to use relative paths (`/api/...`).
Netlify redirects `/api/*` to `/.netlify/functions/api`.
Ensure your `DATABASE_URL` is correct in Netlify Environment Variables.
