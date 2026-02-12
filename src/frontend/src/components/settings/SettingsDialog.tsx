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
import { useGetUserProfile, useGetCallerUserProfile } from '@/hooks/useUserProfile';
import { useInternetIdentity } from '@/hooks/useInternetIdentity';
import { useIsCallerAdmin, useClaimAdmin } from '@/hooks/useAdmin';
import { useListSavedServerLinks, useRemoveSavedServerLink } from '@/hooks/useSavedServerLinks';
import { useListServers } from '@/hooks/useServers';
import { useQueryClient } from '@tanstack/react-query';
import { Principal } from '@icp-sdk/core/principal';
import { setSwitchIntent } from '@/utils/altAccountSwitch';
import { Users, UserPlus, Check, X, ArrowRightLeft, Shield, Bookmark, Copy, ExternalLink, Download } from 'lucide-react';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pollingInterval: number;
  onPollingIntervalChange: (interval: number) => void;
}

function LinkedAccountItem({ principal, onSwitch, onUnlink }: { 
  principal: Principal; 
  onSwitch: (p: Principal) => void;
  onUnlink: (p: Principal) => void;
}) {
  const { data: profile } = useGetUserProfile(principal);
  
  return (
    <div className="flex items-center justify-between gap-2 p-2 rounded-md bg-accent/50">
      <span className="text-sm font-mono truncate flex-1">
        {profile?.name || principal.toString().slice(0, 20) + '...'}
      </span>
      <div className="flex gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onSwitch(principal)}
          className="gap-1 h-7 px-2"
        >
          <ArrowRightLeft className="h-3 w-3" />
          Switch
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onUnlink(principal)}
          className="gap-1 h-7 px-2 text-destructive hover:text-destructive"
        >
          <X className="h-3 w-3" />
          Unlink
        </Button>
      </div>
    </div>
  );
}

function PendingRequestItem({ requester, onAccept }: { 
  requester: Principal; 
  onAccept: (p: Principal) => void;
}) {
  const { data: profile } = useGetUserProfile(requester);
  const acceptMutation = useAcceptAltAccount();
  
  return (
    <div className="flex items-center justify-between gap-2 p-2 rounded-md bg-primary/10 border border-primary/20">
      <span className="text-sm font-mono truncate flex-1">
        {profile?.name || requester.toString().slice(0, 20) + '...'}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onAccept(requester)}
        disabled={acceptMutation.isPending}
        className="gap-1 h-7 px-2"
      >
        <Check className="h-3 w-3" />
        Accept
      </Button>
    </div>
  );
}

