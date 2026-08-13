const mongoose = require('mongoose');

const PharmacySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  generic_name: {
    type: String,
    default: '',
  },
  category: {
    type: String,
    enum: [
      'Antibiotics',
      'Painkillers',
      'Cardiovascular',
      'Dermatology',
      'Neurology',
      'Pediatric',
      'Vitamins & Supplements',
      'First Aid',
      'Respiratory',
      'Gastroenterology',
      'Endocrinology',
      'Oncology',
    ],
    default: 'Painkillers',
  },
  stock_quantity: {
    type: Number,
    required: true,
    default: 0,
  },
  reorder_level: {
    type: Number,
    default: 20,
  },
  unit_price: {
    type: Number,
    required: true,
  },
  expiry_date: {
    type: Date,
    required: true,
  },
  manufacturer: {
    type: String,
    default: 'MedVault Pharma',
  },
  location: {
    type: String,
    default: 'Shelf A-1',
  },
}, { timestamps: true });

module.exports = mongoose.model('Pharmacy', PharmacySchema);
