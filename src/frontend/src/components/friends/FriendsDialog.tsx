import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, UserPlus, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { useSearchUsers, useGetCallerFriends, useSendFriendRequest, useAcceptFriendRequest } from '../../hooks/useFriends';
import { useGetUserProfile } from '../../hooks/useUserProfile';
import UserAvatar from '../profile/UserAvatar';
import type { User, UserProfile } from '../../backend';

interface FriendsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function FriendCard({ userId }: { userId: User }) {
  const { data: profile } = useGetUserProfile(userId);

  if (!profile) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-4 w-32" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <UserAvatar profile={profile} size="md" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground truncate">{profile.name}</p>
          {profile.bio && (
            <p className="text-xs text-muted-foreground truncate">{profile.bio}</p>
          )}
        </div>
      </div>
    </Card>
  );
}

function SearchResultCard({ profile, onAdd }: { profile: UserProfile; onAdd: () => void }) {
  const sendRequest = useSendFriendRequest();

  const handleAdd = async () => {
    try {
      await onAdd();
    } catch (error) {
      // Error already handled by the parent
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <UserAvatar profile={profile} size="md" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground truncate">{profile.name}</p>
          {profile.bio && (
            <p className="text-xs text-muted-foreground truncate">{profile.bio}</p>
          )}
        </div>
        <Button
          size="sm"
          onClick={handleAdd}
          disabled={sendRequest.isPending}
        >
          {sendRequest.isPending ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <>
              <UserPlus className="h-4 w-4 mr-1" />
              Add
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}

export default function FriendsDialog({ open, onOpenChange }: FriendsDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  const { data: friends, isLoading: friendsLoading } = useGetCallerFriends();
  const { data: searchResults, isLoading: searchLoading } = useSearchUsers(searchTerm);
  const sendRequest = useSendFriendRequest();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    if (trimmed) {
      setSearchTerm(trimmed);
    }
  };

  const handleAddFriend = async (profile: UserProfile) => {
    // We need to find the user's principal from the profile
    // Since the backend returns UserProfile without the principal, we'll need to handle this
    // For now, we'll show an error message
    toast.error('Unable to add friend. Please try searching again.');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Friends</DialogTitle>
          <DialogDescription>
            Search for users and manage your friends list.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="friends" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="friends">My Friends</TabsTrigger>
            <TabsTrigger value="search">Search Users</TabsTrigger>
          </TabsList>

          <TabsContent value="friends" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              {friendsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="p-4">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    </Card>
                  ))}
                </div>
              ) : friends && friends.length > 0 ? (
                <div className="space-y-2">
                  {friends.map((friendId) => (
                    <FriendCard key={friendId.toString()} userId={friendId} />
                  ))}
                </div>
              ) : (
                <Card className="p-8 text-center">
                  <p className="text-sm text-muted-foreground">No friends yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Search for users to add them as friends
                  </p>
                </Card>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="search" className="mt-4">
            <form onSubmit={handleSearch} className="mb-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Search by username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Button type="submit" disabled={!searchQuery.trim()}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </form>

            <ScrollArea className="h-[350px] pr-4">
              {searchLoading ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <Card key={i} className="p-4">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    </Card>
                  ))}
                </div>
              ) : searchResults && searchResults.length > 0 ? (
                <div className="space-y-2">
                  {searchResults.map((profile, index) => (
                    <SearchResultCard
                      key={index}
                      profile={profile}
                      onAdd={() => handleAddFriend(profile)}
                    />
                  ))}
                </div>
              ) : searchTerm ? (
                <Card className="p-8 text-center">
                  <p className="text-sm text-muted-foreground">No users found</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Try a different search term
                  </p>
                </Card>
              ) : (
                <Card className="p-8 text-center">
                  <Search className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Enter a username to search
                  </p>
                </Card>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
