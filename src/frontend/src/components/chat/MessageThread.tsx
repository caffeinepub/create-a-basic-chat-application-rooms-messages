import { useState } from 'react';
import { useGetRoomMessages, useDeleteRoomMessage, useToggleRoomMessagePin, useEditRoomMessage } from '../../hooks/useRoomMessages';
import { useGetRoom } from '../../hooks/useChatRooms';
import { useGetUserProfile } from '../../hooks/useUserProfile';
import { useInternetIdentity } from '../../hooks/useInternetIdentity';
import { useRoomPresenceHeartbeat } from '../../hooks/useRoomPresence';
import MessageComposer from './MessageComposer';
import InviteToRoomDialog from './InviteToRoomDialog';
import ProfileViewerDialog from '../profile/ProfileViewerDialog';
import VoicePanel from '../voice/VoicePanel';
import RoomMemberListPanel from './RoomMemberListPanel';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { MessageSquare, Mic, UserPlus, Trash2, Pin, PinOff, Edit2, Check, X, Search } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import UserAvatar from '../profile/UserAvatar';
import ProfileName from '../profile/ProfileName';
import type { ChatMessage } from '../../backend';

interface MessageThreadProps {
  roomId: string | null;
  pollingInterval: number;
}

function Message({ message, isOwnMessage }: { message: ChatMessage; isOwnMessage: boolean }) {
  const { data: senderProfile } = useGetUserProfile(message.sender);
  const [showProfileViewer, setShowProfileViewer] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const deleteMessage = useDeleteRoomMessage();
  const togglePin = useToggleRoomMessagePin();
  const editMessage = useEditRoomMessage();

  const handleSenderClick = () => {
    setShowProfileViewer(true);
  };

  const handleDelete = async () => {
    try {
      await deleteMessage.mutateAsync({
        roomId: message.roomId,
        messageId: message.id,
      });
      toast.success('Message deleted');
      setShowDeleteDialog(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete message');
    }
  };

  const handleTogglePin = async () => {
    try {
      await togglePin.mutateAsync({
        roomId: message.roomId,
        messageId: message.id,
        pin: !message.isPinned,
      });
      toast.success(message.isPinned ? 'Message unpinned' : 'Message pinned');
    } catch (error: any) {
      toast.error(error.message || 'Failed to pin/unpin message');
    }
  };

  const handleEditClick = () => {
    setEditContent(message.content);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditContent(message.content);
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    const trimmedContent = editContent.trim();
    
    if (!trimmedContent) {
      toast.error('Message cannot be empty');
      return;
    }

    try {
      await editMessage.mutateAsync({
        roomId: message.roomId,
        messageId: message.id,
        newContent: trimmedContent,
      });
      toast.success('Message updated');
      setIsEditing(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to edit message');
    }
  };

  if (message.isDeleted) {
    return (
      <div className="flex gap-3 px-4 py-3 opacity-50">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-muted-foreground italic">Message deleted</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex gap-3 px-4 py-3 hover:bg-accent/30 transition-colors group">
        {senderProfile && (
          <button onClick={handleSenderClick} className="flex-shrink-0">
            <UserAvatar profile={senderProfile} size="sm" />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-1">
            {message.isPinned && (
              <Pin className="h-3 w-3 text-primary" />
            )}
            {senderProfile && (
              <button 
                onClick={handleSenderClick}
                className="font-semibold text-sm text-foreground hover:underline"
              >
                <ProfileName profile={senderProfile} />
              </button>
            )}
            <span className="text-xs text-muted-foreground">
              {new Date(Number(message.timestamp) / 1000000).toLocaleString()}
            </span>
          </div>
          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[60px] resize-none text-sm"
                disabled={editMessage.isPending}
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSaveEdit}
                  disabled={editMessage.isPending || !editContent.trim()}
                  className="gap-1"
                >
                  <Check className="h-3 w-3" />
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancelEdit}
                  disabled={editMessage.isPending}
                  className="gap-1"
                >
                  <X className="h-3 w-3" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              {message.content && (
                <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                  {message.content}
                </p>
              )}
              {message.image && (
                <img
                  src={message.image.getDirectURL()}
                  alt="Attachment"
                  className="mt-2 max-w-md rounded-lg border border-border"
                  loading="lazy"
                />
              )}
              {message.video && (
                <video
                  src={message.video.getDirectURL()}
                  controls
                  className="mt-2 max-w-md rounded-lg border border-border"
                  preload="metadata"
                />
              )}
            </>
          )}
        </div>
        {isOwnMessage && !isEditing && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleEditClick}
              title="Edit message"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleTogglePin}
              disabled={togglePin.isPending}
              title={message.isPinned ? 'Unpin message' : 'Pin message'}
            >
              {message.isPinned ? (
                <PinOff className="h-4 w-4" />
              ) : (
                <Pin className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => setShowDeleteDialog(true)}
              disabled={deleteMessage.isPending}
              title="Delete message"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
      {senderProfile && (
        <ProfileViewerDialog
          open={showProfileViewer}
          onOpenChange={setShowProfileViewer}
          targetPrincipal={message.sender}
        />
      )}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Message</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this message? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function MessageThread({ roomId, pollingInterval }: MessageThreadProps) {
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { data: room } = useGetRoom(roomId);
  const { data: messages = [], isLoading, isError } = useGetRoomMessages(roomId, pollingInterval);
  const { identity } = useInternetIdentity();

  // Set up presence heartbeat for the current room
  useRoomPresenceHeartbeat(roomId, 30000);

  const currentUserPrincipal = identity?.getPrincipal().toString();

  // Filter messages by search query (case-insensitive)
  const filteredMessages = searchQuery.trim()
    ? messages.filter(msg => 
        msg.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : messages;

  // Separate pinned and unpinned messages
  const pinnedMessages = filteredMessages.filter(msg => msg.isPinned && !msg.isDeleted);
  const unpinnedMessages = filteredMessages.filter(msg => !msg.isPinned);

  if (!roomId) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <div className="text-center max-w-md px-4">
          <img 
            src="/assets/generated/terrorchat-empty-state.dim_1200x800.png" 
            alt="No room selected" 
            className="w-full max-w-sm mx-auto mb-6 opacity-50"
          />
          <h2 className="text-2xl font-bold text-foreground mb-2">Welcome to TerrorChat</h2>
          <p className="text-muted-foreground">
            Select a room or server from the sidebar to start chatting, or create a new one to get started.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-background">
      <div className="flex-1 flex flex-col min-w-0">
        <Tabs defaultValue="chat" className="flex-1 flex flex-col">
          <div className="border-b border-border bg-card px-4">
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="chat" className="gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Chat
                </TabsTrigger>
                <TabsTrigger value="voice" className="gap-2">
                  <Mic className="h-4 w-4" />
                  Voice
                </TabsTrigger>
              </TabsList>
              {room && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowInviteDialog(true)}
                  className="gap-2"
                >
                  <UserPlus className="h-4 w-4" />
                  Add Friend
                </Button>
              )}
            </div>
          </div>

          <TabsContent value="chat" className="flex-1 flex flex-col m-0">
            <div className="flex-1 flex flex-col min-h-0">
              {/* Search Bar */}
              <div className="px-4 py-3 border-b border-border bg-card">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search messages..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <ScrollArea className="flex-1">
                {isLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                  </div>
                ) : isError ? (
                  <div className="flex items-center justify-center h-32">
                    <p className="text-sm text-destructive">Failed to load messages</p>
                  </div>
                ) : filteredMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-center px-4">
                    {searchQuery.trim() ? (
                      <>
                        <Search className="h-12 w-12 text-muted-foreground mb-3" />
                        <p className="text-sm text-muted-foreground">No messages found</p>
                        <p className="text-xs text-muted-foreground">Try a different search term</p>
                      </>
                    ) : (
                      <>
                        <MessageSquare className="h-12 w-12 text-muted-foreground mb-3" />
                        <p className="text-sm text-muted-foreground">No messages yet</p>
                        <p className="text-xs text-muted-foreground">Be the first to send a message!</p>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="py-2">
                    {pinnedMessages.length > 0 && (
                      <div className="mb-4">
                        <div className="px-4 py-2 bg-primary/10 border-b border-primary/20">
                          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                            <Pin className="h-4 w-4" />
                            Pinned Messages
                          </div>
                        </div>
                        {pinnedMessages.map((message) => (
                          <Message 
                            key={message.id.toString()} 
                            message={message}
                            isOwnMessage={currentUserPrincipal === message.sender.toString()}
                          />
                        ))}
                      </div>
                    )}
                    {unpinnedMessages.map((message) => (
                      <Message 
                        key={message.id.toString()} 
                        message={message}
                        isOwnMessage={currentUserPrincipal === message.sender.toString()}
                      />
                    ))}
                  </div>
                )}
              </ScrollArea>
              <MessageComposer roomId={roomId} />
            </div>
          </TabsContent>

          <TabsContent value="voice" className="flex-1 m-0">
            <VoicePanel roomId={roomId} pollingInterval={pollingInterval} />
          </TabsContent>
        </Tabs>

        {room && (
          <InviteToRoomDialog
            open={showInviteDialog}
            onOpenChange={setShowInviteDialog}
            roomId={room.id}
          />
        )}
      </div>

      {/* Right-side member list panel */}
      <RoomMemberListPanel roomId={roomId} pollingInterval={pollingInterval} />
    </div>
  );
}
