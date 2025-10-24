const mongoose = require('mongoose');

const mealRecordSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  mealType: {
    type: String,
    enum: ['breakfast', 'lunch', 'dinner'],
    default: 'lunch'
  },
  claimed: {
    type: Boolean,
    default: false
  },
  claimedAt: {
    type: Date
  },
  claimedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: {
    type: String,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
mealRecordSchema.index({ student: 1, date: 1 });
mealRecordSchema.index({ vendor: 1, date: 1 });
mealRecordSchema.index({ date: 1, claimed: 1 });

// Compound index for unique daily meals per student
mealRecordSchema.index({ student: 1, date: 1, mealType: 1 }, { unique: true });

module.exports = mongoose.model('MealRecord', mealRecordSchema);
