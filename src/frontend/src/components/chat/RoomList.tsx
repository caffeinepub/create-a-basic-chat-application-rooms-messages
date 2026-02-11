import { useState } from 'react';
import { useListRooms, useCreateRoom } from '../../hooks/useChatRooms';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Plus, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

interface RoomListProps {
  selectedRoomId: string | null;
  onSelectRoom: (roomId: string) => void;
}

export default function RoomList({ selectedRoomId, onSelectRoom }: RoomListProps) {
  const [newRoomName, setNewRoomName] = useState('');
  const { data: rooms, isLoading, isError } = useListRooms();
  const createRoom = useCreateRoom();

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedName = newRoomName.trim();
    if (!trimmedName) {
      toast.error('Please enter a room name');
      return;
    }

    try {
      const roomId = await createRoom.mutateAsync(trimmedName);
      setNewRoomName('');
      onSelectRoom(roomId);
      toast.success('Room created successfully!');
    } catch (error) {
      console.error('Failed to create room:', error);
      toast.error('Failed to create room. Please try again.');
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Create Room Form */}
      <div className="border-b border-border p-4">
        <form onSubmit={handleCreateRoom} className="space-y-2">
          <Input
            placeholder="New room name..."
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
            disabled={createRoom.isPending}
          />
          <Button 
            type="submit" 
            className="w-full gap-2"
            disabled={createRoom.isPending || !newRoomName.trim()}
          >
            {createRoom.isPending ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Create Room
              </>
            )}
          </Button>
        </form>
      </div>

      {/* Room List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {isLoading ? (
            <>
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </>
          ) : isError ? (
            <Card className="p-4 text-center">
              <p className="text-sm text-destructive">Failed to load rooms</p>
              <p className="text-xs text-muted-foreground mt-1">Please try refreshing the page</p>
            </Card>
          ) : rooms && rooms.length > 0 ? (
            rooms.map((room) => (
              <button
                key={room.id}
                onClick={() => onSelectRoom(room.id)}
                className={`w-full text-left p-4 rounded-lg border transition-colors ${
                  selectedRoomId === room.id
                    ? 'bg-accent border-primary'
                    : 'bg-card border-border hover:bg-accent/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <MessageSquare className="h-5 w-5 mt-0.5 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground truncate">{room.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Created {new Date(Number(room.createdAt) / 1000000).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </button>
            ))
          ) : (
            <Card className="p-6 text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No rooms yet</p>
              <p className="text-xs text-muted-foreground mt-1">Create one to get started!</p>
            </Card>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
