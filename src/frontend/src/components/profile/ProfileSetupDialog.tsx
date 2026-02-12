import { useState } from 'react';
import { useSaveCallerUserProfile } from '../../hooks/useUserProfile';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import UserAvatar from './UserAvatar';
import { Sparkles } from 'lucide-react';
import type { UserProfile } from '../../backend';

interface ProfileSetupDialogProps {
  open: boolean;
}

const AVATAR_COLORS = [
  { bg: '#D97706', text: '#FFFFFF', label: 'Amber' },
  { bg: '#DC2626', text: '#FFFFFF', label: 'Red' },
  { bg: '#2563EB', text: '#FFFFFF', label: 'Blue' },
  { bg: '#16A34A', text: '#FFFFFF', label: 'Green' },
  { bg: '#9333EA', text: '#FFFFFF', label: 'Purple' },
  { bg: '#EA580C', text: '#FFFFFF', label: 'Orange' },
];

export default function ProfileSetupDialog({ open }: ProfileSetupDialogProps) {
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[0]);
  const saveProfile = useSaveCallerUserProfile();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error('Please enter your name');
      return;
    }

    const profile: UserProfile = {
      name: trimmedName,
      bio: bio.trim(),
      avatarType: 'default',
      color: selectedColor.text,
      backgroundColor: selectedColor.bg,
      textOverlays: trimmedName.charAt(0).toUpperCase(),
    };

    try {
      await saveProfile.mutateAsync(profile);
      toast.success('Welcome to TerrorChat! 🎉');
      // Dialog will close automatically when userProfile becomes non-null
    } catch (error) {
      console.error('Failed to save profile:', error);
      toast.error('Failed to create profile. Please try again.');
    }
  };

  // Preview profile for live updates
  const previewProfile: UserProfile = {
    name: name || 'Your Name',
    bio: bio,
    avatarType: 'default',
    color: selectedColor.text,
    backgroundColor: selectedColor.bg,
    textOverlays: (name || 'Y').charAt(0).toUpperCase(),
  };

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-lg" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Sparkles className="h-6 w-6 text-primary" />
            Create Your Account
          </DialogTitle>
          <DialogDescription>
            Welcome to TerrorChat! Let's set up your profile to get started.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-6 py-4">
            {/* Live Preview */}
            <div className="flex flex-col items-center gap-3 p-4 bg-muted/50 rounded-lg">
              <UserAvatar profile={previewProfile} size="lg" />
              <div className="text-center">
                <p className="font-medium text-foreground">
                  {name || 'Your Name'}
                </p>
                {bio && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {bio}
                  </p>
                )}
              </div>
            </div>

            {/* Name Input */}
            <div className="space-y-2">
              <Label htmlFor="name">Display Name *</Label>
              <Input
                id="name"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={saveProfile.isPending}
                autoFocus
                maxLength={50}
              />
              <p className="text-xs text-muted-foreground">
                This is how others will see you
              </p>
            </div>

            {/* Bio Input */}
            <div className="space-y-2">
              <Label htmlFor="bio">Bio (optional)</Label>
              <Textarea
                id="bio"
                placeholder="Tell us about yourself..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                disabled={saveProfile.isPending}
                rows={3}
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground">
                {bio.length}/200 characters
              </p>
            </div>

            {/* Color Picker */}
            <div className="space-y-2">
              <Label>Avatar Color</Label>
              <p className="text-sm text-muted-foreground mb-3">
                Choose a color for your avatar
              </p>
              <div className="grid grid-cols-3 gap-3">
                {AVATAR_COLORS.map((color) => (
                  <button
                    key={color.bg}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    disabled={saveProfile.isPending}
                    className={`
                      relative h-14 rounded-lg transition-all
                      ${selectedColor.bg === color.bg 
                        ? 'ring-2 ring-primary ring-offset-2 scale-105' 
                        : 'hover:scale-105'
                      }
                    `}
                    style={{ backgroundColor: color.bg }}
                    aria-label={`Select ${color.label} color`}
                  >
                    <span className="absolute inset-0 flex items-center justify-center text-sm font-medium" style={{ color: color.text }}>
                      {color.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={saveProfile.isPending || !name.trim()} className="w-full">
              {saveProfile.isPending ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Creating Your Account...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Get Started
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
