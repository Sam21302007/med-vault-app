const mongoose = require('mongoose');
const app = require('../server');

const connectDb = async () => {
  if (mongoose.connection.readyState === 1) {
    return;
  }
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI environment variable is missing');
    return;
  }
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✅ Vercel Serverless Function connected to MongoDB Atlas');
  } catch (err) {
    console.error('❌ Vercel Serverless MongoDB connection error:', err.message);
  }
};

module.exports = async (req, res) => {
  await connectDb();
  return app(req, res);
};
