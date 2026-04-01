const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('../utils/logger');

const outputDir = './reports';
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

async function run({ extractedData, structuredEMR, validationReport, patientName, doctorName }) {
  logger.stage('formatter', 'Generating PDF...');

  const fileName = 'report_' + uuidv4() + '.pdf';
  const filePath = path.join(outputDir, fileName);

  await new Promise(function(resolve, reject) {
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    doc.fontSize(20).font('Helvetica-Bold').text('CLINICAL CONSULTATION REPORT', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').fillColor('#666')
      .text('Generated: ' + new Date().toLocaleString(), { align: 'center' });
    if (patientName) doc.text('Patient: ' + patientName, { align: 'center' });
    if (doctorName)  doc.text('Doctor: ' + doctorName,   { align: 'center' });
    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke('#ccc');
    doc.moveDown();

    function section(title, content) {
      if (!content) return;
      doc.fontSize(13).font('Helvetica-Bold').fillColor('#000').text(title);
      doc.moveDown(0.3);
      doc.fontSize(11).font('Helvetica').fillColor('#333')
        .text(typeof content === 'object' ? JSON.stringify(content, null, 2) : String(content));
      doc.moveDown();
    }

    section('Chief Complaint', extractedData && extractedData.chief_complaint);
    section('History of Present Illness', structuredEMR && structuredEMR.history_of_present_illness);
    section('Assessment / Diagnosis', (structuredEMR && structuredEMR.assessment) || (extractedData && extractedData.possible_diagnosis));
    section('Treatment Plan', structuredEMR && structuredEMR.plan);

    if (extractedData && extractedData.medications && extractedData.medications.length) {
      doc.fontSize(13).font('Helvetica-Bold').fillColor('#000').text('Medications');
      doc.moveDown(0.3);
      extractedData.medications.forEach(function(med, i) {
        doc.fontSize(11).font('Helvetica').fillColor('#333')
          .text((i + 1) + '. ' + med.name + ' — ' + (med.dosage || '') + ' ' + (med.frequency || '') + (med.duration ? ' for ' + med.duration : ''));
      });
      doc.moveDown();
    }

    section('Follow-up', extractedData && extractedData.follow_up);
    section('Allergies', extractedData && Array.isArray(extractedData.allergies) ? extractedData.allergies.join(', ') : extractedData && extractedData.allergies);
    section('Record Completeness', Math.round(((validationReport && validationReport.completeness_score) || 0) * 100) + '%');

    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  logger.success('Formatter: PDF saved → ' + filePath);
  return { reportPath: filePath, fileName: fileName };
}

module.exports = { run };
