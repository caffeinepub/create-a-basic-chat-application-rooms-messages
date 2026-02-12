import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { UserProfile } from '../backend';
import type { Principal } from '@icp-sdk/core/principal';

export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: ['currentUserProfile'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useGetUserProfile(user: Principal) {
  const { actor, isFetching } = useActor();

  return useQuery<UserProfile | null, Error>({
    queryKey: ['userProfile', user.toString()],
    queryFn: async () => {
      if (!actor) return null;
      try {
        return await actor.getUserProfile(user);
      } catch (error: any) {
        // Handle authorization errors and backend traps gracefully
        console.warn(`Failed to fetch profile for ${user.toString()}:`, error);
        // Throw error to allow UI to distinguish between null profile and fetch failure
        throw new Error(error.message || 'Failed to fetch profile');
      }
    },
    enabled: !!actor && !isFetching,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: false, // Don't retry on failure
  });
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error('Actor not available');
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: async (_, profile) => {
      // Immediately update the cache for snappier UI refresh
      queryClient.setQueryData(['currentUserProfile'], profile);
      
      // Refetch to ensure backend state is reflected (including cleared pictures)
      await queryClient.refetchQueries({ queryKey: ['currentUserProfile'] });
      
      // Also invalidate all user profiles to refresh message displays
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
    },
  });
}
