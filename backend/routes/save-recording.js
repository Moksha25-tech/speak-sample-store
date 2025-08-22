import express from 'express';
import multer from 'multer';
import { writeFile, readdir } from 'fs/promises';
import { join } from 'path';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import { logger } from '../utils/logger.js';

// Set FFmpeg path
ffmpeg.setFfmpegPath(ffmpegStatic);

const router = express.Router();

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Save recording endpoint
router.post('/save-recording', upload.single('audio'), async (req, res) => {
  try {
    const { transcript } = req.body;
    const audioFile = req.file;

    if (!audioFile) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    // Create timestamp for filenames
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const recordingsDir = process.env.RECORDINGS_DIR || './recordings';
    
    // File paths
    const wavPath = join(recordingsDir, `recording_${timestamp}.wav`);
    const transcriptPath = join(recordingsDir, `transcript_${timestamp}.json`);
    const tempWebmPath = join(recordingsDir, `temp_${timestamp}.webm`);

    // Save temporary webm file
    await writeFile(tempWebmPath, audioFile.buffer);

    // Convert webm to wav using ffmpeg
    await new Promise((resolve, reject) => {
      ffmpeg(tempWebmPath)
        .audioCodec('pcm_s16le')
        .audioChannels(1)
        .audioFrequency(44100)
        .format('wav')
        .save(wavPath)
        .on('end', resolve)
        .on('error', reject);
    });

    // Clean up temporary webm file
    try {
      await import('fs').then(fs => fs.promises.unlink(tempWebmPath));
    } catch (err) {
      logger.warn('Failed to delete temporary file:', err);
    }

    // Save transcript as JSON
    const transcriptData = {
      transcript: transcript || '',
      timestamp: new Date().toISOString(),
      audioFile: `recording_${timestamp}.wav`,
      duration: null // Could be calculated from audio file if needed
    };

    await writeFile(transcriptPath, JSON.stringify(transcriptData, null, 2));

    logger.info({
      audioFile: `recording_${timestamp}.wav`,
      transcriptFile: `transcript_${timestamp}.json`,
      recordingsDir
    }, 'Recording and transcript saved successfully');

    res.json({
      success: true,
      files: {
        audio: `recording_${timestamp}.wav`,
        transcript: `transcript_${timestamp}.json`
      },
      paths: {
        audio: wavPath,
        transcript: transcriptPath
      },
      timestamp
    });

  } catch (error) {
    logger.error('Failed to save recording:', error);
    res.status(500).json({ 
      error: 'Failed to save recording',
      details: error.message 
    });
  }
});

// Get recording logs endpoint
router.get('/recording-logs', async (req, res) => {
  try {
    const recordingsDir = process.env.RECORDINGS_DIR || './recordings';
    const files = await readdir(recordingsDir);
    
    const logs = files
      .filter(file => file.startsWith('recording_') && file.endsWith('.wav'))
      .map(file => {
        const timestamp = file.replace('recording_', '').replace('.wav', '');
        return {
          audioFile: file,
          transcriptFile: `transcript_${timestamp}.json`,
          timestamp: timestamp.replace(/-/g, ':'),
          storagePath: `recordings/${file}`
        };
      })
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp)); // Most recent first

    res.json(logs);
  } catch (error) {
    logger.error('Failed to get recording logs:', error);
    res.status(500).json({ 
      error: 'Failed to get recording logs',
      details: error.message 
    });
  }
});

export default router;