import { useMemberProfile } from '../../hooks/useServerMembers';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import UserAvatar from '../profile/UserAvatar';
import ProfileName from '../profile/ProfileName';
import { Shield, UserCog, UserX, Ban } from 'lucide-react';
import { useState } from 'react';
import type { Principal } from '@icp-sdk/core/principal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface MemberItemProps {
  principal: Principal;
  isActive: boolean;
  isOwner: boolean;
  currentUserIsOwner: boolean;
}

function MemberItem({ principal, isActive, isOwner, currentUserIsOwner }: MemberItemProps) {
  const { profile, isLoading } = useMemberProfile(principal);
  const [kickDialog, setKickDialog] = useState(false);
  const [banDialog, setBanDialog] = useState(false);
  const [banDuration, setBanDuration] = useState('');
  const [roleDialog, setRoleDialog] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'admin' | 'mod' | null>(null);

  const handleKick = () => {
    // Backend doesn't support kick yet
    toast.error('Kick functionality is not yet supported by the backend');
    setKickDialog(false);
  };

  const handleBan = () => {
    // Backend doesn't support ban yet
    toast.error('Ban functionality is not yet supported by the backend');
    setBanDialog(false);
    setBanDuration('');
  };

  const handleSetRole = () => {
    // Backend doesn't support roles yet
    toast.error('Role management is not yet supported by the backend');
    setRoleDialog(false);
    setSelectedRole(null);
  };

  if (isLoading || !profile) {
    return (
      <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 animate-pulse">
        <div className="h-8 w-8 rounded-full bg-muted" />
        <div className="flex-1">
          <div className="h-4 w-24 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors group">
        <UserAvatar profile={profile} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">
              <ProfileName profile={profile} />
            </span>
            {isOwner && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Shield className="h-3 w-3 text-amber-500 flex-shrink-0" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Server Owner</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <div className="flex items-center gap-1">
            <div className={`h-2 w-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
            <span className="text-xs text-muted-foreground">
              {isActive ? 'Active' : 'Offline'}
            </span>
          </div>
        </div>
        
        {/* Only show moderation options if current user is owner and target is not owner */}
        {currentUserIsOwner && !isOwner && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <UserCog className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Shield className="mr-2 h-4 w-4" />
                  Set Role
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => {
                    setSelectedRole('admin');
                    setRoleDialog(true);
                  }}>
                    <Shield className="mr-2 h-4 w-4 text-amber-500" />
                    Admin
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    setSelectedRole('mod');
                    setRoleDialog(true);
                  }}>
                    <Shield className="mr-2 h-4 w-4 text-blue-500" />
                    Moderator
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setKickDialog(true)}>
                <UserX className="mr-2 h-4 w-4" />
                Kick
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setBanDialog(true)} className="text-destructive">
                <Ban className="mr-2 h-4 w-4" />
                Ban
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Kick Confirmation Dialog */}
      <AlertDialog open={kickDialog} onOpenChange={setKickDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kick Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to kick {profile.name} from the server? They can rejoin with an invite.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleKick} className="bg-destructive hover:bg-destructive/90">
              Kick
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Ban Dialog */}
      <Dialog open={banDialog} onOpenChange={setBanDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ban Member</DialogTitle>
            <DialogDescription>
              Ban {profile.name} from the server. They will not be able to rejoin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ban-duration">Ban Duration (optional)</Label>
              <Input
                id="ban-duration"
                placeholder="e.g., 7 days, 30 days, permanent"
                value={banDuration}
                onChange={(e) => setBanDuration(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty for permanent ban. Examples: "7 days", "1 month", "permanent"
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setBanDialog(false);
              setBanDuration('');
            }}>
              Cancel
            </Button>
            <Button onClick={handleBan} variant="destructive">
              <Ban className="mr-2 h-4 w-4" />
              Ban Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role Assignment Dialog */}
      <AlertDialog open={roleDialog} onOpenChange={setRoleDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Assign Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to make {profile.name} a server {selectedRole === 'admin' ? 'administrator' : 'moderator'}?
              {selectedRole === 'admin' && (
                <span className="block mt-2 text-amber-600 dark:text-amber-500">
                  Admins have full control over server settings and can manage all members.
                </span>
              )}
              {selectedRole === 'mod' && (
                <span className="block mt-2 text-blue-600 dark:text-blue-500">
                  Moderators can kick and ban members but cannot change server settings.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSetRole}>
              Assign Role
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface ServerMemberListProps {
  serverId: string;
  members: Array<{ principal: Principal; isActive: boolean }>;
  isLoading: boolean;
  serverOwnerId: string;
  currentUserId: string | null;
}

export default function ServerMemberList({ 
  serverId, 
  members, 
  isLoading,
  serverOwnerId,
  currentUserId
}: ServerMemberListProps) {
  const currentUserIsOwner = currentUserId === serverOwnerId;

  return (
    <div className="w-64 border-l border-border bg-card flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <UserCog className="h-4 w-4" />
          Members
          {!isLoading && <span className="text-muted-foreground">({members.length})</span>}
        </h3>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-1">
          {isLoading ? (
            <>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 animate-pulse">
                  <div className="h-8 w-8 rounded-full bg-muted" />
                  <div className="flex-1">
                    <div className="h-4 w-24 bg-muted rounded mb-1" />
                    <div className="h-3 w-16 bg-muted rounded" />
                  </div>
                </div>
              ))}
            </>
          ) : members.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No active members
            </div>
          ) : (
            <>
              {members.map((member) => (
                <MemberItem
                  key={member.principal.toString()}
                  principal={member.principal}
                  isActive={member.isActive}
                  isOwner={member.principal.toString() === serverOwnerId}
                  currentUserIsOwner={currentUserIsOwner}
                />
              ))}
            </>
          )}
        </div>
      </ScrollArea>

      {currentUserIsOwner && (
        <div className="p-3 border-t border-border bg-muted/30">
          <p className="text-xs text-muted-foreground text-center">
            <Shield className="h-3 w-3 inline mr-1" />
            You are the server owner
          </p>
        </div>
      )}
    </div>
  );
}
