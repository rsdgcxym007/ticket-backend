# Deployment Instructions

## Quick Start Deployment

### Step 1: Prepare Your EC2 Instance

1. Connect to your EC2 instance:
```bash
ssh -i ticket-backend.pem ubuntu@54.221.160.173
```

2. Run the setup script:
```bash
# Download and run the setup script
curl -o setup-ec2.sh https://raw.githubusercontent.com/your-username/ticket-backend/main/scripts/setup-ec2.sh
chmod +x setup-ec2.sh
./setup-ec2.sh
```

Or manually copy the setup script from `scripts/setup-ec2.sh` and run it.

### Step 2: Setup Database

1. Set environment variables and run database setup:
```bash
export DATABASE_HOST="database-1.c8p4wog2qp5o.us-east-1.rds.amazonaws.com"
export DATABASE_USERNAME="postgres"
export DATABASE_PASSWORD="your-rds-password"
export DATABASE_NAME="ticket_backend"

# Download and run database setup
curl -o setup-database.sh https://raw.githubusercontent.com/your-username/ticket-backend/main/scripts/setup-database.sh
chmod +x setup-database.sh
./setup-database.sh
```

### Step 3: Configure GitHub Secrets

Follow the guide in `docs/GITHUB_SECRETS_SETUP.md` to set up all required secrets.

### Step 4: Deploy

Push your code to the main branch to trigger automatic deployment:

```bash
git add .
git commit -m "Add CI/CD configuration"
git push origin main
```

## Manual Deployment (Alternative)

If you prefer to deploy manually without GitHub Actions:

### 1. Build and Deploy Locally

```bash
# Build the application
npm run build

# Create deployment package
tar -czf deployment.tar.gz dist package*.json ecosystem.config.js

# Copy to EC2
scp -i ticket-backend.pem deployment.tar.gz ubuntu@54.221.160.173:/var/www/ticket-backend/

# SSH and extract
ssh -i ticket-backend.pem ubuntu@54.221.160.173
cd /var/www/ticket-backend
tar -xzf deployment.tar.gz
npm ci --only=production

# Set environment variables
cat > .env << EOF
NODE_ENV=production
PORT=4000
DATABASE_HOST=database-1.c8p4wog2qp5o.us-east-1.rds.amazonaws.com
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=your-rds-password
DATABASE_NAME=ticket_backend
JWT_SECRET=your-jwt-secret
EOF

# Start with PM2
pm2 start ecosystem.config.js --env production
pm2 save
```

## Docker Deployment (Alternative)

### 1. Build and Run with Docker

```bash
# Build Docker image
docker build -t ticket-backend .

# Run with Docker Compose
docker-compose up -d
```

### 2. Deploy to EC2 with Docker

```bash
# Install Docker on EC2
ssh -i ticket-backend.pem ubuntu@54.221.160.173
sudo apt update
sudo apt install -y docker.io docker-compose
sudo usermod -aG docker ubuntu
# Logout and login again

# Transfer docker-compose.yml
scp -i ticket-backend.pem docker-compose.yml ubuntu@54.221.160.173:/home/ubuntu/

# Deploy
docker-compose up -d
```

## Monitoring and Maintenance

### Check Application Status
```bash
# PM2 status
pm2 status
pm2 logs ticket-backend

# Nginx status
sudo systemctl status nginx

# Check application health
curl http://localhost:4000/health
```

### Update Application
```bash
# Stop application
pm2 stop ticket-backend

# Pull latest code (if using git)
git pull origin main
npm ci --only=production
npm run build

# Restart application
pm2 start ecosystem.config.js --env production
```

### Database Management
```bash
# Connect to RDS
PGPASSWORD=your-password psql -h database-1.c8p4wog2qp5o.us-east-1.rds.amazonaws.com -U postgres -d ticket_backend

# Backup database
PGPASSWORD=your-password pg_dump -h database-1.c8p4wog2qp5o.us-east-1.rds.amazonaws.com -U postgres ticket_backend > backup.sql
```

## Troubleshooting

### Application Issues
- Check PM2 logs: `pm2 logs ticket-backend`
- Check environment variables: `cat .env`
- Restart application: `pm2 restart ticket-backend`

### Database Issues
- Test connection: `./scripts/setup-database.sh`
- Check security groups in AWS console
- Verify RDS instance is running

### Nginx Issues
- Test configuration: `sudo nginx -t`
- Check logs: `sudo tail -f /var/log/nginx/error.log`
- Restart: `sudo systemctl restart nginx`

## Performance Optimization

### PM2 Cluster Mode
```javascript
// Update ecosystem.config.js
module.exports = {
  apps: [{
    name: 'ticket-backend',
    script: 'dist/main.js',
    instances: 'max', // Use all CPU cores
    exec_mode: 'cluster'
  }]
};
```

### Nginx Caching
Add to nginx configuration:
```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

## Security Checklist

- [ ] Change default passwords
- [ ] Configure proper security groups
- [ ] Enable SSL/TLS certificates
- [ ] Set up regular backups
- [ ] Monitor logs for suspicious activity
- [ ] Keep dependencies updated
