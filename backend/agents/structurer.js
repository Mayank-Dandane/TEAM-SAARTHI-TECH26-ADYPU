/**
 * ╔══════════════════════════════════════════════════════╗
 * ║  AGENT 3 — STRUCTURER                                ║
 * ║  Converts extracted entities → EMR-ready structure   ║
 * ║  Uses Groq LLM to write coherent clinical prose      ║
 * ╚══════════════════════════════════════════════════════╝
 */

const Groq = require('groq-sdk');
const { log, logError } = require('../utils/logger');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = 'llama-3.3-70b-versatile';

const SYSTEM_PROMPT = `You are a clinical documentation specialist. Convert extracted medical data into a properly structured EMR (Electronic Medical Record) entry.

STRICT RULES:
- Return ONLY valid JSON, no markdown, no extra text
- Write concise, professional clinical language
- Do NOT add any diagnoses, treatments, or recommendations not present in the input
- If a field has no data, use an empty string "" or empty array []
- chief_complaint must be a single clear sentence
- history_of_present_illness must be a coherent paragraph combining symptoms + duration + context
- Keep each section factual and documentation-only

OUTPUT FORMAT (strict JSON):
{
  "chief_complaint": "string — one sentence",
  "history_of_present_illness": "string — coherent paragraph",
  "past_medical_history": "string — paragraph or 'Not reported'",
  "current_medications": ["array of medication strings"],
  "allergies": ["array or empty"],
  "review_of_systems": "string — based on symptoms and observations",
  "physical_examination": "string — based on vitals and observations",
  "vitals": {
    "blood_pressure": "string or null",
    "temperature": "string or null",
    "pulse": "string or null",
    "weight": "string or null",
    "spo2": "string or null"
  },
  "assessment_note": "string — documentation note only, no diagnosis",
  "plan_note": "string — as documented by doctor, no additions"
}`;

/**
 * run({ extracted, transcript })
 * @returns {Object} EMR-structured consultation record
 */
const run = async ({ extracted, transcript }) => {
  log('STRUCTURER', 'Converting extracted data into EMR structure...');

  const inputData = JSON.stringify(extracted, null, 2);

  let rawResponse;
  try {
    const completion = await groq.chat.completions.create({
      model: MODEL,
      temperature: 0.2,
      max_tokens: 1200,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Convert this extracted clinical data into a structured EMR record.

EXTRACTED DATA:
${inputData}

ORIGINAL TRANSCRIPT (for context):
"""
${transcript.slice(0, 1500)}
"""`
        }
      ]
    });

    rawResponse = completion.choices[0]?.message?.content;
    if (!rawResponse) throw new Error('Groq returned empty response');

  } catch (err) {
    logError('STRUCTURER', err);
    throw new Error(`Structurer Agent failed: ${err.message}`);
  }

  let structured;
  try {
    structured = JSON.parse(rawResponse);
  } catch {
    throw new Error(`Structurer returned invalid JSON: ${rawResponse.slice(0, 200)}`);
  }

  // Normalise fields
  const safe = (val, fallback = []) => Array.isArray(val) ? val : fallback;
  const safeStr = (val) => (typeof val === 'string' ? val : '');
  const safeObj = (val) => (val && typeof val === 'object' ? val : {});

  return {
    chief_complaint:            safeStr(structured.chief_complaint),
    history_of_present_illness: safeStr(structured.history_of_present_illness),
    past_medical_history:       safeStr(structured.past_medical_history),
    current_medications:        safe(structured.current_medications),
    allergies:                  safe(structured.allergies),
    review_of_systems:          safeStr(structured.review_of_systems),
    physical_examination:       safeStr(structured.physical_examination),
    vitals:                     safeObj(structured.vitals),
    assessment_note:            safeStr(structured.assessment_note),
    plan_note:                  safeStr(structured.plan_note)
  };
};

module.exports = { run };