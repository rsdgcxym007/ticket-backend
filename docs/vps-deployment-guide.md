# 🚀 VPS Deployment Guide
## Ticket Backend System on Ubuntu 24.04

### 📋 **Server Information**
- **IP Address:** 43.229.133.51
- **OS:** Ubuntu 24.04
- **Memory:** 4 GB RAM
- **CPU:** 2 Cores
- **Disk:** 100 GB
- **Application Port:** 4001
- **Database:** PostgreSQL on port 5432

---

## 🛠️ **Initial Server Setup**

### 1. Connect to VPS
```bash
ssh root@43.229.133.51
```

### 2. Run deployment script
```bash
# Make script executable
chmod +x scripts/deploy-vps.sh

# Run deployment script
./scripts/deploy-vps.sh
```

---

## 📦 **Application Deployment**

### 1. Clone repository
```bash
cd /var/www
git clone https://github.com/rsdgcxym007/ticket-backend.git
cd ticket-backend
```

### 2. Install dependencies
```bash
npm install
```

### 3. Build application
```bash
npm run build
```

### 4. Setup environment
```bash
# Copy production environment file
cp .env.production .env

# Install PM2 globally
npm install -g pm2
```

### 5. Start application with PM2
```bash
# Start application
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup PM2 startup
pm2 startup

# Check status
pm2 status
```

---

## 🗄️ **Database Configuration**

### PostgreSQL Setup
```sql
-- Connect to PostgreSQL
sudo -u postgres psql

-- Create user and database
CREATE USER boxing_user WITH PASSWORD 'Password123!';
CREATE DATABASE boxing_ticket_db OWNER boxing_user;
GRANT ALL PRIVILEGES ON DATABASE boxing_ticket_db TO boxing_user;

-- Exit PostgreSQL
\q
```

### Database Connection Test
```bash
# Test connection
psql -h 43.229.133.51 -U boxing_user -d boxing_ticket_db
```

---

## ⚡ **Redis Setup**

### Install and Configure Redis
```bash
# Install Redis
sudo apt install redis-server -y

# Start Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Test Redis
redis-cli ping
```

---

## 🌐 **Nginx Configuration**

### Setup Reverse Proxy
```bash
# Install Nginx
sudo apt install nginx -y

# Enable site configuration
sudo ln -s /etc/nginx/sites-available/ticket-backend /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### Access Points
- **Main Application:** http://43.229.133.51
- **API Endpoints:** http://43.229.133.51/api/
- **Health Check:** http://43.229.133.51/health
- **Swagger Documentation:** http://43.229.133.51/api/docs

---

## 📊 **Monitoring Setup**

### PM2 Monitoring
```bash
# View logs
pm2 logs

# Monitor processes
pm2 monit

# Restart application
pm2 restart ticket-backend-prod
```

### System Monitoring
```bash
# Check system resources
htop

# Check disk usage
df -h

# Check memory usage
free -h

# Check network connections
netstat -tulpn
```

---

## 🔧 **Maintenance Commands**

### Application Updates
```bash
# Pull latest code
git pull origin main

# Install new dependencies
npm install

# Rebuild application
npm run build

# Restart with PM2
pm2 restart ticket-backend-prod
```

### Database Backup
```bash
# Backup database
pg_dump -h 43.229.133.51 -U boxing_user boxing_ticket_db > backup_$(date +%Y%m%d).sql

# Restore database
psql -h 43.229.133.51 -U boxing_user boxing_ticket_db < backup_20241211.sql
```

### Log Management
```bash
# View application logs
pm2 logs ticket-backend-prod

# View Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# View system logs
sudo journalctl -u nginx
sudo journalctl -u postgresql
```

---

## 🔒 **Security Configuration**

### Firewall Setup
```bash
# Configure UFW
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw allow 4001/tcp    # Application
sudo ufw allow 5432/tcp    # PostgreSQL
sudo ufw allow 6379/tcp    # Redis
sudo ufw --force enable
```

### SSL Certificate (Optional)
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com
```

---

## 🚨 **Troubleshooting**

### Common Issues

#### Port Already in Use
```bash
# Kill process on port 4001
sudo lsof -ti:4001 | xargs kill -9

# Restart application
pm2 restart ticket-backend-prod
```

#### Database Connection Issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql

# Check database connections
sudo -u postgres psql -c "SELECT * FROM pg_stat_activity;"
```

#### Application Not Starting
```bash
# Check PM2 logs
pm2 logs ticket-backend-prod

# Check application logs
tail -f /var/log/pm2/ticket-backend-error.log

# Restart application
pm2 restart ticket-backend-prod
```

### Performance Optimization
```bash
# Check CPU usage
top

# Check memory usage
free -h

# Check disk I/O
iostat

# Optimize database
sudo -u postgres psql boxing_ticket_db -c "VACUUM ANALYZE;"
```

---

## 📈 **Scaling Considerations**

### Current Setup (4GB RAM, 2 Cores)
- **PM2 Instances:** 2 (cluster mode)
- **Max Memory per Instance:** 1GB
- **Database Connections:** 20 per instance
- **Redis Memory:** 512MB

### Recommended Upgrades
- **8GB RAM:** Increase to 4 PM2 instances
- **4 Cores:** Better parallel processing
- **SSD Storage:** Faster database operations
- **Load Balancer:** For multiple servers

---

## 📞 **Support Information**

**Server Access:**
- SSH: `ssh root@43.229.133.51`
- Application: http://43.229.133.51:4001
- Database: 43.229.133.51:5432

**Log Locations:**
- Application Logs: `/var/log/pm2/`
- Nginx Logs: `/var/log/nginx/`
- System Logs: `/var/log/syslog`

**Configuration Files:**
- Environment: `/var/www/ticket-backend/.env`
- PM2 Config: `/var/www/ticket-backend/ecosystem.config.js`
- Nginx Config: `/etc/nginx/sites-available/ticket-backend`
