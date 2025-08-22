import { useState, useRef, useCallback } from 'react';

export type RecordingState = 'idle' | 'recording' | 'ready' | 'uploading' | 'uploaded' | 'error';

export interface RecordingHandle {
  blob: Blob | null;
  durationMs: number;
  stop: () => void;
}

export interface UseRecorderReturn {
  state: RecordingState;
  blob: Blob | null;
  durationMs: number;
  error: string | null;
  startRecording: () => Promise<RecordingHandle | null>;
  stopRecording: () => void;
  resetRecording: () => void;
  setState: (state: RecordingState) => void;
  saveRecording: (transcript?: string) => Promise<void>;
}

const MAX_DURATION_MS = 30 * 1000; // 30 seconds

export const useRecorder = (): UseRecorderReturn => {
  const [state, setState] = useState<RecordingState>('idle');
  const [blob, setBlob] = useState<Blob | null>(null);
  const [durationMs, setDurationMs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    chunksRef.current = [];
  }, []);

  const startRecording = useCallback(async (): Promise<RecordingHandle | null> => {
    try {
      setError(null);
      
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });

      // Check if browser supports webm
      const mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        throw new Error('Browser does not support audio/webm recording');
      }

      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      startTimeRef.current = Date.now();

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const recordingBlob = new Blob(chunksRef.current, { type: mimeType });
        const duration = Date.now() - startTimeRef.current;
        
        setBlob(recordingBlob);
        setDurationMs(duration);
        setState('ready');
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setError('Recording failed. Please try again.');
        setState('error');
        cleanup();
      };

      mediaRecorderRef.current.start(100); // Collect data every 100ms
      setState('recording');

      // Auto-stop after max duration
      timerRef.current = setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      }, MAX_DURATION_MS);

      // Return handle for manual control
      return {
        blob: null,
        durationMs: 0,
        stop: () => {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
          }
        }
      };

    } catch (err) {
      console.error('Failed to start recording:', err);
      let errorMessage = 'Failed to start recording. ';
      
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          errorMessage += 'Microphone permission required.';
        } else if (err.name === 'NotFoundError') {
          errorMessage += 'No microphone found.';
        } else {
          errorMessage += err.message;
        }
      }
      
      setError(errorMessage);
      setState('error');
      return null;
    }
  }, [cleanup]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    cleanup();
  }, [cleanup]);

  const resetRecording = useCallback(() => {
    cleanup();
    setBlob(null);
    setDurationMs(0);
    setError(null);
    setState('idle');
  }, [cleanup]);

  const generateTranscript = useCallback((audioBlob: Blob): Promise<string> => {
    return new Promise((resolve) => {
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        resolve('Speech recognition not supported');
        return;
      }

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = true;
      recognition.lang = 'en-US';
      recognition.interimResults = false;

      let transcript = '';
      
      recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            transcript += event.results[i][0].transcript + ' ';
          }
        }
      };

      recognition.onend = () => {
        resolve(transcript.trim() || 'No speech detected');
      };

      recognition.onerror = () => {
        resolve('Speech recognition error');
      };

      // For now, return a placeholder since we can't process the blob directly
      // In a real implementation, you'd need to play the audio and capture it
      resolve('Audio transcript not available (requires audio playback for processing)');
    });
  }, []);

  const saveRecording = useCallback(async (transcript?: string) => {
    if (!blob) {
      setError('No recording to save');
      return;
    }

    try {
      setState('uploading');
      
      // Generate transcript if not provided
      const finalTranscript = transcript || await generateTranscript(blob);
      
      const formData = new FormData();
      formData.append('audio', blob, 'recording.webm');
      formData.append('transcript', finalTranscript);

      const response = await fetch('/api/save-recording', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const result = await response.json();
      console.log('Recording saved:', result);
      setState('uploaded');
      
    } catch (err) {
      console.error('Failed to save recording:', err);
      setError('Failed to save recording to server');
      setState('error');
    }
  }, [blob, generateTranscript]);

  return {
    state,
    blob,
    durationMs,
    error,
    startRecording,
    stopRecording,
    resetRecording,
    setState,
    saveRecording
  };
};