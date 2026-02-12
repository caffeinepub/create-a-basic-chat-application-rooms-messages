import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { useInternetIdentity } from './useInternetIdentity';
import type { Server } from '../backend';
import { ExternalBlob } from '../backend';

export function useListServers() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<Server[]>({
    queryKey: ['servers'],
    queryFn: async () => {
      if (!actor || !identity) return [];
      const user = identity.getPrincipal();
      return actor.getUserServers(user);
    },
    enabled: !!actor && !isFetching && !!identity,
  });
}

export function useCreateServer() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createServer(name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servers'] });
    },
  });
}

export function useDeleteServer() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (serverId: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteServer(serverId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servers'] });
    },
  });
}

export function useSetServerIcon() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ serverId, icon }: { serverId: string; icon: ExternalBlob | null }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.setServerIcon(serverId, icon);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servers'] });
    },
  });
}
