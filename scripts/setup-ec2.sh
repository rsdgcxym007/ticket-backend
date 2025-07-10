#!/bin/bash

# AWS EC2 Server Setup Script for Ubuntu 22.04 LTS
# Run this script on your EC2 instance to prepare it for deployment

set -e

echo "🚀 Starting AWS EC2 setup for NestJS application..."

# Update system packages
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
echo "📱 Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify Node.js installation
echo "Node.js version: $(node --version)"
echo "NPM version: $(npm --version)"

# Install PM2 globally
echo "🔧 Installing PM2..."
sudo npm install -g pm2

# Install Nginx
echo "🌐 Installing Nginx..."
sudo apt install -y nginx

# Install PostgreSQL client (for database management)
echo "🗄️ Installing PostgreSQL client..."
sudo apt install -y postgresql-client

# Create application directory
echo "📁 Creating application directory..."
sudo mkdir -p /var/www/ticket-backend
sudo chown -R $USER:$USER /var/www/ticket-backend

# Create log directory for PM2
echo "📝 Creating log directory..."
sudo mkdir -p /var/log/pm2
sudo chown -R $USER:$USER /var/log/pm2

# Setup firewall (UFW)
echo "🔥 Configuring firewall..."
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw allow 4000
sudo ufw --force enable

# Configure Nginx (basic configuration)
echo "⚙️ Configuring Nginx..."
sudo tee /etc/nginx/sites-available/default > /dev/null <<EOF
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    
    server_name _;
    
    location / {
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
    
    location /health {
        proxy_pass http://localhost:4000/health;
        access_log off;
    }
}
EOF

# Test Nginx configuration
sudo nginx -t

# Start and enable services
echo "🚀 Starting services..."
sudo systemctl start nginx
sudo systemctl enable nginx
sudo systemctl status nginx

# Setup PM2 startup script
echo "🔄 Setting up PM2 startup..."
pm2 startup systemd -u $USER --hp /home/$USER
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp /home/$USER

# Install SSL certificate (Let's Encrypt) - Optional
read -p "🔒 Do you want to install SSL certificate with Let's Encrypt? (y/n): " install_ssl
if [ "$install_ssl" = "y" ] || [ "$install_ssl" = "Y" ]; then
    echo "📜 Installing Certbot for SSL..."
    sudo apt install -y certbot python3-certbot-nginx
    
    read -p "Enter your domain name: " domain_name
    if [ ! -z "$domain_name" ]; then
        sudo certbot --nginx -d $domain_name
        sudo systemctl reload nginx
    fi
fi

# Create a script for easy deployment
echo "📋 Creating deployment script..."
tee /home/$USER/deploy.sh > /dev/null <<EOF
#!/bin/bash
set -e

echo "🚀 Deploying ticket-backend..."

# Navigate to application directory
cd /var/www/ticket-backend/current

# Stop existing application
pm2 stop ticket-backend || echo "Application not running"

# Install dependencies if package.json changed
if [ -f "package.json" ]; then
    npm ci --only=production
fi

# Start application
pm2 start ecosystem.config.js --env production || pm2 start dist/main.js --name ticket-backend

# Save PM2 configuration
pm2 save

echo "✅ Deployment completed successfully!"
EOF

chmod +x /home/$USER/deploy.sh

echo "✅ AWS EC2 setup completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Add your SSH key to GitHub repository secrets as AWS_EC2_PRIVATE_KEY"
echo "2. Add EC2 public IP to GitHub secrets as AWS_EC2_HOST"
echo "3. Add 'ubuntu' to GitHub secrets as AWS_EC2_USERNAME"
echo "4. Add your RDS connection details to GitHub secrets"
echo "5. Push your code to trigger the deployment"
echo ""
echo "🔧 Server Information:"
echo "- Application directory: /var/www/ticket-backend"
echo "- Nginx config: /etc/nginx/sites-available/default"
echo "- PM2 logs: /var/log/pm2/"
echo "- Deployment script: /home/$USER/deploy.sh"
echo ""
echo "🌐 Your application will be available at:"
echo "- HTTP: http://$(curl -s http://checkip.amazonaws.com)"
echo "- API Documentation: http://$(curl -s http://checkip.amazonaws.com)/api/docs"
