import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { Room, RoomId } from '../backend';

export function useListRooms() {
  const { actor, isFetching } = useActor();

  return useQuery<Room[]>({
    queryKey: ['rooms'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listRooms();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetRoom(roomId: string | null) {
  const { actor, isFetching } = useActor();

  return useQuery<Room | null>({
    queryKey: ['room', roomId],
    queryFn: async () => {
      if (!actor || !roomId) return null;
      return actor.getRoom(roomId);
    },
    enabled: !!actor && !isFetching && !!roomId,
  });
}

export function useCreateRoom() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string): Promise<RoomId> => {
      if (!actor) throw new Error('Actor not available');
      return actor.createRoom(name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
  });
}

export function useDeleteRoom() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (roomId: RoomId): Promise<boolean> => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteRoom(roomId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
  });
}
