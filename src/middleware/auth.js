const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Async error handler wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token - user not found'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
};

// Role-based authorization middleware
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required roles: ${roles.join(', ')}`
      });
    }

    next();
  };
};

// Specific role middlewares
const requireClient = authorizeRoles('client');
const requireConsultant = authorizeRoles('consultant');
const requireAdmin = authorizeRoles('admin');
const requireConsultantOrAdmin = authorizeRoles('consultant', 'admin');

// Optional authentication (for public routes that can show different content for logged-in users)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-password');
      
      if (user && user.isActive) {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication for optional auth
    next();
  }
};

// Check if user owns the resource or is admin
const checkOwnership = (modelName, idField = 'id') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[idField];
      const Model = require(`../models/${modelName}`);
      
      const resource = await Model.findById(resourceId);
      
      if (!resource) {
        return res.status(404).json({
          success: false,
          message: 'Resource not found'
        });
      }

      // Admin can access any resource
      if (req.user.role === 'admin') {
        req.resource = resource;
        return next();
      }

      // Check ownership based on model
      let isOwner = false;
      
      switch (modelName) {
        case 'User':
          isOwner = resource._id.toString() === req.user._id.toString();
          break;
        case 'Consultant':
          isOwner = resource.user.toString() === req.user._id.toString();
          break;
        case 'Booking':
          isOwner = resource.client.toString() === req.user._id.toString() || 
                   resource.consultant.toString() === req.user.consultantProfile?._id.toString();
          break;
        default:
          isOwner = false;
      }

      if (!isOwner) {
        return res.status(403).json({
          success: false,
          message: 'Access denied - you do not own this resource'
        });
      }

      req.resource = resource;
      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error checking resource ownership'
      });
    }
  };
};

module.exports = {
  authenticateToken,
  authorizeRoles,
  requireClient,
  requireConsultant,
  requireAdmin,
  requireConsultantOrAdmin,
  optionalAuth,
  checkOwnership,
  asyncHandler
}; 