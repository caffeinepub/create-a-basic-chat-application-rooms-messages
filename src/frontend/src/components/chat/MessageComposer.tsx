import { useState, useRef } from 'react';
import { usePostMessage } from '../../hooks/useRoomMessages';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Image as ImageIcon, Video as VideoIcon, X } from 'lucide-react';
import { toast } from 'sonner';
import { ExternalBlob } from '../../backend';
import EmojiPicker from './EmojiPicker';

interface MessageComposerProps {
  roomId: string;
}

export default function MessageComposer({ roomId }: MessageComposerProps) {
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const postMessage = usePostMessage();

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (including GIF)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be smaller than 10MB');
      return;
    }

    setImageFile(file);
    setVideoFile(null);
    setVideoPreview(null);
    
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      toast.error('Please select a video file');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast.error('Video must be smaller than 50MB');
      return;
    }

    setVideoFile(file);
    setImageFile(null);
    setImagePreview(null);
    
    const reader = new FileReader();
    reader.onload = (e) => setVideoPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const clearAttachment = () => {
    setImageFile(null);
    setVideoFile(null);
    setImagePreview(null);
    setVideoPreview(null);
    if (imageInputRef.current) imageInputRef.current.value = '';
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  const handleEmojiSelect = (emoji: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setContent((prev) => prev + emoji);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = content;
    const before = text.substring(0, start);
    const after = text.substring(end);
    const newContent = before + emoji + after;
    
    setContent(newContent);
    
    // Set cursor position after emoji
    setTimeout(() => {
      textarea.focus();
      const newPosition = start + emoji.length;
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedContent = content.trim();
    if (!trimmedContent && !imageFile && !videoFile) {
      toast.error('Please enter a message or attach an image/video');
      return;
    }

    try {
      let imageBlob: ExternalBlob | undefined;
      let videoBlob: ExternalBlob | undefined;

      if (imageFile) {
        const arrayBuffer = await imageFile.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        imageBlob = ExternalBlob.fromBytes(bytes).withUploadProgress((percentage) => {
          setUploadProgress(percentage);
        });
      }

      if (videoFile) {
        const arrayBuffer = await videoFile.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        videoBlob = ExternalBlob.fromBytes(bytes).withUploadProgress((percentage) => {
          setUploadProgress(percentage);
        });
      }

      await postMessage.mutateAsync({
        roomId,
        content: trimmedContent,
        image: imageBlob,
        video: videoBlob,
      });

      setContent('');
      clearAttachment();
      setUploadProgress(null);
    } catch (error: any) {
      console.error('Failed to send message:', error);
      setUploadProgress(null);
      toast.error(error.message || 'Failed to send message');
    }
  };

  const isDisabled = postMessage.isPending || uploadProgress !== null;

  return (
    <form onSubmit={handleSubmit} className="border-t border-border bg-card p-4">
      {(imagePreview || videoPreview) && (
        <div className="mb-2 relative inline-block">
          {imagePreview && (
            <img src={imagePreview} alt="Preview" className="max-h-32 rounded border border-border" />
          )}
          {videoPreview && (
            <video src={videoPreview} className="max-h-32 rounded border border-border" controls />
          )}
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
            onClick={clearAttachment}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
      <div className="flex gap-2">
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Type a message..."
          disabled={isDisabled}
          className="min-h-[60px] resize-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />
        <div className="flex flex-col gap-2">
          <EmojiPicker onSelect={handleEmojiSelect} disabled={isDisabled} />
          
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*,.gif"
            onChange={handleImageSelect}
            disabled={isDisabled}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={isDisabled}
            onClick={() => imageInputRef.current?.click()}
            title="Attach image (including GIF)"
          >
            <ImageIcon className="h-4 w-4" />
          </Button>
          
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            onChange={handleVideoSelect}
            disabled={isDisabled}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={isDisabled}
            onClick={() => videoInputRef.current?.click()}
          >
            <VideoIcon className="h-4 w-4" />
          </Button>
          
          <Button type="submit" size="icon" disabled={isDisabled}>
            {uploadProgress !== null ? (
              <span className="text-xs">{uploadProgress}%</span>
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
