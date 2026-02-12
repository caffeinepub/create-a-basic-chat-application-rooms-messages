import { useState, useRef } from 'react';
import { usePostMessage } from '../../hooks/useRoomMessages';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Image as ImageIcon, X } from 'lucide-react';
import { toast } from 'sonner';
import { ExternalBlob } from '../../backend';

interface MessageComposerProps {
  roomId: string;
}

export default function MessageComposer({ roomId }: MessageComposerProps) {
  const [content, setContent] = useState('');
  const [imageAttachment, setImageAttachment] = useState<ExternalBlob | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const postMessage = usePostMessage();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      const blob = ExternalBlob.fromBytes(uint8Array).withUploadProgress((percentage) => {
        setUploadProgress(percentage);
      });
      
      setImageAttachment(blob);
      
      // Create preview URL
      const blobUrl = URL.createObjectURL(file);
      setImagePreview(blobUrl);
      setUploadProgress(0);
    } catch (error) {
      console.error('Failed to process image:', error);
      toast.error('Failed to process image. Please try again.');
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = () => {
    setImageAttachment(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedContent = content.trim();
    
    // Validate: must have either text or image
    if (!trimmedContent && !imageAttachment) {
      toast.error('Message cannot be empty');
      return;
    }

    try {
      await postMessage.mutateAsync({ 
        roomId, 
        content: trimmedContent,
        image: imageAttachment || undefined,
      });
      setContent('');
      handleRemoveImage();
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message. Please try again.');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t border-border bg-card">
      {imagePreview && (
        <div className="mb-2 relative inline-block">
          <img 
            src={imagePreview} 
            alt="Preview" 
            className="max-h-32 rounded-lg border border-border"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute -top-2 -right-2 h-6 w-6"
            onClick={handleRemoveImage}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
      {uploadProgress > 0 && uploadProgress < 100 && (
        <div className="mb-2 w-full bg-secondary rounded-full h-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}
      <div className="flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
          disabled={postMessage.isPending}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="flex-shrink-0"
          onClick={() => fileInputRef.current?.click()}
          disabled={postMessage.isPending}
        >
          <ImageIcon className="h-5 w-5" />
        </Button>
        <Textarea
          placeholder="Type a message... (Press Enter to send, Shift+Enter for new line)"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={postMessage.isPending}
          className="min-h-[60px] max-h-[200px] resize-none"
          rows={2}
        />
        <Button 
          type="submit" 
          size="icon"
          disabled={postMessage.isPending || (!content.trim() && !imageAttachment)}
          className="h-[60px] w-[60px] flex-shrink-0"
        >
          {postMessage.isPending ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </div>
    </form>
  );
}
