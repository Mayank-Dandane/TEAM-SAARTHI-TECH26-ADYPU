import mongoose from 'mongoose'
import Patient from '../models/patient.model.js'
import Consultation from '../models/consultation.model.js'
import Report from '../models/report.model.js'

const isConnected = () => mongoose.connection.readyState === 1

export async function savePipelineResult({ patientName, doctorName, result }) {
  if (!isConnected()) return null
  const patient = await Patient.create({ name: patientName || 'Unknown' })
  const report = await Report.create({ filePath: result.reportPath, fileName: result.fileName })
  const consultation = await Consultation.create({
    patient_id: patient._id,
    transcript: result.transcript,
    extractedData: result.extractedData,
    structuredEMR: result.structuredEMR,
    validationReport: result.validationReport,
    reportPath: result.reportPath,
    report_id: report._id,
    processingTimeMs: result.processingTimeMs,
    status: 'complete',
  })
  return { consultationId: consultation._id, patientId: patient._id }
}

export async function getAllConsultations(page = 1, limit = 10) {
  if (!isConnected()) return []
  return Consultation.find().sort({ createdAt: -1 })
    .skip((page - 1) * limit).limit(limit).populate('patient_id')
}

export async function getConsultationById(id) {
  if (!isConnected()) return null
  return Consultation.findById(id).populate('patient_id').populate('report_id')
}

export async function countConsultations() {
  if (!isConnected()) return 0
  return Consultation.countDocuments()
}