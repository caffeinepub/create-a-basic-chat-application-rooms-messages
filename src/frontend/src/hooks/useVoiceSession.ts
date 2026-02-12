import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { RoomId, VoiceSessionState, IceCandidate, SdpOffer, SdpAnswer } from '../backend';

export function useVoiceSessionState(roomId: RoomId | null, pollingInterval: number) {
  const { actor, isFetching } = useActor();

  return useQuery<VoiceSessionState | null>({
    queryKey: ['voiceSession', roomId],
    queryFn: async () => {
      if (!actor || !roomId) return null;
      return actor.getVoiceSessionState(roomId);
    },
    enabled: !!actor && !isFetching && !!roomId,
    refetchInterval: pollingInterval,
    retry: false,
  });
}

export function useStartVoiceSession() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (roomId: RoomId) => {
      if (!actor) throw new Error('Actor not available');
      return actor.startVoiceSession(roomId);
    },
    onSuccess: (_, roomId) => {
      queryClient.invalidateQueries({ queryKey: ['voiceSession', roomId] });
    },
  });
}

export function useEndVoiceSession() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (roomId: RoomId) => {
      if (!actor) throw new Error('Actor not available');
      return actor.endVoiceSession(roomId);
    },
    onSuccess: (_, roomId) => {
      queryClient.invalidateQueries({ queryKey: ['voiceSession', roomId] });
    },
  });
}

export function useSendSdpOffer() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ roomId, offer }: { roomId: RoomId; offer: SdpOffer }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.sendSdpOffer(roomId, offer);
    },
    onSuccess: (_, { roomId }) => {
      queryClient.invalidateQueries({ queryKey: ['voiceSession', roomId] });
    },
  });
}

export function useSendSdpAnswer() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ roomId, answer }: { roomId: RoomId; answer: SdpAnswer }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.sendSdpAnswer(roomId, answer);
    },
    onSuccess: (_, { roomId }) => {
      queryClient.invalidateQueries({ queryKey: ['voiceSession', roomId] });
    },
  });
}

export function useAddIceCandidate() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async ({ roomId, candidate }: { roomId: RoomId; candidate: IceCandidate }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addIceCandidate(roomId, candidate);
    },
  });
}
