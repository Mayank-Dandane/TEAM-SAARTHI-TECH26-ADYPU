const mongoose = require('mongoose')

const consultationSchema = new mongoose.Schema({
  patient_id:       { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
  transcript:       String,
  extractedData:    mongoose.Schema.Types.Mixed,
  structuredEMR:    mongoose.Schema.Types.Mixed,
  validationReport: mongoose.Schema.Types.Mixed,
  reportPath:       String,
  report_id:        { type: mongoose.Schema.Types.ObjectId, ref: 'Report' },
  processingTimeMs: Number,
  status: { type: String, enum: ['processing', 'complete', 'error'], default: 'processing' },
}, { timestamps: true })

module.exports = mongoose.model('Consultation', consultationSchema)