import { useQuery } from '@tanstack/react-query';
import { useActor } from './useActor';
import { useGetUserProfile } from './useUserProfile';
import type { Principal } from '@icp-sdk/core/principal';
import type { UserProfile } from '../backend';
import { getPrincipalDisplayName, getPrincipalInitials } from '../utils/principalDisplay';

export interface ServerMemberWithProfile {
  principal: Principal;
  profile: UserProfile | null;
  isActive: boolean;
  isFetchError: boolean;
}

export function useGetActiveMembers(serverId: string | null, pollingInterval: number = 5000) {
  const { actor, isFetching } = useActor();

  return useQuery<Principal[]>({
    queryKey: ['activeMembers', serverId],
    queryFn: async () => {
      if (!actor || !serverId) return [];
      
      try {
        return await actor.getActiveMembers(serverId);
      } catch (error: any) {
        console.error('Failed to fetch active members:', error);
        throw new Error(error.message || 'Failed to fetch active members');
      }
    },
    enabled: !!actor && !isFetching && !!serverId,
    refetchInterval: pollingInterval,
    staleTime: 2000,
  });
}

// Hook to get all server members (for now, we only have active members from backend)
// In the future, this could be extended to fetch all members
export function useServerMembersWithProfiles(serverId: string | null, pollingInterval: number = 5000): {
  members: ServerMemberWithProfile[];
  isLoading: boolean;
} {
  const { data: activeMembers = [], isLoading: activeMembersLoading } = useGetActiveMembers(serverId, pollingInterval);

  // For now, treat all returned members as active
  // Create member objects with profile data
  const members: ServerMemberWithProfile[] = activeMembers.map(principal => {
    // We'll fetch profiles in the component using individual hooks
    return {
      principal,
      profile: null,
      isActive: true,
      isFetchError: false,
    };
  });

  return {
    members,
    isLoading: activeMembersLoading,
  };
}

// Hook for a single member's profile with fallback
export function useMemberProfile(principal: Principal | null) {
  const { data: profile, isLoading, isError } = useGetUserProfile(principal!);

  if (!principal) {
    return { profile: null, isLoading: false, isError: false };
  }

  // Create fallback profile if fetch failed or profile is null
  if (isError || (!isLoading && !profile)) {
    const principalString = principal.toString();
    const fallbackProfile: UserProfile = {
      name: getPrincipalDisplayName(principalString),
      bio: '',
      avatarType: 'default',
      color: '#FFFFFF',
      backgroundColor: '#9333EA',
      textOverlays: getPrincipalInitials(principalString),
      profilePicture: undefined,
    };
    
    return { profile: fallbackProfile, isLoading: false, isError };
  }

  return { profile, isLoading, isError };
}
