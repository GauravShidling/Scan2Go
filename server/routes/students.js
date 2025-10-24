const express = require('express');
const Student = require('../models/Student');
const Vendor = require('../models/Vendor');
const { auth, requireStudent, requireAdmin } = require('../middleware/auth');
const QRCode = require('qrcode');

const router = express.Router();

// Get student's QR code (for students to view their own QR) - MUST BE FIRST
router.get('/my-qr-code', auth, requireStudent, async (req, res) => {
  try {
    console.log('🔍 QR Code Request - User:', req.user.email);
    
          const student = await Student.findOne({ email: req.user.email }).populate('vendor', 'name');
          if (!student) {
            console.log('❌ Student not found for email:', req.user.email);
            return res.status(404).json({ 
              message: 'You are not subscribed to any vendor. Please contact the admin to add your student record and assign you to a vendor.',
              code: 'STUDENT_NOT_FOUND'
            });
          }

    console.log('✅ Student found:', student.name);

    // Check if student has a vendor assigned
    if (!student.vendor) {
      console.log('❌ Student has no vendor assigned:', student.name);
      return res.status(404).json({ 
        message: 'You are not subscribed to any vendor. Please contact admin to get assigned to a vendor.',
        code: 'NO_VENDOR_ASSIGNED'
      });
    }

    // Ensure QR code exists
    if (!student.qrCode) {
      console.log('🔄 Generating QR code for student:', student.name);
      student.qrCode = require('crypto').randomUUID();
      await student.save();
    }

    // Generate QR code data URL
    const qrData = {
      studentId: student._id,
      qrCode: student.qrCode,
      name: student.name,
      rollNumber: student.rollNumber,
      vendor: student.vendor?.name || 'Unknown'
    };

    console.log('🔄 Generating QR code data URL...');
    const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData), {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    console.log('✅ QR code generated successfully');

    res.json({
      qrCode: student.qrCode,
      qrCodeDataURL,
      student: {
        name: student.name,
        rollNumber: student.rollNumber,
        vendor: student.vendor?.name || 'Unknown'
      }
    });
  } catch (error) {
    console.error('❌ QR code generation error:', error);
    res.status(500).json({ 
      message: 'Server error generating QR code',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get all students (admin only)
router.get('/', auth, requireStudent, async (req, res) => {
  try {
    const { page = 1, limit = 50, vendor, search, active } = req.query;
    
    const query = {};
    
    // Handle vendor filter - validate ObjectId format
    if (vendor) {
      const mongoose = require('mongoose');
      if (mongoose.Types.ObjectId.isValid(vendor)) {
        query.vendor = vendor;
      } else {
        // If not a valid ObjectId, find vendor by name
        const vendorDoc = await Vendor.findOne({ 
          name: { $regex: vendor, $options: 'i' } 
        });
        if (vendorDoc) {
          query.vendor = vendorDoc._id;
        } else {
          // If vendor not found, return empty results
          return res.json({
            students: [],
            totalPages: 0,
            currentPage: page,
            total: 0
          });
        }
      }
    }
    
    if (active !== undefined) query.isActive = active === 'true';
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { rollNumber: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const students = await Student.find(query)
      .populate('vendor', 'name location')
      .sort({ name: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Student.countDocuments(query);

    res.json({
      students,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get student by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const student = await Student.findById(req.params.id)
      .populate('vendor', 'name location contactInfo');
    
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    res.json({ student });
  } catch (error) {
    console.error('Get student error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Search student by roll number or QR code
router.get('/search/:identifier', auth, async (req, res) => {
  try {
    const { identifier } = req.params;
    
    const student = await Student.findOne({
      $or: [
        { rollNumber: identifier },
        { qrCode: identifier },
        { email: identifier }
      ],
      isActive: true
    }).populate('vendor', 'name location');

    if (!student) {
      return res.status(404).json({ message: 'Student not found or inactive' });
    }

    res.json({ student });
  } catch (error) {
    console.error('Search student error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update student
router.put('/:id', auth, requireStudent, async (req, res) => {
  try {
    const { name, vendor, isActive } = req.body;
    
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { name, vendor, isActive },
      { new: true, runValidators: true }
    ).populate('vendor', 'name location');

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    res.json({ student });
  } catch (error) {
    console.error('Update student error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Deactivate student
router.delete('/:id', auth, requireStudent, async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    res.json({ message: 'Student deactivated successfully' });
  } catch (error) {
    console.error('Deactivate student error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get student meal history
router.get('/:id/meals', auth, async (req, res) => {
  try {
    const { page = 1, limit = 30 } = req.query;
    
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const meals = student.mealHistory
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice((page - 1) * limit, page * limit);

    res.json({
      meals,
      totalPages: Math.ceil(student.mealHistory.length / limit),
      currentPage: page,
      total: student.mealHistory.length
    });
  } catch (error) {
    console.error('Get student meals error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Clean up invalid vendor references
router.post('/cleanup-vendors', auth, requireAdmin, async (req, res) => {
  try {
    const mongoose = require('mongoose');
    
    // Find students with invalid vendor references (string instead of ObjectId)
    const invalidStudents = await Student.find({
      vendor: { $type: 'string' }
    });
    
    let fixed = 0;
    let failed = 0;
    const errors = [];
    
    for (const student of invalidStudents) {
      try {
        // Find the correct vendor by name
        const vendor = await Vendor.findOne({ 
          name: { $regex: student.vendor, $options: 'i' } 
        });
        
        if (vendor) {
          student.vendor = vendor._id;
          await student.save();
          fixed++;
          console.log(`Fixed student: ${student.name}, vendor: ${student.vendor} -> ${vendor.name}`);
        } else {
          console.log(`Could not find vendor for student: ${student.name}, vendor: ${student.vendor}`);
          failed++;
          errors.push(`Could not find vendor for student: ${student.name}`);
        }
      } catch (error) {
        console.error(`Error fixing student ${student.name}:`, error);
        failed++;
        errors.push(`Error fixing student ${student.name}: ${error.message}`);
      }
    }
    
    res.json({
      message: 'Vendor cleanup completed',
      totalInvalid: invalidStudents.length,
      fixed,
      failed,
      errors: errors.slice(0, 10) // Return first 10 errors
    });
  } catch (error) {
    console.error('Cleanup vendors error:', error);
    res.status(500).json({ message: 'Server error during cleanup' });
  }
});

// Generate QR code for student
router.get('/qr-code/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find student
    const student = await Student.findById(id).populate('vendor', 'name');
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Generate QR code data URL
    const qrData = {
      studentId: student._id,
      qrCode: student.qrCode,
      name: student.name,
      rollNumber: student.rollNumber,
      vendor: student.vendor.name
    };

    const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData), {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    res.json({
      qrCode: student.qrCode,
      qrCodeDataURL,
      student: {
        name: student.name,
        rollNumber: student.rollNumber,
        vendor: student.vendor.name
      }
    });
  } catch (error) {
    console.error('QR code generation error:', error);
    res.status(500).json({ message: 'Server error generating QR code' });
  }
});

module.exports = router;
