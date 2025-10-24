const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const Student = require('../models/Student');
const Vendor = require('../models/Vendor');
const MealRecord = require('../models/MealRecord');
const { auth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Configure multer for CSV upload (using memory storage for Vercel)
const upload = multer({
  storage: multer.memoryStorage(),
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
    const vendorMap = new Map();
    
    // Create multiple mappings for each vendor (with and without spaces, different cases)
    vendors.forEach(vendor => {
      const cleanName = vendor.name.trim().toLowerCase();
      vendorMap.set(cleanName, vendor._id);
      // Also add without spaces for "Uniworld " -> "Uniworld" matching
      vendorMap.set(cleanName.replace(/\s+/g, ''), vendor._id);
    });

    console.log(`📊 Processing ${results.length} rows from CSV`);
    console.log('Available vendors:', vendors.map(v => v.name));

    for (let i = 0; i < results.length; i++) {
      const row = results[i];
      try {
        // Map your headers to expected fields
        const studentData = {
          name: row['Full Name'],
          email: row['Email Address'],
          rollNumber: row['Batch'],
          vendor: row['Vendor'],
          vendorLocation: row['Hostel :']
        };

        // Validate required fields
        if (!studentData.name || !studentData.email || !studentData.rollNumber || !studentData.vendor) {
          errors.push(`Row ${i + 2}: Missing required fields`);
          continue;
        }

        // Validate email domain
        if (!studentData.email.endsWith('@sst.scaler.com')) {
          errors.push(`Row ${i + 2}: Invalid email domain for ${studentData.email}`);
          continue;
        }

        // Find or create vendor (trim whitespace for matching)
        const cleanVendorName = studentData.vendor.trim();
        let vendorId = vendorMap.get(cleanVendorName.toLowerCase());
        
        if (i < 3) { // Debug first 3 rows
          console.log(`Row ${i + 1}: ${studentData.name} -> Vendor: "${studentData.vendor}" -> Clean: "${cleanVendorName}" -> Found: ${!!vendorId}`);
        }
        
        if (!vendorId) {
          // Try to find vendor by partial name match (case insensitive)
          const existingVendor = await Vendor.findOne({
            name: { $regex: new RegExp(cleanVendorName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }
          });
          
          if (existingVendor) {
            vendorId = existingVendor._id;
            vendorMap.set(cleanVendorName.toLowerCase(), vendorId);
            console.log(`✅ Found existing vendor by partial match: ${existingVendor.name}`);
          } else {
            const newVendor = new Vendor({
              name: cleanVendorName,
              location: studentData.vendorLocation || 'TBD',
              description: `Auto-created from CSV import`
            });
            await newVendor.save();
            vendorId = newVendor._id;
            vendorMap.set(cleanVendorName.toLowerCase(), vendorId);
            console.log(`Created new vendor: ${cleanVendorName}`);
          }
        }

        // Check if student exists
        let student = await Student.findOne({ 
          $or: [
            { email: studentData.email },
            { rollNumber: studentData.rollNumber }
          ]
        });

        if (student) {
          // Update existing student
          student.name = studentData.name;
          student.rollNumber = studentData.rollNumber;
          student.vendor = vendorId;
          student.vendorLocation = studentData.vendorLocation || 'TBD';
          student.isActive = true;
          student.updatedAt = new Date();
          await student.save();
          console.log(`✅ Updated student: ${student.name}`);
        } else {
          // Create new student
          student = new Student({
            name: studentData.name,
            email: studentData.email,
            rollNumber: studentData.rollNumber,
            vendor: vendorId,
            vendorLocation: studentData.vendorLocation || 'TBD',
            isActive: true
          });
          await student.save();
          console.log(`✅ Created student: ${student.name}`);
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

    // Clean up any students with invalid vendor references
    try {
      const invalidStudents = await Student.find({
        vendor: { $type: 'string' }
      });
      
      if (invalidStudents.length > 0) {
        console.log(`Found ${invalidStudents.length} students with invalid vendor references, cleaning up...`);
        
        for (const student of invalidStudents) {
          // Find the correct vendor by name
          const vendor = await Vendor.findOne({ 
            name: { $regex: student.vendor, $options: 'i' } 
          });
          
          if (vendor) {
            student.vendor = vendor._id;
            await student.save();
            console.log(`Fixed vendor reference for student: ${student.name}`);
          } else {
            console.log(`Could not find vendor for student: ${student.name}, vendor: ${student.vendor}`);
          }
        }
      }
    } catch (cleanupError) {
      console.error('Error during cleanup:', cleanupError);
    }

    console.log(`✅ CSV Processing Complete:`);
    console.log(`- Total rows: ${results.length}`);
    console.log(`- Processed students: ${processedStudents.length}`);
    console.log(`- Errors: ${errors.length}`);

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

// Clean up invalid vendor references
router.post('/cleanup-vendors', auth, requireAdmin, async (req, res) => {
  try {
    const invalidStudents = await Student.find({
      vendor: { $type: 'string' }
    });
    
    console.log(`Found ${invalidStudents.length} students with invalid vendor references`);
    
    let fixed = 0;
    let failed = 0;
    const errors = [];
    
    for (const student of invalidStudents) {
      try {
        console.log(`Processing student: ${student.name}, vendor: ${student.vendor}`);
        
        // Find the correct vendor by name
        const vendor = await Vendor.findOne({ 
          name: { $regex: student.vendor, $options: 'i' } 
        });
        
        if (vendor) {
          student.vendor = vendor._id;
          await student.save();
          fixed++;
          console.log(`✅ Fixed student: ${student.name}, vendor: ${student.vendor} -> ${vendor.name}`);
        } else {
          console.log(`❌ Could not find vendor for student: ${student.name}, vendor: ${student.vendor}`);
          failed++;
          errors.push(`Could not find vendor for student: ${student.name}`);
        }
      } catch (error) {
        console.error(`❌ Error fixing student ${student.name}:`, error);
        failed++;
        errors.push(`Error fixing student ${student.name}: ${error.message}`);
      }
    }
    
    // Also check for any students with null/undefined vendors
    const nullVendorStudents = await Student.find({
      $or: [
        { vendor: null },
        { vendor: { $exists: false } }
      ]
    });
    
    console.log(`Found ${nullVendorStudents.length} students with null/undefined vendors`);
    
    for (const student of nullVendorStudents) {
      try {
        // Assign to first available vendor as default
        const defaultVendor = await Vendor.findOne();
        if (defaultVendor) {
          student.vendor = defaultVendor._id;
          await student.save();
          fixed++;
          console.log(`✅ Assigned default vendor to student: ${student.name}`);
        }
      } catch (error) {
        console.error(`❌ Error assigning default vendor to student ${student.name}:`, error);
        failed++;
      }
    }
    
    res.json({
      message: 'Vendor cleanup completed',
      totalInvalid: invalidStudents.length,
      nullVendors: nullVendorStudents.length,
      fixed,
      failed,
      errors: errors.slice(0, 10) // Return first 10 errors
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ message: 'Server error during cleanup' });
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
    
    // Get today's verifications (meal records claimed today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todaysVerifications = await MealRecord.countDocuments({
      claimed: true,
      claimedAt: {
        $gte: today,
        $lt: tomorrow
      }
    });
    
    // Get active students (students who have claimed meals recently)
    const activeStudents = await Student.countDocuments({
      isActive: true,
      lastMealClaimed: {
        $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
      }
    });
    
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
      todaysVerifications,
      activeStudents,
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
