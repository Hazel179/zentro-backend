const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { authenticateToken, checkOwnership, asyncHandler } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/users/profile
// @desc    Get current user profile
// @access  Private
router.get('/profile', authenticateToken, asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      user: req.user
    }
  });
}));

// @route   PUT /api/users/profile
// @desc    Update current user profile
// @access  Private
router.put('/profile', [
  authenticateToken,
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('phone')
    .optional()
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Please enter a valid phone number')
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

  const { firstName, lastName, phone } = req.body;

  // Update user
  if (firstName) req.user.firstName = firstName;
  if (lastName) req.user.lastName = lastName;
  if (phone !== undefined) req.user.phone = phone;

  await req.user.save();

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      user: req.user
    }
  });
}));

// @route   GET /api/users/:id
// @desc    Get user by ID (public info only)
// @access  Public
router.get('/:id', asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
    .select('firstName lastName avatar isVerified');

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  res.json({
    success: true,
    data: {
      user
    }
  });
}));

module.exports = router; 