const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const Student = require('../models/Student');
const Vendor = require('../models/Vendor');
const { auth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Configure multer for CSV upload
const upload = multer({
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Upload and process CSV
router.post('/upload-csv', auth, requireAdmin, upload.single('csvFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No CSV file uploaded' });
    }

    const results = [];
    const errors = [];
    const filePath = req.file.path;

    // Parse CSV file
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', resolve)
        .on('error', reject);
    });

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    // Process each row
    const processedStudents = [];
    const vendors = await Vendor.find({ isActive: true });
    const vendorMap = new Map(vendors.map(v => [v.name.toLowerCase(), v._id]));

    for (let i = 0; i < results.length; i++) {
      const row = results[i];
      try {
        // Validate required fields
        if (!row.name || !row.email || !row.rollNumber || !row.vendor) {
          errors.push(`Row ${i + 2}: Missing required fields`);
          continue;
        }

        // Validate email domain
        if (!row.email.endsWith('@sst.scaler.com')) {
          errors.push(`Row ${i + 2}: Invalid email domain for ${row.email}`);
          continue;
        }

        // Find or create vendor
        let vendorId = vendorMap.get(row.vendor.toLowerCase());
        if (!vendorId) {
          const newVendor = new Vendor({
            name: row.vendor,
            location: row.vendorLocation || 'TBD',
            description: `Auto-created from CSV import`
          });
          await newVendor.save();
          vendorId = newVendor._id;
          vendorMap.set(row.vendor.toLowerCase(), vendorId);
        }

        // Check if student exists
        let student = await Student.findOne({ 
          $or: [
            { email: row.email },
            { rollNumber: row.rollNumber }
          ]
        });

        if (student) {
          // Update existing student
          student.name = row.name;
          student.vendor = vendorId;
          student.isActive = true;
          student.updatedAt = new Date();
          await student.save();
        } else {
          // Create new student
          student = new Student({
            name: row.name,
            email: row.email,
            rollNumber: row.rollNumber,
            vendor: vendorId
          });
          await student.save();
        }

        processedStudents.push({
          name: student.name,
          email: student.email,
          rollNumber: student.rollNumber,
          vendor: row.vendor,
          status: 'processed'
        });

      } catch (error) {
        errors.push(`Row ${i + 2}: ${error.message}`);
      }
    }

    // Deactivate students not in the CSV
    const csvEmails = results.map(row => row.email).filter(Boolean);
    await Student.updateMany(
      { 
        email: { $nin: csvEmails },
        isActive: true 
      },
      { 
        isActive: false,
        updatedAt: new Date()
      }
    );

    res.json({
      message: 'CSV processed successfully',
      totalRows: results.length,
      processed: processedStudents.length,
      errors: errors.length,
      processedStudents: processedStudents.slice(0, 10), // Return first 10 for preview
      errorDetails: errors.slice(0, 10) // Return first 10 errors
    });

  } catch (error) {
    console.error('CSV upload error:', error);
    res.status(500).json({ message: 'Server error during CSV processing' });
  }
});

// Export students data
router.get('/export-students', auth, requireAdmin, async (req, res) => {
  try {
    const { vendor, active = 'true' } = req.query;
    
    const query = { isActive: active === 'true' };
    if (vendor) query.vendor = vendor;

    const students = await Student.find(query)
      .populate('vendor', 'name location')
      .sort({ name: 1 });

    // Convert to CSV format
    const csvData = students.map(student => ({
      name: student.name,
      email: student.email,
      rollNumber: student.rollNumber,
      vendor: student.vendor.name,
      qrCode: student.qrCode,
      isActive: student.isActive,
      lastMealClaimed: student.lastMealClaimed?.date || '',
      createdAt: student.createdAt
    }));

    res.json({
      students: csvData,
      total: csvData.length,
      exportDate: new Date().toISOString()
    });

  } catch (error) {
    console.error('Export students error:', error);
    res.status(500).json({ message: 'Server error during export' });
  }
});

// Get system statistics
router.get('/stats', auth, requireAdmin, async (req, res) => {
  try {
    const totalStudents = await Student.countDocuments({ isActive: true });
    const totalVendors = await Vendor.countDocuments({ isActive: true });
    
    // Get students by vendor
    const studentsByVendor = await Student.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$vendor', count: { $sum: 1 } } },
      { $lookup: { from: 'vendors', localField: '_id', foreignField: '_id', as: 'vendor' } },
      { $unwind: '$vendor' },
      { $project: { vendorName: '$vendor.name', count: 1 } }
    ]);

    // Get recent activity
    const recentStudents = await Student.find({ isActive: true })
      .sort({ updatedAt: -1 })
      .limit(10)
      .populate('vendor', 'name')
      .select('name email rollNumber vendor updatedAt');

    res.json({
      totalStudents,
      totalVendors,
      studentsByVendor,
      recentStudents
    });

  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Bulk operations
router.post('/bulk-deactivate', auth, requireAdmin, async (req, res) => {
  try {
    const { studentIds } = req.body;
    
    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ message: 'Student IDs array is required' });
    }

    const result = await Student.updateMany(
      { _id: { $in: studentIds } },
      { isActive: false, updatedAt: new Date() }
    );

    res.json({
      message: 'Students deactivated successfully',
      modifiedCount: result.modifiedCount
    });

  } catch (error) {
    console.error('Bulk deactivate error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
