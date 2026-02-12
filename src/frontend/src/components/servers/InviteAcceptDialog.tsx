import { useEffect } from 'react';
import { useJoinServerWithInvite } from '../../hooks/useServerInvites';
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
import { toast } from 'sonner';

interface InviteAcceptDialogProps {
  open: boolean;
  inviteCode: string;
  onConfirm: (serverId: string) => void;
  onCancel: () => void;
}

export default function InviteAcceptDialog({
  open,
  inviteCode,
  onConfirm,
  onCancel,
}: InviteAcceptDialogProps) {
  const joinServerMutation = useJoinServerWithInvite();

  const handleConfirm = async () => {
    try {
      const serverId = await joinServerMutation.mutateAsync(inviteCode);
      toast.success('Successfully joined the server!');
      onConfirm(serverId);
    } catch (error: any) {
      console.error('Failed to join server:', error);
      toast.error(error?.message || 'Failed to join server');
      onCancel();
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Join Server?</AlertDialogTitle>
          <AlertDialogDescription>
            You've been invited to join a server. Would you like to accept this invitation?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel} disabled={joinServerMutation.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={joinServerMutation.isPending}>
            {joinServerMutation.isPending ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Joining...
              </>
            ) : (
              'Join Server'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
