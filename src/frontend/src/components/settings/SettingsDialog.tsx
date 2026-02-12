import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';
import { useGetLinkedAltAccounts, useGetPendingAltRequests, useLinkAltAccount, useAcceptAltAccount, useUnlinkAltAccount } from '@/hooks/useAltAccounts';
import { useGetUserProfile } from '@/hooks/useUserProfile';
import { useInternetIdentity } from '@/hooks/useInternetIdentity';
import { useQueryClient } from '@tanstack/react-query';
import { Principal } from '@icp-sdk/core/principal';
import { setSwitchIntent } from '@/utils/altAccountSwitch';
import { Users, UserPlus, Check, X, ArrowRightLeft } from 'lucide-react';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pollingInterval: number;
  onPollingIntervalChange: (interval: number) => void;
}

export default function SettingsDialog({ open, onOpenChange, pollingInterval, onPollingIntervalChange }: SettingsDialogProps) {
  const { theme, setTheme } = useTheme();
  const { clear } = useInternetIdentity();
  const queryClient = useQueryClient();
  
  const [themeValue, setThemeValue] = useState(theme || 'system');
  const [pollingIntervalSeconds, setPollingIntervalSeconds] = useState((pollingInterval / 1000).toString());
  const [newAltPrincipal, setNewAltPrincipal] = useState('');
  const [unlinkTarget, setUnlinkTarget] = useState<Principal | null>(null);

  const { data: linkedAccounts = [], isLoading: linkedLoading } = useGetLinkedAltAccounts();
  const { data: pendingRequests, isLoading: pendingLoading } = useGetPendingAltRequests();
  const linkMutation = useLinkAltAccount();
  const acceptMutation = useAcceptAltAccount();
  const unlinkMutation = useUnlinkAltAccount();

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

  const handleLinkAltAccount = async () => {
    if (!newAltPrincipal.trim()) {
      toast.error('Please enter a principal ID');
      return;
    }

    try {
      const principal = Principal.fromText(newAltPrincipal.trim());
      await linkMutation.mutateAsync(principal);
      toast.success('Link request sent successfully!');
      setNewAltPrincipal('');
    } catch (error: any) {
      console.error('Failed to link alt account:', error);
      if (error.message?.includes('Invalid principal')) {
        toast.error('Invalid principal ID format');
      } else if (error.message?.includes('link to self')) {
        toast.error('Cannot link to your own account');
      } else if (error.message?.includes('already linked')) {
        toast.error('Accounts are already linked');
      } else {
        toast.error(error.message || 'Failed to send link request');
      }
    }
  };

  const handleAcceptRequest = async (requester: Principal) => {
    try {
      await acceptMutation.mutateAsync(requester);
      toast.success('Alternate account linked successfully!');
    } catch (error: any) {
      console.error('Failed to accept request:', error);
      toast.error(error.message || 'Failed to accept link request');
    }
  };

  const handleUnlink = async () => {
    if (!unlinkTarget) return;

    try {
      await unlinkMutation.mutateAsync(unlinkTarget);
      toast.success('Alternate account unlinked successfully!');
      setUnlinkTarget(null);
    } catch (error: any) {
      console.error('Failed to unlink account:', error);
      toast.error(error.message || 'Failed to unlink account');
    }
  };

  const handleSwitchAccount = async (targetPrincipal: Principal) => {
    try {
      // Store the switch intent
      setSwitchIntent(targetPrincipal.toString());
      
      // Sign out and clear cache
      await clear();
      queryClient.clear();
      
      // Close dialog
      onOpenChange(false);
      
      // Show toast with instructions
      toast.info('Signed out. Please sign in with your alternate account.');
    } catch (error) {
      console.error('Failed to switch account:', error);
      toast.error('Failed to switch account. Please try again.');
    }
  };

  const hasAltAccounts = linkedAccounts.length > 0 || (pendingRequests?.incoming.length ?? 0) > 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription>
              Customize your chat experience.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-6 py-4">
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
                    <SelectItem value="black">Black</SelectItem>
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

              <Separator />

              {/* Alternate Accounts Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <h3 className="text-lg font-semibold">Alternate Accounts</h3>
                </div>

                {/* Linked Accounts */}
                {linkedLoading ? (
                  <div className="text-sm text-muted-foreground">Loading linked accounts...</div>
                ) : linkedAccounts.length > 0 ? (
                  <div className="space-y-2">
                    <Label>Linked Accounts</Label>
                    <div className="space-y-2">
                      {linkedAccounts.map((principal) => (
                        <LinkedAccountItem
                          key={principal.toString()}
                          principal={principal}
                          onSwitch={handleSwitchAccount}
                          onUnlink={setUnlinkTarget}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* Pending Incoming Requests */}
                {pendingLoading ? (
                  <div className="text-sm text-muted-foreground">Loading pending requests...</div>
                ) : (pendingRequests?.incoming.length ?? 0) > 0 ? (
                  <div className="space-y-2">
                    <Label>Pending Requests</Label>
                    <div className="space-y-2">
                      {pendingRequests!.incoming.map((request) => (
                        <PendingRequestItem
                          key={request.requester.toString()}
                          request={request}
                          onAccept={handleAcceptRequest}
                          isAccepting={acceptMutation.isPending}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* Empty State */}
                {!linkedLoading && !pendingLoading && !hasAltAccounts && (
                  <p className="text-sm text-muted-foreground">
                    No linked accounts yet. Link an alternate account to switch between them.
                  </p>
                )}

                {/* Link New Account */}
                <div className="space-y-2">
                  <Label htmlFor="altPrincipal">Link Alternate Account</Label>
                  <div className="flex gap-2">
                    <Input
                      id="altPrincipal"
                      placeholder="Enter principal ID"
                      value={newAltPrincipal}
                      onChange={(e) => setNewAltPrincipal(e.target.value)}
                      disabled={linkMutation.isPending}
                    />
                    <Button
                      type="button"
                      size="icon"
                      onClick={handleLinkAltAccount}
                      disabled={linkMutation.isPending || !newAltPrincipal.trim()}
                    >
                      {linkMutation.isPending ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        <UserPlus className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Send a link request to another account you own
                  </p>
                </div>
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

      {/* Unlink Confirmation Dialog */}
      <AlertDialog open={!!unlinkTarget} onOpenChange={(open) => !open && setUnlinkTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unlink Alternate Account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the link between your accounts. You can always link them again later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnlink} disabled={unlinkMutation.isPending}>
              {unlinkMutation.isPending ? 'Unlinking...' : 'Unlink'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function LinkedAccountItem({ 
  principal, 
  onSwitch, 
  onUnlink 
}: { 
  principal: Principal; 
  onSwitch: (p: Principal) => void; 
  onUnlink: (p: Principal) => void;
}) {
  const { data: profile } = useGetUserProfile(principal);
  const displayName = profile?.name || principal.toString().slice(0, 10) + '...';

  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{displayName}</p>
        <p className="text-xs text-muted-foreground truncate">{principal.toString()}</p>
      </div>
      <div className="flex gap-2 ml-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onSwitch(principal)}
          className="gap-1"
        >
          <ArrowRightLeft className="h-3 w-3" />
          Switch
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => onUnlink(principal)}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

function PendingRequestItem({ 
  request, 
  onAccept,
  isAccepting 
}: { 
  request: { requester: Principal }; 
  onAccept: (p: Principal) => void;
  isAccepting: boolean;
}) {
  const { data: profile } = useGetUserProfile(request.requester);
  const displayName = profile?.name || request.requester.toString().slice(0, 10) + '...';

  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{displayName}</p>
        <p className="text-xs text-muted-foreground truncate">{request.requester.toString()}</p>
      </div>
      <Button
        type="button"
        size="sm"
        onClick={() => onAccept(request.requester)}
        disabled={isAccepting}
        className="gap-1 ml-2"
      >
        {isAccepting ? (
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          <Check className="h-3 w-3" />
        )}
        Accept
      </Button>
    </div>
  );
}
