import { mkdir } from 'fs/promises';
import { join } from 'path';
import { logger } from './logger.js';

export const ensureDirs = async () => {
  const recordingsDir = process.env.RECORDINGS_DIR || './recordings';
  const logsDir = process.env.LOGS_DIR || './logs';

  try {
    await mkdir(recordingsDir, { recursive: true });
    await mkdir(logsDir, { recursive: true });
    
    logger.info({
      recordingsDir,
      logsDir
    }, 'Directories ensured');
  } catch (error) {
    logger.error({
      error: error.message,
      recordingsDir,
      logsDir
    }, 'Failed to create directories');
    process.exit(1);
  }
};