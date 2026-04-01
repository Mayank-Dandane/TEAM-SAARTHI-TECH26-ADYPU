const mongoose = require('mongoose')

async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/doctor-copilot'
  try {
    await mongoose.connect(uri)
    console.log('✅ MongoDB connected')
  } catch (err) {
    console.warn('⚠️  MongoDB connection failed — continuing without DB:', err.message)
  }
}

function isConnected() {
  return mongoose.connection.readyState === 1
}

module.exports = { connectDB, isConnected }