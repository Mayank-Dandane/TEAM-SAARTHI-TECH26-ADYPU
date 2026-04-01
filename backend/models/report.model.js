import mongoose from 'mongoose'

const reportSchema = new mongoose.Schema({
  consultation_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Consultation' },
  filePath: String,
  fileName: String,
  generatedAt: { type: Date, default: Date.now },
}, { timestamps: true })

export default mongoose.model('Report', reportSchema)