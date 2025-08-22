import { useState, useEffect, useMemo, useRef } from 'react';
import { Mic, FileText, Clock, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/Header';
import { ItemRow } from '@/components/ItemRow';
import itemsData from '@/data/items.json';
import { useRecorder } from '@/hooks/useRecorder';

type MicPermission = 'granted' | 'denied' | 'prompt' | 'checking';

interface RecordingLog {
  audioFile: string;
  transcriptFile: string;
  timestamp: string;
  storagePath: string;
}

const Index = () => {
  const [micPermission, setMicPermission] = useState<MicPermission>('checking');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [logs, setLogs] = useState<RecordingLog[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<any>(null);
  
  const { state: recordingState, startRecording, stopRecording, resetRecording, saveRecording } = useRecorder();

  // Format timer display
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Recording handlers
  const handleStartRecording = async () => {
    const handle = await startRecording();
    if (handle) {
      // Start timer
      let duration = 0;
      timerRef.current = setInterval(() => {
        duration++;
        setRecordingDuration(duration);
      }, 1000);
    }
  };

  const handleStopRecording = async () => {
    stopRecording();
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRecordingDuration(0);
    
    // Save recording to server
    await saveRecording();
    
    // Refresh logs after saving
    await fetchLogs();
  };

  const fetchLogs = async () => {
    try {
      const response = await fetch('/api/recording-logs');
      if (response.ok) {
        const logsData = await response.json();
        setLogs(logsData);
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    }
  };

  // Check microphone permission and fetch logs on mount
  useEffect(() => {
    const checkMicPermission = async () => {
      try {
        const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        setMicPermission(result.state as MicPermission);
        
        result.addEventListener('change', () => {
          setMicPermission(result.state as MicPermission);
        });
      } catch (error) {
        console.warn('Permission API not supported:', error);
        // Fallback: try to access microphone to check permission
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach(track => track.stop());
          setMicPermission('granted');
        } catch (err) {
          setMicPermission('denied');
        }
      }
    };

    checkMicPermission();
    fetchLogs();
  }, []);

  // Voice command recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.lang = 'en-US';
      
      recognitionRef.current.onresult = (event: any) => {
        const last = event.results.length - 1;
        const command = event.results[last][0].transcript.toLowerCase().trim();
        
        if (command.includes('start recording') && recordingState === 'idle') {
          handleStartRecording();
        }
      };
      
      recognitionRef.current.start();
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [recordingState]);

  // Filter and sort items
  const filteredAndSortedItems = useMemo(() => {
    let filtered = itemsData.items.filter(item =>
      item.toLowerCase().includes(searchQuery.toLowerCase())
    );

    filtered.sort((a, b) => {
      const comparison = a.localeCompare(b);
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [searchQuery, sortOrder]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts when not typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case ' ': // Space to toggle record/stop
          e.preventDefault();
          if (recordingState === 'idle') {
            handleStartRecording();
          } else if (recordingState === 'recording') {
            handleStopRecording();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [recordingState]);

  return (
    <div className="min-h-screen bg-background">
      <Header micPermission={micPermission} />
      
      <main className="container px-6 py-8">
        {/* Search Controls */}
        <div className="mb-6 flex gap-4">
          <input
            type="text"
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-4 py-2 border border-muted rounded-xl bg-background"
          />
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
            className="px-4 py-2 border border-muted rounded-xl bg-background"
          >
            <option value="asc">A → Z</option>
            <option value="desc">Z → A</option>
          </select>
        </div>

        {/* Global Recording Controls */}
        <div className="mt-6 p-6 bg-secondary rounded-2xl border-2 border-muted">
          <div className="flex items-center justify-center">
            {recordingState === 'idle' ? (
              <Button 
                variant="default" 
                size="lg" 
                className="rounded-2xl font-semibold px-8 py-4"
                onClick={handleStartRecording}
              >
                <Mic className="h-5 w-5 mr-2" />
                Start Recording
              </Button>
            ) : recordingState === 'recording' ? (
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-red-500 font-mono text-lg font-bold">
                    {formatTimer(recordingDuration)}
                  </span>
                </div>
                <Button 
                  variant="destructive" 
                  size="lg" 
                  className="rounded-2xl font-semibold px-8 py-4"
                  onClick={handleStopRecording}
                >
                  Stop Recording
                </Button>
              </div>
            ) : recordingState === 'uploading' ? (
              <div className="text-center">
                <p className="text-blue-600 font-semibold mb-2">Saving recording...</p>
              </div>
            ) : recordingState === 'uploaded' ? (
              <div className="text-center">
                <p className="text-green-600 font-semibold mb-2">Recording saved to server!</p>
                <Button 
                  variant="outline" 
                  onClick={resetRecording}
                  className="rounded-2xl"
                >
                  Record Again
                </Button>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-green-600 font-semibold mb-2">Recording ready!</p>
                <Button 
                  variant="outline" 
                  onClick={resetRecording}
                  className="rounded-2xl"
                >
                  Record Again
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Recording Logs */}
        {logs.length > 0 && (
          <div className="mt-8 p-6 bg-secondary rounded-2xl border-2 border-muted">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Recording Logs
            </h2>
            <div className="space-y-3">
              {logs.map((log, index) => (
                <div key={index} className="p-4 bg-background rounded-xl border border-muted">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{log.audioFile}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{new Date(log.timestamp.replace(/-/g, ':')).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FolderOpen className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{log.storagePath}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Items Grid */}
        <div className="mt-8">
          {filteredAndSortedItems.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                No items found matching "{searchQuery}"
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredAndSortedItems.map((item, index) => (
                <div key={`${item}-${index}`} className="p-4 bg-card rounded-xl border border-muted hover:border-primary/20 transition-colors">
                  <span className="text-card-foreground font-medium">{item}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t text-center text-sm text-muted-foreground">
          <span>Build: survey-1.0.0</span>
        </footer>
      </main>
    </div>
  );
};

export default Index;