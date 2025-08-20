import { useState, useEffect } from 'react';
import { Settings, Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface HeaderProps {
  micPermission: 'granted' | 'denied' | 'prompt' | 'checking';
}

export const Header: React.FC<HeaderProps> = ({ micPermission }) => {
  const [apiBaseUrl, setApiBaseUrl] = useState(
    import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'
  );
  const [maxDuration, setMaxDuration] = useState(30);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const getMicStatus = () => {
    switch (micPermission) {
      case 'granted':
        return { text: 'Mic ready', icon: Mic, color: 'text-success' };
      case 'denied':
        return { text: 'Mic blocked', icon: MicOff, color: 'text-destructive' };
      case 'prompt':
        return { text: 'Mic pending', icon: MicOff, color: 'text-warning' };
      default:
        return { text: 'Checking mic', icon: MicOff, color: 'text-muted-foreground' };
    }
  };

  const micStatus = getMicStatus();
  const MicIcon = micStatus.icon;

  const handleSaveSettings = () => {
    // In a real app, these would be saved to localStorage or a settings API
    setIsSettingsOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-6">
        <div className="flex flex-col">
          <h1 className="text-xl font-bold text-foreground">
            Survey — Voice Samples
          </h1>
          <p className="text-sm text-muted-foreground">
            Help us improve pronunciation models by recording short clips for the items below.
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Mic Permission Indicator */}
          <div className={`flex items-center gap-2 ${micStatus.color}`}>
            <MicIcon className="h-4 w-4" />
            <span className="text-sm font-medium hidden sm:inline">
              {micStatus.text}
            </span>
          </div>

          {/* Settings Dialog */}
          <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 focus-ring"
                aria-label="Open settings"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Settings</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="api-url" className="text-right">
                    API Base URL
                  </Label>
                  <Input
                    id="api-url"
                    value={apiBaseUrl}
                    onChange={(e) => setApiBaseUrl(e.target.value)}
                    className="col-span-3"
                    placeholder="http://localhost:4000"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="max-duration" className="text-right">
                    Max Duration (s)
                  </Label>
                  <Input
                    id="max-duration"
                    type="number"
                    min="5"
                    max="60"
                    value={maxDuration}
                    onChange={(e) => setMaxDuration(parseInt(e.target.value))}
                    className="col-span-3"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSaveSettings} variant="default">
                  Save Settings
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </header>
  );
};