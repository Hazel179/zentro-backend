const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    unique: true,
    trim: true,
    maxlength: [100, 'Category name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Category description is required'],
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  icon: {
    type: String,
    required: [true, 'Category icon is required'],
    trim: true
  },
  color: {
    type: String,
    default: '#4B8843',
    match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Please enter a valid hex color']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  consultantCount: {
    type: Number,
    default: 0
  },
  bookingCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for total bookings
categorySchema.virtual('totalBookings').get(function() {
  return this.bookingCount;
});

// Index for better query performance
categorySchema.index({ name: 1 });
categorySchema.index({ isActive: 1 });
categorySchema.index({ sortOrder: 1 });

// Pre-save middleware to ensure unique name
categorySchema.pre('save', function(next) {
  this.name = this.name.charAt(0).toUpperCase() + this.name.slice(1).toLowerCase();
  next();
});

module.exports = mongoose.model('Category', categorySchema); 