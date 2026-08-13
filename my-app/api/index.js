const mongoose = require('mongoose');
const app = require('../server');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://samaug24cs_db_user:PdtXSiVRnMnvd6Iz@cluster0.ip5iro2.mongodb.net/medvault_db?retryWrites=true&w=majority';

let isConnecting = false;

const connectDb = async () => {
  if (mongoose.connection.readyState === 1) {
    return;
  }
  if (isConnecting) {
    let waitCount = 0;
    while (mongoose.connection.readyState !== 1 && waitCount < 10) {
      await new Promise(res => setTimeout(res, 300));
      waitCount++;
    }
    return;
  }

  isConnecting = true;
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 8000,
    });
    console.log('✅ Vercel Serverless Function connected to MongoDB Atlas');
  } catch (err) {
    console.error('❌ Vercel Serverless MongoDB connection error:', err.message);
  } finally {
    isConnecting = false;
  }
};

module.exports = async (req, res) => {
  // Global CORS Headers for Serverless Function
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  await connectDb();
  return app(req, res);
};
