const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Booking = require('../models/Booking');
const Consultant = require('../models/Consultant');
const { authenticateToken, requireClient, requireConsultant, asyncHandler } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/bookings
// @desc    Create a new booking
// @access  Private (client)
router.post('/', [
  authenticateToken,
  requireClient,
  body('consultant')
    .isMongoId()
    .withMessage('Valid consultant ID is required'),
  body('category')
    .isMongoId()
    .withMessage('Valid category ID is required'),
  body('date')
    .isISO8601()
    .withMessage('Valid date is required'),
  body('startTime')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Start time must be in HH:MM format'),
  body('endTime')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('End time must be in HH:MM format'),
  body('duration')
    .isInt({ min: 30, max: 480 })
    .withMessage('Duration must be between 30 and 480 minutes'),
  body('totalAmount')
    .custom((value) => {
      if (typeof value === 'string') value = Number(value);
      return typeof value === 'number' && !isNaN(value) && value >= 0;
    })
    .withMessage('Total amount is required and must be a number'),
  body('meetingType')
    .optional()
    .isIn(['video', 'audio', 'in-person'])
    .withMessage('Meeting type must be video, audio, or in-person'),
  body('notes.client')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Client notes cannot exceed 500 characters')
], asyncHandler(async (req, res) => {
  // Debug: log the incoming payload
  console.log('Received booking payload:', req.body);

  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: errors.array()
    });
  }

  // Extract all required fields
  let { consultant, category, date, startTime, endTime, duration, meetingType = 'video', notes, totalAmount } = req.body;
  // Accept totalAmount as string or number
  if (typeof totalAmount === 'string') totalAmount = Number(totalAmount);

  const bookingDate = new Date(date);

  // Create booking
  const booking = new Booking({
    client: req.user._id,
    consultant,
    category,
    date: bookingDate,
    startTime,
    endTime,
    duration,
    meetingType,
    notes,
    totalAmount
  });

  await booking.save();

  // Populate the response
  await booking.populate('consultant', 'hourlyRate');
  await booking.populate('consultant.user', 'firstName lastName');
  await booking.populate('category', 'name');

  res.status(201).json({
    success: true,
    message: 'Booking created successfully',
    data: {
      booking
    }
  });
}));

// @route   GET /api/bookings
// @desc    Get user's bookings
// @access  Private
router.get('/', [
  authenticateToken,
  query('status').optional().isIn(['pending', 'confirmed', 'completed', 'cancelled', 'no-show']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 })
], asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  // Build query based on user role
  let query = {};
  if (req.user.role === 'client') {
    query.client = req.user._id;
  } else if (req.user.role === 'consultant') {
    const consultant = await Consultant.findOne({ user: req.user._id });
    if (consultant) {
      query.consultant = consultant._id;
    } else {
      return res.status(404).json({
        success: false,
        message: 'Consultant profile not found'
      });
    }
  }

  if (status) {
    query.status = status;
  }

  const bookings = await Booking.find(query)
    .populate('client', 'firstName lastName')
    .populate('consultant.user', 'firstName lastName')
    .populate('category', 'name')
    .sort({ date: 1, startTime: 1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Booking.countDocuments(query);

  res.json({
    success: true,
    data: {
      bookings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
}));

// Add this route BEFORE any "/:id" route
// @route   GET /api/bookings/me
// @desc    Get bookings for the current user
// @access  Private
router.get('/me', authenticateToken, asyncHandler(async (req, res) => {
  let query = {};
  if (req.user.role === 'client') {
    query.client = req.user._id;
  } else if (req.user.role === 'consultant') {
    const consultant = await Consultant.findOne({ user: req.user._id });
    if (consultant) {
      query.consultant = consultant._id;
    } else {
      return res.status(404).json({
        success: false,
        message: 'Consultant profile not found'
      });
    }
  }
  const bookings = await Booking.find(query)
    .populate('client', 'firstName lastName')
    .populate('consultant.user', 'firstName lastName')
    .populate('category', 'name')
    .sort({ date: 1, startTime: 1 });
  res.json({
    success: true,
    data: { bookings }
  });
}));

// @route   GET /api/bookings/:id
// @desc    Get booking by ID
// @access  Private (owner or admin)
router.get('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate('client', 'firstName lastName email')
    .populate('consultant.user', 'firstName lastName email')
    .populate('category', 'name');

  if (!booking) {
    return res.status(404).json({
      success: false,
      message: 'Booking not found'
    });
  }

  // Check access permissions
  const isOwner = booking.client._id.toString() === req.user._id.toString();
  const isConsultant = req.user.role === 'consultant' && 
    booking.consultant.user._id.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'admin';

  if (!isOwner && !isConsultant && !isAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  res.json({
    success: true,
    data: {
      booking
    }
  });
}));

// @route   PUT /api/bookings/:id/status
// @desc    Update booking status
// @access  Private (consultant or admin)
router.put('/:id/status', [
  authenticateToken,
  requireConsultant,
  body('status')
    .isIn(['confirmed', 'completed', 'cancelled', 'no-show'])
    .withMessage('Invalid status'),
  body('notes.consultant')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Consultant notes cannot exceed 500 characters')
], asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: errors.array()
    });
  }

  const { status, notes } = req.body;

  const booking = await Booking.findById(req.params.id);
  if (!booking) {
    return res.status(404).json({
      success: false,
      message: 'Booking not found'
    });
  }

  // Check if user is the consultant for this booking
  const consultant = await Consultant.findOne({ user: req.user._id });
  if (!consultant || booking.consultant.toString() !== consultant._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  // Update booking
  booking.status = status;
  if (notes?.consultant) {
    booking.notes.consultant = notes.consultant;
  }

  // Set completion time if status is completed
  if (status === 'completed') {
    booking.completedAt = new Date();
  }

  // Set cancellation time if status is cancelled
  if (status === 'cancelled') {
    booking.cancelledAt = new Date();
    booking.cancelledBy = 'consultant';
  }

  await booking.save();

  // Populate the response
  await booking.populate('client', 'firstName lastName');
  await booking.populate('consultant.user', 'firstName lastName');
  await booking.populate('category', 'name');

  res.json({
    success: true,
    message: 'Booking status updated successfully',
    data: {
      booking
    }
  });
}));

