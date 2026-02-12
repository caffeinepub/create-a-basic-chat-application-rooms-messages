import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { User } from '../backend';
import { useEffect } from 'react';

export function useGetRoomMembersWithPresence(roomId: string | null, pollingInterval: number = 5000) {
  const { actor, isFetching } = useActor();

  return useQuery<Array<[User, boolean]>>({
    queryKey: ['roomPresence', roomId],
    queryFn: async () => {
      if (!actor || !roomId) return [];
      
      try {
        return await actor.getRoomMembersWithPresence(roomId);
      } catch (error: any) {
        console.error('Failed to fetch room presence:', error);
        throw new Error(error.message || 'Failed to fetch room presence');
      }
    },
    enabled: !!actor && !isFetching && !!roomId,
    refetchInterval: pollingInterval,
    staleTime: 1000,
  });
}

export function useUpdateRoomPresence() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (roomId: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateRoomPresence(roomId);
    },
    onError: (error: any) => {
      console.error('Failed to update room presence:', error);
    },
  });
}

/**
 * Hook that automatically sends presence heartbeats while viewing a room
 */
export function useRoomPresenceHeartbeat(roomId: string | null, intervalMs: number = 30000) {
  const updatePresence = useUpdateRoomPresence();

  useEffect(() => {
    if (!roomId) return;

    // Send initial heartbeat
    updatePresence.mutate(roomId);

    // Set up interval for periodic heartbeats
    const intervalId = setInterval(() => {
      updatePresence.mutate(roomId);
    }, intervalMs);

    return () => {
      clearInterval(intervalId);
    };
  }, [roomId, intervalMs]);
}
