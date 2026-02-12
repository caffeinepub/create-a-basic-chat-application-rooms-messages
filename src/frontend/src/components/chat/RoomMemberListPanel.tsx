import { useMemo, useState } from 'react';
import { useGetRoomMembersWithPresence } from '../../hooks/useRoomPresence';
import { useGetRoomMembers, useAssignRoomMemberRole, useKickRoomMember } from '../../hooks/useRoomRoles';
import { useGetUserProfile } from '../../hooks/useUserProfile';
import { useInternetIdentity } from '../../hooks/useInternetIdentity';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import UserAvatar from '../profile/UserAvatar';
import ProfileName from '../profile/ProfileName';
import { getPrincipalDisplayName, getPrincipalInitials } from '../../utils/principalDisplay';
import { MoreVertical, Shield, ShieldCheck, User as UserIcon, UserX } from 'lucide-react';
import { toast } from 'sonner';
import { RoomMemberRole, type User } from '../../backend';

interface RoomMemberListPanelProps {
  roomId: string;
  pollingInterval: number;
}

function getRoleLabel(role: RoomMemberRole): string {
  switch (role) {
    case RoomMemberRole.owner:
      return 'Owner';
    case RoomMemberRole.admin:
      return 'Admin';
    case RoomMemberRole.moderator:
      return 'Moderator';
    case RoomMemberRole.member:
      return 'Member';
    default:
      return 'Member';
  }
}

function getRoleColor(role: RoomMemberRole): string {
  switch (role) {
    case RoomMemberRole.owner:
      return 'text-amber-500';
    case RoomMemberRole.admin:
      return 'text-red-500';
    case RoomMemberRole.moderator:
      return 'text-blue-500';
    case RoomMemberRole.member:
      return 'text-muted-foreground';
    default:
      return 'text-muted-foreground';
  }
}

