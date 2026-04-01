const mongoose = require('mongoose')

const reportSchema = new mongoose.Schema({
  consultation_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Consultation' },
  filePath:        String,
  fileName:        String,
  pdf_filename:    String,
  generatedAt:     { type: Date, default: Date.now },
}, { timestamps: true })

module.exports = mongoose.model('Report', reportSchema)