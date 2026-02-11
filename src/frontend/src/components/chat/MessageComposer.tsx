import { useState } from 'react';
import { usePostMessage } from '../../hooks/useRoomMessages';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send } from 'lucide-react';
import { toast } from 'sonner';

interface MessageComposerProps {
  roomId: string;
}

export default function MessageComposer({ roomId }: MessageComposerProps) {
  const [content, setContent] = useState('');
  const postMessage = usePostMessage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedContent = content.trim();
    if (!trimmedContent) {
      toast.error('Message cannot be empty');
      return;
    }

    try {
      await postMessage.mutateAsync({ roomId, content: trimmedContent });
      setContent('');
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
    <form onSubmit={handleSubmit} className="p-4">
      <div className="flex gap-2">
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
          disabled={postMessage.isPending || !content.trim()}
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
