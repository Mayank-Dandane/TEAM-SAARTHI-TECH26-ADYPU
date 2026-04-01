const { groq, MODELS } = require('../config/groq');
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
        content: 'Audit this EMR:\n' + JSON.stringify(structuredEMR, null, 2)
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
