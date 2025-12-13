# Netlify Deployment Guide

This application has been configured for deployment on Netlify.

## Prerequisites

1.  **Netlify Account**: Create one at [netlify.com](https://netlify.com).
2.  **GitHub Repository**: Push this code to a GitHub repository.
3.  **Cloud Database**: You **MUST** use a cloud-hosted PostgreSQL database (e.g., Neon, Supabase, Railway Postgres). Local SQLite (`dev.db`) **WILL NOT WORK** on Netlify.

## Deployment Steps

1.  **Connect to Netlify**:
    *   Go to Netlify Dashboard -> "Add new site" -> "Import from an existing project".
    *   Select GitHub and choose your repository.

2.  **Configure Build Settings**:
    *   **Base directory**: (leave empty)
    *   **Build command**: `npm run build`
    *   **Publish directory**: `dist`
    *   **Functions directory**: `netlify/functions` (Netlify should auto-detect this)

3.  **Environment Variables**:
    *   Go to "Site configuration" -> "Environment variables".
    *   Add the following variables:
        *   `DATABASE_URL`: **REQUIRED**. The connection string to your cloud PostgreSQL database.
            *   Example: `postgres://user:password@host:port/dbname?sslmode=require`
        *   `JWT_SECRET`: **REQUIRED**. A long random string for security.
        *   `NODE_ENV`: `production`
        *   `VITE_TELEGRAM_BOT_NAME`: Your Telegram bot name.
        *   `TELEGRAM_BOT_TOKEN`: Your Telegram bot token.
        *   `ENABLE_LOCAL_BACKUPS`: `false` (Default is false, but good to be explicit).

4.  **Deploy**:
    *   Click "Deploy site".

## Important Notes

*   **Database**: The application is configured to use Prisma. During the build process (`npm run build`), it will install server dependencies and generate the Prisma Client.
*   **Migrations**: You should run migrations against your production database *before* or *during* deployment.
    *   Recommended: Run migrations locally pointing to the prod DB:
        ```bash
        # In your local terminal
        export DATABASE_URL="your_prod_db_url"
        cd server
        npx prisma migrate deploy
        ```
*   **Cold Starts**: Netlify Functions sleep after inactivity. The first request might take a few seconds to wake up and connect to the database.
*   **Backups**: Local backups are disabled. Use your cloud database provider's backup solution.

## Troubleshooting

*   **502 Bad Gateway**: Usually means the function crashed. Check "Function logs" in Netlify.
*   **Prisma Errors**: Ensure `DATABASE_URL` is correct and the database is accessible from the internet (0.0.0.0/0).
