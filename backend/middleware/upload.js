import multer from 'multer'
import path from 'path'
import fs from 'fs'

const uploadDir = './uploads'
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir)

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `audio_${Date.now()}${ext}`)
  },
})

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('audio/')) cb(null, true)
  else cb(new Error('Only audio files allowed'), false)
}

export const upload = multer({ storage, fileFilter, limits: { fileSize: 25 * 1024 * 1024 } })