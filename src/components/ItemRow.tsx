import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Mic, Square, Upload, RotateCcw, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRecorder, RecordingState } from '@/hooks/useRecorder';
import { api, UploadMetadata } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

interface ItemRowProps {
  itemName: string;
  isActive: boolean;
  onClick: () => void;
  sessionId: string;
}

export const ItemRow: React.FC<ItemRowProps> = ({ 
  itemName, 
  isActive, 
  onClick,
  sessionId 
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [uploadedFilename, setUploadedFilename] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const {
    state,
    blob,
    durationMs,
    error,
    startRecording,
    stopRecording,
    resetRecording,
    setState
  } = useRecorder();

  // Format duration for display
  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    return `${seconds}s`;
  };

  // Handle audio playback
  const handlePlay = () => {
    if (!blob) return;

    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      const audioUrl = URL.createObjectURL(blob);
      audioRef.current = new Audio(audioUrl);
      audioRef.current.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
      };
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  // Handle recording
  const handleRecord = async () => {
    if (state === 'recording') {
      stopRecording();
    } else {
      onClick(); // Make this row active
      await startRecording();
    }
  };

  // Handle upload
  const handleUpload = async () => {
    if (!blob) return;

    setState('uploading');
    
    try {
      const metadata: UploadMetadata = {
        itemName,
        timestamp: new Date().toISOString(),
        durationMs,
        locale: 'en-IN',
        sessionId,
        deviceInfo: {
          userAgent: navigator.userAgent
        },
        appVersion: 'survey-1.0.0'
      };

      const response = await api.uploadRecording(blob, metadata);
      setUploadedFilename(response.filename);
      setState('uploaded');
      
      toast({
        title: "Uploaded ✓",
        description: `Recording saved as ${response.filename}`,
        variant: "default"
      });
    } catch (err) {
      console.error('Upload failed:', err);
      setState('error');
      toast({
        title: "Upload failed. Try again.",
        description: err instanceof Error ? err.message : "Unknown error occurred",
        variant: "destructive"
      });
    }
  };

  // Handle retake
  const handleRetake = () => {
    resetRecording();
    setUploadedFilename(null);
    setIsPlaying(false);
  };

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Get status indicator class
  const getStatusClass = () => {
    switch (state) {
      case 'recording':
        return 'status-recording';
      case 'ready':
        return 'status-ready';
      case 'uploaded':
        return 'status-uploaded';
      case 'error':
        return 'status-error';
      default:
        return 'status-idle';
    }
  };

  // Get appropriate button variant based on state
  const getButtonVariant = (buttonType: 'record' | 'action') => {
    if (buttonType === 'record') {
      return state === 'recording' ? 'destructive' : 'default';
    }
    return 'outline';
  };

  return (
    <div 
      className={`
        group rounded-xl border bg-card p-6 transition-all duration-200 cursor-pointer
        ${isActive ? 'ring-2 ring-primary shadow-glow bg-primary/5' : 'hover:shadow-md hover:bg-accent/50'}
        ${state === 'recording' ? 'recording-pulse' : ''}
      `}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`status-dot ${getStatusClass()}`} />
          <div>
            <h3 className="font-semibold text-card-foreground">
              {itemName}
            </h3>
            {uploadedFilename && (
              <p className="text-xs text-muted-foreground mt-1">
                Uploaded • {uploadedFilename}
              </p>
            )}
            {state === 'ready' && durationMs > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Duration: {formatDuration(durationMs)}
              </p>
            )}
            {error && (
              <p className="text-xs text-destructive mt-1">
                {error}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Record/Stop Button */}
          {(state === 'idle' || state === 'recording' || state === 'error') && (
            <Button
              variant={getButtonVariant('record')}
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleRecord();
              }}
              className="focus-ring"
              aria-label={state === 'recording' ? 'Stop recording' : 'Start recording'}
            >
              {state === 'recording' ? (
                <>
                  <Square className="h-4 w-4 mr-2" />
                  Stop
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4 mr-2" />
                  Record
                </>
              )}
            </Button>
          )}

          {/* Play Button */}
          {(state === 'ready' || state === 'uploaded') && blob && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handlePlay();
              }}
              className="focus-ring"
              aria-label={isPlaying ? 'Pause playback' : 'Play recording'}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              <span className="ml-2 hidden sm:inline">Play</span>
            </Button>
          )}

          {/* Retake Button */}
          {(state === 'ready' || state === 'uploaded' || state === 'error') && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleRetake();
              }}
              className="focus-ring"
              aria-label="Retake recording"
            >
              <RotateCcw className="h-4 w-4" />
              <span className="ml-2 hidden sm:inline">Retake</span>
            </Button>
          )}

          {/* Upload Button */}
          {state === 'ready' && (
            <Button
              variant="default"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleUpload();
              }}
              className="focus-ring"
              aria-label="Upload recording"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </Button>
          )}

          {/* Uploaded Indicator */}
          {state === 'uploaded' && (
            <div className="flex items-center gap-2 text-success">
              <Check className="h-4 w-4" />
              <span className="text-sm font-medium hidden sm:inline">Uploaded</span>
            </div>
          )}

          {/* Uploading Indicator */}
          {state === 'uploading' && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-medium hidden sm:inline">Uploading...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};