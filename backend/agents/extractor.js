const { groq, MODELS } = require('../config/groq');
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
        ].join('\n')
      },
      {
        role: 'user',
        content: 'Extract clinical entities from this transcript:\n\n' + transcript
      }
    ]
  });

  const data = JSON.parse(response.choices[0].message.content);
  logger.success('Extractor: done');
  return { extractedData: data };
}

module.exports = { run };
