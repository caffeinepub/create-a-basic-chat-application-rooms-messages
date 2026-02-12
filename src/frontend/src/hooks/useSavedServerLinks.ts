import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { SavedServerLink } from '../backend';

export function useListSavedServerLinks() {
  const { actor, isFetching } = useActor();

  return useQuery<SavedServerLink[]>({
    queryKey: ['savedServerLinks'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.listSavedServerLinks();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSaveServerLink() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ serverId, code }: { serverId: string; code: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.saveServerLink(serverId, code);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedServerLinks'] });
    },
    onError: (error: any) => {
      // Normalize backend errors to readable English
      const message = error?.message || '';
      if (message.includes('already saved')) {
        throw new Error('This server link is already saved');
      } else if (message.includes('Unauthorized')) {
        throw new Error('You must be signed in to save server links');
      } else {
        throw new Error('Failed to save server link. Please try again.');
      }
    },
  });
}

export function useRemoveSavedServerLink() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (code: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.removeSavedServerLink(code);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedServerLinks'] });
    },
    onError: (error: any) => {
      // Normalize backend errors to readable English
      const message = error?.message || '';
      if (message.includes('not found')) {
        throw new Error('Saved link not found');
      } else if (message.includes('Unauthorized')) {
        throw new Error('You must be signed in to remove saved links');
      } else {
        throw new Error('Failed to remove saved link. Please try again.');
      }
    },
  });
}
