import { useEffect, useRef } from 'react';
import { useRoomMessages } from '../../hooks/useRoomMessages';
import { useGetUserProfile } from '../../hooks/useUserProfile';
import UserAvatar from '../profile/UserAvatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import MessageComposer from './MessageComposer';
import type { Message } from '../../backend';

interface MessageThreadProps {
  roomId: string | null;
  pollingInterval?: number;
}

function MessageBubble({ message }: { message: Message }) {
  const { data: profile } = useGetUserProfile(message.sender);
  
  const displayName = profile?.name || message.sender.toString().slice(0, 8) + '...';
  const timestamp = new Date(Number(message.timestamp) / 1000000);
  
  return (
    <div className="mb-4 px-4">
      <div className="flex items-start gap-3">
        {profile ? (
          <UserAvatar profile={profile} size="md" />
        ) : (
          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-medium text-primary">
              {displayName.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="font-medium text-foreground text-sm">{displayName}</span>
            <span className="text-xs text-muted-foreground">
              {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <div className="bg-card border border-border rounded-lg px-4 py-2">
            <p className="text-sm text-foreground whitespace-pre-wrap break-words">{message.content}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MessageThread({ roomId, pollingInterval = 3000 }: MessageThreadProps) {
  const { data: messages, isLoading, isError } = useRoomMessages(roomId, pollingInterval);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef(0);

  useEffect(() => {
    if (messages && messages.length > prevMessagesLengthRef.current) {
      // Auto-scroll to bottom when new messages arrive
      if (scrollRef.current) {
        const scrollElement = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollElement) {
          scrollElement.scrollTop = scrollElement.scrollHeight;
        }
      }
    }
    prevMessagesLengthRef.current = messages?.length || 0;
  }, [messages]);

  if (!roomId) {
    return (
      <div className="flex h-full items-center justify-center bg-background p-8">
        <div className="text-center max-w-md">
          <img 
            src="/assets/generated/empty-chat-illustration.dim_1200x800.png" 
            alt="No room selected" 
            className="w-full max-w-sm mx-auto mb-6 opacity-80"
          />
          <h2 className="text-2xl font-bold text-foreground mb-2">No Room Selected</h2>
          <p className="text-muted-foreground">
            Select a room from the sidebar or create a new one to start chatting
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Messages */}
      <ScrollArea ref={scrollRef} className="flex-1">
        <div className="py-4">
          {isLoading ? (
            <div className="space-y-4 px-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-start gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : isError ? (
            <Card className="mx-4 p-6 text-center">
              <p className="text-sm text-destructive">Failed to load messages</p>
              <p className="text-xs text-muted-foreground mt-1">Please try again</p>
            </Card>
          ) : messages && messages.length > 0 ? (
            messages.map((message) => (
              <MessageBubble key={message.id.toString()} message={message} />
            ))
          ) : (
            <div className="flex h-full items-center justify-center p-8">
              <div className="text-center max-w-md">
                <img 
                  src="/assets/generated/empty-chat-illustration.dim_1200x800.png" 
                  alt="No messages" 
                  className="w-full max-w-xs mx-auto mb-4 opacity-60"
                />
                <p className="text-muted-foreground">No messages yet</p>
                <p className="text-sm text-muted-foreground mt-1">Be the first to say something!</p>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Message Composer */}
      <div className="border-t border-border bg-card">
        <MessageComposer roomId={roomId} />
      </div>
    </div>
  );
}
