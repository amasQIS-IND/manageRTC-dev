# Deployment Guide
## manageRTC - Production Deployment Documentation

**Document Version:** 1.0
**Date:** January 28, 2026
**Status:** Phase 6 - Production Readiness

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Environment Configuration](#environment-configuration)
4. [Docker Deployment](#docker-deployment)
5. [Production Deployment](#production-deployment)
6. [Database Setup](#database-setup)
7. [Monitoring & Maintenance](#monitoring--maintenance)
8. [Troubleshooting](#troubleshooting)

---

## Overview

This guide covers deploying manageRTC using Docker Compose for development/staging and provides instructions for production deployment.

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Production Stack                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Nginx (Port 80/443)                  │   │
│  │  - Reverse Proxy                                        │   │
│  │  - SSL Termination                                      │   │
│  │  - Static File Serving                                  │   │
│  │  - Request Routing                                      │   │
│  └────────────┬──────────────────────────┬─────────────────┘   │
│               │                          │                      │
│               ▼                          ▼                      │
│  ┌─────────────────────┐    ┌─────────────────────┐           │
│  │   Frontend (React)  │    │   Backend (Node.js) │           │
│  │   - Build artifacts │    │   - REST API        │           │
│  │   - nginx serving   │    │   - Socket.IO       │           │
│  │   - SPA routing     │    │   - Port 5000       │           │
│  └─────────────────────┘    └──────────┬──────────┘           │
│                                        │                        │
│               ┌────────────────────────┼──────────────────┐    │
│               ▼                        ▼                  ▼    │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────┐│
│  │   MongoDB        │    │   Redis          │    │  Uploads ││
│  │   - Port 27017   │    │   - Port 6379    │    │  Volume  ││
│  │   - Data storage │    │   - Caching      │    └──────────┘│
│  └──────────────────┘    └──────────────────┘               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

### Required Software

- **Docker**: >= 20.10.0
- **Docker Compose**: >= 2.0.0
- **Git**: >= 2.30.0
- **Node.js**: >= 18.0.0 (for local development)

### Required Accounts/Services

- **Clerk Account**: For authentication (https://dashboard.clerk.com)
- **MongoDB Atlas**: Recommended for production (https://www.mongodb.com/cloud/atlas)
- **Redis**: Recommended for production (https://redis.com/try-free/)
- **Domain Name**: For SSL certificates
- **SSL Certificate**: Let's Encrypt or commercial certificate

### System Requirements

**Minimum (Development):**
- CPU: 2 cores
- RAM: 4 GB
- Storage: 20 GB

**Recommended (Production):**
- CPU: 4+ cores
- RAM: 8+ GB
- Storage: 50+ GB SSD

---

## Environment Configuration

### Step 1: Backend Environment Variables

Create `backend/.env` from the example file:

```bash
cd backend
cp .env.example .env
```

**Required variables:**

```bash
# Application
NODE_ENV=production
PORT=5000

# Database (use Atlas in production)
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/hrms

# Clerk Authentication (get from Clerk Dashboard)
CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx
JWT_KEY=your-random-secret-key

# Frontend URL (update with your domain)
FRONTEND_URL=https://yourdomain.com

# Redis (use Redis Cloud in production)
REDIS_HOST=redis-xxxxx.c1.us-east-1-2.ec2.cloud.redislabs.com
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# Security
SESSION_SECRET=another-random-secret-here
JWT_EXPIRES_IN=7d
RATE_LIMIT_ENABLED=true
```

### Step 2: Frontend Environment Variables

Create `react/.env` from the example file:

```bash
cd react
cp .env.example .env
```

**Required variables:**

```bash
NODE_ENV=production

# Backend API URL (update with your domain)
REACT_APP_BACKEND_URL=https://api.yourdomain.com
REACT_APP_API_URL=https://api.yourdomain.com/api

# Socket.IO URL (update with your domain)
REACT_APP_SOCKET_URL=https://api.yourdomain.com

# Clerk
REACT_APP_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx

# Optional: Base path if deploying to subdirectory
REACT_APP_BASE_PATH=
```

### Step 3: Generate Secret Keys

Generate secure random strings for `JWT_KEY` and `SESSION_SECRET`:

```bash
# Method 1: Using OpenSSL
openssl rand -hex 32

# Method 2: Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Method 3: Using Python
python3 -c "import secrets; print(secrets.token_hex(32))"
```

---

## Docker Deployment

### Development Deployment

Start all services:

```bash
# Build and start all services
docker-compose up --build

# Or run in detached mode
docker-compose up -d --build
```

View logs:

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mongo
```

Stop services:

```bash
docker-compose down

# Stop and remove volumes (WARNING: deletes data)
docker-compose down -v
```

### Production Deployment with Docker Compose

1. **Update docker-compose.yml for production:**

```yaml
# Remove port mappings for internal services
# Keep only nginx ports exposed
services:
  backend:
    ports: []  # Remove port mapping
  frontend:
    ports: []  # Remove port mapping
  mongo:
    ports: []  # Remove port mapping
  redis:
    ports: []  # Remove port mapping
```

2. **Set proper resource limits:**

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

3. **Start production containers:**

```bash
# Set production environment
export NODE_ENV=production

# Build production images
docker-compose -f docker-compose.yml build

# Start production services
docker-compose -f docker-compose.yml up -d

# Check service health
docker-compose ps
```

---

## Production Deployment

### Option 1: Cloud Deployment (AWS/Azure/GCP)

#### AWS Deployment

**Recommended Architecture:**
- **ECS Fargate** for container orchestration
- **RDS MongoDB** or MongoDB Atlas for database
- **ElastiCache Redis** for caching
- **ALB** for load balancing
- **Route 53** for DNS
- **ACM** for SSL certificates

**Deployment Steps:**

1. Push Docker images to ECR:
```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Tag images
docker tag manage-rtc-backend:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/manage-rtc-backend:latest
docker tag manage-rtc-frontend:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/manage-rtc-frontend:latest

# Push images
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/manage-rtc-backend:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/manage-rtc-frontend:latest
```

2. Create ECS task definition with images from ECR

3. Configure ALB with SSL certificate

4. Update Route 53 records

#### Azure Deployment

**Recommended Architecture:**
- **Azure Container Instances** or **Azure Kubernetes Service**
- **Cosmos DB** (MongoDB API) for database
- **Azure Cache for Redis** for caching
- **Application Gateway** for load balancing
- **Azure DNS** for DNS management

#### GCP Deployment

**Recommended Architecture:**
- **Google Cloud Run** for containers
- **MongoDB Atlas** for database
- **Memorystore** for Redis
- **Cloud Load Balancing** for traffic
- **Cloud DNS** for DNS

### Option 2: VPS Deployment (DigitalOcean/Linode/Vultr)

**Server Setup:**

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Clone repository
git clone https://github.com/yourusername/hrms-tool-amasqis.git
cd hrms-tool-amasqis

# Configure environment files
cp backend/.env.example backend/.env
cp react/.env.example react/.env
nano backend/.env
nano react/.env

# Start services
docker-compose up -d
```

**Setup SSL with Let's Encrypt:**

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Generate certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal (configured automatically)
sudo certbot renew --dry-run
```

### Option 3: Heroku Deployment

**Create Procfile for backend:**

```
web: node server.js
```

**Create heroku.yml:**

```yaml
build:
  docker:
    web: Dockerfile
run:
  web: node server.js
```

**Deploy:**

```bash
# Login to Heroku
heroku login

# Create app
heroku create manage-rtc

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set CLERK_SECRET_KEY=sk_test_xxxxx
heroku config:set CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
heroku config:set MONGO_URI=mongodb+srv://...
heroku config:set JWT_KEY=your-secret-key
heroku config:set FRONTEND_URL=https://manage-rtc.herokuapp.com

# Add MongoDB addon (or use Atlas)
heroku addons:create mongolab:sandbox

# Deploy
git push heroku main
```

---

## Database Setup

### MongoDB Atlas (Recommended for Production)

1. **Create Atlas account:** https://www.mongodb.com/cloud/atlas

2. **Create cluster:**
   - Choose cluster tier (M10+ for production)
   - Select region closest to your users
   - Configure whitelist (0.0.0.0/0 for testing, specific IPs for production)

3. **Create database user:**
   - Username: `hrms_user`
   - Password: Use strong password
   - Database User Privileges: Read and write to any database

4. **Get connection string:**
```
mongodb+srv://hrms_user:password@cluster0.xxxxx.mongodb.net/hrms?retryWrites=true&w=majority
```

5. **Update backend/.env:**
```bash
MONGO_URI=mongodb+srv://hrms_user:password@cluster0.xxxxx.mongodb.net/hrms?retryWrites=true&w=majority
```

### Database Initialization

```bash
# Connect to MongoDB
mongosh "mongodb+srv://cluster0.xxxxx.mongodb.net/hrms" --username hrms_user

# Create indexes (run once)
use hrms
db.users.createIndex({ email: 1 }, { unique: true })
db.users.createIndex({ clerkId: 1 }, { unique: true })
db.companies.createIndex({ name: 1 })
db.clients.createIndex({ companyId: 1, email: 1 })
db.employees.createIndex({ companyId: 1, email: 1 })
db.attendance.createIndex({ employeeId: 1, date: 1 })
db.leaves.createIndex({ employeeId: 1, status: 1 })
```

### Backup Strategy

**Automated backups (Atlas):**
- Enable continuous backups
- Set retention period (7 days minimum)
- Configure snapshot schedule

**Manual backup:**
```bash
# Backup
mongodump --uri="mongodb+srv://cluster0.xxxxx.mongodb.net/hrms" --out=/backup/$(date +%Y%m%d)

# Restore
mongorestore --uri="mongodb+srv://cluster0.xxxxx.mongodb.net/hrms" --drop /backup/20250128
```

---

## Monitoring & Maintenance

### Health Checks

**Backend health endpoint:**
```bash
curl https://api.yourdomain.com/health
```

**Check container status:**
```bash
docker-compose ps
```

**View resource usage:**
```bash
docker stats
```

### Logging

**View logs:**
```bash
# All services
docker-compose logs -f

# Last 100 lines
docker-compose logs --tail=100 backend

# Since specific time
docker-compose logs --since 2025-01-28T00:00:00 backend
```

**Centralized logging (recommended for production):**
- **Datadog**: https://www.datadoghq.com
- **Loggly**: https://www.loggly.com
- **Papertrail**: https://papertrailapp.com

### Performance Monitoring

**Recommended tools:**
- **Application Performance:** New Relic, Datadog APM
- **Error Tracking:** Sentry (https://sentry.io)
- **Uptime Monitoring:** Pingdom, UptimeRobot
- **Database Monitoring:** MongoDB Atlas built-in metrics

**Setup Sentry:**

```bash
# Backend
npm install @sentry/node
```

```javascript
// backend/server.js
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
```

### Regular Maintenance Tasks

**Weekly:**
- Review error logs
- Check disk space usage
- Review backup completion

**Monthly:**
- Update dependencies: `npm update`
- Review security advisories: `npm audit`
- Clean up old logs: `docker system prune -a`

**Quarterly:**
- Security audit
- Performance review
- Disaster recovery test

---

## Troubleshooting

### Common Issues

#### Issue 1: Containers won't start

**Symptoms:**
```bash
$ docker-compose up
ERROR: for backend  Cannot start service backend: driver failed programming external connectivity
```

**Solution:**
```bash
# Check if ports are already in use
netstat -tuln | grep -E ':(5000|80|443|27017|6379)'

# Kill process using the port
sudo kill -9 <PID>

# Or change ports in docker-compose.yml
```

#### Issue 2: MongoDB connection refused

**Symptoms:**
```
MongooseServerSelectionError: connect ECONNREFUSED 127.0.0.1:27017
```

**Solution:**
```bash
# Check if MongoDB container is running
docker-compose ps mongo

# Check MongoDB logs
docker-compose logs mongo

# Verify MONGO_URI in backend/.env
# Should be: mongodb://mongo:27017/hrms (for Docker)
# NOT: mongodb://localhost:27017/hrms
```

#### Issue 3: Frontend can't connect to backend

**Symptoms:**
```
Network Error / CORS Error
```

**Solution:**
```bash
# Check backend is accessible
curl http://localhost:5000/health

# Check CORS settings in backend/server.js
# Ensure FRONTEND_URL matches your frontend URL

# Check nginx configuration
cat react/nginx.conf
```

#### Issue 4: Socket.IO connection fails

**Symptoms:**
```
Socket.IO connection failed: Error during WebSocket handshake
```

**Solution:**
```bash
# Check Socket.IO is enabled in backend
docker-compose logs backend | grep socket

# Verify REACT_APP_SOCKET_URL in react/.env
# Check nginx proxy configuration for WebSocket upgrade

# Test WebSocket connection
wscat -c http://localhost:5000/socket.io/
```

#### Issue 5: Out of memory errors

**Symptoms:**
```
JavaScript heap out of memory
```

**Solution:**
```bash
# Increase Node.js memory limit
# In docker-compose.yml:
environment:
  - NODE_OPTIONS=--max-old-space-size=4096

# Or add swap space
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### Getting Help

**Documentation:**
- [Phase 6 Progress Report](./20_PHASE_6_PROGRESS.md)
- [Comprehensive Completion Report](./22_COMPREHENSIVE_COMPLETION_REPORT.md)

**Useful Commands:**
```bash
# Full system reset (WARNING: deletes all data)
docker-compose down -v
docker system prune -a --volumes
docker-compose up --build

# Rebuild specific service
docker-compose up -d --build backend

# Execute command in container
docker-compose exec backend bash
docker-compose exec mongo mongosh
```

---

## Security Checklist

Before going to production, ensure:

- [ ] All default passwords changed
- [ ] SSL/TLS certificates installed
- [ ] Firewall configured (only allow necessary ports)
- [ ] Rate limiting enabled
- [ ] CORS configured properly
- [ ] Security headers set (Helmet.js)
- [ ] Input validation enabled
- [ ] SQL injection prevention (MongoDB sanitization)
- [ ] XSS prevention
- [ ] CSRF protection
- [ ] Logging and monitoring enabled
- [ ] Backup strategy implemented
- [ ] Disaster recovery plan tested
- [ ] Environment variables not committed to git
- [ ] `.env` files in `.gitignore`

---

## Post-Deployment Tasks

1. **Verify all services are running:**
   ```bash
   docker-compose ps
   curl https://yourdomain.com/health
   ```

2. **Test authentication flow:**
   - Sign up as new user
   - Login
   - Logout
   - Password reset

3. **Test core features:**
   - Create employee
   - Mark attendance
   - Apply for leave
   - Create project
   - Create task

4. **Setup monitoring:**
   - Configure uptime monitoring
   - Setup error tracking (Sentry)
   - Configure log aggregation

5. **Document access:**
   - Save all credentials securely
   - Document server access
   - Create runbook for common tasks

---

**END OF DEPLOYMENT GUIDE**
