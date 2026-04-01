const listener   = require('../agents/listener');
const extractor  = require('../agents/extractor');
const structurer = require('../agents/structurer');
const validator  = require('../agents/validator');
const formatter  = require('../agents/formatter');
const { logger } = require('../utils/logger');

async function run({ transcript, audioFilePath, patientName, doctorName }) {
  const start = Date.now();
  logger.info('Pipeline starting...');

  const { transcript: finalTranscript } = await listener.run({ transcript, audioFilePath });
  const { extractedData }    = await extractor.run({ transcript: finalTranscript });
  const { structuredEMR }    = await structurer.run({ transcript: finalTranscript, extractedData });
  const { validationReport } = await validator.run({ extractedData, structuredEMR });
  const { reportPath, fileName } = await formatter.run({
    extractedData, structuredEMR, validationReport, patientName, doctorName
  });

  logger.success('Pipeline complete in ' + (Date.now() - start) + 'ms');

  return {
    transcript: finalTranscript,
    extractedData,
    structuredEMR,
    validationReport,
    reportPath,
    fileName,
    processingTimeMs: Date.now() - start,
  };
}

module.exports = { run };