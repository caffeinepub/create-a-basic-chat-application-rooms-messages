import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pollingInterval: number;
  onPollingIntervalChange: (interval: number) => void;
}

export default function SettingsDialog({ open, onOpenChange, pollingInterval, onPollingIntervalChange }: SettingsDialogProps) {
  const { theme, setTheme } = useTheme();
  
  const [themeValue, setThemeValue] = useState(theme || 'system');
  const [pollingIntervalSeconds, setPollingIntervalSeconds] = useState((pollingInterval / 1000).toString());

  useEffect(() => {
    setThemeValue(theme || 'system');
    setPollingIntervalSeconds((pollingInterval / 1000).toString());
  }, [theme, pollingInterval]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const intervalSeconds = parseFloat(pollingIntervalSeconds);
    if (isNaN(intervalSeconds) || intervalSeconds < 0) {
      toast.error('Please enter a valid polling interval (0 or greater)');
      return;
    }

    try {
      // Apply theme immediately
      setTheme(themeValue);
      
      // Update polling interval
      onPollingIntervalChange(Math.round(intervalSeconds * 1000));
      
      toast.success('Settings saved successfully!');
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings. Please try again.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Customize your chat experience.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="theme">Theme</Label>
              <Select
                value={themeValue}
                onValueChange={setThemeValue}
              >
                <SelectTrigger id="theme">
                  <SelectValue placeholder="Select theme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System Default</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Choose your preferred color scheme
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="polling">Message Polling Interval (seconds)</Label>
              <Input
                id="polling"
                type="number"
                min="0"
                step="0.5"
                placeholder="3"
                value={pollingIntervalSeconds}
                onChange={(e) => setPollingIntervalSeconds(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                How often to check for new messages (0 disables auto-refresh)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              Save Settings
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
