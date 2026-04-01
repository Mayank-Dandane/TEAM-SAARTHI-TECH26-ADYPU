const fs = require('fs');
const path = require('path');

const agents = {
  'extractor.js': `const { groq, MODELS } = require('../config/groq');
const { logger } = require('../utils/logger');

async function run({ transcript }) {
  logger.stage('extractor', 'Extracting clinical entities...');

  const response = await groq.chat.completions.create({
    model: MODELS.large,
    temperature: 0.1,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: [
          'You are a clinical NLP expert. Extract structured medical information from the transcript.',
          'Return ONLY valid JSON with these exact fields:',
          '{',
          '  "chief_complaint": "string",',
          '  "symptoms": ["string"],',
          '  "history_of_present_illness": "string",',
          '  "vitals": { "blood_pressure": "", "pulse": "", "temperature": "", "spo2": "", "weight": "" },',
          '  "medications": [{ "name": "", "dosage": "", "frequency": "", "duration": "", "route": "" }],',
          '  "allergies": ["string"],',
          '  "possible_diagnosis": "string",',
          '  "follow_up": "string"',
          '}',
          'Use null for missing fields. Never invent data.'
        ].join('\\n')
      },
      {
        role: 'user',
        content: 'Extract clinical entities from this transcript:\\n\\n' + transcript
      }
    ]
  });

  const data = JSON.parse(response.choices[0].message.content);
  logger.success('Extractor: done');
  return { extractedData: data };
}

module.exports = { run };
`,

  'structurer.js': `const { groq, MODELS } = require('../config/groq');
const { logger } = require('../utils/logger');

async function run({ transcript, extractedData }) {
  logger.stage('structurer', 'Structuring into EMR format...');

  const response = await groq.chat.completions.create({
    model: MODELS.large,
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: [
          'You are a clinical documentation specialist. Convert extracted data into a formal EMR record.',
          'Return ONLY valid JSON:',
          '{',
          '  "chief_complaint": "string",',
          '  "history_of_present_illness": "string",',
          '  "physical_examination": "string",',
          '  "vitals": {},',
          '  "assessment": "string",',
          '  "plan": "string",',
          '  "medications": [],',
          '  "follow_up": "string",',
          '  "doctor_notes": "string"',
          '}'
        ].join('\\n')
      },
      {
        role: 'user',
        content: 'Create EMR from:\\n' + JSON.stringify(extractedData, null, 2) + '\\n\\nTranscript:\\n' + transcript
      }
    ]
  });

  const data = JSON.parse(response.choices[0].message.content);
  logger.success('Structurer: done');
  return { structuredEMR: data };
}

module.exports = { run };
`,

  'validator.js': `const { groq, MODELS } = require('../config/groq');
const { logger } = require('../utils/logger');

const REQUIRED_FIELDS = ['chief_complaint', 'symptoms', 'possible_diagnosis', 'medications'];

async function run({ extractedData, structuredEMR }) {
  logger.stage('validator', 'Validating record...');

  const missing = REQUIRED_FIELDS.filter(function(f) {
    const val = extractedData[f];
    return !val || (Array.isArray(val) && val.length === 0);
  });

  const completeness_score = (REQUIRED_FIELDS.length - missing.length) / REQUIRED_FIELDS.length;

  const response = await groq.chat.completions.create({
    model: MODELS.small,
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: 'You are a medical record auditor. Review this EMR and return JSON: { "is_valid": true, "issues": ["string"], "suggestions": ["string"] }'
      },
      {
        role: 'user',
        content: 'Audit this EMR:\\n' + JSON.stringify(structuredEMR, null, 2)
      }
    ]
  });

  const audit = JSON.parse(response.choices[0].message.content);
  logger.success('Validator: done');

  return {
    validationReport: {
      ...audit,
      missing_fields: missing,
      completeness_score: completeness_score
    }
  };
}

module.exports = { run };
`,

  'formatter.js': `const PDFDocument = require('pdfkit');
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
`,

  'listener.js': `const fs = require('fs');
const path = require('path');
const Groq = require('groq-sdk');
const { logger } = require('../utils/logger');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const run = async function({ audioFilePath, transcript }) {
  if (transcript && transcript.trim().length > 0) {
    logger.stage('listener', 'Using provided transcript (skip STT)');
    return {
      transcript: transcript.trim(),
      source: 'text_input'
    };
  }

  if (audioFilePath) {
    logger.stage('listener', 'Transcribing audio: ' + path.basename(audioFilePath));

    if (!fs.existsSync(audioFilePath)) {
      throw new Error('Audio file not found: ' + audioFilePath);
    }

    const audioStream = fs.createReadStream(audioFilePath);

    const transcription = await groq.audio.transcriptions.create({
      file: audioStream,
      model: 'whisper-large-v3',
      response_format: 'json',
      language: 'en'
    });

    if (!transcription.text || transcription.text.trim().length === 0) {
      throw new Error('Whisper returned an empty transcript. Check audio quality.');
    }

    logger.stage('listener', 'Transcribed ' + transcription.text.length + ' characters');

    return {
      transcript: transcription.text.trim(),
      source: 'whisper_audio'
    };
  }

  throw new Error('Listener Agent: provide either audioFilePath or transcript.');
};

module.exports = { run };
`
};

// Write all files
Object.entries(agents).forEach(([filename, content]) => {
  const filepath = path.join('agents', filename);
  fs.writeFileSync(filepath, content, 'utf8');
  console.log('✅ Written: ' + filepath + ' (' + content.length + ' bytes)');
});

console.log('\n✅ All agent files written successfully!');