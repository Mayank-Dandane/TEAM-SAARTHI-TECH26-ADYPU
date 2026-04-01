const { groq, MODELS } = require('../config/groq');
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
        ].join('\n')
      },
      {
        role: 'user',
        content: 'Create EMR from:\n' + JSON.stringify(extractedData, null, 2) + '\n\nTranscript:\n' + transcript
      }
    ]
  });

  const data = JSON.parse(response.choices[0].message.content);
  logger.success('Structurer: done');
  return { structuredEMR: data };
}

module.exports = { run };
