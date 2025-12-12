# Fix Telegram "Bot domain invalid" Error

## Step-by-Step Instructions

### 1. Open Telegram and go to @BotFather

### 2. Send the command:
```
/mybots
```

### 3. Select your bot: `CMHW_BOT @cmhw2_bot`

### 4. Click "Bot Settings"

### 5. Click "Domain"

### 6. Add your Railway domain:
```
web-production-709c.up.railway.app
```

**IMPORTANT:** 
- Do NOT include `https://`
- Do NOT include `/` at the end
- Just the domain name exactly as shown above

### 7. Click "Save" or "Set Domain"

### 8. Test the login

After setting the domain, refresh your login page and try clicking the Telegram button again.

## Alternative: Check Current Domain

If you want to see what domain is currently set:
1. Go to @BotFather
2. Send `/mybots`
3. Select your bot
4. Click "Bot Settings"
5. Click "Domain"
6. You should see the current domain (if any)

## Troubleshooting

If you still get "Bot domain invalid":
1. Make sure you saved the domain in BotFather
2. Wait 1-2 minutes for Telegram to update
3. Clear your browser cache
4. Try again

## What This Does

Setting the domain in BotFather tells Telegram that your website is authorized to use the Telegram Login Widget for this bot. Without this setting, Telegram will reject all login attempts from your website.
