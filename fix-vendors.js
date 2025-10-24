const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Student = require('./models/Student');
const Vendor = require('./models/Vendor');

async function fixVendorReferences() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find students with invalid vendor references (string instead of ObjectId)
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
    
    console.log('\n🎉 Cleanup Summary:');
    console.log(`Total invalid vendor references: ${invalidStudents.length}`);
    console.log(`Total null/undefined vendors: ${nullVendorStudents.length}`);
    console.log(`Fixed: ${fixed}`);
    console.log(`Failed: ${failed}`);
    
    if (errors.length > 0) {
      console.log('\n❌ Errors:');
      errors.slice(0, 10).forEach(error => console.log(`  - ${error}`));
    }
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Run the cleanup
fixVendorReferences();
