import { useState } from 'react';
import { useListRooms, useCreateRoom, useDeleteRoom } from '../../hooks/useChatRooms';
import { useListServers, useCreateServer, useDeleteServer } from '../../hooks/useServers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Plus, MessageSquare, Server, Trash2, Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import ServerAvatar from '../servers/ServerAvatar';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface RoomListProps {
  selectedRoomId: string | null;
  onSelectRoom: (roomId: string | null) => void;
  selectedServerId: string | null;
  onSelectServer: (serverId: string | null) => void;
}

export default function RoomList({ selectedRoomId, onSelectRoom, selectedServerId, onSelectServer }: RoomListProps) {
  const [newRoomName, setNewRoomName] = useState('');
  const [newServerName, setNewServerName] = useState('');
  const [deleteRoomDialog, setDeleteRoomDialog] = useState<{ id: string; name: string } | null>(null);
  const [deleteServerDialog, setDeleteServerDialog] = useState<{ id: string; name: string } | null>(null);
  const [renameRoomDialog, setRenameRoomDialog] = useState<{ id: string; name: string } | null>(null);
  const [renameServerDialog, setRenameServerDialog] = useState<{ id: string; name: string } | null>(null);
  const [renameValue, setRenameValue] = useState('');
  
  const { data: rooms, isLoading, isError } = useListRooms();
  const { data: servers, isLoading: serversLoading } = useListServers();
  const createRoom = useCreateRoom();
  const createServer = useCreateServer();
  const deleteRoom = useDeleteRoom();
  const deleteServer = useDeleteServer();

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
      const newServer = await createServer.mutateAsync(trimmedName);
      setNewServerName('');
      onSelectServer(newServer.id);
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

  const handleDeleteRoom = async () => {
    if (!deleteRoomDialog) return;

    try {
      await deleteRoom.mutateAsync(deleteRoomDialog.id);
      
      if (selectedRoomId === deleteRoomDialog.id) {
        onSelectRoom(null);
      }
      
      toast.success('Room deleted successfully!');
      setDeleteRoomDialog(null);
    } catch (error: any) {
      console.error('Failed to delete room:', error);
      const errorMessage = error?.message || 'Failed to delete room. Please try again.';
      toast.error(errorMessage);
      setDeleteRoomDialog(null);
    }
  };

  const handleDeleteServer = async () => {
    if (!deleteServerDialog) return;

    try {
      await deleteServer.mutateAsync(deleteServerDialog.id);
      
      if (selectedServerId === deleteServerDialog.id) {
        onSelectServer(null);
      }
      
      toast.success('Server deleted successfully!');
      setDeleteServerDialog(null);
    } catch (error: any) {
      console.error('Failed to delete server:', error);
      const errorMessage = error?.message || 'Failed to delete server. Please try again.';
      toast.error(errorMessage);
      setDeleteServerDialog(null);
    }
  };

  const handleRenameRoom = () => {
    if (!renameRoomDialog) return;
    
    const trimmedName = renameValue.trim();
    if (!trimmedName) {
      toast.error('Please enter a room name');
      return;
    }

    // Note: Backend doesn't support renaming yet
    toast.error('Room renaming is not yet supported by the backend');
    setRenameRoomDialog(null);
    setRenameValue('');
  };

  const handleRenameServer = () => {
    if (!renameServerDialog) return;
    
    const trimmedName = renameValue.trim();
    if (!trimmedName) {
      toast.error('Please enter a server name');
      return;
    }

    // Note: Backend doesn't support renaming yet
    toast.error('Server renaming is not yet supported by the backend');
    setRenameServerDialog(null);
    setRenameValue('');
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
            <p className="text-xs text-destructive">Server limit reached (100)</p>
          )}
        </form>
      </div>

      {/* Servers List */}
      <div className="border-b border-border">
        <div className="px-4 py-2 bg-muted/50">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Server className="h-3 w-3" />
            Servers
          </h3>
        </div>
        <ScrollArea className="max-h-48">
          {serversLoading ? (
            <div className="space-y-2 p-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : servers && servers.length > 0 ? (
            <div className="p-2 space-y-1">
              {servers.map((server) => (
                <Card
                  key={server.id}
                  className={`p-3 cursor-pointer transition-all hover:bg-accent group ${
                    selectedServerId === server.id
                      ? 'bg-room-tile-selected border-room-tile-selected-border'
                      : 'bg-room-tile hover:bg-room-tile-hover border-room-tile-border'
                  }`}
                  onClick={() => onSelectServer(server.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <ServerAvatar server={server} size="sm" />
                      <span className="font-medium text-sm truncate text-room-tile-foreground">
                        {server.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRenameServerDialog({ id: server.id, name: server.name });
                          setRenameValue(server.name);
                        }}
                      >
                        <Edit2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteServerDialog({ id: server.id, name: server.name });
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No servers yet
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Rooms List */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="px-4 py-2 bg-muted/50">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <MessageSquare className="h-3 w-3" />
            Rooms
          </h3>
        </div>
        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="space-y-2 p-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : isError ? (
            <div className="p-4 text-center text-sm text-destructive">
              Failed to load rooms
            </div>
          ) : rooms && rooms.length > 0 ? (
            <div className="p-2 space-y-1">
              {rooms.map((room) => (
                <Card
                  key={room.id}
                  className={`p-3 cursor-pointer transition-all hover:bg-accent group ${
                    selectedRoomId === room.id
                      ? 'bg-room-tile-selected border-room-tile-selected-border'
                      : 'bg-room-tile hover:bg-room-tile-hover border-room-tile-border'
                  }`}
                  onClick={() => onSelectRoom(room.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-room-tile-icon flex items-center justify-center">
                        <MessageSquare className="h-4 w-4 text-room-tile-foreground" />
                      </div>
                      <span className="font-medium text-sm truncate text-room-tile-foreground">
                        {room.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRenameRoomDialog({ id: room.id, name: room.name });
                          setRenameValue(room.name);
                        }}
                      >
                        <Edit2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteRoomDialog({ id: room.id, name: room.name });
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No rooms yet. Create one to start chatting!
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Delete Room Confirmation Dialog */}
      <AlertDialog open={!!deleteRoomDialog} onOpenChange={(open) => !open && setDeleteRoomDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Room</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteRoomDialog?.name}"? This action cannot be undone and all messages will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRoom} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Server Confirmation Dialog */}
      <AlertDialog open={!!deleteServerDialog} onOpenChange={(open) => !open && setDeleteServerDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Server</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteServerDialog?.name}"? This action cannot be undone and all server data will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteServer} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rename Room Dialog */}
      <Dialog open={!!renameRoomDialog} onOpenChange={(open) => {
        if (!open) {
          setRenameRoomDialog(null);
          setRenameValue('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Room</DialogTitle>
            <DialogDescription>
              Enter a new name for "{renameRoomDialog?.name}"
            </DialogDescription>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            placeholder="New room name"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleRenameRoom();
              }
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setRenameRoomDialog(null);
              setRenameValue('');
            }}>
              Cancel
            </Button>
            <Button onClick={handleRenameRoom} disabled={!renameValue.trim()}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Server Dialog */}
      <Dialog open={!!renameServerDialog} onOpenChange={(open) => {
        if (!open) {
          setRenameServerDialog(null);
          setRenameValue('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Server</DialogTitle>
            <DialogDescription>
              Enter a new name for "{renameServerDialog?.name}"
            </DialogDescription>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            placeholder="New server name"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleRenameServer();
              }
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setRenameServerDialog(null);
              setRenameValue('');
            }}>
              Cancel
            </Button>
            <Button onClick={handleRenameServer} disabled={!renameValue.trim()}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