function MemberRow({ 
  userId, 
  isActive, 
  role, 
  isOwner, 
  isCurrentUser,
  roomId,
  onKickClick,
}: { 
  userId: User; 
  isActive: boolean;
  role: RoomMemberRole;
  isOwner: boolean;
  isCurrentUser: boolean;
  roomId: string;
  onKickClick: (userId: User) => void;
}) {
  const { data: profile, isLoading, isError } = useGetUserProfile(userId);
  const assignRole = useAssignRoomMemberRole();

  const displayName = profile?.name || getPrincipalDisplayName(userId.toString());
  const statusLabel = isActive ? 'Active' : 'Offline';
  const statusColor = isActive ? 'text-green-500' : 'text-muted-foreground';
  const roleLabel = getRoleLabel(role);
  const roleColor = getRoleColor(role);

  const handleRoleChange = async (newRole: RoomMemberRole) => {
    try {
      await assignRole.mutateAsync({ roomId, member: userId, role: newRole });
      toast.success(`Role updated to ${getRoleLabel(newRole)}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update role');
    }
  };

  const showRoleControls = isOwner && !isCurrentUser && role !== RoomMemberRole.owner;

  return (
    <div className="flex items-center gap-3 px-4 py-2 hover:bg-accent/30 transition-colors group">
      {profile && !isError ? (
        <UserAvatar profile={profile} size="sm" />
      ) : (
        <div
          className="flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center font-medium text-sm bg-muted text-muted-foreground"
        >
          {getPrincipalInitials(userId.toString())}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground truncate">
            {profile && !isError ? <ProfileName profile={profile} /> : displayName}
          </p>
          <div className={`flex items-center gap-1 ${statusColor}`}>
            <div className={`h-2 w-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-muted-foreground'}`} />
            <span className="text-xs">{statusLabel}</span>
          </div>
        </div>
        <p className={`text-xs ${roleColor} font-medium`}>{roleLabel}</p>
      </div>
      
      {showRoleControls && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              disabled={assignRole.isPending}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Manage Role</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => handleRoleChange(RoomMemberRole.admin)}
              disabled={role === RoomMemberRole.admin}
            >
              <ShieldCheck className="mr-2 h-4 w-4" />
              Set as Admin
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => handleRoleChange(RoomMemberRole.moderator)}
              disabled={role === RoomMemberRole.moderator}
            >
              <Shield className="mr-2 h-4 w-4" />
              Set as Moderator
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => handleRoleChange(RoomMemberRole.member)}
              disabled={role === RoomMemberRole.member}
            >
              <UserIcon className="mr-2 h-4 w-4" />
              Set as Member
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => onKickClick(userId)}
              className="text-destructive focus:text-destructive"
            >
              <UserX className="mr-2 h-4 w-4" />
              Kick from Room
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

export default function RoomMemberListPanel({ roomId, pollingInterval }: RoomMemberListPanelProps) {
  const { identity } = useInternetIdentity();
  const { data: membersWithPresence = [], isLoading: presenceLoading, isError: presenceError } = useGetRoomMembersWithPresence(roomId, pollingInterval);
  const { data: roomMembers = [], isLoading: rolesLoading, isError: rolesError } = useGetRoomMembers(roomId);
  const kickMember = useKickRoomMember();
  
  const [kickTarget, setKickTarget] = useState<User | null>(null);

  const currentUserPrincipal = identity?.getPrincipal().toString();

  // Find current user's role
  const currentUserRole = useMemo(() => {
    if (!currentUserPrincipal) return null;
    const member = roomMembers.find(m => m.user.toString() === currentUserPrincipal);
    return member?.role || null;
  }, [roomMembers, currentUserPrincipal]);

  const isOwner = currentUserRole === RoomMemberRole.owner;

  // Merge presence data with role data
  const membersWithRoles = useMemo(() => {
    return membersWithPresence.map(([userId, isActive]) => {
      const member = roomMembers.find(m => m.user.toString() === userId.toString());
      return {
        userId,
        isActive,
        role: member?.role || RoomMemberRole.member,
      };
    });
  }, [membersWithPresence, roomMembers]);

  // Sort members: owner first, then by role hierarchy, then by activity, then alphabetically
  const sortedMembers = useMemo(() => {
    const roleOrder: Record<RoomMemberRole, number> = {
      [RoomMemberRole.owner]: 0,
      [RoomMemberRole.admin]: 1,
      [RoomMemberRole.moderator]: 2,
      [RoomMemberRole.member]: 3,
    };

    return [...membersWithRoles].sort((a, b) => {
      // First by role
      const roleCompare = roleOrder[a.role] - roleOrder[b.role];
      if (roleCompare !== 0) return roleCompare;

      // Then by activity
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;

      // Finally alphabetically by principal
      return a.userId.toString().localeCompare(b.userId.toString());
    });
  }, [membersWithRoles]);

  const handleKickConfirm = async () => {
    if (!kickTarget) return;

    try {
      await kickMember.mutateAsync({ roomId, member: kickTarget });
      toast.success('Member kicked from room');
      setKickTarget(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to kick member');
    }
  };

  const isLoading = presenceLoading || rolesLoading;
  const isError = presenceError || rolesError;

  return (
    <>
      <div className="w-64 border-l border-border bg-card flex flex-col">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Members</h3>
          <p className="text-xs text-muted-foreground">
            {sortedMembers.length} {sortedMembers.length === 1 ? 'member' : 'members'}
          </p>
        </div>
        
        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : isError ? (
            <div className="flex items-center justify-center h-32 px-4">
              <p className="text-sm text-destructive text-center">Failed to load members</p>
            </div>
          ) : sortedMembers.length === 0 ? (
            <div className="flex items-center justify-center h-32 px-4">
              <p className="text-sm text-muted-foreground text-center">No members</p>
            </div>
          ) : (
            <div className="py-2">
              {sortedMembers.map(({ userId, isActive, role }) => (
                <MemberRow 
                  key={userId.toString()} 
                  userId={userId} 
                  isActive={isActive}
                  role={role}
                  isOwner={isOwner}
                  isCurrentUser={userId.toString() === currentUserPrincipal}
                  roomId={roomId}
                  onKickClick={setKickTarget}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      <AlertDialog open={!!kickTarget} onOpenChange={(open) => !open && setKickTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kick Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to kick this member from the room? They will need to be re-invited to rejoin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={kickMember.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleKickConfirm}
              disabled={kickMember.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {kickMember.isPending ? 'Kicking...' : 'Kick Member'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
