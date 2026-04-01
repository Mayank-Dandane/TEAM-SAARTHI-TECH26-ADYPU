/**
 * ╔══════════════════════════════════════════════════════╗
 * ║  AGENT 4 — VALIDATOR                                 ║
 * ║  Checks completeness, consistency, and quality       ║
 * ║  Uses fast llama-3.1-8b to save token quota          ║
 * ╚══════════════════════════════════════════════════════╝
 */

const Groq = require('groq-sdk');
const { log, logError } = require('../utils/logger');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = 'llama-3.1-8b-instant'; // Fast model — validation is lightweight

const REQUIRED_FIELDS = [
  'chief_complaint',
  'history_of_present_illness',
  'past_medical_history',
  'current_medications',
  'review_of_systems',
  'physical_examination'
];

const SYSTEM_PROMPT = `You are a clinical documentation quality reviewer. Check if a structured EMR record is complete and consistent.

STRICT RULES:
- Return ONLY valid JSON, no markdown, no extra text
- Do NOT add medical opinions or diagnoses
- Only flag documentation quality issues

OUTPUT FORMAT (strict JSON):
{
  "is_valid": true or false,
  "completeness_score": number 0-100,
  "missing_fields": ["list of field names that are empty or missing"],
  "warnings": ["list of documentation quality warnings"],
  "suggestions": ["list of suggested improvements for the doctor"]
}`;

/**
 * run({ structured })
 * @returns {{ is_valid, completeness_score, missing_fields, warnings, suggestions }}
 */
const run = async ({ structured }) => {
  log('VALIDATOR', 'Running completeness and consistency checks...');

  // ── STEP 1: Rule-based checks (deterministic, no LLM needed) ───────────
  const missingFields = [];
  const warnings = [];

  for (const field of REQUIRED_FIELDS) {
    const val = structured[field];
    const isEmpty =
      val === null ||
      val === undefined ||
      val === '' ||
      (Array.isArray(val) && val.length === 0);
    if (isEmpty) missingFields.push(field);
  }

  // Logical consistency checks
  if (!structured.chief_complaint || structured.chief_complaint.length < 5) {
    warnings.push('Chief complaint is too brief or missing.');
  }
  if (!structured.history_of_present_illness || structured.history_of_present_illness.length < 20) {
    warnings.push('History of present illness appears incomplete.');
  }
  if (structured.current_medications?.length === 0) {
    warnings.push('No medications documented — confirm if patient is medication-free.');
  }
  if (!structured.vitals || Object.values(structured.vitals).every(v => !v)) {
    warnings.push('No vitals recorded.');
  }

  // ── STEP 2: LLM-based quality review ───────────────────────────────────
  let llmResult = { suggestions: [] };
  try {
    const completion = await groq.chat.completions.create({
      model: MODEL,
      temperature: 0.1,
      max_tokens: 500,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Review this EMR record for documentation quality:\n\n${JSON.stringify(structured, null, 2)}`
        }
      ]
    });

    const raw = completion.choices[0]?.message?.content;
    if (raw) {
      const parsed = JSON.parse(raw);
      llmResult.suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];
      // Merge any LLM-detected missing fields
      if (Array.isArray(parsed.missing_fields)) {
        parsed.missing_fields.forEach(f => {
          if (!missingFields.includes(f)) missingFields.push(f);
        });
      }
      if (Array.isArray(parsed.warnings)) {
        parsed.warnings.forEach(w => {
          if (!warnings.includes(w)) warnings.push(w);
        });
      }
    }
  } catch (err) {
    logError('VALIDATOR', err);
    llmResult.suggestions = ['LLM validation unavailable — rule-based checks applied only.'];
  }

  // ── STEP 3: Compute completeness score ──────────────────────────────────
  const totalFields = REQUIRED_FIELDS.length;
  const filledFields = totalFields - missingFields.length;
  const completeness_score = Math.round((filledFields / totalFields) * 100);
  const is_valid = missingFields.length === 0 && completeness_score >= 60;

  log('VALIDATOR', `Score: ${completeness_score}% | Valid: ${is_valid} | Missing: ${missingFields.length}`);

  return {
    is_valid,
    completeness_score,
    missing_fields: missingFields,
    warnings,
    suggestions: llmResult.suggestions
  };
};

module.exports = { run };