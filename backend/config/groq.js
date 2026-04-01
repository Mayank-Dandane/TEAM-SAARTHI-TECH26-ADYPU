require('dotenv').config()
const Groq = require('groq-sdk')

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

const MODELS = {
  large:   'llama-3.3-70b-versatile',
  small:   'llama-3.1-8b-instant',
  whisper: 'whisper-large-v3',
}

module.exports = { groq, MODELS }