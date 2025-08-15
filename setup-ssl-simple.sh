#!/bin/bash

# Simple SSL Certificate Setup (Alternative Method)
# For patongboxingstadiumticket.com

set -e

echo "🔧 Simple SSL Setup for Patong Boxing Stadium"
echo "This is an alternative method if the main script fails"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root (use sudo)${NC}"
    exit 1
fi

# Variables
DOMAIN="patongboxingstadiumticket.com"
API_DOMAIN="api-patongboxingstadiumticket.com"
EMAIL="info@patongboxingstadiumticket.com"

echo -e "${YELLOW}Step 1: Installing required packages...${NC}"
apt update
apt install -y nginx certbot python3-certbot-nginx curl

echo -e "${YELLOW}Step 2: Creating basic Nginx configuration...${NC}"

# Create basic config for main domain
cat > /etc/nginx/sites-available/$DOMAIN << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}
EOF

# Create basic config for API domain
cat > /etc/nginx/sites-available/$API_DOMAIN << EOF
server {
    listen 80;
    server_name $API_DOMAIN;
    
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    location / {
        proxy_pass http://localhost:4000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Enable sites
ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/$API_DOMAIN /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test and restart nginx
nginx -t
systemctl restart nginx

echo -e "${YELLOW}Step 3: Waiting for DNS propagation check...${NC}"
echo "Checking if domains resolve to this server..."

# Check DNS
for domain in "$DOMAIN" "$API_DOMAIN"; do
    echo "Checking $domain..."
    if nslookup "$domain" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ $domain resolves${NC}"
    else
        echo -e "${RED}✗ $domain doesn't resolve yet${NC}"
        echo "Please wait for DNS propagation or check your DNS settings"
    fi
done

echo -e "${YELLOW}Step 4: Attempting to get SSL certificates...${NC}"

# Try to get certificates
echo "Getting certificate for main domain..."
if certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --email "$EMAIL" --agree-tos --non-interactive --redirect; then
    echo -e "${GREEN}✓ Main domain certificate successful${NC}"
else
    echo -e "${RED}✗ Main domain certificate failed${NC}"
fi

echo "Getting certificate for API domain..."
if certbot --nginx -d "$API_DOMAIN" --email "$EMAIL" --agree-tos --non-interactive --redirect; then
    echo -e "${GREEN}✓ API domain certificate successful${NC}"
else
    echo -e "${RED}✗ API domain certificate failed${NC}"
fi

echo -e "${YELLOW}Step 5: Updating Nginx configurations with CORS...${NC}"

# Update API domain config with CORS
cat > /etc/nginx/sites-available/$API_DOMAIN << EOF
server {
    listen 80;
    server_name $API_DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $API_DOMAIN;

    ssl_certificate /etc/letsencrypt/live/$API_DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$API_DOMAIN/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # CORS headers
    add_header Access-Control-Allow-Origin "https://$DOMAIN" always;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept, Authorization" always;
    add_header Access-Control-Allow-Credentials true always;

    location / {
        # Handle preflight requests
        if (\$request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin "https://$DOMAIN";
            add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
            add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept, Authorization";
            add_header Access-Control-Allow-Credentials true;
            add_header Content-Length 0;
            add_header Content-Type text/plain;
            return 204;
        }

        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    client_max_body_size 10M;
}
EOF

# Test and reload nginx
nginx -t
systemctl reload nginx

echo -e "${YELLOW}Step 6: Setting up auto-renewal...${NC}"
crontab -l 2>/dev/null | { cat; echo "0 12 * * * /usr/bin/certbot renew --quiet"; } | crontab -

echo -e "${GREEN}SSL setup completed!${NC}"
echo ""
echo "Testing your domains:"
echo "Main site: https://$DOMAIN"
echo "API site: https://$API_DOMAIN/health"
echo ""
echo "If certificates failed, check the troubleshooting guide or try manual method."

# Test certificates
echo -e "${YELLOW}Testing HTTPS connections...${NC}"
sleep 3

if curl -f -s "https://$DOMAIN" > /dev/null; then
    echo -e "${GREEN}✓ Main domain HTTPS working${NC}"
else
    echo -e "${RED}✗ Main domain HTTPS not working${NC}"
fi

if curl -f -s "https://$API_DOMAIN/health" > /dev/null; then
    echo -e "${GREEN}✓ API domain HTTPS working${NC}"
else
    echo -e "${RED}✗ API domain HTTPS not working yet${NC}"
    echo "Make sure your backend is running on port 4000"
fi

echo ""
echo "Certificate status:"
certbot certificates
