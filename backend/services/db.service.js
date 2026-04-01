const mongoose     = require('mongoose')
const Patient      = require('../models/patient.model')
const Consultation = require('../models/consultation.model')
const Report       = require('../models/report.model')

const isConnected = () => mongoose.connection.readyState === 1

async function savePipelineResult({ patientName, doctorName, result }) {
  if (!isConnected()) return null
  const patient = await Patient.create({ name: patientName || 'Unknown' })
  const report  = await Report.create({ filePath: result.reportPath, fileName: result.fileName, pdf_filename: result.fileName })
  const consultation = await Consultation.create({
    patient_id:       patient._id,
    transcript:       result.transcript,
    extractedData:    result.extractedData,
    structuredEMR:    result.structuredEMR,
    validationReport: result.validationReport,
    reportPath:       result.reportPath,
    report_id:        report._id,
    processingTimeMs: result.processingTimeMs,
    status:           'complete',
  })
  return { consultationId: consultation._id, patientId: patient._id }
}

async function getAllConsultations({ limit = 10, skip = 0 } = {}) {
  if (!isConnected()) return []
  return Consultation.find().sort({ createdAt: -1 }).skip(skip).limit(limit).populate('patient_id')
}

async function getConsultationById(id) {
  if (!isConnected()) return null
  return Consultation.findById(id).populate('patient_id').populate('report_id')
}

async function getReportByConsultation(consultationId) {
  if (!isConnected()) return null
  const c = await Consultation.findById(consultationId).populate('report_id')
  return c?.report_id || null
}

async function countConsultations() {
  if (!isConnected()) return 0
  return Consultation.countDocuments()
}

module.exports = { savePipelineResult, getAllConsultations, getConsultationById, getReportByConsultation, countConsultations, isConnected }