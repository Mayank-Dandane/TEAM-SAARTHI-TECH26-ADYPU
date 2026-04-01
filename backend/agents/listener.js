/**
 * ╔══════════════════════════════════════════════════════╗
 * ║  AGENT 1 — LISTENER                                  ║
 * ║  Converts audio → transcript via Groq Whisper        ║
 * ║  OR passes through a raw text transcript directly    ║
 * ╚══════════════════════════════════════════════════════╝
 */

const fs = require('fs');
const path = require('path');
const Groq = require('groq-sdk');
const { log } = require('../utils/logger');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * run({ audioFilePath, transcript })
 * @returns {{ transcript: string, source: string }}
 */
const run = async ({ audioFilePath, transcript }) => {
  // ── PATH A: Raw transcript passed in directly ──────────────────────────
  if (transcript && transcript.trim().length > 0) {
    log('LISTENER', '📝 Using provided transcript (skip STT)');
    return {
      transcript: transcript.trim(),
      source: 'text_input'
    };
  }

  // ── PATH B: Audio file — transcribe via Groq Whisper ──────────────────
  if (audioFilePath) {
    log('LISTENER', `🎙️  Transcribing audio: ${path.basename(audioFilePath)}`);

    if (!fs.existsSync(audioFilePath)) {
      throw new Error(`Audio file not found: ${audioFilePath}`);
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

    log('LISTENER', `✅ Transcribed ${transcription.text.length} characters`);

    return {
      transcript: transcription.text.trim(),
      source: 'whisper_audio'
    };
  }

  throw new Error('Listener Agent: provide either audioFilePath or transcript.');
};

module.exports = { run };