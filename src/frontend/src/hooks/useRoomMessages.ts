import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { ChatMessage, NewChatMessage, MessageId } from '../backend';

export function useGetRoomMessages(roomId: string | null, pollingInterval: number = 3000) {
  const { actor, isFetching } = useActor();

  return useQuery<ChatMessage[]>({
    queryKey: ['messages', roomId],
    queryFn: async () => {
      if (!actor || !roomId) return [];
      
      try {
        // Fetch all messages (afterId: 0, limit: 1000)
        return await actor.fetchMessages(roomId, BigInt(0), BigInt(1000));
      } catch (error: any) {
        console.error('Failed to fetch messages:', error);
        throw new Error(error.message || 'Failed to fetch messages');
      }
    },
    enabled: !!actor && !isFetching && !!roomId,
    refetchInterval: pollingInterval,
    staleTime: 1000,
  });
}

export function usePostMessage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (message: NewChatMessage) => {
      if (!actor) throw new Error('Actor not available');
      return actor.postMessage(message);
    },
    onSuccess: (_, variables) => {
      // Invalidate the messages query to refetch
      queryClient.invalidateQueries({ queryKey: ['messages', variables.roomId] });
    },
  });
}

export function useEditRoomMessage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ roomId, messageId, newContent }: { roomId: string; messageId: MessageId; newContent: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.editMessage(roomId, messageId, newContent);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messages', variables.roomId] });
    },
    onError: (error: any) => {
      throw new Error(error.message || 'Failed to edit message');
    },
  });
}

export function useDeleteRoomMessage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ roomId, messageId }: { roomId: string; messageId: MessageId }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteMessage(roomId, messageId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messages', variables.roomId] });
    },
    onError: (error: any) => {
      throw new Error(error.message || 'Failed to delete message');
    },
  });
}

export function useToggleRoomMessagePin() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ roomId, messageId, pin }: { roomId: string; messageId: MessageId; pin: boolean }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.togglePin(roomId, messageId, pin);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messages', variables.roomId] });
    },
    onError: (error: any) => {
      throw new Error(error.message || 'Failed to pin/unpin message');
    },
  });
}
