import { useEffect, useRef } from 'react';
import { useRoomMessages } from '../../hooks/useRoomMessages';
import { useGetUserProfile } from '../../hooks/useUserProfile';
import UserAvatar from '../profile/UserAvatar';
import ProfileName from '../profile/ProfileName';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import MessageComposer from './MessageComposer';
import InviteToRoomDialog from './InviteToRoomDialog';
import { Button } from '@/components/ui/button';
import { UserPlus } from 'lucide-react';
import { useState } from 'react';
import type { ChatMessage } from '../../backend';

interface MessageThreadProps {
  roomId: string | null;
  pollingInterval?: number;
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const { data: profile } = useGetUserProfile(message.sender);
  
  // Always render with fallback - don't wait for profile
  const displayName = profile?.name || message.sender.toString().slice(0, 8) + '...';
  const timestamp = new Date(Number(message.timestamp) / 1000000);
  
  return (
    <div className="mb-4 px-4">
      <div className="flex items-start gap-3">
        {profile ? (
          <UserAvatar profile={profile} size="sm" />
        ) : (
          <div className="flex-shrink-0 h-8 w-8 rounded-full bg-muted flex items-center justify-center">
            <span className="text-xs font-medium text-muted-foreground">?</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="font-medium text-sm text-foreground">
              {profile ? <ProfileName profile={profile} /> : displayName}
            </span>
            <span className="text-xs text-muted-foreground">
              {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <div className="text-sm text-foreground break-words">
            {message.content}
          </div>
          {message.image && (
            <div className="mt-2">
              <img
                src={message.image.getDirectURL()}
                alt="Message attachment"
                className="max-w-sm rounded-lg border border-border"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MessageThread({ roomId, pollingInterval = 3000 }: MessageThreadProps) {
  const { data: messages, isLoading, error } = useRoomMessages(roomId, pollingInterval);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showInviteDialog, setShowInviteDialog] = useState(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (!roomId) {
    return (
      <div className="flex h-full items-center justify-center bg-background p-8">
        <div className="text-center max-w-md">
          <img 
            src="/assets/generated/empty-chat-illustration.dim_1200x800.png" 
            alt="No room selected" 
            className="w-full max-w-sm mx-auto mb-6 opacity-60"
          />
          <h2 className="text-2xl font-semibold text-foreground mb-2">No Room Selected</h2>
          <p className="text-muted-foreground">
            Select a room from the sidebar or create a new one to start chatting.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center bg-background p-8">
        <Card className="p-6 max-w-md">
          <h3 className="text-lg font-semibold text-destructive mb-2">Error Loading Messages</h3>
          <p className="text-sm text-muted-foreground">
            {error instanceof Error ? error.message : 'Failed to load messages. Please try again.'}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Room Header */}
      <div className="border-b border-border bg-card px-6 py-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Chat Room</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowInviteDialog(true)}
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Add Friend
        </Button>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="py-4">
          {isLoading ? (
            <div className="space-y-4 px-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-start gap-3">
                  <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-16 w-full max-w-md" />
                  </div>
                </div>
              ))}
            </div>
          ) : messages && messages.length > 0 ? (
            messages.map((message) => (
              <MessageBubble key={message.id.toString()} message={message} />
            ))
          ) : (
            <div className="flex h-full items-center justify-center p-8">
              <Card className="p-6 text-center max-w-md">
                <p className="text-sm text-muted-foreground">
                  No messages yet. Start the conversation!
                </p>
              </Card>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Message Composer */}
      <div className="border-t border-border bg-card">
        <MessageComposer roomId={roomId} />
      </div>

      {/* Invite Dialog */}
      {showInviteDialog && (
        <InviteToRoomDialog
          open={showInviteDialog}
          onOpenChange={setShowInviteDialog}
          roomId={roomId}
        />
      )}
    </div>
  );
}
