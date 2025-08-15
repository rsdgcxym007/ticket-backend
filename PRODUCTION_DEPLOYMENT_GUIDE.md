# Production Deployment Guide for Patong Boxing Stadium API

## Overview
This guide covers deploying the Patong Boxing Stadium backend API to `api-patongboxingstadiumticket.com`.

## Prerequisites
- Server with Ubuntu/CentOS/RHEL
- Root or sudo access
- Domain `patongboxingstadiumticket.com` pointing to your server
- Subdomain `api-patongboxingstadiumticket.com` pointing to your server

## DNS Configuration

### 1. Configure DNS Records
Add these DNS records in your domain registrar's control panel:

```
Type    Name    Value                   TTL
A       @       YOUR_SERVER_IP          3600
A       api     YOUR_SERVER_IP          3600
CNAME   www     patongboxingstadiumticket.com  3600
```

### 2. Verify DNS Propagation
```bash
# Check main domain
nslookup patongboxingstadiumticket.com

# Check API subdomain
nslookup api-patongboxingstadiumticket.com
```

## Server Setup

### 1. Initial Server Configuration
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y curl git nginx certbot python3-certbot-nginx postgresql-client redis-tools
```

### 2. Install Node.js and PM2
```bash
# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Setup PM2 startup
pm2 startup
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp $HOME
```

## Application Deployment

### 1. Deploy Application
```bash
# Navigate to web directory
cd /var/www

# Clone repository
sudo git clone YOUR_REPOSITORY_URL api-patongboxingstadiumticket.com

# Set permissions
sudo chown -R $USER:$USER api-patongboxingstadiumticket.com
cd api-patongboxingstadiumticket.com

# Install dependencies
npm ci --production

# Build application
npm run build
```

### 2. Environment Configuration
```bash
# Create production environment file
cp .env.production.example .env.production

# Edit environment variables
nano .env.production
```

Update `.env.production` with your actual values:
```env
NODE_ENV=production
PORT=4000

# Domain Configuration
FRONTEND_URL=https://patongboxingstadiumticket.com
BACKEND_URL=https://api-patongboxingstadiumticket.com
API_URL=https://api-patongboxingstadiumticket.com/api

# Database Configuration
DATABASE_HOST=43.229.133.51
DATABASE_PORT=5432
DATABASE_USERNAME=boxing_user
DATABASE_PASSWORD=YOUR_ACTUAL_PASSWORD
DATABASE_NAME=patong_boxing_stadium

# Email Configuration
GMAIL_USER=info@patongboxingstadiumticket.com
GMAIL_PASSWORD=YOUR_APP_PASSWORD
EMAIL_FROM=info@patongboxingstadiumticket.com

# JWT Configuration
JWT_SECRET=YOUR_SECURE_JWT_SECRET_KEY

# Other configurations...
```

### 3. Start Application with PM2
```bash
# Start application
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Check status
pm2 status
pm2 logs patong-boxing-stadium
```

## Nginx Configuration

### 1. Create Nginx Configuration
```bash
sudo nano /etc/nginx/sites-available/api-patongboxingstadiumticket.com
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name api-patongboxingstadiumticket.com;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;

    # API reverse proxy
    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://127.0.0.1:4000/health;
        access_log off;
    }

    # Block access to sensitive files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }

    # Logging
    access_log /var/log/nginx/api-patongboxingstadiumticket.com.access.log;
    error_log /var/log/nginx/api-patongboxingstadiumticket.com.error.log;
}
```

### 2. Enable Site and Test Configuration
```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/api-patongboxingstadiumticket.com /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

## SSL Certificate Setup

### 1. Install SSL Certificate
```bash
# Install SSL certificate with Certbot
sudo certbot --nginx -d api-patongboxingstadiumticket.com

# Test auto-renewal
sudo certbot renew --dry-run
```

### 2. Configure Auto-Renewal
```bash
# Add to crontab
sudo crontab -e

# Add this line:
0 12 * * * /usr/bin/certbot renew --quiet
```

## Database Setup

### 1. Verify Database Connection
```bash
# Test database connection
psql -h 43.229.133.51 -U boxing_user -d patong_boxing_stadium -c "SELECT version();"
```

### 2. Run Database Migrations (if needed)
```bash
cd /var/www/api-patongboxingstadiumticket.com
npm run typeorm:run
```

## Monitoring and Maintenance

### 1. Application Monitoring
```bash
# Check PM2 status
pm2 status
pm2 logs patong-boxing-stadium --lines 100

# Monitor system resources
htop
free -h
df -h
```

### 2. Log Management
```bash
# Application logs
pm2 logs patong-boxing-stadium

# Nginx logs
sudo tail -f /var/log/nginx/api-patongboxingstadiumticket.com.access.log
sudo tail -f /var/log/nginx/api-patongboxingstadiumticket.com.error.log

# System logs
sudo journalctl -u nginx -f
```

### 3. Regular Maintenance
```bash
# Restart application
pm2 restart patong-boxing-stadium

# Reload Nginx
sudo systemctl reload nginx

# Update application
cd /var/www/api-patongboxingstadiumticket.com
git pull origin main
npm ci --production
npm run build
pm2 restart patong-boxing-stadium
```

## Testing Deployment

### 1. Health Check
```bash
curl -X GET https://api-patongboxingstadiumticket.com/health
```

### 2. API Documentation
Visit: `https://api-patongboxingstadiumticket.com/api`

### 3. Test CORS
```bash
curl -H "Origin: https://patongboxingstadiumticket.com" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS \
     https://api-patongboxingstadiumticket.com/api/events
```

## Troubleshooting

### Common Issues

1. **Application won't start**
   ```bash
   pm2 logs patong-boxing-stadium
   ```

2. **Database connection issues**
   ```bash
   ping 43.229.133.51
   telnet 43.229.133.51 5432
   ```

3. **SSL certificate issues**
   ```bash
   sudo certbot certificates
   sudo certbot renew --force-renewal -d api-patongboxingstadiumticket.com
   ```

4. **Nginx issues**
   ```bash
   sudo nginx -t
   sudo systemctl status nginx
   ```

### Performance Tuning

1. **PM2 Configuration**
   - Monitor memory usage: `pm2 monit`
   - Adjust instances if needed in `ecosystem.config.js`

2. **Nginx Optimization**
   - Enable gzip compression (already configured)
   - Implement caching for static assets
   - Tune worker processes

3. **Database Optimization**
   - Monitor query performance
   - Implement connection pooling
   - Regular database maintenance

## Security Checklist

- [ ] SSL certificate installed and auto-renewal configured
- [ ] Firewall configured (only allow ports 22, 80, 443)
- [ ] Database password changed from default
- [ ] JWT secret updated with secure value
- [ ] Rate limiting configured in Nginx
- [ ] Security headers configured
- [ ] Regular security updates scheduled

## Deployment Checklist

- [ ] DNS records configured
- [ ] Server dependencies installed
- [ ] Application deployed and built
- [ ] Environment variables configured
- [ ] PM2 process started
- [ ] Nginx configured and tested
- [ ] SSL certificate installed
- [ ] Database connection verified
- [ ] Health check passing
- [ ] API documentation accessible
- [ ] CORS configuration tested
- [ ] Monitoring configured
- [ ] Backup strategy implemented

## Contact Information

For support and maintenance questions, contact the development team with:
- Server logs from PM2 and Nginx
- Error messages and stack traces
- Steps to reproduce any issues
- Current system resource usage
