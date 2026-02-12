import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { User, RoomId } from '../backend';

export function useAddUserToRoom() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ roomId, userId }: { roomId: RoomId; userId: User }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addUserToRoom(roomId, userId);
    },
    onSuccess: () => {
      // Invalidate room list so invited users can see the room
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
  });
}
