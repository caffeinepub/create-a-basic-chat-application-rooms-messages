import { useState, useEffect } from 'react';
import { useGetCallerUserProfile, useSaveCallerUserProfile } from '../../hooks/useUserProfile';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import UserAvatar from './UserAvatar';
import type { UserProfile } from '../../backend';

interface ProfileEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AVATAR_COLORS = [
  { bg: '#D97706', text: '#FFFFFF', label: 'Amber' },
  { bg: '#DC2626', text: '#FFFFFF', label: 'Red' },
  { bg: '#2563EB', text: '#FFFFFF', label: 'Blue' },
  { bg: '#16A34A', text: '#FFFFFF', label: 'Green' },
  { bg: '#9333EA', text: '#FFFFFF', label: 'Purple' },
  { bg: '#EA580C', text: '#FFFFFF', label: 'Orange' },
  { bg: '#0891B2', text: '#FFFFFF', label: 'Cyan' },
  { bg: '#DB2777', text: '#FFFFFF', label: 'Pink' },
];

export default function ProfileEditorDialog({ open, onOpenChange }: ProfileEditorDialogProps) {
  const { data: currentProfile } = useGetCallerUserProfile();
  const saveProfile = useSaveCallerUserProfile();
  
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[0]);

  useEffect(() => {
    if (currentProfile) {
      setName(currentProfile.name);
      setBio(currentProfile.bio);
      const matchingColor = AVATAR_COLORS.find(
        c => c.bg === currentProfile.avatar.backgroundColor
      );
      if (matchingColor) {
        setSelectedColor(matchingColor);
      }
    }
  }, [currentProfile]);

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
      avatar: {
        avatarType: 'default',
        color: selectedColor.text,
        backgroundColor: selectedColor.bg,
        textOverlays: trimmedName.charAt(0).toUpperCase(),
      },
    };

    try {
      await saveProfile.mutateAsync(profile);
      toast.success('Profile updated successfully!');
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save profile:', error);
      toast.error('Failed to update profile. Please try again.');
    }
  };

  const previewProfile: UserProfile = {
    name: name || 'Preview',
    bio: bio,
    avatar: {
      avatarType: 'default',
      color: selectedColor.text,
      backgroundColor: selectedColor.bg,
      textOverlays: (name || 'P').charAt(0).toUpperCase(),
    },
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Update your display name, bio, and avatar appearance.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="flex justify-center">
              <UserAvatar profile={previewProfile} size="lg" />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="name">Display Name</Label>
              <Input
                id="name"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={saveProfile.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                placeholder="Tell us about yourself..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                disabled={saveProfile.isPending}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Avatar Color</Label>
              <div className="grid grid-cols-4 gap-2">
                {AVATAR_COLORS.map((color) => (
                  <button
                    key={color.bg}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className={`h-12 rounded-lg border-2 transition-all ${
                      selectedColor.bg === color.bg
                        ? 'border-foreground scale-105'
                        : 'border-border hover:border-muted-foreground'
                    }`}
                    style={{ backgroundColor: color.bg }}
                    title={color.label}
                  >
                    <span className="sr-only">{color.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saveProfile.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saveProfile.isPending || !name.trim()}>
              {saveProfile.isPending ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
