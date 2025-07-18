const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  image: String,
  category: String,
  duration: String,
  price: Number,
  rating: Number
}, { timestamps: true });

module.exports = mongoose.model('Service', serviceSchema); 