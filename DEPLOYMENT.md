# Scan2Go Deployment Guide

## 🚀 Quick Deployment Options

### Option 1: Vercel (Recommended - Free)

#### Frontend Deployment
1. **Push to GitHub**:
   ```bash
   git remote add origin https://github.com/yourusername/scan2go.git
   git push -u origin main
   ```

2. **Deploy Frontend**:
   - Go to [Vercel](https://vercel.com)
   - Import your GitHub repository
   - Set **Root Directory** to `client`
   - Set **Build Command** to `npm run build`
   - Set **Output Directory** to `dist`
   - Add environment variable: `VITE_API_URL=https://your-backend-url.vercel.app/api`

#### Backend Deployment
1. **Deploy Backend**:
   - Go to [Vercel](https://vercel.com)
   - Import your GitHub repository
   - Set **Root Directory** to `server`
   - Set **Build Command** to `npm install`
   - Add environment variables:
     - `MONGODB_URI=your_mongodb_atlas_connection_string`
     - `JWT_SECRET=your_jwt_secret`
     - `NODE_ENV=production`

### Option 2: Netlify + Railway

#### Frontend (Netlify)
1. **Deploy to Netlify**:
   - Connect GitHub repository
   - Set **Base Directory** to `client`
   - Set **Build Command** to `npm run build`
   - Set **Publish Directory** to `dist`

#### Backend (Railway)
1. **Deploy to Railway**:
   - Connect GitHub repository
   - Set **Root Directory** to `server`
   - Add environment variables

## 🔧 Environment Variables

### Frontend (.env)
```env
VITE_API_URL=https://your-backend-url.vercel.app/api
VITE_APP_NAME=Scan2Go
VITE_APP_VERSION=1.0.0
```

### Backend (.env)
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/scan2go
JWT_SECRET=your_super_secret_jwt_key_here
NODE_ENV=production
PORT=5000
```

## 📋 Pre-Deployment Checklist

- [ ] MongoDB Atlas database created
- [ ] Environment variables configured
- [ ] CORS origins updated in server.js
- [ ] Frontend API URL updated
- [ ] Test registration/login flow
- [ ] Test CSV upload functionality

## 🌐 Custom Domain Setup

1. **Update CORS** in `server/server.js`:
   ```javascript
   const allowedOrigins = process.env.NODE_ENV === 'production' 
     ? [
         'https://your-custom-domain.com',
         'https://scan2go.vercel.app'
       ]
     : /^http:\/\/localhost:\d+$/;
   ```

2. **Update Frontend API URL**:
   ```env
   VITE_API_URL=https://your-backend-domain.com/api
   ```

## 🔄 Deployment Steps

1. **Commit all changes**:
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Deploy Backend first** (get the URL)

3. **Update Frontend environment** with backend URL

4. **Deploy Frontend**

5. **Update CORS** with frontend URL

6. **Test the complete application**

## 🎯 Post-Deployment

1. **Register first admin user**
2. **Create vendors**
3. **Upload student CSV data**
4. **Test student verification**

---

**Your Scan2Go application will be live and accessible worldwide!** 🌍
