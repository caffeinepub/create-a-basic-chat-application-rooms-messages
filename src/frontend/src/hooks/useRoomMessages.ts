import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { Message, MessageId, RoomId } from '../backend';

export function useRoomMessages(roomId: string | null, pollingInterval: number = 3000) {
  const { actor, isFetching } = useActor();

  return useQuery<Message[]>({
    queryKey: ['messages', roomId],
    queryFn: async () => {
      if (!actor || !roomId) return [];
      // Fetch all messages (afterId: 0, limit: 1000)
      const messages = await actor.fetchMessages(roomId, BigInt(0), BigInt(1000));
      return messages;
    },
    enabled: !!actor && !isFetching && !!roomId,
    refetchInterval: roomId && pollingInterval > 0 ? pollingInterval : false,
  });
}

export function usePostMessage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ roomId, content }: { roomId: RoomId; content: string }): Promise<MessageId> => {
      if (!actor) throw new Error('Actor not available');
      return actor.postMessage(roomId, content);
    },
    onSuccess: (_, variables) => {
      // Invalidate messages for the specific room
      queryClient.invalidateQueries({ queryKey: ['messages', variables.roomId] });
    },
  });
}
