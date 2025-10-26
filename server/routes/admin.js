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
  const mongoose = require('mongoose');
  const session = await mongoose.startSession();
  
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No CSV file uploaded' });
    }

    const results = [];
    const errors = [];

    // Parse CSV file from memory buffer using proper CSV parsing
    const csvData = req.file.buffer.toString('utf8');
    const lines = csvData.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      return res.status(400).json({ message: 'CSV file is empty' });
    }
    
    // Parse header row with proper CSV parsing
    const parseCSVLine = (line) => {
      const result = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      
      result.push(current.trim());
      return result;
    };
    
    const headers = parseCSVLine(lines[0]);
    console.log('📋 CSV Headers:', headers);
    
    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const row = {};
      
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      
      results.push(row);
    }
    
    console.log(`📊 Parsed ${results.length} rows from CSV`);
    console.log('📋 Sample parsed data:', results.slice(0, 2));
    
    // Debug: Check CSV parsing results
    console.log('🔍 CSV Parsing Debug:');
    console.log('- Total rows parsed:', results.length);
    console.log('- First row keys:', Object.keys(results[0] || {}));
    console.log('- Sample emails found:', results.map(r => r['Email Address']).slice(0, 5));
    console.log('- All emails valid:', results.every(r => r['Email Address'] && r['Email Address'].includes('@')));

    // Start transaction
    await session.startTransaction();
    console.log(`🔄 Transaction started - Session ID: ${session.id}`);
    
    // Test database connection
    const connectionTest = await Student.countDocuments({}).session(session);
    console.log(`🔍 Database connection test - Total students in DB: ${connectionTest}`);

    // Process in batches to avoid timeout
    const BATCH_SIZE = 20;
    const processedStudents = [];
    const vendors = await Vendor.find({ isActive: true }).session(session);
    const vendorMap = new Map();
    
    // Create multiple mappings for each vendor (with and without spaces, different cases)
    vendors.forEach(vendor => {
      const cleanName = vendor.name.trim().toLowerCase();
      vendorMap.set(cleanName, vendor._id);
      // Also add without spaces for "Uniworld " -> "Uniworld" matching
      vendorMap.set(cleanName.replace(/\s+/g, ''), vendor._id);
    });

    console.log(`📊 Processing ${results.length} rows from CSV in batches of ${BATCH_SIZE}`);
    console.log('Available vendors:', vendors.map(v => v.name));
    console.log('📋 CSV Headers detected:', headers);

    // Process all records in a single transaction to ensure consistency
    console.log(`🔄 Processing ${results.length} rows in single transaction`);
    
    // Add progress logging for large files
    const progressInterval = results.length > 20 ? Math.floor(results.length / 10) : results.length;
    
    for (let i = 0; i < results.length; i++) {
      // Log progress for large files
      if (i > 0 && i % progressInterval === 0) {
        console.log(`📊 Progress: ${i}/${results.length} rows processed (${Math.round((i/results.length)*100)}%)`);
      }
      const row = results[i];
      
      try {
        console.log(`📝 Processing row ${i + 1}:`, row);
        
        // Map your headers to expected fields - try multiple variations
        const possibleNameHeaders = ['Full Name', 'Name', 'name', 'full_name', 'FullName'];
        const possibleEmailHeaders = ['Email Address', 'Email', 'email', 'EmailAddress', 'email_address'];
        const possibleBatchHeaders = ['Batch', 'batch', 'Roll Number', 'roll_number', 'RollNumber'];
        const possibleVendorHeaders = ['Vendor', 'vendor', 'Vendor Name', 'vendor_name'];
        const possibleLocationHeaders = ['Hostel :', 'Hostel', 'hostel', 'Location', 'location'];
        
        const findHeader = (possibleHeaders) => {
          for (const header of possibleHeaders) {
            if (headers.includes(header)) {
              return header;
            }
          }
          return possibleHeaders[0]; // fallback to first option
        };
        
        const studentData = {
          name: row[findHeader(possibleNameHeaders)],
          email: row[findHeader(possibleEmailHeaders)],
          rollNumber: row[findHeader(possibleBatchHeaders)],
          vendor: row[findHeader(possibleVendorHeaders)],
          vendorLocation: row[findHeader(possibleLocationHeaders)]
        };
        
        console.log(`📋 Mapped data:`, studentData);

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
          }).session(session);
          
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
            await newVendor.save({ session });
            vendorId = newVendor._id;
            vendorMap.set(cleanVendorName.toLowerCase(), vendorId);
            console.log(`Created new vendor: ${cleanVendorName}`);
          }
        }
        
        // CRITICAL: Verify vendorId is valid
        if (!vendorId) {
          console.log(`❌ CRITICAL ERROR: No vendor ID found for student ${studentData.name}!`);
          errors.push(`Row ${i + 2}: No vendor found for ${studentData.vendor}`);
          continue;
        }
        
        console.log(`🔍 DEBUG: Vendor ID for ${studentData.name}: ${vendorId}`);

        // Check if student exists
        let student = await Student.findOne({ 
          $or: [
            { email: studentData.email },
            { rollNumber: studentData.rollNumber }
          ]
        }).session(session);

        if (student) {
          // Update existing student
          console.log(`🔄 Updating existing student: ${student.name} (${student.email})`);
          console.log(`   - Current isActive: ${student.isActive}`);
          console.log(`   - Setting isActive to: true`);
          
          student.name = studentData.name;
          student.rollNumber = studentData.rollNumber;
          student.vendor = vendorId;
          student.vendorLocation = studentData.vendorLocation || 'TBD';
          student.isActive = true;
          student.updatedAt = new Date();
          
          const savedStudent = await student.save({ session });
          console.log(`✅ Updated student: ${savedStudent.name} - isActive: ${savedStudent.isActive}`);
          
          // CRITICAL: Verify the student is actually active in database
          const verifyStudent = await Student.findById(savedStudent._id).session(session);
          console.log(`🔍 VERIFICATION: Student ${verifyStudent.name} - isActive: ${verifyStudent.isActive}`);
          
          if (!verifyStudent.isActive) {
            console.log(`❌ CRITICAL ERROR: Student ${verifyStudent.name} is NOT active after save!`);
          }
        } else {
          // Create new student
          console.log(`🆕 Creating new student: ${studentData.name} (${studentData.email})`);
          
          student = new Student({
            name: studentData.name,
            email: studentData.email,
            rollNumber: studentData.rollNumber,
            vendor: vendorId,
            vendorLocation: studentData.vendorLocation || 'TBD',
            isActive: true
          });
          
          // DEBUG: Check student object before save
          console.log(`🔍 DEBUG: Student object before save:`, {
            name: student.name,
            email: student.email,
            isActive: student.isActive,
            vendor: student.vendor
          });
          
          const savedStudent = await student.save({ session });
          console.log(`✅ Created student: ${savedStudent.name} - isActive: ${savedStudent.isActive}`);
          
          // CRITICAL: Verify the student is actually active in database
          const verifyStudent = await Student.findById(savedStudent._id).session(session);
          console.log(`🔍 VERIFICATION: Student ${verifyStudent.name} - isActive: ${verifyStudent.isActive}`);
          
          if (!verifyStudent.isActive) {
            console.log(`❌ CRITICAL ERROR: Student ${verifyStudent.name} is NOT active after save!`);
            console.log(`🔍 DEBUG: Full student object:`, verifyStudent);
          }
        }

        processedStudents.push({
          name: student.name,
          email: student.email,
          rollNumber: student.rollNumber,
          vendor: row.vendor,
          status: 'processed'
        });

      } catch (error) {
        console.error(`❌ Error processing row ${i + 1}:`, error);
        errors.push(`Row ${i + 2}: ${error.message}`);
      }
    }
    
    console.log(`✅ All ${results.length} rows processed in single transaction`);

    // Deactivate students not in the CSV
    console.log('🔍 Email Extraction Debug:');
    console.log('- Available headers:', headers);
    console.log('- Sample row keys:', Object.keys(results[0] || {}));
    console.log('- Sample row data:', results[0]);
    
    // Try multiple possible email header variations
    const possibleEmailHeaders = ['Email Address', 'Email', 'email', 'EmailAddress', 'email_address'];
    let emailHeader = null;
    
    for (const header of possibleEmailHeaders) {
      if (headers.includes(header)) {
        emailHeader = header;
        console.log(`✅ Found email header: "${header}"`);
        break;
      }
    }
    
    if (!emailHeader) {
      console.log('❌ No email header found! Available headers:', headers);
      console.log('⚠️ Skipping deactivation logic to prevent data loss');
    }
    
    const csvEmails = emailHeader ? results.map(row => {
      const email = row[emailHeader];
      return email ? email.trim() : null;
    }).filter(Boolean) : [];
    
    console.log(`📧 CSV emails to keep active:`, csvEmails.slice(0, 5));
    console.log(`📊 Total emails found in CSV: ${csvEmails.length}`);
    
    if (csvEmails.length === 0) {
      console.log('⚠️ CRITICAL: No emails found in CSV - skipping deactivation to prevent data loss!');
      console.log('📋 Available row keys:', Object.keys(results[0] || {}));
      console.log('📋 Sample row data:', results[0]);
    } else {
      console.log('✅ Email extraction working - students in CSV will be kept active');
    }
    
    // NOTE: Deactivation moved to AFTER transaction commit to prevent conflicts

    // Clean up any students with invalid vendor references
    try {
      const invalidStudents = await Student.find({
        vendor: { $type: 'string' }
      }).session(session);
      
      if (invalidStudents.length > 0) {
        console.log(`Found ${invalidStudents.length} students with invalid vendor references, cleaning up...`);
        
        for (const student of invalidStudents) {
          // Find the correct vendor by name
          const vendor = await Vendor.findOne({ 
            name: { $regex: student.vendor, $options: 'i' } 
          }).session(session);
          
          if (vendor) {
            student.vendor = vendor._id;
            await student.save({ session });
            console.log(`Fixed vendor reference for student: ${student.name}`);
          } else {
            console.log(`Could not find vendor for student: ${student.name}, vendor: ${student.vendor}`);
          }
        }
      }
    } catch (cleanupError) {
      console.error('Error during cleanup:', cleanupError);
    }

    // Commit final transaction
    await session.commitTransaction();
    console.log(`✅ Transaction committed successfully`);

    // Wait a moment for database to be consistent
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // CRITICAL: Immediately check database state after commit
    console.log(`🔍 CRITICAL CHECK: Database state immediately after commit`);
    
    // Force database refresh by ending session
    await session.endSession();
    console.log(`🔄 Session ended, checking database without session`);
    
    const immediateActiveCount = await Student.countDocuments({ isActive: true });
    console.log(`   - Immediate active count: ${immediateActiveCount}`);
    
    // NOW perform deactivation AFTER transaction commit
    let deactivateResult = { modifiedCount: 0 };
    
    if (csvEmails.length > 0) {
      console.log(`🔍 Deactivation Debug (AFTER commit):`);
      console.log(`   - CSV emails count: ${csvEmails.length}`);
      console.log(`   - Sample CSV emails: ${csvEmails.slice(0, 3)}`);
      
      // Check current active students before deactivation
      const activeStudentsBeforeDeactivation = await Student.countDocuments({ isActive: true });
      console.log(`   - Active students before deactivation: ${activeStudentsBeforeDeactivation}`);
      
      // Check how many students will be deactivated
      const studentsToDeactivate = await Student.countDocuments({
        email: { $nin: csvEmails },
        isActive: true
      });
      console.log(`   - Students that will be deactivated: ${studentsToDeactivate}`);
      
      deactivateResult = await Student.updateMany(
        { 
          email: { $nin: csvEmails },
          isActive: true 
        },
        { 
          isActive: false,
          updatedAt: new Date()
        }
      );
      
      console.log(`❌ Deactivated ${deactivateResult.modifiedCount} students not in CSV`);
      
      // Verify deactivation worked
      const activeStudentsAfterDeactivation = await Student.countDocuments({ isActive: true });
      console.log(`   - Active students after deactivation: ${activeStudentsAfterDeactivation}`);
      
      if (deactivateResult.modifiedCount !== studentsToDeactivate) {
        console.log(`⚠️ WARNING: Expected to deactivate ${studentsToDeactivate}, but deactivated ${deactivateResult.modifiedCount}`);
      }
    } else {
      console.log('⚠️ Skipping deactivation - no valid emails found in CSV');
    }
    
    // Check if our processed students are actually in the database
    const processedEmails = processedStudents.map(s => s.email);
    const immediateProcessedCount = await Student.countDocuments({
      email: { $in: processedEmails },
      isActive: true
    });
    console.log(`   - Immediate processed students active: ${immediateProcessedCount}/${processedStudents.length}`);
    
    if (immediateProcessedCount !== processedStudents.length) {
      console.log(`❌ CRITICAL ISSUE: Not all processed students are active immediately after commit!`);
      
      // Check what happened to the missing students
      const missingStudents = await Student.find({
        email: { $in: processedEmails },
        isActive: false
      }).select('name email isActive createdAt updatedAt');
      
      console.log(`❌ Missing students (inactive):`, missingStudents.map(s => 
        `${s.name} (${s.email}) - Created: ${s.createdAt}, Updated: ${s.updatedAt}`
      ));
    }

    // Get final counts
    const totalActiveStudents = await Student.countDocuments({ isActive: true });
    const totalInactiveStudents = await Student.countDocuments({ isActive: false });
    const activeProcessedStudents = await Student.countDocuments({
      email: { $in: processedEmails },
      isActive: true
    });
    
    // Additional verification: Check specific students
    const sampleProcessedStudents = processedStudents.slice(0, 5);
    console.log(`🔍 Verification - Sample processed students:`);
    for (const student of sampleProcessedStudents) {
      const dbStudent = await Student.findOne({ email: student.email });
      console.log(`- ${student.name} (${student.email}): Active=${dbStudent?.isActive}, Vendor=${dbStudent?.vendor}`);
    }
    
    console.log(`✅ CSV Processing Complete:`);
    console.log(`- Total CSV rows: ${results.length}`);
    console.log(`- Processed students: ${processedStudents.length}`);
    console.log(`- Processed students that are active: ${activeProcessedStudents}`);
    console.log(`- Errors: ${errors.length}`);
    console.log(`- Total active students: ${totalActiveStudents}`);
    console.log(`- Total inactive students: ${totalInactiveStudents}`);
    
    if (activeProcessedStudents !== processedStudents.length) {
      console.log(`⚠️ WARNING: Not all processed students are active! Expected ${processedStudents.length}, found ${activeProcessedStudents}`);
      
      // Find which students are not active
      const inactiveProcessedStudents = await Student.find({
        email: { $in: processedEmails },
        isActive: false
      }).select('name email isActive');
      
      console.log(`❌ Inactive processed students:`, inactiveProcessedStudents.map(s => `${s.name} (${s.email})`));
    }

    res.json({
      message: 'CSV processed successfully',
      totalRows: results.length,
      processed: processedStudents.length,
      errors: errors.length,
      totalActiveStudents: totalActiveStudents,
      totalInactiveStudents: totalInactiveStudents,
      deactivatedCount: deactivateResult.modifiedCount,
      processedStudents: processedStudents.slice(0, 10), // Return first 10 for preview
      errorDetails: errors.slice(0, 10) // Return first 10 errors
    });

  } catch (error) {
    console.error('CSV upload error:', error);
    await session.abortTransaction();
    await session.endSession();
    res.status(500).json({ message: 'Server error during CSV processing' });
  } finally {
    // Session is already ended in the main flow, only end if not already ended
    if (session.inTransaction()) {
      await session.abortTransaction();
      await session.endSession();
    }
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
