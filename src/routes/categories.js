const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Category = require('../models/Category');
const { authenticateToken, requireAdmin, optionalAuth, asyncHandler } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/categories
// @desc    Get all categories (public)
// @access  Public
router.get('/', [
  query('active').optional().isBoolean().withMessage('Active must be a boolean'),
  query('sort').optional().isIn(['name', 'sortOrder', 'consultantCount']).withMessage('Invalid sort field'),
  query('order').optional().isIn(['asc', 'desc']).withMessage('Order must be asc or desc')
], optionalAuth, asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: errors.array()
    });
  }

  const { active, sort = 'sortOrder', order = 'asc' } = req.query;

  // Build query
  const query = {};
  if (active !== undefined) {
    query.isActive = active === 'true';
  }

  // Build sort object
  const sortObj = {};
  sortObj[sort] = order === 'desc' ? -1 : 1;

  const categories = await Category.find(query)
    .sort(sortObj)
    .populate('consultantCount', 'name');

  res.json({
    success: true,
    count: categories.length,
    data: categories
  });
}));

// @route   GET /api/categories/:id
// @desc    Get single category by ID
// @access  Public
router.get('/:id', optionalAuth, asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id)
    .populate('consultantCount', 'name');

  if (!category) {
    return res.status(404).json({
      success: false,
      message: 'Category not found'
    });
  }

  res.json({
    success: true,
    data: category
  });
}));

// @route   POST /api/categories
// @desc    Create new category
// @access  Admin only
router.post('/', [
  authenticateToken,
  requireAdmin,
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Description must be between 10 and 500 characters'),
  body('icon')
    .trim()
    .notEmpty()
    .withMessage('Icon is required'),
  body('color')
    .optional()
    .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .withMessage('Please enter a valid hex color'),
  body('sortOrder')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Sort order must be a positive integer')
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

  const { name, description, icon, color = '#4B8843', sortOrder = 0 } = req.body;

  // Check if category already exists
  const existingCategory = await Category.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
  if (existingCategory) {
    return res.status(400).json({
      success: false,
      message: 'Category with this name already exists'
    });
  }

  const category = new Category({
    name,
    description,
    icon,
    color,
    sortOrder
  });

  await category.save();

  res.status(201).json({
    success: true,
    message: 'Category created successfully',
    data: category
  });
}));

// @route   PUT /api/categories/:id
// @desc    Update category
// @access  Admin only
router.put('/:id', [
  authenticateToken,
  requireAdmin,
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Description must be between 10 and 500 characters'),
  body('icon')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Icon cannot be empty'),
  body('color')
    .optional()
    .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .withMessage('Please enter a valid hex color'),
  body('sortOrder')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Sort order must be a positive integer'),
  body('isActive')
    .optional()
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

  const category = await Category.findById(req.params.id);
  if (!category) {
    return res.status(404).json({
      success: false,
      message: 'Category not found'
    });
  }

  // Check for name uniqueness if name is being updated
  if (req.body.name && req.body.name !== category.name) {
    const existingCategory = await Category.findOne({ 
      name: { $regex: new RegExp(`^${req.body.name}$`, 'i') },
      _id: { $ne: req.params.id }
    });
    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: 'Category with this name already exists'
      });
    }
  }

  // Update category
  Object.keys(req.body).forEach(key => {
    if (req.body[key] !== undefined) {
      category[key] = req.body[key];
    }
  });

  await category.save();

  res.json({
    success: true,
    message: 'Category updated successfully',
    data: category
  });
}));

// @route   DELETE /api/categories/:id
// @desc    Delete category
// @access  Admin only
router.delete('/:id', [
  authenticateToken,
  requireAdmin
], asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) {
    return res.status(404).json({
      success: false,
      message: 'Category not found'
    });
  }

  // Check if category has consultants
  if (category.consultantCount > 0) {
    return res.status(400).json({
      success: false,
      message: 'Cannot delete category with active consultants'
    });
  }

  await Category.findByIdAndDelete(req.params.id);

  res.json({
    success: true,
    message: 'Category deleted successfully'
  });
}));

// @route   GET /api/categories/:id/consultants
// @desc    Get consultants in a category
// @access  Public
router.get('/:id/consultants', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  query('sort').optional().isIn(['rating', 'hourlyRate', 'experience']).withMessage('Invalid sort field'),
  query('order').optional().isIn(['asc', 'desc']).withMessage('Order must be asc or desc')
], optionalAuth, asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: errors.array()
    });
  }

  const { page = 1, limit = 10, sort = 'rating', order = 'desc' } = req.query;
  const skip = (page - 1) * limit;

  // Check if category exists
  const category = await Category.findById(req.params.id);
  if (!category) {
    return res.status(404).json({
      success: false,
      message: 'Category not found'
    });
  }

  // Build sort object
  const sortObj = {};
  sortObj[sort] = order === 'desc' ? -1 : 1;

  const Consultant = require('../models/Consultant');
  const consultants = await Consultant.find({
    categories: req.params.id,
    isActive: true
  })
    .populate('user', 'firstName lastName avatar')
    .populate('categories', 'name color')
    .sort(sortObj)
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Consultant.countDocuments({
    categories: req.params.id,
    isActive: true
  });

  res.json({
    success: true,
    data: {
      category,
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

module.exports = router; 