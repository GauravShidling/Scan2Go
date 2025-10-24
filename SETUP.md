# Scan2Go Setup Guide

## Quick Start Checklist

### ✅ Prerequisites
- [ ] Node.js (v16+) installed
- [ ] MongoDB running (local or Atlas)
- [ ] Git installed

### ✅ Backend Setup
1. [ ] Navigate to `server/` directory
2. [ ] Run `npm install`
3. [ ] Copy `env.example` to `.env`
4. [ ] Configure MongoDB URI in `.env`
5. [ ] Set JWT_SECRET in `.env`
6. [ ] Run `npm run dev`

### ✅ Frontend Setup
1. [ ] Navigate to `client/` directory
2. [ ] Run `npm install`
3. [ ] Copy `env.example` to `.env`
4. [ ] Configure VITE_API_URL in `.env`
5. [ ] Run `npm run dev`

### ✅ Initial Configuration
1. [ ] Register first admin user
2. [ ] Create vendors in admin panel
3. [ ] Upload student CSV data
4. [ ] Test student verification

## Detailed Setup Steps

### 1. Database Configuration

#### Option A: Local MongoDB
```bash
# Install MongoDB (macOS with Homebrew)
brew install mongodb-community

# Start MongoDB
brew services start mongodb-community

# Your connection string will be:
MONGODB_URI=mongodb://localhost:27017/scan2go
```

#### Option B: MongoDB Atlas (Recommended)
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account
3. Create a new cluster
4. Get your connection string
5. Replace `<password>` with your database password
6. Use connection string like: `mongodb+srv://username:password@cluster.mongodb.net/scan2go`

### 2. Environment Variables

#### Backend (.env in server/ directory)
```env
# Database
MONGODB_URI=mongodb://localhost:27017/scan2go

# JWT Secret (generate a strong secret)
JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_random

# Server Configuration
PORT=5000
NODE_ENV=development
```

#### Frontend (.env in client/ directory)
```env
# API Configuration
VITE_API_URL=http://localhost:5000/api

# App Configuration
VITE_APP_NAME=Scan2Go
VITE_APP_VERSION=1.0.0
```

### 3. Generate JWT Secret
```bash
# Generate a random JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 4. Start the Application

#### Terminal 1 - Backend
```bash
cd server
npm run dev
```

#### Terminal 2 - Frontend
```bash
cd client
npm run dev
```

### 5. First-Time Setup

1. **Open the application**: http://localhost:5173
2. **Register as admin**: Use an @sst.scaler.com email with role "admin"
3. **Create vendors**: Go to Admin Panel → Create vendors
4. **Upload student data**: Use CSV upload feature

## CSV Format

Your CSV file should have these columns:
```csv
name,email,rollNumber,vendor,vendorLocation
John Doe,john.doe@sst.scaler.com,2024001,Cafeteria A,Main Building
Jane Smith,jane.smith@sst.scaler.com,2024002,Cafeteria B,Library Wing
```

## Testing the Application

### 1. Test Authentication
- Register with @sst.scaler.com email
- Login with credentials
- Verify role-based access

### 2. Test Student Verification
- Create a test student
- Use verification interface
- Test search and QR functionality

### 3. Test Admin Features
- Upload CSV file
- Export student data
- View statistics

## Common Issues & Solutions

### Issue: MongoDB Connection Failed
**Solution**: 
- Check MongoDB is running
- Verify connection string
- Check network connectivity (for Atlas)

### Issue: JWT Token Invalid
**Solution**:
- Check JWT_SECRET is set
- Clear browser localStorage
- Restart the server

### Issue: CORS Errors
**Solution**:
- Check VITE_API_URL is correct
- Verify backend CORS configuration
- Ensure both servers are running

### Issue: File Upload Fails
**Solution**:
- Check file is CSV format
- Verify file size (max 5MB)
- Check uploads directory exists

## Production Deployment

### Backend Deployment
1. Set `NODE_ENV=production`
2. Use production MongoDB URI
3. Set secure JWT secret
4. Configure CORS for production domain

### Frontend Deployment
1. Build production bundle: `npm run build`
2. Deploy to static hosting (Vercel, Netlify)
3. Update API URL for production

## Security Checklist

- [ ] Strong JWT secret (64+ characters)
- [ ] MongoDB authentication enabled
- [ ] CORS configured for production
- [ ] Rate limiting enabled
- [ ] HTTPS in production
- [ ] Environment variables secured

## Support

If you encounter issues:
1. Check the troubleshooting section
2. Verify all environment variables
3. Check server logs for errors
4. Ensure all dependencies are installed

---

**Ready to go!** 🚀 Your Scan2Go application should now be running successfully.
