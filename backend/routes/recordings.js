import express from 'express';
import { promises as fs } from 'fs';
import { join, basename } from 'path';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import { handleUpload } from '../middleware/upload.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

const RECORDINGS_DIR = process.env.RECORDINGS_DIR || './recordings';
const LOGS_DIR = process.env.LOGS_DIR || './logs';

// Helper function to get log file path for a date
const getLogFilePath = (date) => {
  const dateStr = dayjs(date).format('YYYY-MM-DD');
  return join(LOGS_DIR, `recording_log_${dateStr}.json`);
};

// Helper function to write log entry
const writeLogEntry = async (logEntry) => {
  const logFilePath = getLogFilePath(new Date());
  
  try {
    let logs = [];
    
    // Try to read existing log file
    try {
      const existingData = await fs.readFile(logFilePath, 'utf8');
      logs = JSON.parse(existingData);
    } catch (error) {
      // File doesn't exist or is empty, start with empty array
      if (error.code !== 'ENOENT') {
        logger.warn({ error: error.message, logFilePath }, 'Failed to read existing log file');
      }
    }
    
    // Add new entry
    logs.push(logEntry);
    
    // Write back to file
    await fs.writeFile(logFilePath, JSON.stringify(logs, null, 2));
    
    logger.debug({ logFilePath, entryCount: logs.length }, 'Log entry written');
  } catch (error) {
    logger.error({ 
      error: error.message, 
      logFilePath,
      entry: logEntry 
    }, 'Failed to write log entry');
  }
};

// Helper function to remove log entry
const removeLogEntry = async (filename) => {
  try {
    // We need to check multiple days since we don't know when it was uploaded
    const dates = [];
    for (let i = 0; i < 7; i++) {
      dates.push(dayjs().subtract(i, 'day').toDate());
    }
    
    for (const date of dates) {
      const logFilePath = getLogFilePath(date);
      
      try {
        const data = await fs.readFile(logFilePath, 'utf8');
        const logs = JSON.parse(data);
        const filteredLogs = logs.filter(log => log.filename !== filename);
        
        if (filteredLogs.length !== logs.length) {
          await fs.writeFile(logFilePath, JSON.stringify(filteredLogs, null, 2));
          logger.debug({ filename, logFilePath }, 'Log entry removed');
          break;
        }
      } catch (error) {
        // Continue to next date if file doesn't exist
        if (error.code !== 'ENOENT') {
          logger.warn({ error: error.message, logFilePath }, 'Failed to process log file');
        }
      }
    }
  } catch (error) {
    logger.error({ error: error.message, filename }, 'Failed to remove log entry');
  }
};

// POST /api/upload-recording
router.post('/upload-recording', handleUpload, async (req, res) => {
  try {
    const { file, metadata } = req;
    const recordingId = uuidv4();
    
    // Create log entry
    const logEntry = {
      recordingId,
      filename: file.filename,
      itemName: metadata.itemName,
      durationMs: metadata.durationMs,
      timestamp: metadata.timestamp,
      locale: metadata.locale || 'en-IN',
      sessionId: metadata.sessionId,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      appVersion: metadata.appVersion || 'unknown',
      fileSize: file.size,
      deviceInfo: metadata.deviceInfo || {}
    };
    
    // Write to log file
    await writeLogEntry(logEntry);
    
    logger.info({
      recordingId,
      filename: file.filename,
      itemName: metadata.itemName,
      fileSize: file.size
    }, 'Recording uploaded successfully');
    
    res.status(201).json({
      recordingId,
      filename: file.filename,
      url: `/api/download/${file.filename}`
    });
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to process upload');
    res.status(500).json({
      error: 'Upload processing failed',
      message: error.message
    });
  }
});

