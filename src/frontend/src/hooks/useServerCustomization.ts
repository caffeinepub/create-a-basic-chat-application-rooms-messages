import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { ExternalBlob } from '../backend';

export function useGetServerBio(serverId: string) {
  const { actor, isFetching } = useActor();

  return useQuery<string>({
    queryKey: ['serverBio', serverId],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getServerBio(serverId);
    },
    enabled: !!actor && !isFetching && !!serverId,
  });
}

export function useSetServerBio() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ serverId, bio }: { serverId: string; bio: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.setServerBio(serverId, bio);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['servers'] });
      queryClient.invalidateQueries({ queryKey: ['serverBio', variables.serverId] });
    },
  });
}

export function useGetServerBanner(serverId: string) {
  const { actor, isFetching } = useActor();

  return useQuery<ExternalBlob | null>({
    queryKey: ['serverBanner', serverId],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getServerBanner(serverId);
    },
    enabled: !!actor && !isFetching && !!serverId,
  });
}

export function useSetServerBanner() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ serverId, banner }: { serverId: string; banner: ExternalBlob | null }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.setServerBanner(serverId, banner);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['servers'] });
      queryClient.invalidateQueries({ queryKey: ['serverBanner', variables.serverId] });
    },
  });
}

export function useGetServerAccentColor(serverId: string) {
  const { actor, isFetching } = useActor();

  return useQuery<string>({
    queryKey: ['serverAccentColor', serverId],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getServerAccentColor(serverId);
    },
    enabled: !!actor && !isFetching && !!serverId,
  });
}

export function useSetServerAccentColor() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ serverId, accentColor }: { serverId: string; accentColor: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.setServerAccentColor(serverId, accentColor);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['servers'] });
      queryClient.invalidateQueries({ queryKey: ['serverAccentColor', variables.serverId] });
    },
  });
}
