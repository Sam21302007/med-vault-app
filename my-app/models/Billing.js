const mongoose = require('mongoose');

const BillingItemSchema = new mongoose.Schema({
  description: { type: String, required: true },
  category: { type: String, enum: ['Consultation', 'Room', 'Pharmacy', 'Lab Test', 'Surgery', 'Miscellaneous'], default: 'Consultation' },
  amount: { type: Number, required: true },
});

const BillingSchema = new mongoose.Schema({
  invoice_number: {
    type: String,
    required: true,
    unique: true,
  },
  patient_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  doctor_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  items: [BillingItemSchema],
  subtotal: {
    type: Number,
    required: true,
  },
  tax: {
    type: Number,
    default: 0,
  },
  discount: {
    type: Number,
    default: 0,
  },
  total_amount: {
    type: Number,
    required: true,
  },
  payment_status: {
    type: String,
    enum: ['Paid', 'Pending', 'Partial'],
    default: 'Pending',
  },
  payment_method: {
    type: String,
    enum: ['Cash', 'Card', 'Insurance', 'UPI', 'Bank Transfer', 'Unpaid'],
    default: 'Unpaid',
  },
  due_date: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  },
  paid_at: {
    type: Date,
    default: null,
  },
  notes: {
    type: String,
    default: '',
  },
}, { timestamps: true });

module.exports = mongoose.model('Billing', BillingSchema);
