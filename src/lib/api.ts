const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

export interface UploadMetadata {
  itemName: string;
  timestamp: string;
  durationMs: number;
  locale: string;
  sessionId: string;
  deviceInfo: {
    userAgent: string;
  };
  appVersion: string;
}

export interface UploadResponse {
  recordingId: string;
  filename: string;
  url: string;
}

export interface RecordingInfo {
  filename: string;
  size: number;
  createdAt: string;
  itemName: string;
}

export interface HealthResponse {
  status: string;
  uptime: number;
  recordingsCount: number;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const errorText = await response.text();
    throw new ApiError(response.status, errorText || `HTTP ${response.status}`);
  }
  return response.json();
};

export const api = {
  async uploadRecording(blob: Blob, metadata: UploadMetadata): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', blob, 'recording.webm');
    formData.append('meta', JSON.stringify(metadata));

    const response = await fetch(`${API_BASE_URL}/api/upload-recording`, {
      method: 'POST',
      body: formData,
    });

    return handleResponse(response);
  },

  async getRecordings(item?: string, date?: string): Promise<RecordingInfo[]> {
    const params = new URLSearchParams();
    if (item) params.append('item', item);
    if (date) params.append('date', date);

    const response = await fetch(
      `${API_BASE_URL}/api/recordings?${params.toString()}`
    );

    return handleResponse(response);
  },

  async getRecordingLogs(date: string): Promise<any[]> {
    const response = await fetch(
      `${API_BASE_URL}/api/recording-logs?date=${date}`
    );

    return handleResponse(response);
  },

  async downloadRecording(filename: string): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/api/download/${filename}`);
    
    if (!response.ok) {
      throw new ApiError(response.status, `Failed to download ${filename}`);
    }
    
    return response.blob();
  },

  async deleteRecording(filename: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/recordings/${filename}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new ApiError(response.status, errorText || `Failed to delete ${filename}`);
    }
  },

  async health(): Promise<HealthResponse> {
    const response = await fetch(`${API_BASE_URL}/api/health`);
    return handleResponse(response);
  }
};