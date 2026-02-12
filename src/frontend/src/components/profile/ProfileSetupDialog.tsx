import { useState } from 'react';
import { useSaveCallerUserProfile } from '../../hooks/useUserProfile';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import type { UserProfile } from '../../backend';

export default function ProfileSetupDialog() {
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
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
      color: '#FFFFFF',
      backgroundColor: '#D97706',
      textOverlays: trimmedName.charAt(0).toUpperCase(),
    };

    try {
      await saveProfile.mutateAsync(profile);
      toast.success('Profile created successfully!');
    } catch (error) {
      console.error('Failed to save profile:', error);
      toast.error('Failed to create profile. Please try again.');
    }
  };

  return (
    <Dialog open={true}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Welcome! 👋</DialogTitle>
          <DialogDescription>
            Let's get you set up. Tell us a bit about yourself.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Display Name</Label>
              <Input
                id="name"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                disabled={saveProfile.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Bio (optional)</Label>
              <Textarea
                id="bio"
                placeholder="Tell us about yourself..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                disabled={saveProfile.isPending}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={saveProfile.isPending || !name.trim()}>
              {saveProfile.isPending ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Creating...
                </>
              ) : (
                'Continue'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
