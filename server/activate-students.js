const mongoose = require('mongoose');
require('dotenv').config();

// Import the Student model
const Student = require('./models/Student');

async function activateAllStudents() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/scan2go');
    console.log('✅ Connected to MongoDB');

    // Get count of inactive students
    const inactiveCount = await Student.countDocuments({ isActive: false });
    console.log(`📊 Found ${inactiveCount} inactive students`);

    if (inactiveCount === 0) {
      console.log('✅ All students are already active!');
      return;
    }

    // Activate all students
    const result = await Student.updateMany(
      { isActive: false },
      { 
        isActive: true,
        updatedAt: new Date()
      }
    );

    console.log(`✅ Activated ${result.modifiedCount} students`);

    // Get final counts
    const totalActiveStudents = await Student.countDocuments({ isActive: true });
    const totalInactiveStudents = await Student.countDocuments({ isActive: false });

    console.log(`📊 Final counts:`);
    console.log(`   - Active students: ${totalActiveStudents}`);
    console.log(`   - Inactive students: ${totalInactiveStudents}`);

    console.log('🎉 All students activated successfully!');

  } catch (error) {
    console.error('❌ Error activating students:', error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the function
activateAllStudents();
