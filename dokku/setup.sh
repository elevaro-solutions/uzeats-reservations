#!/bin/bash
set -euo pipefail

# ReserveTable Dokku Setup Script
# Run this on your Dokku server to initialize the apps.
# Usage: bash setup.sh <domain>
# Example: bash setup.sh reservetable.com

DOMAIN="${1:?Usage: bash setup.sh <domain>}"
API_APP="reservetable-api"
WEB_APP="reservetable-web"
DASH_APP="reservetable-dashboard"

echo "==> Setting up ReserveTable on $DOMAIN"

# Create apps
echo "==> Creating apps..."
dokku apps:create $API_APP 2>/dev/null || echo "$API_APP already exists"
dokku apps:create $WEB_APP 2>/dev/null || echo "$WEB_APP already exists"
dokku apps:create $DASH_APP 2>/dev/null || echo "$DASH_APP already exists"

# Set domains
echo "==> Configuring domains..."
dokku domains:set $API_APP "api.$DOMAIN"
dokku domains:set $WEB_APP "$DOMAIN"
dokku domains:set $DASH_APP "dashboard.$DOMAIN"

# Set Dockerfile paths
echo "==> Configuring builders..."
dokku builder-dockerfile:set $API_APP dockerfile-path Dockerfile.api
dokku builder-dockerfile:set $WEB_APP dockerfile-path Dockerfile.web
dokku builder-dockerfile:set $DASH_APP dockerfile-path Dockerfile.dashboard

# Set port mappings
echo "==> Configuring ports..."
dokku ports:set $API_APP http:80:4000
dokku ports:set $WEB_APP http:80:3000
dokku ports:set $DASH_APP http:80:3001

# Health checks
echo "==> Configuring health checks..."
dokku checks:set $API_APP web /health

# Docker build args for Next.js apps
echo "==> Setting build args..."
dokku docker-options:add $WEB_APP build "--build-arg NEXT_PUBLIC_API_URL=https://api.$DOMAIN/graphql"
dokku docker-options:add $DASH_APP build "--build-arg NEXT_PUBLIC_API_URL=https://api.$DOMAIN/graphql"

# Zero-downtime deploy settings
echo "==> Configuring zero-downtime..."
dokku checks:enable $API_APP
dokku checks:enable $WEB_APP
dokku checks:enable $DASH_APP

echo ""
echo "==> Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Set environment variables:"
echo "     dokku config:set $API_APP NODE_ENV=production MONGODB_URI=... REDIS_URL=... ..."
echo "  2. Enable SSL:"
echo "     dokku letsencrypt:enable $API_APP"
echo "     dokku letsencrypt:enable $WEB_APP"
echo "     dokku letsencrypt:enable $DASH_APP"
echo "  3. Push code:"
echo "     git push dokku-api main"
echo ""
echo "See dokku/DEPLOY.md for full instructions."
