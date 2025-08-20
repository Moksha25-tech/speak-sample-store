import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Mic, Square, Upload, RotateCcw, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRecorder, RecordingState } from '@/hooks/useRecorder';
import { api, UploadMetadata } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

// Food emoji mapping
const foodEmojis: { [key: string]: string } = {
  'Idli': '🍚', 'Vada': '🍘', 'Pongal': '🍲', 'Dosa': '🥞', 'Masala Dosa': '🥞',
  'Paneer Tikka': '🧀', 'Butter Chicken': '🍛', 'Veg Biryani': '🍚', 'Samosa': '🥟',
  'Chole Bhature': '🫘', 'Chicken Tikka': '🍖', 'Dal Tadka': '🫛', 'Gulab Jamun': '🍡',
  'Mango Lassi': '🥭', 'Naan': '🫓', 'Tandoori Roti': '🫓', 'Rajma Masala': '🫘',
  'Aloo Gobi': '🥔', 'Palak Paneer': '🥬', 'Curd Rice': '🍚', 'Kerala Fish Curry': '🐟'
};

const getRandomEmoji = (itemName: string): string => {
  if (foodEmojis[itemName]) return foodEmojis[itemName];
  const defaultEmojis = ['🍽️', '🥘', '🍛', '🍜', '🍲', '🥗', '🍕', '🍔', '🌮', '🥙'];
  return defaultEmojis[Math.floor(Math.random() * defaultEmojis.length)];
};

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
        p-6 rounded-2xl border-2 bg-card transition-all duration-200 hover:shadow-lg cursor-pointer relative overflow-hidden group
        ${isActive ? 'ring-2 ring-primary border-primary shadow-lg' : 'border-border hover:border-primary/30'}
        ${state === 'recording' ? 'recording-pulse border-recording' : ''}
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
      <div className="flex flex-col items-center text-center space-y-4">
        {/* Food Emoji */}
        <div className="text-5xl group-hover:scale-110 transition-transform duration-200">
          {getRandomEmoji(itemName)}
        </div>
        
        {/* Item Name */}
        <div>
          <h3 className="font-bold text-lg text-card-foreground">{itemName}</h3>
          {uploadedFilename && (
            <p className="text-sm text-success font-medium mt-1">
              ✓ Uploaded
            </p>
          )}
          {state === 'ready' && durationMs > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              {formatDuration(durationMs)} recorded
            </p>
          )}
          {error && (
            <p className="text-sm text-destructive mt-1">
              {error}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="w-full space-y-2">
          {/* Record/Stop Button */}
          {(state === 'idle' || state === 'recording' || state === 'error') && (
            <Button
              variant={state === 'recording' ? 'destructive' : 'default'}
              size="lg"
              onClick={(e) => {
                e.stopPropagation();
                handleRecord();
              }}
              className="w-full focus-ring rounded-2xl font-semibold text-lg py-3"
              aria-label={state === 'recording' ? 'Stop recording' : 'Start recording'}
            >
              {state === 'recording' ? (
                <>
                  <Square className="h-5 w-5 mr-2" />
                  Stop Recording
                </>
              ) : (
                <>
                  <Mic className="h-5 w-5 mr-2" />
                  {state === 'error' ? 'Retry Recording' : 'Start Recording'}
                </>
              )}
            </Button>
          )}

          {/* Play and Retake buttons */}
          {(state === 'ready' || state === 'uploaded') && blob && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePlay();
                }}
                className="flex-1 focus-ring rounded-xl"
                aria-label={isPlaying ? 'Pause playback' : 'Play recording'}
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4 mr-1" />
                ) : (
                  <Play className="h-4 w-4 mr-1" />
                )}
                Play
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRetake();
                }}
                className="flex-1 focus-ring rounded-xl"
                aria-label="Retake recording"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Retake
              </Button>
            </div>
          )}

          {/* Upload Button */}
          {state === 'ready' && (
            <Button
              variant="default"
              size="lg"
              onClick={(e) => {
                e.stopPropagation();
                handleUpload();
              }}
              className="w-full focus-ring rounded-2xl font-semibold text-lg py-3"
              aria-label="Upload recording"
            >
              <Upload className="h-5 w-5 mr-2" />
              Upload Recording
            </Button>
          )}

          {/* Uploading State */}
          {state === 'uploading' && (
            <Button
              variant="default"
              size="lg"
              disabled
              className="w-full rounded-2xl font-semibold text-lg py-3"
            >
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Uploading...
            </Button>
          )}

          {/* Uploaded State */}
          {state === 'uploaded' && (
            <Button
              variant="outline"
              size="lg"
              disabled
              className="w-full rounded-2xl font-semibold text-lg py-3 text-success border-success"
            >
              <Check className="h-5 w-5 mr-2" />
              Successfully Uploaded
            </Button>
          )}
        </div>
        
        {/* Status Indicator */}
        <div className={`absolute top-3 right-3 w-3 h-3 rounded-full ${
          state === 'idle' ? 'bg-muted-foreground' :
          state === 'recording' ? 'bg-recording animate-pulse' :
          state === 'ready' ? 'bg-warning' :
          state === 'uploaded' ? 'bg-success' :
          'bg-destructive'
        }`} />
      </div>
    </div>
  );
};