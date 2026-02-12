import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { useInternetIdentity } from './useInternetIdentity';
import type { Server } from '../backend';

export function useListServers() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<Server[]>({
    queryKey: ['servers'],
    queryFn: async () => {
      if (!actor || !identity) return [];
      const principal = identity.getPrincipal();
      return actor.getUserServers(principal);
    },
    enabled: !!actor && !isFetching && !!identity,
  });
}

export function useCreateServer() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string): Promise<Server> => {
      if (!actor) throw new Error('Actor not available');
      return actor.createServer(name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servers'] });
    },
  });
}
