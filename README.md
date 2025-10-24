# Scan2Go - Student Meal Verification System

A MERN-based web application that automates student verification and vendor management for SST meal allocations.

## 🎯 Features

### 🔐 Authentication
- **Restricted Access**: Only students with @sst.scaler.com email addresses can register
- **Role-based Access**: Student, Vendor, and Admin roles with different permissions
- **Secure JWT Authentication**: Token-based authentication with automatic logout

### 👨‍💼 Admin Panel
- **CSV Upload**: Upload monthly Google Sheets data to sync student records
- **Data Management**: Add new students, update vendor assignments, deactivate missing students
- **Export Functionality**: Export student data for reporting
- **System Statistics**: View total students, vendors, and activity metrics

### 🏪 Vendor Dashboard
- **Student Verification**: Quick search and verification of students
- **QR Code Support**: Scan QR codes for instant verification
- **Real-time Stats**: Track daily meals served, claim rates, and pending claims
- **Student Management**: View assigned students and their meal history

### 🎓 Student Interface
- **Meal Tracking**: View meal history and claim status
- **QR Code Generation**: Unique QR codes for quick verification
- **Vendor Assignment**: See assigned vendor information

## 🛠️ Tech Stack

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose ODM
- **JWT** for authentication
- **Multer** for file uploads
- **CSV Parser** for data processing
- **Helmet** for security
- **Rate Limiting** for API protection

### Frontend
- **React 18** with Vite
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Axios** for API calls
- **React Hot Toast** for notifications
- **Heroicons** for UI icons

## 📋 Prerequisites

Before setting up the project, ensure you have:

1. **Node.js** (v16 or higher)
2. **MongoDB** (local installation or MongoDB Atlas)
3. **Git** for version control

## 🚀 Setup Instructions

### 1. Clone the Repository
```bash
git clone <repository-url>
cd Scan2Go
```

### 2. Backend Setup

#### Install Dependencies
```bash
cd server
npm install
```

#### Environment Configuration
1. Copy the environment example file:
```bash
cp env.example .env
```

2. Update the `.env` file with your configuration:
```env
# Database
MONGODB_URI=mongodb://localhost:27017/scan2go
# or for MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/scan2go

# JWT Secret (generate a strong secret)
JWT_SECRET=your_super_secret_jwt_key_here

# Server Configuration
PORT=5000
NODE_ENV=development

# Google OAuth (Optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Email Configuration (Optional)
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

#### Start the Backend Server
```bash
# Development mode
npm run dev

# Production mode
npm start
```

The backend server will run on `http://localhost:5000`

### 3. Frontend Setup

#### Install Dependencies
```bash
cd client
npm install
```

#### Environment Configuration
1. Copy the environment example file:
```bash
cp env.example .env
```

2. Update the `.env` file:
```env
# API Configuration
VITE_API_URL=http://localhost:5000/api

# App Configuration
VITE_APP_NAME=Scan2Go
VITE_APP_VERSION=1.0.0
```

#### Start the Frontend Development Server
```bash
npm run dev
```

The frontend will run on `http://localhost:5173`

## 🗄️ Database Setup

### MongoDB Local Installation
1. Install MongoDB Community Edition
2. Start MongoDB service
3. Create database: `scan2go`

### MongoDB Atlas (Cloud)
1. Create a MongoDB Atlas account
2. Create a new cluster
3. Get your connection string
4. Update `MONGODB_URI` in your `.env` file

## 📊 Initial Data Setup

### 1. Create Admin User
Register the first admin user through the registration page with:
- Email: `admin@sst.scaler.com`
- Role: `admin`

### 2. Create Vendors
Use the admin panel to create vendors:
- Vendor 1: "Cafeteria A"
- Vendor 2: "Cafeteria B" 
- Vendor 3: "Cafeteria C"

### 3. Upload Student Data
1. Prepare your CSV file with columns:
   - `name`: Student's full name
   - `email`: Student's email (@sst.scaler.com)
   - `rollNumber`: Student's roll number
   - `vendor`: Assigned vendor name
   - `vendorLocation`: Vendor location (optional)

2. Use the Admin Panel to upload the CSV file

## 🔧 Configuration Details

### Required Environment Variables

#### Backend (.env)
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT tokens (use a strong, random string)
- `PORT`: Server port (default: 5000)
- `NODE_ENV`: Environment (development/production)

#### Frontend (.env)
- `VITE_API_URL`: Backend API URL
- `VITE_APP_NAME`: Application name
- `VITE_APP_VERSION`: Application version

### Security Considerations
1. **JWT Secret**: Use a strong, random secret key
2. **MongoDB**: Secure your database with proper authentication
3. **CORS**: Configure CORS for production domains
4. **Rate Limiting**: Adjust rate limits based on usage
5. **HTTPS**: Use HTTPS in production

## 📱 Usage Guide

### For Administrators
1. **Login** with admin credentials
2. **Upload CSV** with student data
3. **Monitor** system statistics
4. **Manage** students and vendors

### For Vendors
1. **Login** with vendor credentials
2. **Verify students** using search or QR codes
3. **Track** daily meal statistics
4. **View** assigned students

### For Students
1. **Register** with @sst.scaler.com email
2. **View** assigned vendor
3. **Get** QR code for verification
4. **Track** meal history

## 🚀 Deployment

### Backend Deployment
1. Set `NODE_ENV=production`
2. Configure production MongoDB URI
3. Set secure JWT secret
4. Deploy to platforms like Heroku, Railway, or DigitalOcean

### Frontend Deployment
1. Build the production bundle:
```bash
npm run build
```
2. Deploy to platforms like Vercel, Netlify, or AWS S3

## 🐛 Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Check MongoDB service is running
   - Verify connection string
   - Ensure database permissions

2. **JWT Token Issues**
   - Check JWT_SECRET is set
   - Verify token expiration
   - Clear browser storage if needed

3. **CORS Errors**
   - Update CORS configuration in server.js
   - Check frontend API URL

4. **File Upload Issues**
   - Check file size limits
   - Verify CSV format
   - Ensure uploads directory exists

## 📞 Support

For technical support or questions:
- Check the troubleshooting section
- Review the API documentation
- Contact the development team

## 🔄 Updates and Maintenance

### Regular Tasks
1. **Backup** database regularly
2. **Monitor** system performance
3. **Update** dependencies
4. **Review** security settings

### Data Management
1. **Archive** old meal records
2. **Update** student information
3. **Sync** with Google Sheets monthly
4. **Generate** reports as needed

---

**Scan2Go** - Streamlining student meal verification at SST! 🎓🍽️
