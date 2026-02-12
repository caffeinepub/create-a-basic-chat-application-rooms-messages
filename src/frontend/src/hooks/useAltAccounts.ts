import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { Principal } from '@icp-sdk/core/principal';
import type { AltAccountRequest } from '../backend';

export function useGetLinkedAltAccounts() {
  const { actor, isFetching } = useActor();

  return useQuery<Principal[]>({
    queryKey: ['linkedAltAccounts'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getLinkedAltAccounts();
    },
    enabled: !!actor && !isFetching,
    retry: false,
  });
}

export function useGetPendingAltRequests() {
  const { actor, isFetching } = useActor();

  return useQuery<{ outgoing: AltAccountRequest[]; incoming: AltAccountRequest[] }>({
    queryKey: ['pendingAltRequests'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getPendingAltRequests();
    },
    enabled: !!actor && !isFetching,
    retry: false,
  });
}

export function useLinkAltAccount() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (altPrincipal: Principal) => {
      if (!actor) throw new Error('Actor not available');
      return actor.linkAltAccount(altPrincipal);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['linkedAltAccounts'] });
      queryClient.invalidateQueries({ queryKey: ['pendingAltRequests'] });
    },
  });
}

export function useAcceptAltAccount() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requester: Principal) => {
      if (!actor) throw new Error('Actor not available');
      return actor.acceptAltAccount(requester);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['linkedAltAccounts'] });
      queryClient.invalidateQueries({ queryKey: ['pendingAltRequests'] });
    },
  });
}

export function useUnlinkAltAccount() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (altPrincipal: Principal) => {
      if (!actor) throw new Error('Actor not available');
      return actor.unlinkAltAccount(altPrincipal);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['linkedAltAccounts'] });
      queryClient.invalidateQueries({ queryKey: ['pendingAltRequests'] });
    },
  });
}
