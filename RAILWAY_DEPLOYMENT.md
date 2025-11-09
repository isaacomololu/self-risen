# Railway Deployment Quick Reference

## Quick Checklist

- [ ] Create Railway account and project
- [ ] Add PostgreSQL service
- [ ] Add Redis service (optional but recommended)
- [ ] Add application service (connect GitHub repo)
- [ ] Link PostgreSQL to application (auto-populates `DATABASE_URL`)
- [ ] Link Redis to application (if using)
- [ ] Set all required environment variables
- [ ] Set `FIREBASE_CREDENTIALS` environment variable (or mount file)
- [ ] Deploy and verify migrations run
- [ ] Test the application endpoint
- [ ] Configure custom domain (optional)

## Required Environment Variables

Copy these to Railway's Variables tab:

```bash
NODE_ENV=production
BASE_URL=https://your-app-name.up.railway.app
FRONTEND_URL=https://your-frontend-domain.com
JWT_SECRET=your-secret-key
JWT_EXPIRATION=7d
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password
OAUTH_CLIENTID=your-oauth-client-id
OAUTH_CLIENT_SECRET=your-oauth-client-secret
OAUTH_REFRESH_TOKEN=your-oauth-refresh-token
FIREBASE_CREDENTIALS={"type":"service_account",...}
```

## Service References

When linking services, Railway automatically provides:

- `DATABASE_URL` from PostgreSQL service
- `REDIS_HOST` and `REDIS_PORT` from Redis service (if linked)

Use service references:

```bash
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_HOST=${{Redis.REDIS_HOST}}
REDIS_PORT=${{Redis.REDIS_PORT}}
```

## Firebase Credentials

**Option 1 (Recommended):** Add as environment variable

```bash
FIREBASE_CREDENTIALS={"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}
```

**Option 2:** Mount as file volume at `/app/firebase-credentials.json`

## Deployment Commands

```bash
# View logs
railway logs

# Run migrations manually
railway run npx prisma migrate deploy

# Open shell
railway shell

# Deploy
railway up
```

## Troubleshooting

**Build fails?** Check build logs, verify Dockerfile syntax

**App won't start?** Check application logs, verify all env vars are set

**Database connection error?** Ensure PostgreSQL is linked, check `DATABASE_URL`

**Migrations not running?** Check startup logs, run manually if needed

For detailed instructions, see [README.railway.md](./README.railway.md)
