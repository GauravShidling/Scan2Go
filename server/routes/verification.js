const express = require('express');
const Student = require('../models/Student');
const MealRecord = require('../models/MealRecord');
const { auth, requireVendor } = require('../middleware/auth');

const router = express.Router();

// Verify student by QR code or roll number
router.post('/verify', auth, requireVendor, async (req, res) => {
  try {
    const { identifier, vendorId } = req.body;
    
    if (!identifier || !vendorId) {
      return res.status(400).json({ message: 'Identifier and vendor ID are required' });
    }

    // Find student
    const student = await Student.findOne({
      $or: [
        { qrCode: identifier },
        { rollNumber: identifier },
        { email: identifier }
      ],
      isActive: true
    }).populate('vendor', 'name location');

    if (!student) {
      return res.status(404).json({ 
        message: 'Student not found or inactive',
        verified: false 
      });
    }

    // Check if student is assigned to this vendor
    if (student.vendor._id.toString() !== vendorId) {
      return res.status(400).json({ 
        message: 'Student is not assigned to this vendor',
        verified: false,
        student: {
          name: student.name,
          rollNumber: student.rollNumber,
          assignedVendor: student.vendor.name
        }
      });
    }

    // Check if student has already claimed today's meal
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayMeal = await MealRecord.findOne({
      student: student._id,
      date: { $gte: today, $lt: tomorrow },
      claimed: true
    });

    if (todayMeal) {
      return res.status(400).json({
        message: 'Student has already claimed today\'s meal',
        verified: false,
        alreadyClaimed: true,
        student: {
          name: student.name,
          rollNumber: student.rollNumber,
          claimedAt: todayMeal.claimedAt
        }
      });
    }

    // Create meal record
    const mealRecord = new MealRecord({
      student: student._id,
      vendor: vendorId,
      date: new Date(),
      claimed: true,
      claimedAt: new Date(),
      claimedBy: req.user._id
    });

    await mealRecord.save();

    // Update student's last meal claimed
    student.lastMealClaimed = {
      date: new Date(),
      vendor: vendorId
    };

    // Add to meal history
    student.mealHistory.push({
      date: new Date(),
      vendor: vendorId,
      claimed: true
    });

    await student.save();

    res.json({
      message: 'Student verified successfully',
      verified: true,
      student: {
        name: student.name,
        rollNumber: student.rollNumber,
        email: student.email,
        vendor: student.vendor.name
      },
      mealRecord: {
        id: mealRecord._id,
        claimedAt: mealRecord.claimedAt
      }
    });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ message: 'Server error during verification' });
  }
});

// Get verification history for a vendor
router.get('/history/:vendorId', auth, requireVendor, async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { page = 1, limit = 50, date } = req.query;

    const query = { vendor: vendorId, claimed: true };
    
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
      query.date = { $gte: startDate, $lt: endDate };
    }

    const mealRecords = await MealRecord.find(query)
      .populate('student', 'name rollNumber email')
      .populate('claimedBy', 'name email')
      .sort({ claimedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await MealRecord.countDocuments(query);

    res.json({
      mealRecords,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get verification history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get today's verification stats
router.get('/stats/:vendorId', auth, requireVendor, async (req, res) => {
  try {
    const { vendorId } = req.params;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get total students assigned to vendor
    const totalStudents = await Student.countDocuments({ 
      vendor: vendorId, 
      isActive: true 
    });

    // Get students who claimed today
    const claimedToday = await MealRecord.countDocuments({
      vendor: vendorId,
      date: { $gte: today, $lt: tomorrow },
      claimed: true
    });

    // Get students who haven't claimed today
    const notClaimedToday = totalStudents - claimedToday;

    // Get hourly breakdown
    const hourlyStats = await MealRecord.aggregate([
      {
        $match: {
          vendor: vendorId,
          date: { $gte: today, $lt: tomorrow },
          claimed: true
        }
      },
      {
        $group: {
          _id: { $hour: '$claimedAt' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      totalStudents,
      claimedToday,
      notClaimedToday,
      claimRate: totalStudents > 0 ? (claimedToday / totalStudents * 100).toFixed(2) : 0,
      hourlyStats
    });
  } catch (error) {
    console.error('Get verification stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
