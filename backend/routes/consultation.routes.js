/**
 * ╔══════════════════════════════════════════════════════╗
 * ║  CONSULTATION ROUTES                                 ║
 * ╠══════════════════════════════════════════════════════╣
 * ║  POST   /api/consultation/process      → Full pipeline
 * ║  GET    /api/consultation/stats        → Dashboard stats
 * ║  GET    /api/consultation              → List (paginated)
 * ║  GET    /api/consultation/:id          → Single record
 * ║  GET    /api/consultation/:id/report   → Report metadata
 * ║  DELETE /api/consultation/:id          → Delete record
 * ╚══════════════════════════════════════════════════════╝
 */

const express  = require('express');
const router   = express.Router();
const { body, param, validationResult } = require('express-validator');
const fs       = require('fs');
const path     = require('path');

const upload   = require('../middleware/upload');
const pipeline = require('../services/pipeline.service');
const db       = require('../services/db.service');

// ── Validation middleware ────────────────────────────────────────────────────
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(e => ({ field: e.path, message: e.msg }))
    });
  }
  next();
};

// ── POST /api/consultation/process ───────────────────────────────────────────
router.post(
  '/process',
  upload.single('audio'),
  [
    body('transcript')
      .optional()
      .isString()
      .isLength({ min: 10 })
      .withMessage('Transcript must be at least 10 characters')
  ],
  validate,
  async (req, res, next) => {
    try {
      const startTime      = Date.now();
      const hasAudio       = !!req.file;
      const hasTranscript  = !!(req.body.transcript?.trim()?.length > 0);

      if (!hasAudio && !hasTranscript) {
        return res.status(400).json({
          success: false,
          message: 'Provide either an audio file (field: "audio") or transcript text (field: "transcript").'
        });
      }

      const result = await pipeline.run({
        audioFilePath: hasAudio      ? req.file.path              : null,
        transcript:    hasTranscript ? req.body.transcript.trim() : null
      });

      return res.status(200).json({
        success:            true,
        processing_time_ms: Date.now() - startTime,
        data:               result
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /api/consultation/stats ──────────────────────────────────────────────
router.get('/stats', async (req, res, next) => {
  try {
    const stats = await db.savePipelineResult
      ? null
      : null; // just checking db is imported

    const [total_consultations, total_reports] = await Promise.all([
      db.countConsultations(),
      db.getReportByConsultation ? 0 : 0
    ]);

    // Use Report model directly for count
    let total_reports_count = 0;
    try {
      const Report = require('../models/report.model');
      total_reports_count = await Report.countDocuments();
    } catch (_) {}

    res.json({
      success: true,
      data: {
        total_consultations,
        total_reports: total_reports_count,
        db_connected:  db.isConnected()
      }
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/consultation ────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const page  = Math.max(parseInt(req.query.page)  || 1,  1);
    const skip  = (page - 1) * limit;

    const [consultations, total] = await Promise.all([
      db.getAllConsultations({ limit, skip }),
      db.countConsultations()
    ]);

    res.json({
      success: true,
      data: {
        consultations,
        pagination: {
          total,
          page,
          limit,
          total_pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/consultation/:id ────────────────────────────────────────────────
router.get(
  '/:id',
  [param('id').isMongoId().withMessage('Invalid consultation ID')],
  validate,
  async (req, res, next) => {
    try {
      const consultation = await db.getConsultationById(req.params.id);
      if (!consultation) {
        return res.status(404).json({ success: false, message: 'Consultation not found' });
      }
      res.json({ success: true, data: consultation });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /api/consultation/:id/report ─────────────────────────────────────────
router.get(
  '/:id/report',
  [param('id').isMongoId().withMessage('Invalid consultation ID')],
  validate,
  async (req, res, next) => {
    try {
      const report = await db.getReportByConsultation(req.params.id);
      if (!report) {
        return res.status(404).json({ success: false, message: 'No report found for this consultation' });
      }
      res.json({ success: true, data: report });
    } catch (err) {
      next(err);
    }
  }
);

// ── DELETE /api/consultation/:id ─────────────────────────────────────────────
router.delete(
  '/:id',
  [param('id').isMongoId().withMessage('Invalid consultation ID')],
  validate,
  async (req, res, next) => {
    try {
      const Consultation = require('../models/consultation.model');
      const Report       = require('../models/report.model');

      const consultation = await Consultation.findById(req.params.id);
      if (!consultation) {
        return res.status(404).json({ success: false, message: 'Consultation not found' });
      }

      // Delete linked PDF file from disk
      if (consultation.report_id) {
        const report = await Report.findById(consultation.report_id);
        if (report?.pdf_filename) {
          const pdfPath = path.join(__dirname, '../reports', report.pdf_filename);
          if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
        }
        await Report.findByIdAndDelete(consultation.report_id);
      }

      await Consultation.findByIdAndDelete(req.params.id);

      res.json({ success: true, message: 'Consultation and associated report deleted.' });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;