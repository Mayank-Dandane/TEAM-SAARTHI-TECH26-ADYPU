/**
 * ╔══════════════════════════════════════════════════════╗
 * ║  PIPELINE SERVICE                                    ║
 * ║  Orchestrates all 5 agents in sequence               ║
 * ║  Logs every stage — saves result to DB               ║
 * ╚══════════════════════════════════════════════════════╝
 */

const { log, logError } = require('../utils/logger');
const db = require('./db.service');

// ── Agent imports ─────────────────────────────────────────────────────────────
const listenerAgent   = require('../agents/listener');
const extractorAgent  = require('../agents/extractor');
const structurerAgent = require('../agents/structurer');
const validatorAgent  = require('../agents/validator');
const formatterAgent  = require('../agents/formatter');

/**
 * run({ audioFilePath, transcript })
 * Chains all 5 agents, saves to DB, returns full result.
 */
const run = async ({ audioFilePath, transcript }) => {
  const startTime    = Date.now();
  const pipelineLogs = [];

  const addLog = (stage, message) => {
    pipelineLogs.push({ stage, message, timestamp: new Date() });
    log(stage, message);
  };

  addLog('PIPELINE', '🚀 Starting Doctor Copilot pipeline...');

  // ── STAGE 1: LISTENER ──────────────────────────────────────────────────────
  addLog('LISTENER', audioFilePath ? 'Transcribing audio file...' : 'Using provided transcript');
  const listenerOutput = await listenerAgent.run({ audioFilePath, transcript });
  addLog('LISTENER', `✅ Transcript ready — ${listenerOutput.transcript.length} chars [source: ${listenerOutput.source}]`);

  // ── STAGE 2: EXTRACTOR ─────────────────────────────────────────────────────
  addLog('EXTRACTOR', 'Extracting clinical entities from transcript...');
  const extractorOutput = await extractorAgent.run({ transcript: listenerOutput.transcript });
  addLog('EXTRACTOR', `✅ Extracted — symptoms: ${extractorOutput.symptoms?.length || 0}, meds: ${extractorOutput.medications?.length || 0}, history: ${extractorOutput.history?.length || 0}`);

  // ── STAGE 3: STRUCTURER ────────────────────────────────────────────────────
  addLog('STRUCTURER', 'Structuring into EMR format...');
  const structurerOutput = await structurerAgent.run({
    extracted:  extractorOutput,
    transcript: listenerOutput.transcript
  });
  addLog('STRUCTURER', '✅ EMR structure generated');

  // ── STAGE 4: VALIDATOR ─────────────────────────────────────────────────────
  addLog('VALIDATOR', 'Validating completeness and consistency...');
  const validatorOutput = await validatorAgent.run({ structured: structurerOutput });
  addLog('VALIDATOR', `✅ Valid: ${validatorOutput.is_valid} | Score: ${validatorOutput.completeness_score}% | Warnings: ${validatorOutput.warnings?.length || 0}`);

  // ── STAGE 5: FORMATTER ─────────────────────────────────────────────────────
  addLog('FORMATTER', 'Generating human-readable summary and PDF...');
  const formatterOutput = await formatterAgent.run({
    structured: structurerOutput,
    extracted:  extractorOutput,
    validation: validatorOutput
  });
  addLog('FORMATTER', `✅ PDF generated: ${formatterOutput.pdf_filename || 'N/A'}`);

  addLog('PIPELINE', '🎉 All agents completed successfully!');

  const processingTimeMs = Date.now() - startTime;
  addLog('PIPELINE', `⏱  Total time: ${processingTimeMs}ms`);

  // ── ASSEMBLE FULL RESULT ───────────────────────────────────────────────────
  const pipelineResult = {
    pipeline_logs: pipelineLogs,
    stages: {
      transcript: listenerOutput,
      extracted:  extractorOutput,
      structured: structurerOutput,
      validated:  validatorOutput,
      formatted:  formatterOutput
    }
  };

  // ── SAVE TO DATABASE ───────────────────────────────────────────────────────
  const { consultation, patient, report } = await db.savePipelineResult({
    pipelineResult,
    processingTimeMs
  });

  addLog('PIPELINE', consultation
    ? `💾 Saved to DB — consultation: ${consultation._id}`
    : '⚠️  DB unavailable — running stateless'
  );

  return {
    consultation_id:    consultation?._id || null,
    patient_id:         patient?._id      || null,
    report_id:          report?._id       || null,
    processing_time_ms: processingTimeMs,
    pipeline_logs:      pipelineLogs,
    stages:             pipelineResult.stages
  };
};

module.exports = { run };