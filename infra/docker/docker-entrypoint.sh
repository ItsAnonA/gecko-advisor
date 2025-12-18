#!/bin/sh
set -e

echo "=== Nginx Startup Validation ==="

# Validate required environment variables
if [ -z "$BACKEND_PROXY_URL" ]; then
  echo "ERROR: BACKEND_PROXY_URL is not set"
  exit 1
fi

if [ -z "$NEXTJS_PROXY_URL" ]; then
  echo "ERROR: NEXTJS_PROXY_URL is not set"
  exit 1
fi

echo "Environment variables validated:"
echo "  BACKEND_PROXY_URL: $BACKEND_PROXY_URL"
echo "  NEXTJS_PROXY_URL: $NEXTJS_PROXY_URL"
env | grep -E '^CSP=' || echo "  CSP: not set (using default)"

# Use envsubst to substitute variables in nginx template
echo "Generating nginx config from template..."
envsubst '${CSP} ${BACKEND_PROXY_URL} ${NEXTJS_PROXY_URL}' < /nginx.tmpl.conf > /etc/nginx/nginx.conf

# Validate nginx config before starting
echo "Validating nginx configuration..."
nginx -t || {
  echo "ERROR: Invalid nginx configuration"
  cat /etc/nginx/nginx.conf
  exit 1
}

echo "Nginx config validated successfully"
echo "=== Starting nginx ==="
exec nginx -g 'daemon off;'
