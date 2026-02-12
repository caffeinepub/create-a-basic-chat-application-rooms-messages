import { useInternetIdentity } from './hooks/useInternetIdentity';
import { useGetCallerUserProfile } from './hooks/useUserProfile';
import { useState } from 'react';
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
import { Button } from '@/components/ui/button';
import { Settings, User, Users } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

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
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background px-4">
        <div className="mb-8">
          <img 
            src="/assets/generated/chat-logo.dim_512x512.png" 
            alt="Tchat Logo" 
            className="h-32 w-32 mx-auto mb-6"
          />
          <h1 className="text-4xl font-bold text-foreground mb-2 text-center">Welcome to Tchat</h1>
          <p className="text-muted-foreground text-center max-w-md">
            Connect with others in real-time. Sign in to start chatting.
          </p>
        </div>
        <LoginButton />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="/assets/generated/chat-logo.dim_512x512.png" 
              alt="Tchat Logo" 
              className="h-10 w-10"
            />
            <h1 className="text-2xl font-bold text-foreground">Tchat</h1>
          </div>
          <div className="flex items-center gap-4">
            {userProfile && (
              <div className="flex items-center gap-2">
                <UserAvatar profile={userProfile} size="sm" />
                <span className="text-sm text-muted-foreground">
                  Hello, <span className="font-medium text-foreground"><ProfileName profile={userProfile} /></span>
                </span>
              </div>
            )}
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
          © {new Date().getFullYear()} · Built with ❤️ using{' '}
          <a
            href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground hover:underline font-medium"
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
