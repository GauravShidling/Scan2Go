const express = require('express');
const Vendor = require('../models/Vendor');
const Student = require('../models/Student');
const { auth, requireVendor } = require('../middleware/auth');

const router = express.Router();

// Get all vendors
router.get('/', auth, async (req, res) => {
  try {
    const vendors = await Vendor.find({ isActive: true })
      .sort({ name: 1 });

    res.json({ vendors });
  } catch (error) {
    console.error('Get vendors error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get vendor by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    res.json({ vendor });
  } catch (error) {
    console.error('Get vendor error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get vendor dashboard data
router.get('/:id/dashboard', auth, requireVendor, async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    // Get students assigned to this vendor
    const students = await Student.find({ 
      vendor: req.params.id, 
      isActive: true 
    }).select('name rollNumber email lastMealClaimed');

    // Get today's meal records
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayMeals = await Student.aggregate([
      { $match: { vendor: vendor._id, isActive: true } },
      { $unwind: '$mealHistory' },
      { 
        $match: { 
          'mealHistory.date': { 
            $gte: today, 
            $lt: tomorrow 
          } 
        } 
      },
      { $count: 'total' }
    ]);

    // Get monthly stats
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const monthlyStats = await Student.aggregate([
      { $match: { vendor: vendor._id, isActive: true } },
      { $unwind: '$mealHistory' },
      {
        $match: {
          'mealHistory.date': {
            $gte: new Date(currentYear, currentMonth, 1),
            $lt: new Date(currentYear, currentMonth + 1, 1)
          }
        }
      },
      { $count: 'total' }
    ]);

    res.json({
      vendor: {
        id: vendor._id,
        name: vendor.name,
        location: vendor.location,
        totalStudents: students.length,
        todayMeals: todayMeals[0]?.total || 0,
        monthlyMeals: monthlyStats[0]?.total || 0
      },
      students: students.map(student => ({
        id: student._id,
        name: student.name,
        rollNumber: student.rollNumber,
        email: student.email,
        lastMealClaimed: student.lastMealClaimed
      }))
    });
  } catch (error) {
    console.error('Get vendor dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Search students for a vendor
router.get('/:id/students/search', auth, requireVendor, async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const students = await Student.find({
      vendor: req.params.id,
      isActive: true,
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { rollNumber: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } }
      ]
    }).select('name rollNumber email qrCode lastMealClaimed');

    res.json({ students });
  } catch (error) {
    console.error('Search vendor students error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new vendor (admin only)
router.post('/', auth, requireVendor, async (req, res) => {
  try {
    const { name, description, location, contactInfo } = req.body;

    const vendor = new Vendor({
      name,
      description,
      location,
      contactInfo
    });

    await vendor.save();

    res.status(201).json({ vendor });
  } catch (error) {
    console.error('Create vendor error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update vendor
router.put('/:id', auth, requireVendor, async (req, res) => {
  try {
    const { name, description, location, contactInfo, isActive } = req.body;
    
    const vendor = await Vendor.findByIdAndUpdate(
      req.params.id,
      { name, description, location, contactInfo, isActive },
      { new: true, runValidators: true }
    );

    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    res.json({ vendor });
  } catch (error) {
    console.error('Update vendor error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
