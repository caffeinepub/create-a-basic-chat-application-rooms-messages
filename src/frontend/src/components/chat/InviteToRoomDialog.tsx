import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { useGetCallerFriends } from '../../hooks/useFriends';
import { useAddUserToRoom } from '../../hooks/useRoomMembers';
import { useGetUserProfile } from '../../hooks/useUserProfile';
import UserAvatar from '../profile/UserAvatar';
import ProfileName from '../profile/ProfileName';
import type { User } from '../../backend';

interface InviteToRoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomId: string;
}

function FriendInviteCard({ userId, roomId, onSuccess }: { userId: User; roomId: string; onSuccess: () => void }) {
  const { data: profile, isLoading, isFetched } = useGetUserProfile(userId);
  const addUser = useAddUserToRoom();

  const handleInvite = async () => {
    try {
      await addUser.mutateAsync({ roomId, userId });
      const displayName = profile?.name || 'User';
      toast.success(`${displayName} added to room!`);
      onSuccess();
    } catch (error: any) {
      console.error('Failed to add user to room:', error);
      const errorMessage = error?.message || 'Failed to add user to room';
      toast.error(errorMessage);
    }
  };

  // Show skeleton only while loading
  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-4 w-32" />
        </div>
      </Card>
    );
  }

  // Show fallback when profile is null or fetch failed
  if (!profile && isFetched) {
    const principalSnippet = userId.toString().slice(0, 8) + '...';
    return (
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-muted flex items-center justify-center">
            <span className="text-sm font-medium text-muted-foreground">?</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground truncate">Unknown user</p>
            <p className="text-xs text-muted-foreground truncate">{principalSnippet}</p>
          </div>
          <Button
            size="sm"
            onClick={handleInvite}
            disabled={addUser.isPending}
          >
            {addUser.isPending ? (
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

  // Show profile when available
  if (profile) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <UserAvatar profile={profile} size="md" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground truncate">
              <ProfileName profile={profile} />
            </p>
            {profile.bio && (
              <p className="text-xs text-muted-foreground truncate">{profile.bio}</p>
            )}
          </div>
          <Button
            size="sm"
            onClick={handleInvite}
            disabled={addUser.isPending}
          >
            {addUser.isPending ? (
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

  return null;
}

export default function InviteToRoomDialog({ open, onOpenChange, roomId }: InviteToRoomDialogProps) {
  const { data: friends, isLoading } = useGetCallerFriends();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Friend to Room</DialogTitle>
          <DialogDescription>
            Select a friend to add to this chat room.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[400px] pr-4">
          {isLoading ? (
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
                <FriendInviteCard
                  key={friendId.toString()}
                  userId={friendId}
                  roomId={roomId}
                  onSuccess={() => onOpenChange(false)}
                />
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <p className="text-sm text-muted-foreground">No friends yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Add friends first to invite them to rooms
              </p>
            </Card>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
