import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { join } from 'path';
import { logger } from '../utils/logger.js';

const MAX_FILE_SIZE = (parseInt(process.env.MAX_FILE_MB) || 10) * 1024 * 1024; // Convert MB to bytes
const RECORDINGS_DIR = process.env.RECORDINGS_DIR || './recordings';

// Create a safe filename from item name
const createSafeFilename = (itemName) => {
  return itemName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .substring(0, 50); // Limit length
};

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, RECORDINGS_DIR);
  },
  filename: (req, file, cb) => {
    try {
      // Parse metadata from request
      const meta = JSON.parse(req.body.meta || '{}');
      const itemName = meta.itemName || 'unknown';
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const uuid = uuidv4().substring(0, 8);
      const safeItemName = createSafeFilename(itemName);
      
      // Create filename: survey_{item}_{timestamp}_{uuid}.webm
      const filename = `survey_${safeItemName}_${timestamp}_${uuid}.webm`;
      
      logger.debug({
        originalName: file.originalname,
        generatedName: filename,
        itemName: meta.itemName
      }, 'Generated filename for upload');
      
      cb(null, filename);
    } catch (error) {
      logger.error({ error: error.message }, 'Failed to generate filename');
      cb(error);
    }
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  // Check MIME type
  if (file.mimetype !== 'audio/webm') {
    logger.warn({
      filename: file.originalname,
      mimetype: file.mimetype
    }, 'Invalid file type uploaded');
    
    return cb(new Error('Only audio/webm files are allowed'), false);
  }
  
  cb(null, true);
};

// Create multer upload middleware
export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1, // Only allow one file per request
    fields: 10, // Limit number of fields
    fieldSize: 1024 * 1024 // 1MB limit for field values
  }
}).single('file');

// Enhanced upload middleware with error handling
export const handleUpload = (req, res, next) => {
  uploadMiddleware(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      logger.warn({
        error: err.message,
        code: err.code,
        field: err.field
      }, 'Multer upload error');
      
      switch (err.code) {
        case 'LIMIT_FILE_SIZE':
          return res.status(413).json({
            error: 'File too large',
            message: `Maximum file size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`
          });
        case 'LIMIT_FILE_COUNT':
          return res.status(400).json({
            error: 'Too many files',
            message: 'Only one file per upload is allowed'
          });
        case 'LIMIT_UNEXPECTED_FILE':
          return res.status(400).json({
            error: 'Unexpected file field',
            message: 'File must be uploaded in the "file" field'
          });
        default:
          return res.status(400).json({
            error: 'Upload error',
            message: err.message
          });
      }
    }
    
    if (err) {
      logger.error({ error: err.message }, 'Upload error');
      return res.status(400).json({
        error: 'Upload failed',
        message: err.message
      });
    }
    
    // Validate that file was uploaded
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
        message: 'Please provide an audio file in the "file" field'
      });
    }
    
    // Validate metadata
    try {
      const meta = JSON.parse(req.body.meta || '{}');
      req.metadata = meta;
      
      // Validate required metadata fields
      if (!meta.itemName || !meta.timestamp || !meta.durationMs) {
        return res.status(400).json({
          error: 'Invalid metadata',
          message: 'Missing required fields: itemName, timestamp, durationMs'
        });
      }
      
      // Validate duration
      const maxDurationMs = (parseInt(process.env.MAX_DURATION_SEC) || 30) * 1000;
      if (meta.durationMs > maxDurationMs) {
        return res.status(400).json({
          error: 'Recording too long',
          message: `Maximum duration is ${maxDurationMs / 1000} seconds`
        });
      }
      
      logger.info({
        filename: req.file.filename,
        size: req.file.size,
        itemName: meta.itemName,
        durationMs: meta.durationMs
      }, 'File uploaded successfully');
      
      next();
    } catch (error) {
      logger.error({ error: error.message }, 'Failed to parse metadata');
      return res.status(400).json({
        error: 'Invalid metadata',
        message: 'Metadata must be valid JSON'
      });
    }
  });
};