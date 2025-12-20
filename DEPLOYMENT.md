# Deployment Guide

## Deploy to Vercel (Recommended)

### Step 1: Prepare Your Code
```bash
# Make sure everything works locally
npm run build
npm start
```

### Step 2: Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/studymode.git
git push -u origin main
```

### Step 3: Deploy to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Configure environment variables:
   - `MONGODB_URI` - Your MongoDB Atlas connection string
   - `JWT_SECRET` - Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   - `NEXT_PUBLIC_API_URL` - Your Vercel URL (e.g., https://studymode.vercel.app)
5. Click "Deploy"

### Step 4: Update MongoDB Whitelist
1. Go to MongoDB Atlas
2. Network Access → IP Whitelist
3. Add: `0.0.0.0/0` (allows Vercel)

---

## Deploy to Netlify

### Step 1: Build Settings
```bash
# Build command:
npm run build

# Publish directory:
.next
```

### Step 2: Environment Variables
Add in Netlify dashboard:
- `MONGODB_URI`
- `JWT_SECRET`
- `NEXT_PUBLIC_API_URL`

### Step 3: Deploy
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod
```

---

## Deploy to Railway

### Step 1: Install Railway CLI
```bash
npm install -g @railway/cli
```

### Step 2: Login and Init
```bash
railway login
railway init
```

### Step 3: Add Environment Variables
```bash
railway variables set MONGODB_URI="your-connection-string"
railway variables set JWT_SECRET="your-secret"
railway variables set NEXT_PUBLIC_API_URL="https://your-app.railway.app"
```

### Step 4: Deploy
```bash
railway up
```

---

## Deploy to DigitalOcean App Platform

### Step 1: Create App
1. Go to DigitalOcean
2. Create → Apps
3. Connect GitHub repository

### Step 2: Configure
- Build Command: `npm run build`
- Run Command: `npm start`
- HTTP Port: 3000

### Step 3: Environment Variables
Add in dashboard:
- `MONGODB_URI`
- `JWT_SECRET`
- `NEXT_PUBLIC_API_URL`

---

## Self-Hosting (VPS/Server)

### Prerequisites
- Ubuntu 20.04+ or similar
- Node.js 18+
- MongoDB installed or Atlas
- Nginx (recommended)
- PM2 for process management

### Step 1: Setup Server
```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install MongoDB (if local)
# Follow: https://docs.mongodb.com/manual/tutorial/install-mongodb-on-ubuntu/
```

### Step 2: Clone and Setup
```bash
# Clone repository
git clone https://github.com/yourusername/studymode.git
cd studymode

# Install dependencies
npm install

# Create .env.local
nano .env.local
# Add your environment variables

# Build application
npm run build
```

### Step 3: Start with PM2
```bash
# Start app
pm2 start npm --name "studymode" -- start

# Save PM2 process list
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

### Step 4: Configure Nginx (Optional)
```bash
sudo nano /etc/nginx/sites-available/studymode
```

Add configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/studymode /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 5: SSL with Let's Encrypt
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## MongoDB Setup for Production

### Option 1: MongoDB Atlas (Recommended)

**Advantages:**
- Free tier available
- Automatic backups
- Global distribution
- No server management

**Setup:**
1. Create account at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create cluster (M0 Free tier)
3. Create database user
4. Whitelist IP addresses
5. Get connection string

**Connection String Format:**
```
mongodb+srv://username:password@cluster.mongodb.net/studymode?retryWrites=true&w=majority
```

### Option 2: Self-Hosted MongoDB

**Installation (Ubuntu):**
```bash
# Import MongoDB public GPG Key
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -

# Create list file
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# Install MongoDB
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

**Secure MongoDB:**
```bash
# Connect to MongoDB shell
mongosh

# Create admin user
use admin
db.createUser({
  user: "admin",
  pwd: "your-secure-password",
  roles: ["root"]
})

# Create database user
use studymode
db.createUser({
  user: "studymode_user",
  pwd: "your-secure-password",
  roles: ["readWrite"]
})
```

**Enable authentication:**
```bash
sudo nano /etc/mongod.conf
```

Add:
```yaml
security:
  authorization: enabled
```

Restart:
```bash
sudo systemctl restart mongod
```

---

## Environment Variables Reference

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/studymode` |
| `JWT_SECRET` | Secret for JWT signing | Random 32+ character string |
| `NEXT_PUBLIC_API_URL` | Public API URL | `https://studymode.vercel.app` |

### Generate JWT Secret
```bash
# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# OpenSSL
openssl rand -hex 32

# PowerShell
-join ((1..64) | ForEach-Object { '{0:X}' -f (Get-Random -Max 16) })
```

---

## Post-Deployment Checklist

- [ ] Environment variables set correctly
- [ ] MongoDB connection working
- [ ] Can create new user account
- [ ] Can login with credentials
- [ ] Timer functions correctly
- [ ] Sessions save to database
- [ ] Analytics charts display
- [ ] Export/import works
- [ ] HTTPS enabled (for production)
- [ ] Custom domain configured (optional)
- [ ] Monitoring setup (optional)
- [ ] Backups configured

---

## Monitoring & Maintenance

### PM2 Monitoring (Self-hosted)
```bash
# View logs
pm2 logs studymode

# Monitor resources
pm2 monit

# Restart app
pm2 restart studymode

# View status
pm2 status
```

### Database Backups

**MongoDB Atlas:**
- Automatic backups included
- Configure in dashboard

**Self-hosted:**
```bash
# Manual backup
mongodump --db studymode --out /path/to/backup

# Restore
mongorestore --db studymode /path/to/backup/studymode
```

### Automated Backups (Cron)
```bash
crontab -e
```

Add:
```bash
# Daily backup at 2 AM
0 2 * * * mongodump --db studymode --out /backups/$(date +\%Y\%m\%d)
```

---

## Troubleshooting Deployment

### Build Fails
```bash
# Clear cache
rm -rf .next node_modules
npm install
npm run build
```

### MongoDB Connection Issues
- Check connection string format
- Verify IP whitelist
- Test with MongoDB Compass
- Check firewall rules

### Environment Variables Not Loading
- Verify variable names (case-sensitive)
- Restart deployment
- Check platform-specific docs

### App Not Starting
```bash
# Check logs
pm2 logs studymode
# or
vercel logs
```

---

## Performance Optimization

### Enable Caching
```javascript
// next.config.ts
const nextConfig = {
  headers: async () => [
    {
      source: '/:path*',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=31536000, immutable',
        },
      ],
    },
  ],
};
```

### MongoDB Indexes
Already included in models:
- User: email (unique)
- Session: userId + timestamp (compound)

### CDN Setup (Optional)
- Use Cloudflare for static assets
- Enable Vercel Edge Network
- Configure proper cache headers

---

## Security Best Practices

✅ **Never commit `.env.local` to Git**  
✅ **Use strong JWT secret (32+ characters)**  
✅ **Enable HTTPS in production**  
✅ **Whitelist specific IPs for MongoDB**  
✅ **Keep dependencies updated**  
✅ **Enable rate limiting (future)**  
✅ **Monitor logs for suspicious activity**

---

## Support & Resources

- **Next.js Deployment**: https://nextjs.org/docs/deployment
- **Vercel Docs**: https://vercel.com/docs
- **MongoDB Atlas**: https://docs.atlas.mongodb.com/
- **PM2 Docs**: https://pm2.keymetrics.io/docs/usage/quick-start/

---

**Questions?** Open an issue on GitHub!
