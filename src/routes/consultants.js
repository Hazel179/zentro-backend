const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Consultant = require('../models/Consultant');
const User = require('../models/User');
const { authenticateToken, requireConsultant, optionalAuth, asyncHandler } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/consultants
// @desc    Get all consultants (public)
// @access  Public
router.get('/', [
  query('category').optional().isMongoId().withMessage('Invalid category ID'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  query('sort').optional().isIn(['rating', 'hourlyRate', 'experience']).withMessage('Invalid sort field'),
  query('order').optional().isIn(['asc', 'desc']).withMessage('Order must be asc or desc'),
  query('minRate').optional().isFloat({ min: 0 }).withMessage('Min rate must be a positive number'),
  query('maxRate').optional().isFloat({ min: 0 }).withMessage('Max rate must be a positive number'),
  query('available').optional().isBoolean().withMessage('Available must be a boolean')
], optionalAuth, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: errors.array()
    });
  }

  const {
    category,
    page = 1,
    limit = 10,
    sort = 'rating',
    order = 'desc',
    minRate,
    maxRate,
    available
  } = req.query;

  const skip = (page - 1) * limit;

  const queryObj = { isActive: true };
  if (category) queryObj.categories = category;
  if (minRate !== undefined) queryObj.hourlyRate = { $gte: parseFloat(minRate) };
  if (maxRate !== undefined) {
    queryObj.hourlyRate = queryObj.hourlyRate || {};
    queryObj.hourlyRate.$lte = parseFloat(maxRate);
  }

  const sortObj = {};
  sortObj[sort] = order === 'desc' ? -1 : 1;

  const consultants = await Consultant.find(queryObj)
    .populate('user', 'firstName lastName avatar')
    .populate('categories', 'name color')
    .sort(sortObj)
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Consultant.countDocuments(queryObj);

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

// @route   GET /api/consultants/:id
// @desc    Get consultant by ID
// @access  Public
router.get('/:id', optionalAuth, asyncHandler(async (req, res) => {
  const consultant = await Consultant.findById(req.params.id)
    .populate('user', 'firstName lastName avatar phone')
    .populate('categories', 'name description color');

  if (!consultant) {
    return res.status(404).json({
      success: false,
      message: 'Consultant not found'
    });
  }

  res.json({
    success: true,
    data: {
      consultant
    }
  });
}));

// @route   POST /api/consultants
// @desc    Create consultant profile
// @access  Private (consultant role)
router.post('/', [
  authenticateToken,
  requireConsultant,
  body('categories')
    .isArray({ min: 1 })
    .withMessage('At least one category is required'),
  body('categories.*')
    .isMongoId()
    .withMessage('Invalid category ID'),
  body('bio')
    .trim()
    .isLength({ min: 50, max: 1000 })
    .withMessage('Bio must be between 50 and 1000 characters'),
  body('experience')
    .isInt({ min: 0, max: 50 })
    .withMessage('Experience must be between 0 and 50 years'),
  body('hourlyRate')
    .isFloat({ min: 10, max: 1000 })
    .withMessage('Hourly rate must be between $10 and $1000'),
  body('languages')
    .optional()
    .isArray()
    .withMessage('Languages must be an array')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: errors.array()
    });
  }

  const existingProfile = await Consultant.findOne({ user: req.user._id });
  if (existingProfile) {
    return res.status(400).json({
      success: false,
      message: 'Consultant profile already exists'
    });
  }

  const { categories, bio, experience, hourlyRate, languages = [] } = req.body;

  const consultant = new Consultant({
    user: req.user._id,
    categories,
    bio,
    experience,
    hourlyRate,
    languages
  });

  await consultant.save();
  await consultant.populate('user', 'firstName lastName avatar');
  await consultant.populate('categories', 'name color');

  res.status(201).json({
    success: true,
    message: 'Consultant profile created successfully',
    data: {
      consultant
    }
  });
}));

// @route   PUT /api/consultants/:id
// @desc    Update consultant profile
// @access  Private (owner or admin)
router.put('/:id', [
  authenticateToken,
  body('categories').optional().isArray({ min: 1 }).withMessage('At least one category is required'),
  body('categories.*').optional().isMongoId().withMessage('Invalid category ID'),
  body('bio').optional().trim().isLength({ min: 50, max: 1000 }).withMessage('Bio must be between 50 and 1000 characters'),
  body('experience').optional().isInt({ min: 0, max: 50 }).withMessage('Experience must be between 0 and 50 years'),
  body('hourlyRate').optional().isFloat({ min: 10, max: 1000 }).withMessage('Hourly rate must be between $10 and $1000'),
  body('languages').optional().isArray().withMessage('Languages must be an array'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: errors.array()
    });
  }

  const consultant = await Consultant.findById(req.params.id);
  if (!consultant) {
    return res.status(404).json({
      success: false,
      message: 'Consultant not found'
    });
  }

  if (req.user.role !== 'admin' && consultant.user.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  Object.keys(req.body).forEach(key => {
    if (req.body[key] !== undefined) {
      consultant[key] = req.body[key];
    }
  });

  await consultant.save();
  await consultant.populate('user', 'firstName lastName avatar');
  await consultant.populate('categories', 'name color');

  res.json({
    success: true,
    message: 'Consultant profile updated successfully',
    data: {
      consultant
    }
  });
}));

// @route   GET /api/consultants/profile/me
// @desc    Get current user's consultant profile
// @access  Private (consultant)
router.get('/profile/me', authenticateToken, requireConsultant, asyncHandler(async (req, res) => {
  const consultant = await Consultant.findOne({ user: req.user._id })
    .populate('categories', 'name color');

  if (!consultant) {
    return res.status(404).json({
      success: false,
      message: 'Consultant profile not found'
    });
  }

  res.json({
    success: true,
    data: {
      consultant
    }
  });
}));

// ✅ NEW ROUTE: /api/consultant_rating
router.get('/consultant_rating', [
  query('order').optional().isIn(['asc', 'desc']).withMessage('Order must be asc or desc')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: errors.array()
    });
  }

  const order = req.query.order === 'asc' ? 1 : -1;

  const consultants = await Consultant.find({ isActive: true })
    .sort({ rating: order })
    .limit(10)
    .populate('user', 'firstName lastName avatar')
    .populate('categories', 'name color');

  res.status(200).json({
    success: true,
    data: {
      consultants
    }
  });
}));

module.exports = router;
