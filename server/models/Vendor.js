const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  contactInfo: {
    phone: String,
    email: String,
    address: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  totalStudents: {
    type: Number,
    default: 0
  },
  dailyMealsServed: {
    type: Number,
    default: 0
  },
  monthlyStats: [{
    month: String,
    year: Number,
    totalMeals: Number,
    uniqueStudents: Number
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
vendorSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Index for faster queries
vendorSchema.index({ isActive: 1 });

module.exports = mongoose.model('Vendor', vendorSchema);
