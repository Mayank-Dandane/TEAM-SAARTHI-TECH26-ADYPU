const mongoose = require('mongoose')

const patientSchema = new mongoose.Schema({
  name:    { type: String, default: 'Unknown' },
  age:     String,
  gender:  String,
  contact: String,
}, { timestamps: true })

module.exports = mongoose.model('Patient', patientSchema)