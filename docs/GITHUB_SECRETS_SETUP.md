# GitHub Secrets Setup Guide

This guide explains how to set up GitHub Secrets for your CI/CD pipeline.

## Required Secrets

Navigate to your GitHub repository → Settings → Secrets and variables → Actions → New repository secret

### AWS Configuration
```
AWS_EC2_HOST
- Description: Your EC2 instance public IP address
- Value: 54.221.160.173 (your actual EC2 public IP)

AWS_EC2_USERNAME
- Description: EC2 instance username
- Value: ubuntu (for Ubuntu instances) or ec2-user (for Amazon Linux)

AWS_EC2_PRIVATE_KEY
- Description: Your private key content from ticket-backend.pem
- Value: Contents of your .pem file (including -----BEGIN RSA PRIVATE KEY----- and -----END RSA PRIVATE KEY-----)
```

### Database Configuration (RDS)
```
RDS_HOST
- Description: Your RDS PostgreSQL endpoint
- Value: database-1.c8p4wog2qp5o.us-east-1.rds.amazonaws.com (your actual RDS endpoint)

RDS_USERNAME
- Description: Database username
- Value: postgres

RDS_PASSWORD
- Description: Database password
- Value: Your RDS password (the one you set during RDS creation)

RDS_DATABASE
- Description: Database name
- Value: ticket_backend (or your preferred database name)
```

### Application Configuration
```
JWT_SECRET
- Description: Secret key for JWT token signing
- Value: Generate a strong random string (e.g., openssl rand -base64 64)

DOMAIN_NAME
- Description: Your domain name (optional)
- Value: yourdomain.com (if you have a domain, otherwise use EC2 public IP)
```

## How to Get Your Private Key Content

1. Open Terminal on your Mac
2. Navigate to where you saved ticket-backend.pem
3. Run: `cat ticket-backend.pem`
4. Copy the entire output including the BEGIN and END lines
5. Paste it as the value for AWS_EC2_PRIVATE_KEY secret

## Setting Up Your Domain (Optional)

If you have a domain name:
1. Point your domain's A record to your EC2 public IP (54.221.160.173)
2. Add the domain to the DOMAIN_NAME secret
3. The deployment script will automatically set up SSL with Let's Encrypt

## Example Secret Values

```bash
# AWS Configuration
AWS_EC2_HOST=54.221.160.173
AWS_EC2_USERNAME=ubuntu
AWS_EC2_PRIVATE_KEY=-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA...
(your actual private key content)
...
-----END RSA PRIVATE KEY-----

# Database Configuration  
RDS_HOST=database-1.c8p4wog2qp5o.us-east-1.rds.amazonaws.com
RDS_USERNAME=postgres
RDS_PASSWORD=your-secure-password
RDS_DATABASE=ticket_backend

# Application Configuration
JWT_SECRET=your-super-secret-jwt-key-min-32-characters-long
DOMAIN_NAME=api.yourdomain.com
```

## Testing the Setup

1. Make sure your `.env.prod` file is properly configured
2. Validate production environment: `./scripts/env-manager.sh validate prod`
3. Push code to your main/master branch
4. Check the Actions tab in your GitHub repository
5. Monitor the deployment process
6. Your application should be available at:
   - http://54.221.160.173 (or your domain)
   - API docs: http://54.221.160.173/api/docs

## Troubleshooting

### Common Issues:
1. **SSH Connection Failed**: Check your private key format and EC2 security groups
2. **Database Connection Failed**: Verify RDS security groups allow connections from EC2
3. **Application Won't Start**: Check environment variables and logs with `pm2 logs`

### Checking Deployment Status:
```bash
# SSH into your EC2 instance
ssh -i ticket-backend.pem ubuntu@54.221.160.173

# Check application status
pm2 status
pm2 logs ticket-backend

# Check nginx status
sudo systemctl status nginx
sudo nginx -t
```
