import { useState } from 'react';
import { Search, ArrowUpDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface ControlsBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortOrder: 'asc' | 'desc';
  onSortChange: (order: 'asc' | 'desc') => void;
  uploadedCount: number;
  apiStatus: 'online' | 'offline' | 'checking';
}

export const ControlsBar: React.FC<ControlsBarProps> = ({
  searchQuery,
  onSearchChange,
  sortOrder,
  onSortChange,
  uploadedCount,
  apiStatus
}) => {
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);

  const getApiStatusColor = () => {
    switch (apiStatus) {
      case 'online':
        return 'text-success';
      case 'offline':
        return 'text-destructive';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <div className="space-y-4">
      {/* Instruction Banner */}
      <div className="rounded-xl bg-gradient-subtle p-6 border">
        <div className="space-y-2 text-sm">
          <p className="text-foreground">
            Tap an item, then press <span className="font-semibold">Record</span>. 
            Speak the item name clearly. Max 30 seconds.
          </p>
          <p className="text-muted-foreground">
            Your recordings are uploaded anonymously. No transcript is stored.
          </p>
          <p className="text-muted-foreground">
            You can play back before uploading or discard.
          </p>
          
          <Dialog open={isPrivacyOpen} onOpenChange={setIsPrivacyOpen}>
            <DialogTrigger asChild>
              <Button variant="link" className="p-0 h-auto text-primary hover:text-primary/80">
                Privacy & Consent
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px]">
              <DialogHeader>
                <DialogTitle>Privacy & Consent</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <p>
                  By using this voice recording survey, you consent to the following:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Only audio files and basic metadata (item name, timestamp, duration) are stored</li>
                  <li>No personal identifiers are collected or stored</li>
                  <li>Recordings are used solely for pronunciation model improvement</li>
                  <li>No transcription or speech-to-text processing is performed</li>
                  <li>You may request deletion of your recordings via the filename</li>
                </ul>
                <p className="text-muted-foreground">
                  Data is stored securely and is not shared with third parties.
                </p>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center flex-1">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search items…"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 focus-ring"
            />
          </div>

          {/* Sort */}
          <Select value={sortOrder} onValueChange={(value: 'asc' | 'desc') => onSortChange(value)}>
            <SelectTrigger className="w-[140px] focus-ring">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="asc">A → Z</SelectItem>
              <SelectItem value="desc">Z → A</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Session Stats */}
        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted-foreground">
            Recorded today: <span className="font-semibold text-foreground">{uploadedCount}</span> clips
          </span>
          
          <div className={`flex items-center gap-2 ${getApiStatusColor()}`}>
            <div className="w-2 h-2 rounded-full bg-current" />
            <span className="font-medium">
              API: {apiStatus === 'checking' ? 'Checking...' : apiStatus}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};