export default function SettingsDialog({ open, onOpenChange, pollingInterval, onPollingIntervalChange }: SettingsDialogProps) {
  const { theme, setTheme } = useTheme();
  const { clear, identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  
  const [themeValue, setThemeValue] = useState(theme || 'system');
  const [pollingIntervalSeconds, setPollingIntervalSeconds] = useState((pollingInterval / 1000).toString());
  const [newAltPrincipal, setNewAltPrincipal] = useState('');
  const [unlinkTarget, setUnlinkTarget] = useState<Principal | null>(null);
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);

  const { data: linkedAccounts = [], isLoading: linkedLoading } = useGetLinkedAltAccounts();
  const { data: pendingRequests, isLoading: pendingLoading } = useGetPendingAltRequests();
  const { data: isAdmin = false, isLoading: adminLoading } = useIsCallerAdmin();
  const { data: savedLinks = [], isLoading: savedLinksLoading } = useListSavedServerLinks();
  const { data: userServers = [] } = useListServers();
  const { data: callerProfile } = useGetCallerUserProfile();
  const linkMutation = useLinkAltAccount();
  const acceptMutation = useAcceptAltAccount();
  const unlinkMutation = useUnlinkAltAccount();
  const claimAdminMutation = useClaimAdmin();
  const removeSavedLink = useRemoveSavedServerLink();

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

  const handleClaimAdmin = async () => {
    try {
      await claimAdminMutation.mutateAsync();
      toast.success('Admin access claimed successfully!');
    } catch (error: any) {
      console.error('Failed to claim admin:', error);
      if (error.message?.includes('already exists')) {
        toast.error('An admin already exists for this application');
      } else {
        toast.error(error.message || 'Failed to claim admin access');
      }
    }
  };

  const handleCopyLink = async (code: string) => {
    const inviteUrl = `${window.location.origin}${window.location.pathname}?invite=${encodeURIComponent(code)}`;
    
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success('Link copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy link:', error);
      toast.error('Failed to copy link');
    }
  };

  const handleOpenLink = (code: string) => {
    const inviteUrl = `${window.location.origin}${window.location.pathname}?invite=${encodeURIComponent(code)}`;
    window.location.assign(inviteUrl);
  };

  const handleRemoveLink = async () => {
    if (!removeTarget) return;

    try {
      await removeSavedLink.mutateAsync(removeTarget);
      toast.success('Saved link removed successfully!');
      setRemoveTarget(null);
    } catch (error: any) {
      console.error('Failed to remove saved link:', error);
      toast.error(error.message || 'Failed to remove saved link');
    }
  };

  const handleCopyPrincipal = async () => {
    if (!identity) return;

    try {
      await navigator.clipboard.writeText(identity.getPrincipal().toString());
      toast.success('Principal copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy principal:', error);
      toast.error('Failed to copy principal');
    }
  };

  const handleExportAccountData = async () => {
    if (!identity) {
      toast.error('Not authenticated');
      return;
    }

    try {
      const accountData = {
        principal: identity.getPrincipal().toString(),
        profile: callerProfile || null,
        linkedAltAccounts: linkedAccounts.map(p => p.toString()),
        savedServerLinks: savedLinks.map(link => ({
          serverId: link.serverId,
          code: link.code,
          savedAt: link.savedAt.toString(),
        })),
        exportedAt: new Date().toISOString(),
      };

      const dataStr = JSON.stringify(accountData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `terrorchat-account-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Account data exported successfully!');
    } catch (error) {
      console.error('Failed to export account data:', error);
      toast.error('Failed to export account data');
    }
  };

  const getServerName = (serverId: string): string => {
    const server = userServers.find(s => s.id === serverId);
    return server?.name || serverId.slice(0, 20) + '...';
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
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="polling">Polling Interval (seconds)</Label>
                <Input
                  id="polling"
                  type="number"
                  min="0"
                  step="0.5"
                  value={pollingIntervalSeconds}
                  onChange={(e) => setPollingIntervalSeconds(e.target.value)}
                  placeholder="3"
                />
                <p className="text-xs text-muted-foreground">
                  How often to check for new messages (0 = disabled)
                </p>
              </div>

              <Separator />

              {/* Admin Access Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <Label className="text-base font-semibold">Admin Access</Label>
                </div>
                {adminLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    Loading admin status...
                  </div>
                ) : isAdmin ? (
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-foreground font-medium">You are an admin</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">You are not an admin</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleClaimAdmin}
                      disabled={claimAdminMutation.isPending}
                      className="gap-2"
                    >
                      {claimAdminMutation.isPending ? (
                        <>
                          <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                          Claiming...
                        </>
                      ) : (
                        <>
                          <Shield className="h-3 w-3" />
                          Claim admin access
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>

              <Separator />

              {/* Saved Server Links Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Bookmark className="h-4 w-4 text-primary" />
                  <Label className="text-base font-semibold">Saved Server Links</Label>
                </div>

                {savedLinksLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    Loading saved links...
                  </div>
                ) : savedLinks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No saved links yet.</p>
                ) : (
                  <div className="space-y-2">
                    {savedLinks.map((link) => (
                      <div key={link.code} className="flex items-center justify-between gap-2 p-2 rounded-md bg-accent/50 border border-border">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{getServerName(link.serverId)}</p>
                          <p className="text-xs text-muted-foreground font-mono truncate">{link.code}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyLink(link.code)}
                            className="h-7 px-2"
                            title="Copy link"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenLink(link.code)}
                            className="h-7 px-2"
                            title="Open link"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setRemoveTarget(link.code)}
                            className="h-7 px-2 text-destructive hover:text-destructive"
                            title="Remove"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Account Data Section */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Account Data</Label>
                
                {identity && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label className="text-sm">Principal ID</Label>
                      <div className="flex gap-2">
                        <Input
                          value={identity.getPrincipal().toString()}
                          readOnly
                          className="font-mono text-xs"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={handleCopyPrincipal}
                          className="flex-shrink-0"
                          title="Copy principal"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleExportAccountData}
                      className="gap-2 w-full"
                    >
                      <Download className="h-4 w-4" />
                      Export Account Data
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Download a JSON file containing your profile, linked accounts, and saved links.
                    </p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Alternate Accounts Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <Label className="text-base font-semibold">Alternate Accounts</Label>
                </div>

                {/* Linked Accounts */}
                {linkedLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    Loading linked accounts...
                  </div>
                ) : linkedAccounts.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Linked accounts:</p>
                    {linkedAccounts.map((principal) => (
                      <LinkedAccountItem
                        key={principal.toString()}
                        principal={principal}
                        onSwitch={handleSwitchAccount}
                        onUnlink={setUnlinkTarget}
                      />
                    ))}
                  </div>
                ) : null}

                {/* Pending Requests */}
                {pendingLoading ? null : (pendingRequests?.incoming.length ?? 0) > 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Pending requests:</p>
                    {pendingRequests!.incoming.map((request) => (
                      <PendingRequestItem
                        key={request.requester.toString()}
                        requester={request.requester}
                        onAccept={handleAcceptRequest}
                      />
                    ))}
                  </div>
                ) : null}

                {/* Link New Account */}
                <div className="space-y-2">
                  <Label htmlFor="altPrincipal" className="text-sm">Link new account</Label>
                  <div className="flex gap-2">
                    <Input
                      id="altPrincipal"
                      type="text"
                      value={newAltPrincipal}
                      onChange={(e) => setNewAltPrincipal(e.target.value)}
                      placeholder="Enter Principal ID"
                      className="font-mono text-xs"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleLinkAltAccount}
                      disabled={linkMutation.isPending || !newAltPrincipal.trim()}
                      className="gap-1 whitespace-nowrap"
                    >
                      {linkMutation.isPending ? (
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      ) : (
                        <UserPlus className="h-3 w-3" />
                      )}
                      Link
                    </Button>
                  </div>
                </div>

                {!hasAltAccounts && !linkedLoading && !pendingLoading && (
                  <p className="text-xs text-muted-foreground">
                    No linked accounts yet. Enter a Principal ID above to send a link request.
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Save Settings</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Unlink Confirmation Dialog */}
      <AlertDialog open={!!unlinkTarget} onOpenChange={(open) => !open && setUnlinkTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unlink Alternate Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unlink this alternate account? You can link it again later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnlink} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Unlink
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove Saved Link Confirmation Dialog */}
      <AlertDialog open={!!removeTarget} onOpenChange={(open) => !open && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Saved Link</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this saved server link? You can save it again later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveLink} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
