const express = require('express');
const { body, validationResult, query } = require('express-validator');
const User = require('../models/User');
const Consultant = require('../models/Consultant');
const Category = require('../models/Category');
const Booking = require('../models/Booking');
const { authenticateToken, requireAdmin, asyncHandler } = require('../middleware/auth');

const router = express.Router();

// All admin routes require admin authentication
router.use(authenticateToken, requireAdmin);

// @route   GET /api/admin/dashboard
// @desc    Get admin dashboard statistics
// @access  Admin only
router.get('/dashboard', asyncHandler(async (req, res) => {
  // Get counts
  const totalUsers = await User.countDocuments();
  const totalConsultants = await Consultant.countDocuments();
  const totalCategories = await Category.countDocuments();
  const totalBookings = await Booking.countDocuments();

  // Get recent bookings
  const recentBookings = await Booking.find()
    .populate('client', 'firstName lastName')
    .populate('consultant.user', 'firstName lastName')
    .populate('category', 'name')
    .sort({ createdAt: -1 })
    .limit(10);

  // Get booking statistics
  const bookingStats = await Booking.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  // Get revenue statistics (if payment integration is added)
  const revenueStats = {
    total: 0,
    thisMonth: 0,
    lastMonth: 0
  };

  // Get top categories
  const topCategories = await Category.find()
    .sort({ consultantCount: -1 })
    .limit(5);

  // Get top consultants
  const topConsultants = await Consultant.find()
    .populate('user', 'firstName lastName')
    .sort({ 'rating.average': -1 })
    .limit(5);

  res.json({
    success: true,
    data: {
      stats: {
        totalUsers,
        totalConsultants,
        totalCategories,
        totalBookings
      },
      recentBookings,
      bookingStats,
      revenueStats,
      topCategories,
      topConsultants
    }
  });
}));

// @route   GET /api/admin/users
// @desc    Get all users with pagination and filtering
// @access  Admin only
router.get('/users', [
  query('role').optional().isIn(['client', 'consultant', 'admin']),
  query('status').optional().isIn(['active', 'inactive']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().isString()
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

  const { role, status, page = 1, limit = 20, search } = req.query;
  const skip = (page - 1) * limit;

  // Build query
  const query = {};
  if (role) query.role = role;
  if (status) query.isActive = status === 'active';
  if (search) {
    query.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }

  const users = await User.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await User.countDocuments(query);

  res.json({
    success: true,
    data: {
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
}));

// @route   PUT /api/admin/users/:id/status
// @desc    Update user status (activate/deactivate)
// @access  Admin only
router.put('/users/:id/status', [
  body('isActive')
    .isBoolean()
    .withMessage('isActive must be a boolean')
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

  const { isActive } = req.body;

  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Prevent admin from deactivating themselves
  if (user._id.toString() === req.user._id.toString()) {
    return res.status(400).json({
      success: false,
      message: 'Cannot deactivate your own account'
    });
  }

  user.isActive = isActive;
  await user.save();

  res.json({
    success: true,
    message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
    data: {
      user
    }
  });
}));

// @route   GET /api/admin/consultants
// @desc    Get all consultants with pagination and filtering
// @access  Admin only
router.get('/consultants', [
  query('verified').optional().isBoolean(),
  query('active').optional().isBoolean(),
  query('category').optional().isMongoId(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
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

  const { verified, active, category, page = 1, limit = 20 } = req.query;
  const skip = (page - 1) * limit;

  // Build query
  const query = {};
  if (verified !== undefined) query.isVerified = verified;
  if (active !== undefined) query.isActive = active;
  if (category) query.categories = category;

  const consultants = await Consultant.find(query)
    .populate('user', 'firstName lastName email')
    .populate('categories', 'name')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Consultant.countDocuments(query);

  res.json({
    success: true,
    data: {
      consultants,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
}));

// @route   PUT /api/admin/consultants/:id/verify
// @desc    Verify a consultant
// @access  Admin only
router.put('/consultants/:id/verify', [
  body('isVerified')
    .isBoolean()
    .withMessage('isVerified must be a boolean')
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

  const { isVerified } = req.body;

  const consultant = await Consultant.findById(req.params.id);
  if (!consultant) {
    return res.status(404).json({
      success: false,
      message: 'Consultant not found'
    });
  }

  consultant.isVerified = isVerified;
  await consultant.save();

  // Populate the response
  await consultant.populate('user', 'firstName lastName email');
  await consultant.populate('categories', 'name');

  res.json({
    success: true,
    message: `Consultant ${isVerified ? 'verified' : 'unverified'} successfully`,
    data: {
      consultant
    }
  });
}));

// @route   GET /api/admin/bookings
// @desc    Get all bookings with pagination and filtering
// @access  Admin only
router.get('/bookings', [
  query('status').optional().isIn(['pending', 'confirmed', 'completed', 'cancelled', 'no-show']),
  query('dateFrom').optional().isISO8601(),
  query('dateTo').optional().isISO8601(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
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

  const { status, dateFrom, dateTo, page = 1, limit = 20 } = req.query;
  const skip = (page - 1) * limit;

  // Build query
  const query = {};
  if (status) query.status = status;
  if (dateFrom || dateTo) {
    query.date = {};
    if (dateFrom) query.date.$gte = new Date(dateFrom);
    if (dateTo) query.date.$lte = new Date(dateTo);
  }

  const bookings = await Booking.find(query)
    .populate('client', 'firstName lastName email')
    .populate('consultant.user', 'firstName lastName email')
    .populate('category', 'name')
    .sort({ date: -1, startTime: -1 })
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

// @route   PUT /api/admin/bookings/:id/status
// @desc    Update booking status (admin override)
// @access  Admin only
router.put('/bookings/:id/status', [
  body('status')
    .isIn(['pending', 'confirmed', 'completed', 'cancelled', 'no-show'])
    .withMessage('Invalid status'),
  body('notes.admin')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Admin notes cannot exceed 500 characters')
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

  // Update booking
  booking.status = status;
  if (notes?.admin) {
    booking.notes.admin = notes.admin;
  }

  // Set completion time if status is completed
  if (status === 'completed') {
    booking.completedAt = new Date();
  }

  // Set cancellation time if status is cancelled
  if (status === 'cancelled') {
    booking.cancelledAt = new Date();
    booking.cancelledBy = 'admin';
  }

  await booking.save();

  // Populate the response
  await booking.populate('client', 'firstName lastName email');
  await booking.populate('consultant.user', 'firstName lastName email');
  await booking.populate('category', 'name');

  res.json({
    success: true,
    message: 'Booking status updated successfully',
    data: {
      booking
    }
  });
}));

module.exports = router; 