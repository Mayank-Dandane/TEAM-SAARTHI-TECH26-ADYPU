const fs = require('fs');
const path = require('path');
const { groq } = require('../config/groq');
const { logger } = require('../utils/logger');

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
