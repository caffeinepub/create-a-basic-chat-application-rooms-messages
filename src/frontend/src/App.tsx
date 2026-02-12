import { useInternetIdentity } from './hooks/useInternetIdentity';
import { useGetCallerUserProfile } from './hooks/useUserProfile';
import { useState, useEffect } from 'react';
import LoginButton from './components/auth/LoginButton';
import ProfileSetupDialog from './components/profile/ProfileSetupDialog';
import ProfileEditorDialog from './components/profile/ProfileEditorDialog';
import SettingsDialog from './components/settings/SettingsDialog';
import FriendsDialog from './components/friends/FriendsDialog';
import RoomList from './components/chat/RoomList';
import MessageThread from './components/chat/MessageThread';
import UserAvatar from './components/profile/UserAvatar';
import ProfileName from './components/profile/ProfileName';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Settings, User, Users, Shield, ArrowRightLeft } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { getPrincipalDisplayName, getPrincipalInitials } from './utils/principalDisplay';
import { getSwitchIntent, clearSwitchIntent } from './utils/altAccountSwitch';
import type { UserProfile } from './backend';

function AppContent() {
  const { identity, isInitializing } = useInternetIdentity();
  const { data: userProfile, isLoading: profileLoading, isFetched } = useGetCallerUserProfile();
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [pollingInterval, setPollingInterval] = useState(3000);

  const isAuthenticated = !!identity;
  const showProfileSetup = isAuthenticated && !profileLoading && isFetched && userProfile === null;

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
              <span className="text-sm text-muted-foreground">
                Hello, <span className="font-medium text-foreground">{displayName}</span>
              </span>
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
            onSelectRoom={setSelectedRoomId} 
          />
        </aside>

        {/* Message Thread */}
        <main className="flex-1 overflow-hidden">
          <MessageThread roomId={selectedRoomId} pollingInterval={pollingInterval} />
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-border bg-card px-6 py-3">
        <p className="text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} TerrorChat · Built with love using{' '}
          <a 
            href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            caffeine.ai
          </a>
        </p>
      </footer>

      {/* Profile Setup Dialog */}
      {showProfileSetup && <ProfileSetupDialog />}
      
      {/* Profile Editor Dialog - now opens even when profile is null */}
      <ProfileEditorDialog 
        open={showProfileEditor} 
        onOpenChange={setShowProfileEditor}
      />

      {/* Settings Dialog */}
      {showSettings && (
        <SettingsDialog 
          open={showSettings} 
          onOpenChange={setShowSettings}
          pollingInterval={pollingInterval}
          onPollingIntervalChange={setPollingInterval}
        />
      )}

      {/* Friends Dialog */}
      {showFriends && (
        <FriendsDialog 
          open={showFriends} 
          onOpenChange={setShowFriends}
        />
      )}

      <Toaster />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem themes={['light', 'dark', 'black', 'system']}>
      <AppContent />
    </ThemeProvider>
  );
}
