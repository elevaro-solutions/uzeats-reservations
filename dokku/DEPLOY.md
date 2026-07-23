# Dokku Deployment Guide

## Prerequisites

- A server with Dokku installed (v0.30+)
- Domain pointing to your server (e.g., `tablevera.online`)
- MongoDB — use MongoDB Atlas or self-hosted (replica set not required)
- Redis instance for BullMQ job queues

## Architecture

Three Dokku apps run from separate Dockerfiles in this monorepo:

| App | Dockerfile | Port | Domain |
|-----|-----------|------|--------|
| `tablevera-api` | `Dockerfile.api` | 4000 | `api.tablevera.online` |
| `tablevera-web` | `Dockerfile.web` | 3000 | `tablevera.online` |
| `tablevera-dashboard` | `Dockerfile.dashboard` | 3001 | `dashboard.tablevera.online` |

## Server Setup

```bash
# Create apps
dokku apps:create tablevera-api
dokku apps:create tablevera-web
dokku apps:create tablevera-dashboard

# Set domains
dokku domains:set tablevera-api api.tablevera.online
dokku domains:set tablevera-web tablevera.online
dokku domains:set tablevera-dashboard dashboard.tablevera.online

# Set builder to Dockerfile and specify which file to use
dokku builder:set tablevera-api build-dir .
dokku builder-dockerfile:set tablevera-api dockerfile-path Dockerfile.api

dokku builder:set tablevera-web build-dir .
dokku builder-dockerfile:set tablevera-web dockerfile-path Dockerfile.web

dokku builder:set tablevera-dashboard build-dir .
dokku builder-dockerfile:set tablevera-dashboard dockerfile-path Dockerfile.dashboard

# Set ports
dokku ports:set tablevera-api http:80:4000
dokku ports:set tablevera-web http:80:3000
dokku ports:set tablevera-dashboard http:80:3001

# Enable SSL with Let's Encrypt
dokku letsencrypt:enable tablevera-api
dokku letsencrypt:enable tablevera-web
dokku letsencrypt:enable tablevera-dashboard
```

## Environment Variables

### API

```bash
dokku config:set tablevera-api \
  NODE_ENV=production \
  PORT=4000 \
  MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net/reservations?retryWrites=true&w=majority" \
  REDIS_URL="redis://default:password@redis-host:6379" \
  JWT_ACCESS_SECRET="$(openssl rand -base64 32)" \
  JWT_REFRESH_SECRET="$(openssl rand -base64 32)" \
  JWT_ACCESS_EXPIRES=15m \
  JWT_REFRESH_EXPIRES=7d \
  CORS_ORIGINS="https://tablevera.online,https://dashboard.tablevera.online" \
  AUTH_DEV_OTP=false \
  STRIPE_SECRET_KEY="sk_live_..." \
  STRIPE_WEBHOOK_SECRET="whsec_..." \
  STRIPE_CURRENCY=usd \
  RESEND_API_KEY="re_..." \
  EMAIL_FROM="noreply@tablevera.online" \
  DO_SPACES_KEY="..." \
  DO_SPACES_SECRET="..." \
  DO_SPACES_ENDPOINT="https://nyc3.digitaloceanspaces.com" \
  DO_SPACES_BUCKET="tablevera" \
  DO_SPACES_CDN="https://tablevera.nyc3.cdn.digitaloceanspaces.com" \
  VAPID_PUBLIC_KEY="..." \
  VAPID_PRIVATE_KEY="..." \
  VAPID_SUBJECT="mailto:admin@tablevera.online"
```

### Web

```bash
dokku config:set tablevera-web \
  NODE_ENV=production

# Build-time args (for Next.js static optimization)
dokku docker-options:add tablevera-web build \
  "--build-arg NEXT_PUBLIC_API_URL=https://api.tablevera.online/graphql" \
  "--build-arg NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_..." \
  "--build-arg NEXT_PUBLIC_VAPID_PUBLIC_KEY=..." \
  "--build-arg NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=..." \
  "--build-arg NEXT_PUBLIC_GOOGLE_CLIENT_ID=..."
```

For Google sign-in, set the same OAuth Web client ID on the API (`GOOGLE_CLIENT_ID`) and as the web build arg (`NEXT_PUBLIC_GOOGLE_CLIENT_ID`). In Google Cloud Console, add your diner origins (e.g. `https://tablevera.online`, `http://localhost:3000`) under Authorized JavaScript origins.

### Dashboard

```bash
dokku config:set tablevera-dashboard \
  NODE_ENV=production

dokku docker-options:add tablevera-dashboard build \
  "--build-arg NEXT_PUBLIC_API_URL=https://api.tablevera.online/graphql" \
  "--build-arg NEXT_PUBLIC_WEB_URL=https://tablevera.online"
```

## Deploy

### Option A: Git Push (per-app)

```bash
# Add Dokku remotes
git remote add dokku-api dokku@your-server:tablevera-api
git remote add dokku-web dokku@your-server:tablevera-web
git remote add dokku-dashboard dokku@your-server:tablevera-dashboard

# Deploy all
git push dokku-api main
git push dokku-web main
git push dokku-dashboard main
```

### Option B: GitHub Actions (automated)

See `.github/workflows/deploy.yml` — pushes to `main` trigger automated deployment.

## Health Checks

```bash
# API health
dokku checks:set tablevera-api web /health

# Verify deployments
curl https://api.tablevera.online/health
curl https://tablevera.online
curl https://dashboard.tablevera.online
```

## Scaling

```bash
# Scale API workers (for BullMQ processing)
dokku ps:scale tablevera-api web=1

# Scale web frontends
dokku ps:scale tablevera-web web=1
dokku ps:scale tablevera-dashboard web=1
```

## Stripe Webhook

After first deploy, set up the Stripe webhook:
- Endpoint: `https://api.tablevera.online/webhooks/stripe`
- Events: `payment_intent.amount_capturable_updated`, `payment_intent.succeeded`

## Rollback

```bash
dokku ps:rollback tablevera-api
dokku ps:rollback tablevera-web
dokku ps:rollback tablevera-dashboard
```

## Logs

```bash
dokku logs tablevera-api -t
dokku logs tablevera-web -t
dokku logs tablevera-dashboard -t
```
