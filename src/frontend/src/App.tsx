import { useInternetIdentity } from './hooks/useInternetIdentity';
import { useGetCallerUserProfile } from './hooks/useUserProfile';
import { useListServers } from './hooks/useServers';
import { useIsCallerAdmin } from './hooks/useAdmin';
import { useState, useEffect } from 'react';
import LoginButton from './components/auth/LoginButton';
import ProfileSetupDialog from './components/profile/ProfileSetupDialog';
import ProfileEditorDialog from './components/profile/ProfileEditorDialog';
import SettingsDialog from './components/settings/SettingsDialog';
import FriendsDialog from './components/friends/FriendsDialog';
import InviteAcceptDialog from './components/servers/InviteAcceptDialog';
import RoomList from './components/chat/RoomList';
import MessageThread from './components/chat/MessageThread';
import ServerChatView from './components/servers/ServerChatView';
import UserAvatar from './components/profile/UserAvatar';
import ProfileName from './components/profile/ProfileName';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings, User, Users, Shield, ArrowRightLeft } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { getPrincipalDisplayName, getPrincipalInitials } from './utils/principalDisplay';
import { getSwitchIntent, clearSwitchIntent } from './utils/altAccountSwitch';
import { getPersistedUrlParameter, clearSessionParameter, clearParamFromUrl } from './utils/urlParams';
import type { UserProfile } from './backend';

