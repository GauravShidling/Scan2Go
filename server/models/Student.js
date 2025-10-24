const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid/v4');

const studentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    validate: {
      validator: function(email) {
        return email.endsWith('@sst.scaler.com');
      },
      message: 'Email must end with @sst.scaler.com'
    }
  },
  rollNumber: {
    type: String,
    required: true,
    trim: true
  },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  qrCode: {
    type: String,
    unique: true
  },
  lastMealClaimed: {
    date: Date,
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor'
    }
  },
  mealHistory: [{
    date: {
      type: Date,
      default: Date.now
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor'
    },
    claimed: {
      type: Boolean,
      default: false
    }
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
studentSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Generate QR code when student is created
studentSchema.pre('save', function(next) {
  if (this.isNew && !this.qrCode) {
    this.qrCode = uuidv4();
  }
  next();
});

// Index for faster queries
studentSchema.index({ vendor: 1, isActive: 1 });

module.exports = mongoose.model('Student', studentSchema);
