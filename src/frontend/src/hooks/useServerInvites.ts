import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';

/**
 * Hook to generate a server invite code
 */
export function useGenerateServerInvite() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (serverId: string) => {
      if (!actor) throw new Error('Actor not available');
      try {
        return await actor.generateServerInviteCode(serverId);
      } catch (error: any) {
        throw new Error(error?.message || 'Failed to generate invite code');
      }
    },
    onSuccess: () => {
      // No cache invalidation needed for invite generation
    },
  });
}

/**
 * Hook to join a server using an invite code
 */
export function useJoinServerWithInvite() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inviteCode: string) => {
      if (!actor) throw new Error('Actor not available');
      try {
        return await actor.joinServerWithInvite(inviteCode);
      } catch (error: any) {
        // Normalize error messages to be user-friendly
        const message = error?.message || 'Failed to join server';
        if (message.includes('not found')) {
          throw new Error('Invalid or expired invite code');
        }
        if (message.includes('already a member')) {
          throw new Error('You are already a member of this server');
        }
        throw new Error(message);
      }
    },
    onSuccess: () => {
      // Invalidate servers list so the newly joined server appears
      queryClient.invalidateQueries({ queryKey: ['servers'] });
      // Also invalidate any server-member related queries
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && key.includes('activeMembers');
        }
      });
    },
  });
}
