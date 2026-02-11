import { useState, useEffect } from 'react';
import { useGetCallerUserPreferences, useSetCallerUserPreferences } from '../../hooks/useUserPreferences';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';
import { UserPreferences, ThemePreference } from '../../backend';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { data: currentPreferences } = useGetCallerUserPreferences();
  const savePreferences = useSetCallerUserPreferences();
  const { setTheme } = useTheme();
  
  const [theme, setThemeValue] = useState<ThemePreference>(ThemePreference.systemDefault);
  const [pollingInterval, setPollingInterval] = useState('3');

  useEffect(() => {
    if (currentPreferences) {
      setThemeValue(currentPreferences.theme);
      setPollingInterval((Number(currentPreferences.chatRefresh.pollingIntervalMs) / 1000).toString());
    }
  }, [currentPreferences]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const intervalSeconds = parseFloat(pollingInterval);
    if (isNaN(intervalSeconds) || intervalSeconds < 0) {
      toast.error('Please enter a valid polling interval (0 or greater)');
      return;
    }

    const preferences: UserPreferences = {
      theme: theme,
      chatRefresh: {
        pollingIntervalMs: BigInt(Math.round(intervalSeconds * 1000)),
      },
    };

    try {
      await savePreferences.mutateAsync(preferences);
      
      // Apply theme immediately
      const themeMap: Record<ThemePreference, string> = {
        [ThemePreference.light]: 'light',
        [ThemePreference.dark]: 'dark',
        [ThemePreference.systemDefault]: 'system',
      };
      setTheme(themeMap[theme]);
      
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
                value={theme}
                onValueChange={(value) => setThemeValue(value as ThemePreference)}
                disabled={savePreferences.isPending}
              >
                <SelectTrigger id="theme">
                  <SelectValue placeholder="Select theme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ThemePreference.light}>Light</SelectItem>
                  <SelectItem value={ThemePreference.dark}>Dark</SelectItem>
                  <SelectItem value={ThemePreference.systemDefault}>System Default</SelectItem>
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
                value={pollingInterval}
                onChange={(e) => setPollingInterval(e.target.value)}
                disabled={savePreferences.isPending}
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
              disabled={savePreferences.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={savePreferences.isPending}>
              {savePreferences.isPending ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Saving...
                </>
              ) : (
                'Save Settings'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
