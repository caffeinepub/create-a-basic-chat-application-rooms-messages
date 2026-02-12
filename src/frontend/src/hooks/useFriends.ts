import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { User, UserProfile } from '../backend';

export function useSearchUsers(searchText: string) {
  const { actor, isFetching } = useActor();

  return useQuery<UserProfile[]>({
    queryKey: ['searchUsers', searchText],
    queryFn: async () => {
      if (!actor || !searchText) return [];
      return actor.searchUsersByName(searchText);
    },
    enabled: !!actor && !isFetching && !!searchText,
    staleTime: 30000, // Cache for 30 seconds
  });
}

export function useGetCallerFriends() {
  const { actor, isFetching } = useActor();

  return useQuery<User[]>({
    queryKey: ['callerFriends'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getCallerFriends();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSendFriendRequest() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (to: User) => {
      if (!actor) throw new Error('Actor not available');
      return actor.sendFriendRequest(to);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['callerFriends'] });
    },
  });
}

export function useAcceptFriendRequest() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (from: User) => {
      if (!actor) throw new Error('Actor not available');
      return actor.acceptFriendRequest(from);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['callerFriends'] });
    },
  });
}
