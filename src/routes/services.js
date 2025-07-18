const express = require('express');
const Service = require('../models/Service');
const router = express.Router();

// GET /api/services - all services
router.get('/', async (req, res) => {
  try {
    const services = await Service.find();
    res.json({ success: true, data: services });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/services/:id - service by id
router.get('/:id', async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) return res.status(404).json({ success: false, message: 'Service not found' });
    res.json({ success: true, data: service });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router; 