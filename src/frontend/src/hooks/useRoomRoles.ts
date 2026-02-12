import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { RoomId, User, RoomMember, RoomMemberRole } from '../backend';

/**
 * Hook to fetch room members with their roles
 */
export function useGetRoomMembers(roomId: string | null) {
  const { actor, isFetching } = useActor();

  return useQuery<RoomMember[]>({
    queryKey: ['roomMembers', roomId],
    queryFn: async () => {
      if (!actor || !roomId) return [];
      
      try {
        return await actor.getRoomMembers(roomId);
      } catch (error: any) {
        console.error('Failed to fetch room members:', error);
        throw new Error(error.message || 'Failed to fetch room members');
      }
    },
    enabled: !!actor && !isFetching && !!roomId,
  });
}

/**
 * Hook to assign a role to a room member
 */
export function useAssignRoomMemberRole() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      roomId, 
      member, 
      role 
    }: { 
      roomId: RoomId; 
      member: User; 
      role: RoomMemberRole;
    }) => {
      if (!actor) throw new Error('Actor not available');
      
      try {
        return await actor.assignRoomMemberRole(roomId, member, role);
      } catch (error: any) {
        throw new Error(error.message || 'Failed to assign role');
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate room members query to refetch with updated roles
      queryClient.invalidateQueries({ queryKey: ['roomMembers', variables.roomId] });
    },
  });
}

/**
 * Hook to kick a member from a room
 */
export function useKickRoomMember() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      roomId, 
      member 
    }: { 
      roomId: RoomId; 
      member: User;
    }) => {
      if (!actor) throw new Error('Actor not available');
      
      try {
        return await actor.kickRoomMember(roomId, member);
      } catch (error: any) {
        throw new Error(error.message || 'Failed to kick member');
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate both room members and presence queries
      queryClient.invalidateQueries({ queryKey: ['roomMembers', variables.roomId] });
      queryClient.invalidateQueries({ queryKey: ['roomPresence', variables.roomId] });
    },
  });
}