// GET /api/recordings
router.get('/recordings', async (req, res) => {
  try {
    const { item, date } = req.query;
    
    // Read recordings directory
    const files = await fs.readdir(RECORDINGS_DIR);
    const webmFiles = files.filter(file => file.endsWith('.webm'));
    
    let recordings = [];
    
    for (const file of webmFiles) {
      try {
        const filePath = join(RECORDINGS_DIR, file);
        const stats = await fs.stat(filePath);
        
        // Extract item name from filename (survey_{item}_{timestamp}_{uuid}.webm)
        const parts = file.split('_');
        const itemName = parts.length >= 2 ? parts[1] : 'unknown';
        
        recordings.push({
          filename: file,
          size: stats.size,
          createdAt: stats.ctime.toISOString(),
          itemName: itemName.replace(/_/g, ' ')
        });
      } catch (error) {
        logger.warn({ error: error.message, filename: file }, 'Failed to get file stats');
      }
    }
    
    // Apply filters
    if (item) {
      const itemFilter = item.toLowerCase();
      recordings = recordings.filter(r => 
        r.itemName.toLowerCase().includes(itemFilter)
      );
    }
    
    if (date) {
      const targetDate = dayjs(date).format('YYYY-MM-DD');
      recordings = recordings.filter(r => 
        dayjs(r.createdAt).format('YYYY-MM-DD') === targetDate
      );
    }
    
    // Sort by creation date (newest first)
    recordings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    logger.info({
      totalRecordings: recordings.length,
      filters: { item, date }
    }, 'Recordings list retrieved');
    
    res.json(recordings);
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to get recordings');
    res.status(500).json({
      error: 'Failed to retrieve recordings',
      message: error.message
    });
  }
});

// GET /api/recording-logs
router.get('/recording-logs', async (req, res) => {
  try {
    const { date = dayjs().format('YYYY-MM-DD') } = req.query;
    const logFilePath = getLogFilePath(date);
    
    try {
      const data = await fs.readFile(logFilePath, 'utf8');
      const logs = JSON.parse(data);
      
      logger.info({
        date,
        logCount: logs.length
      }, 'Recording logs retrieved');
      
      res.json(logs);
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Log file doesn't exist for this date
        logger.info({ date }, 'No log file found for date');
        res.json([]);
      } else {
        throw error;
      }
    }
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to get recording logs');
    res.status(500).json({
      error: 'Failed to retrieve logs',
      message: error.message
    });
  }
});

// GET /api/download/:filename
router.get('/download/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    
    // Validate filename to prevent directory traversal
    if (!filename || filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({
        error: 'Invalid filename',
        message: 'Filename contains invalid characters'
      });
    }
    
    const filePath = join(RECORDINGS_DIR, filename);
    
    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      logger.warn({ filename }, 'File not found for download');
      return res.status(404).json({
        error: 'File not found',
        message: `Recording ${filename} does not exist`
      });
    }
    
    // Set appropriate headers
    res.setHeader('Content-Type', 'audio/webm');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache');
    
    // Stream the file
    const fileStream = await fs.open(filePath, 'r');
    const stream = fileStream.createReadStream();
    
    stream.on('error', (error) => {
      logger.error({ error: error.message, filename }, 'Error streaming file');
      if (!res.headersSent) {
        res.status(500).json({
          error: 'Download failed',
          message: 'Error streaming file'
        });
      }
    });
    
    stream.on('end', () => {
      fileStream.close();
      logger.info({ filename }, 'File download completed');
    });
    
    stream.pipe(res);
    
  } catch (error) {
    logger.error({ error: error.message }, 'Download failed');
    res.status(500).json({
      error: 'Download failed',
      message: error.message
    });
  }
});

// DELETE /api/recordings/:filename
router.delete('/recordings/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    
    // Validate filename
    if (!filename || filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({
        error: 'Invalid filename',
        message: 'Filename contains invalid characters'
      });
    }
    
    const filePath = join(RECORDINGS_DIR, filename);
    
    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      logger.warn({ filename }, 'File not found for deletion');
      return res.status(404).json({
        error: 'File not found',
        message: `Recording ${filename} does not exist`
      });
    }
    
    // Delete the file
    await fs.unlink(filePath);
    
    // Remove from log
    await removeLogEntry(filename);
    
    logger.info({ filename }, 'Recording deleted successfully');
    
    res.json({
      message: `Recording ${filename} deleted successfully`
    });
    
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to delete recording');
    res.status(500).json({
      error: 'Delete failed',
      message: error.message
    });
  }
});

// GET /api/health (enhanced version with recording count)
router.get('/health', async (req, res) => {
  try {
    // Count recordings
    const files = await fs.readdir(RECORDINGS_DIR);
    const recordingsCount = files.filter(file => file.endsWith('.webm')).length;
    
    res.json({
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      recordingsCount
    });
  } catch (error) {
    logger.error({ error: error.message }, 'Health check failed');
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

export default router;