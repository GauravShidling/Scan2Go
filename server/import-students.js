const mongoose = require('mongoose');
const fs = require('fs');
const csv = require('csv-parser');
const Student = require('./models/Student');
const Vendor = require('./models/Vendor');
require('dotenv').config();

async function importStudents() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing students
    console.log('🧹 Clearing existing students...');
    await Student.deleteMany({});
    console.log('✅ Students cleared');

    // Read CSV file
    const results = [];
    const filePath = '/Users/gauravsmac/Downloads/Scan2Go_Data - Sheet1.csv';
    
    console.log('📖 Reading CSV file...');
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', resolve)
        .on('error', reject);
    });

    console.log(`📊 Found ${results.length} rows in CSV`);

    // Get vendors
    const vendors = await Vendor.find({ isActive: true });
    console.log('🏪 Available vendors:', vendors.map(v => v.name));

    // Create vendor map
    const vendorMap = new Map();
    vendors.forEach(vendor => {
      const cleanName = vendor.name.trim().toLowerCase();
      vendorMap.set(cleanName, vendor._id);
      // Also add without spaces for "Uniworld " -> "Uniworld" matching
      vendorMap.set(cleanName.replace(/\s+/g, ''), vendor._id);
    });

    let processed = 0;
    let errors = 0;

    console.log('🔄 Processing students...');

    for (let i = 0; i < results.length; i++) {
      const row = results[i];
      
      try {
        // Map CSV headers to expected fields
        const studentData = {
          name: row['Full Name'],
          email: row['Email Address'],
          rollNumber: row['Batch'],
          vendor: row['Vendor'],
          vendorLocation: row['Hostel :']
        };

        // Validate required fields
        if (!studentData.name || !studentData.email || !studentData.rollNumber || !studentData.vendor) {
          console.log(`❌ Row ${i + 2}: Missing required fields`);
          errors++;
          continue;
        }

        // Validate email domain
        if (!studentData.email.endsWith('@sst.scaler.com')) {
          console.log(`❌ Row ${i + 2}: Invalid email domain for ${studentData.email}`);
          errors++;
          continue;
        }

        // Find vendor
        const cleanVendorName = studentData.vendor.trim();
        let vendorId = vendorMap.get(cleanVendorName.toLowerCase());
        
        if (!vendorId) {
          // Try to find vendor by partial name match
          const existingVendor = await Vendor.findOne({
            name: { $regex: new RegExp(cleanVendorName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }
          });
          
          if (existingVendor) {
            vendorId = existingVendor._id;
            console.log(`✅ Found vendor by partial match: ${existingVendor.name}`);
          } else {
            console.log(`❌ Row ${i + 2}: Vendor not found: ${cleanVendorName}`);
            errors++;
            continue;
          }
        }

        // Create student
        const student = new Student({
          name: studentData.name,
          email: studentData.email,
          rollNumber: studentData.rollNumber,
          vendor: vendorId,
          vendorLocation: studentData.vendorLocation || 'TBD',
          isActive: true
        });

        await student.save();
        processed++;

        if (processed % 100 === 0) {
          console.log(`✅ Processed ${processed} students...`);
        }

      } catch (error) {
        console.log(`❌ Row ${i + 2}: Error - ${error.message}`);
        errors++;
      }
    }

    console.log('\n🎉 Import Complete!');
    console.log(`✅ Successfully processed: ${processed} students`);
    console.log(`❌ Errors: ${errors}`);
    
    const totalStudents = await Student.countDocuments();
    console.log(`📊 Total students in database: ${totalStudents}`);

  } catch (error) {
    console.error('❌ Import failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

importStudents();
