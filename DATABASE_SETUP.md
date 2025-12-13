# Database Setup Guide

Since Netlify only hosts your **code**, you need a separate place to host your **database**.
Here are the best free options to get a `DATABASE_URL`.

## Option 1: Neon (Recommended - Easiest)
Neon is a serverless Postgres database that works perfectly with Netlify.

1.  Go to **[neon.tech](https://neon.tech)** and Sign Up.
2.  Create a new Project (name it `dashboard-db`).
3.  It will show you a **Connection String** immediately.
4.  It looks like this: `postgres://neondb_owner:AbC123...@ep-cool-cloud.aws.neon.tech/neondb?sslmode=require`
5.  **Copy this string**. This is your `DATABASE_URL`.

## Option 2: Supabase
1.  Go to **[supabase.com](https://supabase.com)** and Sign Up.
2.  Create a new Project.
3.  Go to **Project Settings** -> **Database**.
4.  Scroll down to **Connection String** -> **URI**.
5.  **Copy the string**. Replace `[YOUR-PASSWORD]` with the password you created in step 2.

## Option 3: Railway (Database Only)
You mentioned Railway had issues, but their **Database** service is actually very stable (it was the *app* hosting that reset).

1.  Go to your Railway project.
2.  Right-click the canvas -> **Create** -> **Database** -> **PostgreSQL**.
3.  Click on the new Postgres card -> **Variables**.
4.  Copy the `DATABASE_URL`.

---

## What to do next?

Once you have the URL (e.g., `postgres://...`):

1.  **In Netlify**:
    *   Go to **Site configuration** -> **Environment variables**.
    *   Add Key: `DATABASE_URL`
    *   Add Value: (Paste the URL you just copied)

2.  **For Local Deployment (Migration)**:
    *   Paste the URL below in your terminal to initialize the database:
    ```powershell
    $env:DATABASE_URL="<PASTE_YOUR_URL_HERE>"
    npm run prisma:deploy
    ```
