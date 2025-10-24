const express = require('express');
const Student = require('../models/Student');
const { auth, requireStudent } = require('../middleware/auth');

const router = express.Router();

// Get all students (admin only)
router.get('/', auth, requireStudent, async (req, res) => {
  try {
    const { page = 1, limit = 50, vendor, search, active } = req.query;
    
    const query = {};
    
    if (vendor) query.vendor = vendor;
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

module.exports = router;
