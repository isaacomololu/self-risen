# Railway Deployment Guide

This guide will help you deploy the Self-Risen application to Railway.

## Prerequisites

- A Railway account ([railway.app](https://railway.app))
- GitHub repository (or connect via Railway CLI)
- Environment variables ready

## Step 1: Create a New Project on Railway

1. Go to [railway.app](https://railway.app) and sign in
2. Click "New Project"
3. Select "Deploy from GitHub repo" (recommended) or "Empty Project"

## Step 2: Add Services

You'll need to add three services:

### 2.1 PostgreSQL Database

1. Click "New" → "Database" → "Add PostgreSQL"
2. Railway will automatically create a PostgreSQL database
3. Note the connection details (you'll need the `DATABASE_URL`)

### 2.2 Redis (Optional but Recommended)

1. Click "New" → "Database" → "Add Redis"
2. Railway will create a Redis instance
3. Note the connection details (you'll need `REDIS_HOST` and `REDIS_PORT`)

### 2.3 Application Service

1. Click "New" → "GitHub Repo" (or "Empty Service" if using CLI)
2. Select your repository
3. Railway will detect the Dockerfile and start building

## Step 3: Configure Environment Variables

In your application service, go to the "Variables" tab and add the following:

### Required Variables

```bash
# Application
NODE_ENV=production
PORT=8080  # Railway sets this automatically, but include for safety
BASE_URL=https://your-app-name.up.railway.app  # Update with your Railway URL
FRONTEND_URL=https://your-frontend-domain.com  # Your frontend URL

# Database (Railway provides this automatically if you link the service)
# DATABASE_URL will be auto-populated when you link the PostgreSQL service

# Redis (if using Redis service)
REDIS_HOST=${{Redis.REDIS_HOST}}  # Reference the Redis service
REDIS_PORT=${{Redis.REDIS_PORT}}  # Reference the Redis service

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRATION=7d

# Email (Nodemailer)
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password

# OAuth
OAUTH_CLIENTID=your-oauth-client-id
OAUTH_CLIENT_SECRET=your-oauth-client-secret
OAUTH_REFRESH_TOKEN=your-oauth-refresh-token
```

### Optional Variables

```bash
# Mailgun (for email notifications)
MAILGUN_API_KEY=your-mailgun-api-key
MAILGUN_DOMAIN=your-domain.com
MAILGUN_FROM_EMAIL=noreply@your-domain.com

# Twilio (for SMS notifications)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# Firebase (for push notifications)
# Paste entire JSON from firebase-credentials.json as a single-line JSON string
FIREBASE_CREDENTIALS={"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}
```

## Step 4: Link Services

1. In your application service, go to the "Settings" tab
2. Under "Service Connections", link:
   - PostgreSQL service (this auto-populates `DATABASE_URL`)
   - Redis service (if you added one)

## Step 5: Add Firebase Credentials

The application now supports loading Firebase credentials from environment variables (Railway-friendly). Choose one option:

### Option 1: Environment Variable (Recommended for Railway)

1. Copy the entire contents of your `firebase-credentials.json` file
2. In Railway, add a new environment variable:

   ```bash
   FIREBASE_CREDENTIALS={"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}
   ```

   Paste the entire JSON object as the value (all on one line, or use Railway's multi-line support)

3. The application will automatically use this environment variable

### Option 2: Railway File Mount

1. In your service settings, go to "Volumes"
2. Create a new volume
3. Mount it to `/app/firebase-credentials.json`
4. Upload your `firebase-credentials.json` file

**Note:** The application checks for `FIREBASE_CREDENTIALS` environment variable first, then falls back to the file.

## Step 6: Deploy

1. Railway will automatically deploy when you push to your connected branch
2. Or manually trigger a deployment from the Railway dashboard
3. Watch the build logs to ensure everything builds correctly

## Step 7: Run Database Migrations

Migrations run automatically on startup (see Dockerfile CMD), but you can also run them manually:

1. Go to your application service
2. Click "Deployments" → Select the latest deployment
3. Click "View Logs" to see migration output

Or use Railway CLI:

```bash
railway run npx prisma migrate deploy
```

## Step 8: Configure Custom Domain (Optional)

1. Go to your application service → "Settings" → "Networking"
2. Click "Generate Domain" or "Add Custom Domain"
3. Update your `BASE_URL` environment variable with the new domain

## Railway CLI (Alternative Method)

You can also deploy using Railway CLI:

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Link to existing project
railway link

# Set environment variables
railway variables set NODE_ENV=production
railway variables set JWT_SECRET=your-secret
# ... add all other variables

# Deploy
railway up
```

## Monitoring

- **Logs**: View real-time logs in the Railway dashboard
- **Metrics**: Check CPU, memory, and network usage
- **Deployments**: View deployment history and rollback if needed

## Troubleshooting

### Build Fails

- Check build logs for errors
- Ensure all dependencies are in `package.json`
- Verify Dockerfile syntax

### Application Won't Start

- Check application logs
- Verify all required environment variables are set
- Ensure database connection is working (check `DATABASE_URL`)
- Verify Redis connection (if using)

### Database Connection Issues

- Ensure PostgreSQL service is linked
- Check `DATABASE_URL` is correctly set
- Verify database is running (check service status)

### Migrations Not Running

- Check startup logs for migration output
- Run migrations manually: `railway run npx prisma migrate deploy`
- Verify Prisma schema is correct

### Firebase Credentials Not Found

- Ensure `firebase-credentials.json` is mounted or available
- Check file path in your code
- Consider using environment variables instead

## Environment Variable References

Railway supports referencing other services:

```bash
# Reference PostgreSQL
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Reference Redis
REDIS_HOST=${{Redis.REDIS_HOST}}
REDIS_PORT=${{Redis.REDIS_PORT}}
```

## Cost Optimization

- Railway offers a free tier with $5 credit
- PostgreSQL and Redis services are charged separately
- Monitor usage in the dashboard
- Consider using Railway's shared databases for development

## Useful Commands

```bash
# View logs
railway logs

# Run commands in the service
railway run <command>

# Open shell
railway shell

# View variables
railway variables

# Deploy
railway up
```

## Next Steps

1. Set up CI/CD (Railway auto-deploys on git push)
2. Configure monitoring and alerts
3. Set up staging environment
4. Configure custom domains
5. Set up backups for PostgreSQL

For more information, visit [Railway Documentation](https://docs.railway.app).
