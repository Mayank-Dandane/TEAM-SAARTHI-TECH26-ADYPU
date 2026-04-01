/**
 * ╔══════════════════════════════════════════════════════╗
 * ║  AGENT 5 — FORMATTER                                 ║
 * ║  Generates final outputs:                            ║
 * ║   • Structured JSON (EMR-ready)                      ║
 * ║   • Human-readable summary                           ║
 * ║   • PDF report via PDFKit                            ║
 * ╚══════════════════════════════════════════════════════╝
 */

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { log, logError } = require('../utils/logger');

const REPORTS_DIR = path.join(__dirname, '../reports');

// ── Helpers ─────────────────────────────────────────────────────────────────

const formatDate = () => {
  return new Date().toLocaleDateString('en-IN', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

const buildSummary = (structured, extracted, validation) => {
  const lines = [];
  if (structured.chief_complaint)
    lines.push(`Chief Complaint: ${structured.chief_complaint}`);
  if (extracted.symptoms?.length)
    lines.push(`Symptoms: ${extracted.symptoms.join(', ')}`);
  if (extracted.duration)
    lines.push(`Duration: ${extracted.duration}`);
  if (structured.current_medications?.length)
    lines.push(`Medications: ${structured.current_medications.join(', ')}`);
  if (!validation.is_valid)
    lines.push(`⚠ Incomplete record — ${validation.missing_fields.join(', ')} missing`);
  return lines.join('\n');
};

// ── PDF Generator ────────────────────────────────────────────────────────────

const generatePDF = (structured, extracted, validation) => {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(REPORTS_DIR)) {
      fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }

    const filename = `report_${uuidv4()}.pdf`;
    const filepath = path.join(REPORTS_DIR, filename);
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const stream = fs.createWriteStream(filepath);

    doc.pipe(stream);

    // ── HEADER ──────────────────────────────────────────────────────────
    doc
      .fillColor('#1a73e8')
      .fontSize(22)
      .font('Helvetica-Bold')
      .text('🩺 Doctor Copilot', { align: 'center' });

    doc
      .fillColor('#444')
      .fontSize(11)
      .font('Helvetica')
      .text('AI-Powered Clinical Documentation System', { align: 'center' });

    doc.moveDown(0.5);
    doc
      .fillColor('#888')
      .fontSize(9)
      .text(`Generated: ${formatDate()}`, { align: 'center' });

    doc
      .moveTo(50, doc.y + 8)
      .lineTo(545, doc.y + 8)
      .strokeColor('#1a73e8')
      .lineWidth(1.5)
      .stroke();

    doc.moveDown(1);

    // ── PATIENT INFO ─────────────────────────────────────────────────────
    const sectionHeader = (title) => {
      doc.moveDown(0.5);
      doc
        .fillColor('#1a73e8')
        .fontSize(12)
        .font('Helvetica-Bold')
        .text(title.toUpperCase());
      doc
        .moveTo(50, doc.y + 2)
        .lineTo(545, doc.y + 2)
        .strokeColor('#d0e4ff')
        .lineWidth(1)
        .stroke();
      doc.moveDown(0.4);
    };

    const field = (label, value) => {
      if (!value || value === '' || (Array.isArray(value) && value.length === 0)) return;
      doc
        .fillColor('#333')
        .fontSize(10)
        .font('Helvetica-Bold')
        .text(`${label}: `, { continued: true })
        .font('Helvetica')
        .fillColor('#555')
        .text(Array.isArray(value) ? value.join(', ') : String(value));
    };

    sectionHeader('Patient Information');
    field('Name',   extracted.patient_name || 'Not recorded');
    field('Age',    extracted.age || 'Not recorded');
    field('Gender', extracted.gender || 'Not recorded');

    sectionHeader('Chief Complaint');
    doc
      .fillColor('#333')
      .fontSize(10)
      .font('Helvetica')
      .text(structured.chief_complaint || 'Not documented', { lineGap: 3 });

    sectionHeader('History of Present Illness');
    doc
      .fillColor('#333')
      .fontSize(10)
      .font('Helvetica')
      .text(structured.history_of_present_illness || 'Not documented', { lineGap: 3 });

    sectionHeader('Symptoms & Duration');
    field('Symptoms', extracted.symptoms?.join(', ') || 'None documented');
    field('Duration', extracted.duration || 'Not specified');

    sectionHeader('Past Medical History');
    doc
      .fillColor('#333')
      .fontSize(10)
      .font('Helvetica')
      .text(structured.past_medical_history || 'Not reported', { lineGap: 3 });

    sectionHeader('Medications');
    if (structured.current_medications?.length) {
      structured.current_medications.forEach((med, i) => {
        doc
          .fillColor('#555')
          .fontSize(10)
          .font('Helvetica')
          .text(`  ${i + 1}. ${med}`);
      });
    } else {
      doc.fillColor('#888').fontSize(10).text('  No medications documented');
    }

    sectionHeader('Allergies');
    field('Allergies', extracted.allergies?.join(', ') || 'None reported');

    // Vitals
    const vitals = structured.vitals || {};
    const hasVitals = Object.values(vitals).some(v => v);
    if (hasVitals) {
      sectionHeader('Vitals');
      field('Blood Pressure', vitals.blood_pressure);
      field('Temperature',    vitals.temperature);
      field('Pulse',          vitals.pulse);
      field('Weight',         vitals.weight);
      field('SpO2',           vitals.spo2);
    }

    sectionHeader('Clinical Observations');
    doc
      .fillColor('#333')
      .fontSize(10)
      .font('Helvetica')
      .text(structured.physical_examination || 'Not documented', { lineGap: 3 });

    sectionHeader('Assessment Note');
    doc
      .fillColor('#333')
      .fontSize(10)
      .font('Helvetica')
      .text(structured.assessment_note || 'Not documented', { lineGap: 3 });

    sectionHeader('Plan / Doctor Notes');
    doc
      .fillColor('#333')
      .fontSize(10)
      .font('Helvetica')
      .text(structured.plan_note || 'Not documented', { lineGap: 3 });

    // ── VALIDATION SUMMARY ───────────────────────────────────────────────
    doc.moveDown(0.5);
    sectionHeader('Record Quality');
    const scoreColor = validation.completeness_score >= 80 ? '#2e7d32'
      : validation.completeness_score >= 50 ? '#e65100' : '#c62828';

    doc
      .fillColor(scoreColor)
      .fontSize(10)
      .font('Helvetica-Bold')
      .text(`Completeness Score: ${validation.completeness_score}%`);

    if (validation.warnings?.length) {
      doc.moveDown(0.3);
      doc.fillColor('#e65100').fontSize(9).font('Helvetica-Bold').text('Warnings:');
      validation.warnings.forEach(w => {
        doc.fillColor('#888').fontSize(9).font('Helvetica').text(`  • ${w}`);
      });
    }

    // ── FOOTER ───────────────────────────────────────────────────────────
    doc.moveDown(1);
    doc
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .strokeColor('#ddd')
      .lineWidth(1)
      .stroke();
    doc.moveDown(0.3);
    doc
      .fillColor('#aaa')
      .fontSize(8)
      .font('Helvetica')
      .text(
        'DISCLAIMER: This document is auto-generated by an AI documentation assistant. ' +
        'It does not constitute medical advice or diagnosis. ' +
        'All clinical decisions remain the sole responsibility of the treating physician.',
        { align: 'center', lineGap: 2 }
      );

    doc.end();

    stream.on('finish', () => {
      const stats = fs.statSync(filepath);
      log('FORMATTER', `PDF saved: ${filename} (${Math.round(stats.size / 1024)} KB)`);
      resolve({ filename, filepath, size_bytes: stats.size });
    });
    stream.on('error', reject);
  });
};

// ── Main Agent ───────────────────────────────────────────────────────────────

/**
 * run({ structured, extracted, validation })
 * @returns {{ emr_json, summary, pdf_url, pdf_filename }}
 */
const run = async ({ structured, extracted, validation }) => {
  log('FORMATTER', 'Generating outputs...');

  // Build human-readable summary
  const summary = buildSummary(structured, extracted, validation);

  // Generate PDF
  let pdfResult = { filename: null, filepath: null, size_bytes: 0 };
  try {
    pdfResult = await generatePDF(structured, extracted, validation);
  } catch (err) {
    logError('FORMATTER', err);
    // Don't fail the whole pipeline for PDF errors
  }

  const pdf_url = pdfResult.filename
    ? `/reports/${pdfResult.filename}`
    : null;

  return {
    emr_json:     structured,
    summary,
    pdf_url,
    pdf_filename: pdfResult.filename,
    pdf_size_bytes: pdfResult.size_bytes
  };
};

module.exports = { run };