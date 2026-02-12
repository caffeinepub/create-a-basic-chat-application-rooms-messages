import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { ServerAnnouncement } from '../backend';
import { ExternalBlob } from '../backend';

export function useGetServerAnnouncements(serverId: string | null, pollingInterval: number = 3000) {
  const { actor, isFetching } = useActor();

  return useQuery<ServerAnnouncement[]>({
    queryKey: ['serverAnnouncements', serverId],
    queryFn: async () => {
      if (!actor || !serverId) return [];
      
      try {
        // Fetch all announcements (afterId: 0, limit: 1000)
        return await actor.getServerAnnouncements(serverId, BigInt(0), BigInt(1000));
      } catch (error: any) {
        console.error('Failed to fetch server announcements:', error);
        throw new Error(error.message || 'Failed to fetch announcements');
      }
    },
    enabled: !!actor && !isFetching && !!serverId,
    refetchInterval: pollingInterval,
    staleTime: 1000,
  });
}

export function usePostServerAnnouncement() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      serverId, 
      content, 
      image, 
      video 
    }: { 
      serverId: string; 
      content: string; 
      image?: ExternalBlob; 
      video?: ExternalBlob;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.postServerAnnouncement(serverId, content, image || null, video || null);
    },
    onSuccess: (_, variables) => {
      // Invalidate the announcements query to refetch
      queryClient.invalidateQueries({ queryKey: ['serverAnnouncements', variables.serverId] });
    },
  });
}

export function useEditServerAnnouncement() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ serverId, announcementId, newContent }: { serverId: string; announcementId: bigint; newContent: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.editServerAnnouncement(serverId, announcementId, newContent);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['serverAnnouncements', variables.serverId] });
    },
    onError: (error: any) => {
      throw new Error(error.message || 'Failed to edit announcement');
    },
  });
}

export function useUpdatePresence() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (isActive: boolean) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updatePresence(isActive);
    },
  });
}

export function useDeleteServerAnnouncement() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ serverId, announcementId }: { serverId: string; announcementId: bigint }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteServerAnnouncement(serverId, announcementId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['serverAnnouncements', variables.serverId] });
    },
    onError: (error: any) => {
      throw new Error(error.message || 'Failed to delete announcement');
    },
  });
}

export function useToggleServerAnnouncementPin() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ serverId, announcementId, pin }: { serverId: string; announcementId: bigint; pin: boolean }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.toggleServerPin(serverId, announcementId, pin);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['serverAnnouncements', variables.serverId] });
    },
    onError: (error: any) => {
      throw new Error(error.message || 'Failed to pin/unpin announcement');
    },
  });
}
