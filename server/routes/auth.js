const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Register new user
router.post('/register', async (req, res) => {
  try {
    console.log('🔍 Registration attempt:', req.body);
    const { name, email, password, role } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      console.log('❌ Missing required fields');
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    // Validate email domain
    if (!email.endsWith('@sst.scaler.com')) {
      console.log('❌ Invalid email domain:', email);
      return res.status(400).json({ message: 'Only @sst.scaler.com emails are allowed' });
    }

    // SECURITY: Only allow student registration through public endpoint
    if (role && role !== 'student') {
      console.log('❌ Unauthorized role registration attempt:', role);
      return res.status(403).json({ 
        message: 'Only students can register through this endpoint. Vendor and admin accounts must be created by existing admins.' 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('❌ User already exists:', email);
      return res.status(400).json({ message: 'User already exists' });
    }

    console.log('✅ Creating new student user:', { name, email });

    // Create new user (always as student for public registration)
    const userData = {
      name,
      email,
      password,
      role: 'student', // Force student role for public registration
      authProvider: 'local'
    };

    const user = new User(userData);
    await user.save();
    console.log('✅ Student user created successfully:', user._id);

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Student registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('❌ Registration error:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      keyPattern: error.keyPattern,
      keyValue: error.keyValue
    });

    // Handle specific MongoDB errors
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'User already exists',
        field: Object.keys(error.keyPattern)[0]
      });
    }

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        message: 'Validation error',
        errors: errors
      });
    }

    res.status(500).json({
      message: 'Server error during registration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate email domain
    if (!email.endsWith('@sst.scaler.com')) {
      return res.status(400).json({ message: 'Only @sst.scaler.com emails are allowed' });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(400).json({ message: 'Account is deactivated' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Logout (client-side token removal)
router.post('/logout', auth, (req, res) => {
  res.json({ message: 'Logout successful' });
});

// ADMIN ONLY: Create vendor or admin accounts
router.post('/create-user', auth, requireAdmin, async (req, res) => {
  try {
    console.log('🔍 Admin creating user:', req.body);
    const { name, email, password, role, vendorId } = req.body;

    // Validate required fields
    if (!name || !email || !password || !role) {
      return res.status(400).json({ 
        message: 'Name, email, password, and role are required' 
      });
    }

    // Validate role
    if (!['admin', 'vendor', 'student'].includes(role)) {
      return res.status(400).json({ 
        message: 'Role must be admin, vendor, or student' 
      });
    }

    // Validate email domain
    if (!email.endsWith('@sst.scaler.com')) {
      return res.status(400).json({ 
        message: 'Only @sst.scaler.com emails are allowed' 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create user data
    const userData = {
      name,
      email,
      password,
      role,
      authProvider: 'local'
    };

    // Add vendor field if role is vendor and vendorId is provided
    if (role === 'vendor' && vendorId) {
      userData.vendor = vendorId;
    }

    const user = new User(userData);
    await user.save();

    console.log('✅ Admin created user successfully:', { 
      id: user._id, 
      name: user.name, 
      email: user.email, 
      role: user.role 
    });

    res.status(201).json({
      message: `${role} user created successfully`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('❌ Admin user creation error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'User already exists',
        field: Object.keys(error.keyPattern)[0]
      });
    }

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        message: 'Validation error',
        errors: errors
      });
    }

    res.status(500).json({
      message: 'Server error during user creation',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
