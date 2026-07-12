# Dokku Deployment Guide

## Prerequisites

- A server with Dokku installed (v0.30+)
- Domain pointing to your server (e.g., `reservetable.com`)
- MongoDB with replica set (for transactions) — use MongoDB Atlas or self-hosted
- Redis instance for BullMQ job queues

## Architecture

Three Dokku apps run from separate Dockerfiles in this monorepo:

| App | Dockerfile | Port | Domain |
|-----|-----------|------|--------|
| `reservetable-api` | `Dockerfile.api` | 4000 | `api.reservetable.com` |
| `reservetable-web` | `Dockerfile.web` | 3000 | `reservetable.com` |
| `reservetable-dashboard` | `Dockerfile.dashboard` | 3001 | `dashboard.reservetable.com` |

## Server Setup

```bash
# Create apps
dokku apps:create reservetable-api
dokku apps:create reservetable-web
dokku apps:create reservetable-dashboard

# Set domains
dokku domains:set reservetable-api api.reservetable.com
dokku domains:set reservetable-web reservetable.com
dokku domains:set reservetable-dashboard dashboard.reservetable.com

# Set builder to Dockerfile and specify which file to use
dokku builder:set reservetable-api build-dir .
dokku builder-dockerfile:set reservetable-api dockerfile-path Dockerfile.api

dokku builder:set reservetable-web build-dir .
dokku builder-dockerfile:set reservetable-web dockerfile-path Dockerfile.web

dokku builder:set reservetable-dashboard build-dir .
dokku builder-dockerfile:set reservetable-dashboard dockerfile-path Dockerfile.dashboard

# Set ports
dokku ports:set reservetable-api http:80:4000
dokku ports:set reservetable-web http:80:3000
dokku ports:set reservetable-dashboard http:80:3001

# Enable SSL with Let's Encrypt
dokku letsencrypt:enable reservetable-api
dokku letsencrypt:enable reservetable-web
dokku letsencrypt:enable reservetable-dashboard
```

## Environment Variables

### API

```bash
dokku config:set reservetable-api \
  NODE_ENV=production \
  PORT=4000 \
  MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net/reservations?retryWrites=true&w=majority" \
  REDIS_URL="redis://default:password@redis-host:6379" \
  JWT_ACCESS_SECRET="$(openssl rand -base64 32)" \
  JWT_REFRESH_SECRET="$(openssl rand -base64 32)" \
  JWT_ACCESS_EXPIRES=15m \
  JWT_REFRESH_EXPIRES=7d \
  CORS_ORIGINS="https://reservetable.com,https://dashboard.reservetable.com" \
  AUTH_DEV_OTP=false \
  STRIPE_SECRET_KEY="sk_live_..." \
  STRIPE_WEBHOOK_SECRET="whsec_..." \
  STRIPE_CURRENCY=usd \
  RESEND_API_KEY="re_..." \
  EMAIL_FROM="noreply@reservetable.com" \
  DO_SPACES_KEY="..." \
  DO_SPACES_SECRET="..." \
  DO_SPACES_ENDPOINT="https://nyc3.digitaloceanspaces.com" \
  DO_SPACES_BUCKET="reservetable" \
  DO_SPACES_CDN="https://reservetable.nyc3.cdn.digitaloceanspaces.com" \
  VAPID_PUBLIC_KEY="..." \
  VAPID_PRIVATE_KEY="..." \
  VAPID_SUBJECT="mailto:admin@reservetable.com"
```

### Web

```bash
dokku config:set reservetable-web \
  NODE_ENV=production

# Build-time args (for Next.js static optimization)
dokku docker-options:add reservetable-web build \
  "--build-arg NEXT_PUBLIC_API_URL=https://api.reservetable.com/graphql" \
  "--build-arg NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_..." \
  "--build-arg NEXT_PUBLIC_VAPID_PUBLIC_KEY=..."
```

### Dashboard

```bash
dokku config:set reservetable-dashboard \
  NODE_ENV=production

dokku docker-options:add reservetable-dashboard build \
  "--build-arg NEXT_PUBLIC_API_URL=https://api.reservetable.com/graphql"
```

## Deploy

### Option A: Git Push (per-app)

```bash
# Add Dokku remotes
git remote add dokku-api dokku@your-server:reservetable-api
git remote add dokku-web dokku@your-server:reservetable-web
git remote add dokku-dashboard dokku@your-server:reservetable-dashboard

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
dokku checks:set reservetable-api web /health

# Verify deployments
curl https://api.reservetable.com/health
curl https://reservetable.com
curl https://dashboard.reservetable.com
```

## Scaling

```bash
# Scale API workers (for BullMQ processing)
dokku ps:scale reservetable-api web=1

# Scale web frontends
dokku ps:scale reservetable-web web=1
dokku ps:scale reservetable-dashboard web=1
```

## Stripe Webhook

After first deploy, set up the Stripe webhook:
- Endpoint: `https://api.reservetable.com/webhooks/stripe`
- Events: `payment_intent.amount_capturable_updated`, `payment_intent.succeeded`

## Rollback

```bash
dokku ps:rollback reservetable-api
dokku ps:rollback reservetable-web
dokku ps:rollback reservetable-dashboard
```

## Logs

```bash
dokku logs reservetable-api -t
dokku logs reservetable-web -t
dokku logs reservetable-dashboard -t
```