// @route   POST /api/bookings/:id/cancel
// @desc    Cancel booking (client)
// @access  Private (client - owner)
router.post('/:id/cancel', [
  authenticateToken,
  requireClient,
  body('reason')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Cancellation reason cannot exceed 200 characters')
], asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const booking = await Booking.findById(req.params.id);
  if (!booking) {
    return res.status(404).json({
      success: false,
      message: 'Booking not found'
    });
  }

  // Check if user is the client for this booking
  if (booking.client.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  // Check if booking can be cancelled
  if (booking.status !== 'pending' && booking.status !== 'confirmed') {
    return res.status(400).json({
      success: false,
      message: 'Booking cannot be cancelled in its current status'
    });
  }

  // Update booking
  booking.status = 'cancelled';
  booking.cancelledAt = new Date();
  booking.cancelledBy = 'client';
  if (reason) {
    booking.cancellationReason = reason;
  }

  await booking.save();

  res.json({
    success: true,
    message: 'Booking cancelled successfully'
  });
}));

// @route   POST /api/bookings/:id/rate
// @desc    Rate a completed booking
// @access  Private (client - owner)
router.post('/:id/rate', [
  authenticateToken,
  requireClient,
  body('score')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('review')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Review cannot exceed 1000 characters')
], asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: errors.array()
    });
  }

  const { score, review } = req.body;

  const booking = await Booking.findById(req.params.id);
  if (!booking) {
    return res.status(404).json({
      success: false,
      message: 'Booking not found'
    });
  }

  // Check if user is the client for this booking
  if (booking.client.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  // Check if booking is completed
  if (booking.status !== 'completed') {
    return res.status(400).json({
      success: false,
      message: 'Can only rate completed bookings'
    });
  }

  // Check if already rated
  if (booking.rating.score) {
    return res.status(400).json({
      success: false,
      message: 'Booking has already been rated'
    });
  }

  // Update booking rating
  booking.rating = {
    score,
    review,
    createdAt: new Date()
  };

  await booking.save();

  // Update consultant's average rating
  const consultant = await Consultant.findById(booking.consultant);
  if (consultant) {
    const allRatings = await Booking.find({
      consultant: booking.consultant,
      'rating.score': { $exists: true }
    });

    const totalRating = allRatings.reduce((sum, b) => sum + b.rating.score, 0);
    consultant.rating.average = totalRating / allRatings.length;
    consultant.rating.count = allRatings.length;
    await consultant.save();
  }

  res.json({
    success: true,
    message: 'Booking rated successfully'
  });
}));

module.exports = router; 