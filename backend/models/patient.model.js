import mongoose from 'mongoose'

const patientSchema = new mongoose.Schema({
  name: { type: String, default: 'Unknown' },
  age: String,
  gender: String,
  contact: String,
}, { timestamps: true })

export default mongoose.model('Patient', patientSchema)