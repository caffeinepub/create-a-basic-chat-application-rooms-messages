import { useState } from 'react';
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
import ProfileViewerDialog from '../profile/ProfileViewerDialog';
import type { User } from '../../backend';

interface InviteToRoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomId: string;
}

function FriendInviteCard({ userId, roomId, onSuccess }: { userId: User; roomId: string; onSuccess: () => void }) {
  const { data: profile, isLoading, isFetched } = useGetUserProfile(userId);
  const addUserToRoom = useAddUserToRoom();
  const [showProfileViewer, setShowProfileViewer] = useState(false);

  const handleInvite = async () => {
    try {
      await addUserToRoom.mutateAsync({ roomId, userId });
      toast.success('Friend added to room');
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add friend to room');
    }
  };

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-4 w-32 flex-1" />
          <Skeleton className="h-9 w-20" />
        </div>
      </Card>
    );
  }

  if (!profile && isFetched) {
    const principalSnippet = userId.toString().slice(0, 8) + '...';
    return (
      <>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowProfileViewer(true)}
              className="flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-primary rounded-full"
            >
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                <span className="text-sm font-medium text-muted-foreground">?</span>
              </div>
            </button>
            <div className="flex-1 min-w-0">
              <button
                onClick={() => setShowProfileViewer(true)}
                className="font-medium text-foreground truncate hover:underline focus:outline-none focus:underline text-left"
              >
                Unknown user
              </button>
              <p className="text-xs text-muted-foreground truncate">{principalSnippet}</p>
            </div>
            <Button
              size="sm"
              onClick={handleInvite}
              disabled={addUserToRoom.isPending}
            >
              {addUserToRoom.isPending ? (
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
        {showProfileViewer && (
          <ProfileViewerDialog
            open={showProfileViewer}
            onOpenChange={setShowProfileViewer}
            targetPrincipal={userId}
          />
        )}
      </>
    );
  }

  if (profile) {
    return (
      <>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowProfileViewer(true)}
              className="flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-primary rounded-full"
            >
              <UserAvatar profile={profile} size="md" />
            </button>
            <div className="flex-1 min-w-0">
              <button
                onClick={() => setShowProfileViewer(true)}
                className="font-medium text-foreground truncate hover:underline focus:outline-none focus:underline text-left"
              >
                <ProfileName profile={profile} />
              </button>
              {profile.bio && (
                <p className="text-xs text-muted-foreground truncate">{profile.bio}</p>
              )}
            </div>
            <Button
              size="sm"
              onClick={handleInvite}
              disabled={addUserToRoom.isPending}
            >
              {addUserToRoom.isPending ? (
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
        {showProfileViewer && (
          <ProfileViewerDialog
            open={showProfileViewer}
            onOpenChange={setShowProfileViewer}
            targetPrincipal={userId}
          />
        )}
      </>
    );
  }

  return null;
}

export default function InviteToRoomDialog({ open, onOpenChange, roomId }: InviteToRoomDialogProps) {
  const { data: friends, isLoading } = useGetCallerFriends();

  const handleSuccess = () => {
    // Keep dialog open so user can add more friends
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Friends to Room</DialogTitle>
          <DialogDescription>
            Select friends to invite to this chat room. Click on a friend to view their profile.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[400px] pr-4">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="p-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <Skeleton className="h-4 w-32 flex-1" />
                    <Skeleton className="h-9 w-20" />
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
                  onSuccess={handleSuccess}
                />
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <p className="text-sm text-muted-foreground">No friends to invite</p>
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
