const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  consultant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Consultant',
    required: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  date: {
    type: Date,
    required: [true, 'Booking date is required'],
    validate: {
      validator: function(value) {
        return value > new Date();
      },
      message: 'Booking date must be in the future'
    }
  },
  duration: {
    type: Number,
    required: [true, 'Duration is required'],
    min: [30, 'Minimum duration is 30 minutes'],
    max: [480, 'Maximum duration is 8 hours'],
    default: 60
  },
  startTime: {
    type: String,
    required: [true, 'Start time is required'],
    match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter a valid time in HH:MM format']
  },
  endTime: {
    type: String,
    required: [true, 'End time is required'],
    match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter a valid time in HH:MM format']
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'completed', 'cancelled', 'no-show'],
    default: 'pending'
  },
  totalAmount: {
    type: Number,
    required: [true, 'Total amount is required'],
    min: [0, 'Total amount cannot be negative']
  },
  notes: {
    client: {
      type: String,
      maxlength: [500, 'Client notes cannot exceed 500 characters']
    },
    consultant: {
      type: String,
      maxlength: [500, 'Consultant notes cannot exceed 500 characters']
    }
  },
  meetingLink: {
    type: String,
    trim: true
  },
  meetingType: {
    type: String,
    enum: ['video', 'audio', 'in-person'],
    default: 'video'
  },
  location: {
    type: String,
    trim: true,
    maxlength: [200, 'Location cannot exceed 200 characters']
  },
  cancellationReason: {
    type: String,
    maxlength: [200, 'Cancellation reason cannot exceed 200 characters']
  },
  cancelledBy: {
    type: String,
    enum: ['client', 'consultant', 'admin']
  },
  cancelledAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  rating: {
    score: {
      type: Number,
      min: 1,
      max: 5
    },
    review: {
      type: String,
      maxlength: [1000, 'Review cannot exceed 1000 characters']
    },
    createdAt: {
      type: Date
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for booking date in readable format
bookingSchema.virtual('formattedDate').get(function() {
  return this.date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

// Virtual for booking time range
bookingSchema.virtual('timeRange').get(function() {
  return `${this.startTime} - ${this.endTime}`;
});

// Virtual for duration in hours
bookingSchema.virtual('durationHours').get(function() {
  return this.duration / 60;
});

// Virtual for status color
bookingSchema.virtual('statusColor').get(function() {
  const colors = {
    pending: '#FFDF59',
    confirmed: '#4B8843',
    completed: '#4B8843',
    cancelled: '#FF6B6B',
    'no-show': '#FF6B6B'
  };
  return colors[this.status] || '#6C757D';
});

// Indexes for better query performance
bookingSchema.index({ client: 1 });
bookingSchema.index({ consultant: 1 });
bookingSchema.index({ date: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ 'consultant.user': 1 });
bookingSchema.index({ date: 1, startTime: 1, consultant: 1 });

// Pre-save middleware to calculate end time and total amount
bookingSchema.pre('save', async function(next) {
  if (this.isModified('startTime') || this.isModified('duration')) {
    // Calculate end time
    const startTime = new Date(`2000-01-01T${this.startTime}:00`);
    const endTime = new Date(startTime.getTime() + this.duration * 60000);
    this.endTime = endTime.toTimeString().slice(0, 5);
  }
  
  // Calculate total amount if not set
  if (!this.totalAmount && this.consultant) {
    const Consultant = mongoose.model('Consultant');
    const consultant = await Consultant.findById(this.consultant);
    if (consultant) {
      this.totalAmount = (consultant.hourlyRate * this.duration) / 60;
    }
  }
  
  next();
});

// Pre-save middleware to update consultant booking counts
bookingSchema.pre('save', async function(next) {
  if (this.isModified('status')) {
    const Consultant = mongoose.model('Consultant');
    
    if (this.status === 'completed' && this._original && this._original.status !== 'completed') {
      await Consultant.findByIdAndUpdate(this.consultant, {
        $inc: { completedBookings: 1 }
      });
    }
  }
  
  if (this.isNew) {
    const Consultant = mongoose.model('Consultant');
    await Consultant.findByIdAndUpdate(this.consultant, {
      $inc: { totalBookings: 1 }
    });
  }
  
  next();
});

// Static method to check for booking conflicts
bookingSchema.statics.checkConflict = async function(consultantId, date, startTime, endTime, excludeBookingId = null) {
  const query = {
    consultant: consultantId,
    date: date,
    status: { $nin: ['cancelled', 'no-show'] },
    $or: [
      {
        startTime: { $lt: endTime },
        endTime: { $gt: startTime }
      }
    ]
  };
  
  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId };
  }
  
  const conflict = await this.findOne(query);
  return conflict;
};

module.exports = mongoose.model('Booking', bookingSchema); 