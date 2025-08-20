import { useState, useEffect, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/Header';
import { ControlsBar } from '@/components/ControlsBar';
import { ItemRow } from '@/components/ItemRow';
import itemsData from '@/data/items.json';
import { api } from '@/lib/api';

type MicPermission = 'granted' | 'denied' | 'prompt' | 'checking';
type ApiStatus = 'online' | 'offline' | 'checking';

const Index = () => {
  const [micPermission, setMicPermission] = useState<MicPermission>('checking');
  const [apiStatus, setApiStatus] = useState<ApiStatus>('checking');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [sessionId] = useState(() => uuidv4());

  // Check microphone permission on mount
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
  }, []);

  // Check API health on mount and periodically
  useEffect(() => {
    const checkApiHealth = async () => {
      try {
        await api.health();
        setApiStatus('online');
      } catch (error) {
        console.warn('API health check failed:', error);
        setApiStatus('offline');
      }
    };

    checkApiHealth();
    
    // Check every 30 seconds
    const interval = setInterval(checkApiHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  // Get uploaded count from localStorage (simple session tracking)
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const key = `survey-uploaded-${today}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      setUploadedCount(parseInt(stored, 10));
    }

    // Listen for upload events to update count
    const handleUpload = () => {
      const newCount = uploadedCount + 1;
      setUploadedCount(newCount);
      localStorage.setItem(key, newCount.toString());
    };

    // This is a simple way to track uploads - in a real app you'd use a proper state management solution
    window.addEventListener('survey-upload-success', handleUpload);
    return () => window.removeEventListener('survey-upload-success', handleUpload);
  }, [uploadedCount]);

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
          if (activeItemIndex !== null) {
            // This would trigger the record action on the active item
            // The actual implementation would need to communicate with the ItemRow component
          }
          break;
        case 'Escape': // Escape to clear active item
          e.preventDefault();
          setActiveItemIndex(null);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeItemIndex]);

  return (
    <div className="min-h-screen bg-background">
      <Header micPermission={micPermission} />
      
      <main className="container px-6 py-8">
        <ControlsBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sortOrder={sortOrder}
          onSortChange={setSortOrder}
          uploadedCount={uploadedCount}
          apiStatus={apiStatus}
        />

        {/* Listening Status Banner */}
        <div className="mt-6 p-4 bg-secondary rounded-2xl border-2 border-muted">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-warning animate-pulse" />
              <span className="text-secondary-foreground font-medium">
                Passively listening...
              </span>
            </div>
            <Button 
              variant="default" 
              size="lg" 
              className="rounded-2xl font-semibold px-6 py-3"
              onClick={() => {
                if (activeItemIndex !== null) {
                  // Focus on the active item's record button
                  const activeElement = document.querySelector(`[data-item-index="${activeItemIndex}"] button`);
                  if (activeElement) (activeElement as HTMLElement).click();
                }
              }}
            >
              <Mic className="h-5 w-5 mr-2" />
              Start Recording
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Passive listening active. Say "start recording" to begin ordering.
          </p>
        </div>

        {/* Items Grid */}
        <div className="mt-8">
          {filteredAndSortedItems.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                No items found matching "{searchQuery}"
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredAndSortedItems.map((item, index) => (
                <div key={`${item}-${index}`} data-item-index={index}>
                  <ItemRow
                    itemName={item}
                    isActive={activeItemIndex === index}
                    onClick={() => setActiveItemIndex(index)}
                    sessionId={sessionId}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t text-center text-sm text-muted-foreground">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span>Build: survey-1.0.0</span>
              <span className="text-xs opacity-50">•</span>
              <span>Session: {sessionId.slice(0, 8)}</span>
            </div>
            <div className={`flex items-center gap-2 ${
              apiStatus === 'online' ? 'text-success' : apiStatus === 'offline' ? 'text-destructive' : 'text-muted-foreground'
            }`}>
              <div className="w-2 h-2 rounded-full bg-current" />
              <span>API: {apiStatus}</span>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default Index;