function AppContent() {
  const { identity, isInitializing } = useInternetIdentity();
  const { data: userProfile, isLoading: profileLoading, isFetched } = useGetCallerUserProfile();
  const { data: servers } = useListServers();
  const { data: isAdmin = false } = useIsCallerAdmin();
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [pollingInterval, setPollingInterval] = useState(3000);
  const [pendingInviteCode, setPendingInviteCode] = useState<string | null>(null);
  const [showInviteDialog, setShowInviteDialog] = useState(false);

  const isAuthenticated = !!identity;
  const showProfileSetup = isAuthenticated && !profileLoading && isFetched && userProfile === null;

  // Clear selected server if it no longer exists
  useEffect(() => {
    if (selectedServerId && servers) {
      const serverExists = servers.some(s => s.id === selectedServerId);
      if (!serverExists) {
        setSelectedServerId(null);
      }
    }
  }, [selectedServerId, servers]);

  // Check for switch intent after authentication
  useEffect(() => {
    if (!isAuthenticated || !identity) return;

    const switchIntent = getSwitchIntent();
    if (switchIntent) {
      const currentPrincipal = identity.getPrincipal().toString();
      
      if (currentPrincipal === switchIntent) {
        // Success: switched to the intended account
        toast.success('Successfully switched to alternate account!');
        clearSwitchIntent();
      } else {
        // Mismatch: signed in with wrong account
        toast.error(
          'You signed in with a different account. Please sign out and sign in with the intended alternate account to complete the switch.',
          { duration: 8000 }
        );
        clearSwitchIntent();
      }
    }
  }, [isAuthenticated, identity]);

  // Handle invite code from URL
  useEffect(() => {
    // Check for invite code in URL (persisted through sign-in via sessionStorage)
    const inviteCode = getPersistedUrlParameter('invite');
    
    if (inviteCode) {
      if (isAuthenticated) {
        // User is authenticated, show invite dialog
        setPendingInviteCode(inviteCode);
        setShowInviteDialog(true);
      }
      // If not authenticated, the invite code is stored in sessionStorage
      // and will be picked up after sign-in
    }
  }, [isAuthenticated]);

  const handleInviteConfirm = (serverId: string) => {
    // Clear the invite code from URL and session
    clearParamFromUrl('invite');
    clearSessionParameter('invite');
    setPendingInviteCode(null);
    setShowInviteDialog(false);
    
    // Select the newly joined server
    setSelectedServerId(serverId);
    setSelectedRoomId(null);
  };

  const handleInviteCancel = () => {
    // Clear the invite code from URL and session
    clearParamFromUrl('invite');
    clearSessionParameter('invite');
    setPendingInviteCode(null);
    setShowInviteDialog(false);
  };

  if (isInitializing) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    const switchIntent = getSwitchIntent();
    const inviteCode = getPersistedUrlParameter('invite');
    
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background px-4">
        <div className="mb-8 max-w-lg">
          <img 
            src="/assets/generated/chat-logo.dim_512x512.png" 
            alt="TerrorChat Logo" 
            className="h-32 w-32 mx-auto mb-6"
          />
          <h1 className="text-4xl font-bold text-foreground mb-4 text-center">Welcome to TerrorChat</h1>
          
          {switchIntent ? (
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-6 mb-6">
              <div className="flex items-start gap-3">
                <ArrowRightLeft className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-foreground mb-2">Switching Accounts</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    You've signed out to switch to an alternate account. Please sign in again and select the intended account in Internet Identity.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Target account: <span className="font-mono">{switchIntent.slice(0, 20)}...</span>
                  </p>
                </div>
              </div>
            </div>
          ) : inviteCode ? (
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-6 mb-6">
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-foreground mb-2">Server Invitation</h3>
                  <p className="text-sm text-muted-foreground">
                    You've been invited to join a server. Sign in to accept the invitation and start chatting.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-center mb-6">
              Connect with others in real-time. Sign in to start chatting.
            </p>
          )}
          
          <div className="bg-card border border-border rounded-lg p-6 mb-6">
            <div className="flex items-start gap-3 mb-4">
              <Shield className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-foreground mb-2">Secure Authentication</h3>
                <p className="text-sm text-muted-foreground">
                  TerrorChat uses Internet Identity for secure, passwordless authentication. Your session persists on this device until you sign out.
                </p>
              </div>
            </div>
            <ul className="text-sm text-muted-foreground space-y-2 ml-8">
              <li>• No passwords to remember</li>
              <li>• Your account stays signed in across page reloads</li>
              <li>• Sign out anytime to clear your local session</li>
            </ul>
          </div>
        </div>
        <LoginButton />
      </div>
    );
  }

  // Create fallback profile for header display when profile is missing/loading/errored
  const principalString = identity?.getPrincipal().toString() || '';
  const fallbackProfile: UserProfile = {
    name: getPrincipalDisplayName(principalString),
    bio: '',
    avatarType: 'default',
    color: '#FFFFFF',
    backgroundColor: '#9333EA',
    textOverlays: getPrincipalInitials(principalString),
    profilePicture: undefined,
  };

  // Use actual profile if available, otherwise use fallback
  const displayProfile = userProfile || fallbackProfile;
  const displayName = userProfile ? <ProfileName profile={userProfile} /> : fallbackProfile.name;

  // Handle room selection (clears server selection)
  const handleSelectRoom = (roomId: string | null) => {
    setSelectedRoomId(roomId);
    setSelectedServerId(null);
  };

  // Handle server selection (clears room selection)
  const handleSelectServer = (serverId: string | null) => {
    setSelectedServerId(serverId);
    setSelectedRoomId(null);
  };

  // Find selected server and check ownership
  const selectedServer = servers?.find(s => s.id === selectedServerId);
  const isServerOwner = selectedServer && identity 
    ? selectedServer.owner.toString() === identity.getPrincipal().toString()
    : false;

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="/assets/generated/chat-logo.dim_512x512.png" 
              alt="TerrorChat Logo" 
              className="h-10 w-10"
            />
            <h1 className="text-2xl font-bold text-foreground">TerrorChat</h1>
          </div>
          <div className="flex items-center gap-4">
            {/* Always show identity display when authenticated */}
            <div className="flex items-center gap-2">
              <UserAvatar profile={displayProfile} size="sm" />
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Hello, <span className="font-medium text-foreground">{displayName}</span>
                </span>
                {isAdmin && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    <Shield className="h-3 w-3" />
                    Admin
                  </Badge>
                )}
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <Settings className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowProfileEditor(true)}>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowFriends(true)}>
                  <Users className="mr-2 h-4 w-4" />
                  Friends
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowSettings(true)}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <LoginButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Room List Sidebar */}
        <aside className="w-80 border-r border-border bg-card overflow-hidden flex flex-col">
          <RoomList 
            selectedRoomId={selectedRoomId} 
            onSelectRoom={handleSelectRoom}
            selectedServerId={selectedServerId}
            onSelectServer={handleSelectServer}
          />
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-hidden">
          {selectedServer ? (
            <ServerChatView 
              server={selectedServer} 
              isOwner={isServerOwner}
              pollingInterval={pollingInterval}
            />
          ) : (
            <MessageThread 
              roomId={selectedRoomId} 
              pollingInterval={pollingInterval}
            />
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-border bg-card px-6 py-3">
        <div className="flex items-center justify-center text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} Built with ❤️ using{' '}
            <a 
              href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              caffeine.ai
            </a>
          </span>
        </div>
      </footer>

      {/* Dialogs */}
      <ProfileSetupDialog open={showProfileSetup} />
      <ProfileEditorDialog 
        open={showProfileEditor} 
        onOpenChange={setShowProfileEditor}
      />
      <SettingsDialog 
        open={showSettings} 
        onOpenChange={setShowSettings}
        pollingInterval={pollingInterval}
        onPollingIntervalChange={setPollingInterval}
      />
      <FriendsDialog 
        open={showFriends} 
        onOpenChange={setShowFriends}
      />
      {pendingInviteCode && (
        <InviteAcceptDialog
          open={showInviteDialog}
          inviteCode={pendingInviteCode}
          onConfirm={handleInviteConfirm}
          onCancel={handleInviteCancel}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AppContent />
      <Toaster />
    </ThemeProvider>
  );
}
