const mongoose = require('mongoose');

const pipelineLogSchema = new mongoose.Schema({
  stage:     { type: String },
  message:   { type: String },
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

const consultationSchema = new mongoose.Schema({
  patient_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    default: null
  },

  // Linked report (back-filled after PDF generation)
  report_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Report',
    default: null
  },

  // Raw transcript from Listener Agent
  transcript: { type: String, required: true },

  // All 5 pipeline stage outputs stored for full auditability
  pipeline_stages: {
    extracted:  { type: mongoose.Schema.Types.Mixed, default: null },
    structured: { type: mongoose.Schema.Types.Mixed, default: null },
    validated:  { type: mongoose.Schema.Types.Mixed, default: null },
    formatted:  { type: mongoose.Schema.Types.Mixed, default: null }
  },

  // Final merged EMR-ready structured data
  structured_data: { type: mongoose.Schema.Types.Mixed, default: null },

  // Pipeline run status
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },

  // Per-stage logs for demo transparency
  pipeline_logs: [pipelineLogSchema],

  // Total pipeline time in ms
  processing_time_ms: { type: Number, default: null }

}, { timestamps: true });

// Index for fast list queries
consultationSchema.index({ createdAt: -1 });
consultationSchema.index({ status: 1 });

module.exports = mongoose.model('Consultation', consultationSchema);