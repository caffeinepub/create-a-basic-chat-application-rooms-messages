import { useState, useRef } from 'react';
import { usePostServerAnnouncement, useDeleteServerAnnouncement, useToggleServerAnnouncementPin, useEditServerAnnouncement } from '../../hooks/useServerChat';
import { useGetUserProfile } from '../../hooks/useUserProfile';
import { useInternetIdentity } from '../../hooks/useInternetIdentity';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Send, Image as ImageIcon, Video as VideoIcon, X, MessageSquare, Trash2, Pin, PinOff, Edit2, Check, Search } from 'lucide-react';
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
import { ExternalBlob } from '../../backend';
import UserAvatar from '../profile/UserAvatar';
import ProfileName from '../profile/ProfileName';
import ProfileViewerDialog from '../profile/ProfileViewerDialog';
import EmojiPicker from '../chat/EmojiPicker';
import type { ServerAnnouncement } from '../../backend';

interface ServerAnnouncementThreadProps {
  serverId: string;
  serverName: string;
  announcements: ServerAnnouncement[];
  isLoading: boolean;
}

function AnnouncementMessage({ announcement, serverId, isOwnMessage }: { announcement: ServerAnnouncement; serverId: string; isOwnMessage: boolean }) {
  const { data: authorProfile } = useGetUserProfile(announcement.author);
  const [showProfileViewer, setShowProfileViewer] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(announcement.content);
  const deleteAnnouncement = useDeleteServerAnnouncement();
  const togglePin = useToggleServerAnnouncementPin();
  const editAnnouncement = useEditServerAnnouncement();

  const handleAuthorClick = () => {
    setShowProfileViewer(true);
  };

  const handleDelete = async () => {
    try {
      await deleteAnnouncement.mutateAsync({
        serverId,
        announcementId: announcement.id,
      });
      toast.success('Announcement deleted');
      setShowDeleteDialog(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete announcement');
    }
  };

  const handleTogglePin = async () => {
    try {
      await togglePin.mutateAsync({
        serverId,
        announcementId: announcement.id,
        pin: !announcement.isPinned,
      });
      toast.success(announcement.isPinned ? 'Announcement unpinned' : 'Announcement pinned');
    } catch (error: any) {
      toast.error(error.message || 'Failed to pin/unpin announcement');
    }
  };

  const handleEditClick = () => {
    setEditContent(announcement.content);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditContent(announcement.content);
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    const trimmedContent = editContent.trim();
    
    if (!trimmedContent) {
      toast.error('Announcement cannot be empty');
      return;
    }

    try {
      await editAnnouncement.mutateAsync({
        serverId,
        announcementId: announcement.id,
        newContent: trimmedContent,
      });
      toast.success('Announcement updated');
      setIsEditing(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to edit announcement');
    }
  };

  if (announcement.isDeleted) {
    return (
      <div className="flex gap-3 px-4 py-3 opacity-50">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-muted-foreground italic">Announcement deleted</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex gap-3 px-4 py-3 hover:bg-accent/30 transition-colors group">
        {authorProfile && (
          <button onClick={handleAuthorClick} className="shrink-0">
            <UserAvatar profile={authorProfile} size="sm" />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-1">
            {announcement.isPinned && (
              <Pin className="h-3 w-3 text-primary" />
            )}
            {authorProfile && (
              <button 
                onClick={handleAuthorClick}
                className="font-semibold text-sm text-foreground hover:underline"
              >
                <ProfileName profile={authorProfile} />
              </button>
            )}
            <span className="text-xs text-muted-foreground">
              {new Date(Number(announcement.timestamp) / 1000000).toLocaleString()}
            </span>
          </div>
          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[60px] resize-none text-sm"
                disabled={editAnnouncement.isPending}
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSaveEdit}
                  disabled={editAnnouncement.isPending || !editContent.trim()}
                  className="gap-1"
                >
                  <Check className="h-3 w-3" />
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancelEdit}
                  disabled={editAnnouncement.isPending}
                  className="gap-1"
                >
                  <X className="h-3 w-3" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              {announcement.content && (
                <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                  {announcement.content}
                </p>
              )}
              {announcement.image && (
                <img
                  src={announcement.image.getDirectURL()}
                  alt="Attachment"
                  className="mt-2 max-w-md rounded-lg border border-border"
                  loading="lazy"
                />
              )}
              {announcement.video && (
                <video
                  src={announcement.video.getDirectURL()}
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
              title="Edit announcement"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleTogglePin}
              disabled={togglePin.isPending}
              title={announcement.isPinned ? 'Unpin announcement' : 'Pin announcement'}
            >
              {announcement.isPinned ? (
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
              disabled={deleteAnnouncement.isPending}
              title="Delete announcement"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
      {authorProfile && (
        <ProfileViewerDialog
          open={showProfileViewer}
          onOpenChange={setShowProfileViewer}
          targetPrincipal={announcement.author}
        />
      )}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Announcement</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this announcement? This action cannot be undone.
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

export default function ServerAnnouncementThread({ serverId, serverName, announcements, isLoading }: ServerAnnouncementThreadProps) {
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { identity } = useInternetIdentity();
  const postAnnouncement = usePostServerAnnouncement();

  const currentUserPrincipal = identity?.getPrincipal().toString();

  // Filter announcements by search query (case-insensitive)
  const filteredAnnouncements = searchQuery.trim()
    ? announcements.filter(ann => 
        ann.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : announcements;

  // Separate pinned and unpinned announcements
  const pinnedAnnouncements = filteredAnnouncements.filter(ann => ann.isPinned && !ann.isDeleted);
  const unpinnedAnnouncements = filteredAnnouncements.filter(ann => !ann.isPinned);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Image must be less than 10MB');
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('video/')) {
        toast.error('Please select a video file');
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        toast.error('Video must be less than 50MB');
        return;
      }
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
    }
  };

  const clearAttachments = () => {
    setImageFile(null);
    setVideoFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setImagePreview(null);
    setVideoPreview(null);
    setUploadProgress(0);
    if (imageInputRef.current) imageInputRef.current.value = '';
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedContent = content.trim();
    if (!trimmedContent && !imageFile && !videoFile) {
      toast.error('Please enter a message or attach media');
      return;
    }

    try {
      let imageBlob: ExternalBlob | undefined = undefined;
      let videoBlob: ExternalBlob | undefined = undefined;

      if (imageFile) {
        const imageBytes = new Uint8Array(await imageFile.arrayBuffer());
        imageBlob = ExternalBlob.fromBytes(imageBytes).withUploadProgress((percentage) => {
          setUploadProgress(percentage);
        });
      }

      if (videoFile) {
        const videoBytes = new Uint8Array(await videoFile.arrayBuffer());
        videoBlob = ExternalBlob.fromBytes(videoBytes).withUploadProgress((percentage) => {
          setUploadProgress(percentage);
        });
      }

      await postAnnouncement.mutateAsync({
        serverId,
        content: trimmedContent,
        image: imageBlob,
        video: videoBlob,
      });

      setContent('');
      clearAttachments();
      toast.success('Announcement posted!');
    } catch (error: any) {
      console.error('Failed to post announcement:', error);
      toast.error(error.message || 'Failed to post announcement');
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newContent = content.slice(0, start) + emoji + content.slice(end);
    setContent(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 0);
  };

  return (
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
        ) : filteredAnnouncements.length === 0 ? (
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
                <p className="text-sm text-muted-foreground">No announcements yet</p>
                <p className="text-xs text-muted-foreground">Be the first to post an announcement!</p>
              </>
            )}
          </div>
        ) : (
          <div className="py-2">
            {pinnedAnnouncements.length > 0 && (
              <div className="mb-4">
                <div className="px-4 py-2 bg-primary/10 border-b border-primary/20">
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <Pin className="h-4 w-4" />
                    Pinned Announcements
                  </div>
                </div>
                {pinnedAnnouncements.map((announcement) => (
                  <AnnouncementMessage 
                    key={announcement.id.toString()} 
                    announcement={announcement}
                    serverId={serverId}
                    isOwnMessage={currentUserPrincipal === announcement.author.toString()}
                  />
                ))}
              </div>
            )}
            {unpinnedAnnouncements.map((announcement) => (
              <AnnouncementMessage 
                key={announcement.id.toString()} 
                announcement={announcement}
                serverId={serverId}
                isOwnMessage={currentUserPrincipal === announcement.author.toString()}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Composer */}
      <form onSubmit={handleSubmit} className="border-t border-border bg-card p-4">
        {(imagePreview || videoPreview) && (
          <div className="mb-3 relative inline-block">
            {imagePreview && (
              <div className="relative">
                <img src={imagePreview} alt="Preview" className="max-h-32 rounded-lg border border-border" />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                  onClick={clearAttachments}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
            {videoPreview && (
              <div className="relative">
                <video src={videoPreview} className="max-h-32 rounded-lg border border-border" controls />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                  onClick={clearAttachments}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="mt-2">
                <div className="h-1 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Uploading: {uploadProgress}%</p>
              </div>
            )}
          </div>
        )}
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={`Post an announcement in ${serverName}...`}
            className="min-h-[60px] resize-none"
            disabled={postAnnouncement.isPending}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <div className="flex flex-col gap-2">
            <EmojiPicker onSelect={handleEmojiSelect} />
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => imageInputRef.current?.click()}
              disabled={postAnnouncement.isPending || !!videoFile}
              title="Attach image"
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              onChange={handleVideoSelect}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => videoInputRef.current?.click()}
              disabled={postAnnouncement.isPending || !!imageFile}
              title="Attach video"
            >
              <VideoIcon className="h-4 w-4" />
            </Button>
            <Button
              type="submit"
              size="icon"
              disabled={postAnnouncement.isPending || (!content.trim() && !imageFile && !videoFile)}
            >
              {postAnnouncement.isPending ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
