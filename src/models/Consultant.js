const mongoose = require('mongoose');

const consultantSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  categories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  }],
  bio: {
    type: String,
    required: [true, 'Bio is required'],
    maxlength: [1000, 'Bio cannot exceed 1000 characters']
  },
  experience: {
    type: Number,
    required: [true, 'Years of experience is required'],
    min: [0, 'Experience cannot be negative'],
    max: [50, 'Experience cannot exceed 50 years']
  },
  hourlyRate: {
    type: Number,
    required: [true, 'Hourly rate is required'],
    min: [10, 'Hourly rate must be at least $10'],
    max: [1000, 'Hourly rate cannot exceed $1000']
  },
  availability: {
    monday: {
      isAvailable: { type: Boolean, default: false },
      startTime: { type: String, default: '09:00' },
      endTime: { type: String, default: '17:00' }
    },
    tuesday: {
      isAvailable: { type: Boolean, default: false },
      startTime: { type: String, default: '09:00' },
      endTime: { type: String, default: '17:00' }
    },
    wednesday: {
      isAvailable: { type: Boolean, default: false },
      startTime: { type: String, default: '09:00' },
      endTime: { type: String, default: '17:00' }
    },
    thursday: {
      isAvailable: { type: Boolean, default: false },
      startTime: { type: String, default: '09:00' },
      endTime: { type: String, default: '17:00' }
    },
    friday: {
      isAvailable: { type: Boolean, default: false },
      startTime: { type: String, default: '09:00' },
      endTime: { type: String, default: '17:00' }
    },
    saturday: {
      isAvailable: { type: Boolean, default: false },
      startTime: { type: String, default: '09:00' },
      endTime: { type: String, default: '17:00' }
    },
    sunday: {
      isAvailable: { type: Boolean, default: false },
      startTime: { type: String, default: '09:00' },
      endTime: { type: String, default: '17:00' }
    }
  },
  qualifications: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    institution: {
      type: String,
      required: true,
      trim: true
    },
    year: {
      type: Number,
      required: true,
      min: [1900, 'Year must be after 1900'],
      max: [new Date().getFullYear(), 'Year cannot be in the future']
    }
  }],
  certifications: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    issuingBody: {
      type: String,
      required: true,
      trim: true
    },
    issueDate: {
      type: Date,
      required: true
    },
    expiryDate: {
      type: Date
    }
  }],
  languages: [{
    type: String,
    trim: true,
    enum: ['English', 'Spanish', 'French', 'German', 'Chinese', 'Japanese', 'Korean', 'Arabic', 'Hindi', 'Portuguese', 'Russian', 'Italian', 'Dutch', 'Swedish', 'Norwegian', 'Danish', 'Finnish', 'Polish', 'Turkish', 'Greek']
  }],
  specializations: [{
    type: String,
    trim: true
  }],
  achievements: [{
    type: String,
    trim: true
  }],
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  totalBookings: {
    type: Number,
    default: 0
  },
  completedBookings: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for completion rate
consultantSchema.virtual('completionRate').get(function() {
  if (this.totalBookings === 0) return 0;
  return Math.round((this.completedBookings / this.totalBookings) * 100);
});

// Virtual for availability status
consultantSchema.virtual('isCurrentlyAvailable').get(function() {
  const now = new Date();
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayOfWeek = days[now.getDay()];
  const currentTime = now.toTimeString().slice(0, 5);

  const dayAvailability = this.availability[dayOfWeek];
  if (!dayAvailability || !dayAvailability.isAvailable) return false;

  return currentTime >= dayAvailability.startTime && currentTime <= dayAvailability.endTime;
});

// Indexes for better query performance
consultantSchema.index({ user: 1 });
consultantSchema.index({ categories: 1 });
consultantSchema.index({ isActive: 1 });
consultantSchema.index({ isVerified: 1 });
consultantSchema.index({ 'rating.average': -1 });
consultantSchema.index({ hourlyRate: 1 });

// Pre-save middleware to update category consultant counts
consultantSchema.pre('save', async function(next) {
  if (this.isModified('categories')) {
    const Category = mongoose.model('Category');
    
    // Decrement count from old categories
    if (this._original && this._original.categories) {
      await Category.updateMany(
        { _id: { $in: this._original.categories } },
        { $inc: { consultantCount: -1 } }
      );
    }
    
    // Increment count for new categories
    if (this.categories && this.categories.length > 0) {
      await Category.updateMany(
        { _id: { $in: this.categories } },
        { $inc: { consultantCount: 1 } }
      );
    }
  }
  next();
});

module.exports = mongoose.model('Consultant', consultantSchema); 