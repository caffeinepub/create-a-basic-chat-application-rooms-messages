import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { UserPreferences, ThemePreference } from '../backend';

const DEFAULT_PREFERENCES: UserPreferences = {
  theme: ThemePreference.systemDefault,
  chatRefresh: {
    pollingIntervalMs: BigInt(3000),
  },
};

export function useGetCallerUserPreferences() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserPreferences>({
    queryKey: ['currentUserPreferences'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      const prefs = await actor.getCallerUserPreferences();
      return prefs || DEFAULT_PREFERENCES;
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    data: query.data || DEFAULT_PREFERENCES,
  };
}

export function useSetCallerUserPreferences() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (preferences: UserPreferences) => {
      if (!actor) throw new Error('Actor not available');
      return actor.setCallerUserPreferences(preferences);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserPreferences'] });
    },
  });
}
