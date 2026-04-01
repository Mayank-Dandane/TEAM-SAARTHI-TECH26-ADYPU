/**
 * ╔══════════════════════════════════════════════════════╗
 * ║  AGENT 2 — EXTRACTOR                                 ║
 * ║  Extracts clinical entities from raw transcript      ║
 * ║  Uses Groq llama-3.3-70b with strict JSON schema     ║
 * ╚══════════════════════════════════════════════════════╝
 */

const Groq = require('groq-sdk');
const { log, logError } = require('../utils/logger');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = 'llama-3.3-70b-versatile';

const SYSTEM_PROMPT = `You are a clinical documentation assistant. Your ONLY job is to extract medical information from doctor-patient conversation transcripts.

STRICT RULES:
- Return ONLY valid JSON, no extra text, no markdown, no explanation
- Do NOT diagnose or suggest treatments
- Extract ONLY what is explicitly mentioned in the transcript
- Use null for missing fields, empty arrays [] for missing lists
- Be precise and factual

OUTPUT FORMAT (strict JSON):
{
  "patient_name": string or null,
  "age": string or null,
  "gender": "male" | "female" | "other" | null,
  "symptoms": [array of symptom strings],
  "duration": string or null,
  "history": [array of past medical history strings],
  "medications": [array of medication strings mentioned],
  "allergies": [array of allergy strings or empty],
  "observations": [array of clinical observation strings],
  "vitals": {
    "blood_pressure": string or null,
    "temperature": string or null,
    "pulse": string or null,
    "weight": string or null,
    "spo2": string or null
  }
}`;

/**
 * run({ transcript })
 * @returns {Object} Extracted clinical entities
 */
const run = async ({ transcript }) => {
  log('EXTRACTOR', 'Sending transcript to Groq for entity extraction...');

  let rawResponse;
  try {
    const completion = await groq.chat.completions.create({
      model: MODEL,
      temperature: 0.1, // Low temp = more deterministic extraction
      max_tokens: 1000,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Extract all clinical entities from this transcript:\n\n"""\n${transcript}\n"""`
        }
      ]
    });

    rawResponse = completion.choices[0]?.message?.content;
    if (!rawResponse) throw new Error('Groq returned empty response');

  } catch (err) {
    logError('EXTRACTOR', err);
    throw new Error(`Extractor Agent failed: ${err.message}`);
  }

  // Parse and validate JSON
  let extracted;
  try {
    extracted = JSON.parse(rawResponse);
  } catch (parseErr) {
    logError('EXTRACTOR', new Error('JSON parse failed'));
    throw new Error(`Extractor returned invalid JSON: ${rawResponse.slice(0, 200)}`);
  }

  // Normalise — ensure arrays are arrays
  const safe = (val, fallback = []) => Array.isArray(val) ? val : fallback;
  const safeObj = (val) => (val && typeof val === 'object') ? val : {};

  return {
    patient_name: extracted.patient_name || null,
    age:          extracted.age || null,
    gender:       extracted.gender || null,
    symptoms:     safe(extracted.symptoms),
    duration:     extracted.duration || null,
    history:      safe(extracted.history),
    medications:  safe(extracted.medications),
    allergies:    safe(extracted.allergies),
    observations: safe(extracted.observations),
    vitals:       safeObj(extracted.vitals)
  };
};

module.exports = { run };