import { useState } from 'react';
import { useListRooms, useCreateRoom } from '../../hooks/useChatRooms';
import { useListServers, useCreateServer } from '../../hooks/useServers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Plus, MessageSquare, Server } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

interface RoomListProps {
  selectedRoomId: string | null;
  onSelectRoom: (roomId: string) => void;
}

export default function RoomList({ selectedRoomId, onSelectRoom }: RoomListProps) {
  const [newRoomName, setNewRoomName] = useState('');
  const [newServerName, setNewServerName] = useState('');
  const { data: rooms, isLoading, isError } = useListRooms();
  const { data: servers, isLoading: serversLoading } = useListServers();
  const createRoom = useCreateRoom();
  const createServer = useCreateServer();

  const serverCount = servers?.length || 0;
  const hasReachedServerLimit = serverCount >= 100;

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

  const handleCreateServer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedName = newServerName.trim();
    if (!trimmedName) {
      toast.error('Please enter a server name');
      return;
    }

    if (hasReachedServerLimit) {
      toast.error('You have reached the 100 server limit.');
      return;
    }

    try {
      await createServer.mutateAsync(trimmedName);
      setNewServerName('');
      toast.success('Server created successfully!');
    } catch (error: any) {
      console.error('Failed to create server:', error);
      const errorMessage = error?.message || 'Failed to create server. Please try again.';
      if (errorMessage.includes('Maximum of 100 servers')) {
        toast.error('You have reached the 100 server limit.');
      } else {
        toast.error(errorMessage);
      }
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

      {/* Create Server Form */}
      <div className="border-b border-border p-4">
        <form onSubmit={handleCreateServer} className="space-y-2">
          <Input
            placeholder="New server name..."
            value={newServerName}
            onChange={(e) => setNewServerName(e.target.value)}
            disabled={createServer.isPending || hasReachedServerLimit}
          />
          <Button 
            type="submit" 
            className="w-full gap-2"
            disabled={createServer.isPending || !newServerName.trim() || hasReachedServerLimit}
          >
            {createServer.isPending ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Create Server
              </>
            )}
          </Button>
          {hasReachedServerLimit && (
            <p className="text-xs text-destructive text-center">
              You have reached the 100 server limit.
            </p>
          )}
          {!hasReachedServerLimit && !serversLoading && (
            <p className="text-xs text-muted-foreground text-center">
              {serverCount} / 100 servers
            </p>
          )}
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
                    ? 'bg-room-tile-selected border-room-tile-selected-border'
                    : 'bg-room-tile border-room-tile-border hover:bg-room-tile-hover'
                }`}
              >
                <div className="flex items-start gap-3">
                  <MessageSquare 
                    className={`h-5 w-5 mt-0.5 ${
                      selectedRoomId === room.id
                        ? 'text-room-tile-selected-icon'
                        : 'text-room-tile-icon'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <h3 
                      className={`font-medium truncate ${
                        selectedRoomId === room.id
                          ? 'text-room-tile-selected-foreground'
                          : 'text-room-tile-foreground'
                      }`}
                    >
                      {room.name}
                    </h3>
                    <p 
                      className={`text-xs mt-1 ${
                        selectedRoomId === room.id
                          ? 'text-room-tile-selected-foreground/70'
                          : 'text-room-tile-foreground/60'
                      }`}
                    >
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
