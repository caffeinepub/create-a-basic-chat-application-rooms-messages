import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useGetUserProfile } from '../../hooks/useUserProfile';
import UserAvatar from './UserAvatar';
import ProfileName from './ProfileName';
import { getPrincipalDisplayName, getPrincipalInitials } from '../../utils/principalDisplay';
import type { Principal } from '@icp-sdk/core/principal';
import type { UserProfile } from '../../backend';

interface ProfileViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetPrincipal: Principal;
}

export default function ProfileViewerDialog({
  open,
  onOpenChange,
  targetPrincipal,
}: ProfileViewerDialogProps) {
  const { data: profile, isLoading, error, isFetched } = useGetUserProfile(targetPrincipal);

  const principalString = targetPrincipal.toString();
  
  // Create fallback profile for when profile is missing
  const fallbackProfile: UserProfile = {
    name: getPrincipalDisplayName(principalString),
    bio: 'No profile information available',
    avatarType: 'default',
    color: '#FFFFFF',
    backgroundColor: '#9333EA',
    textOverlays: getPrincipalInitials(principalString),
    profilePicture: undefined,
  };

  const displayProfile = profile || fallbackProfile;
  const hasRealProfile = !!profile;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>User Profile</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mb-4" />
            <p className="text-sm text-muted-foreground">Loading profile...</p>
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load profile. The user may not have set up their profile yet, or there was a connection error.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            {/* Profile Picture and Name */}
            <div className="flex flex-col items-center text-center space-y-3">
              <UserAvatar profile={displayProfile} size="lg" />
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {hasRealProfile ? <ProfileName profile={displayProfile} /> : displayProfile.name}
                </h3>
                {!hasRealProfile && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Principal ID: {principalString.slice(0, 20)}...
                  </p>
                )}
              </div>
            </div>

            {/* Bio */}
            {displayProfile.bio && (
              <Card className="p-4">
                <h4 className="text-sm font-medium text-foreground mb-2">Bio</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {displayProfile.bio}
                </p>
              </Card>
            )}

            {/* Profile Picture Info */}
            {hasRealProfile && displayProfile.profilePicture && (
              <Card className="p-4">
                <h4 className="text-sm font-medium text-foreground mb-2">Profile Picture</h4>
                <img
                  src={displayProfile.profilePicture.getDirectURL()}
                  alt={`${displayProfile.name}'s profile`}
                  className="w-full rounded-lg border border-border"
                />
              </Card>
            )}

            {/* No Profile Warning */}
            {!hasRealProfile && isFetched && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This user hasn't set up their profile yet. The information shown is derived from their account identifier.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
