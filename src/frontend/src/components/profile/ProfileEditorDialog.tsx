import { useState, useEffect } from 'react';
import { useGetCallerUserProfile, useSaveCallerUserProfile } from '../../hooks/useUserProfile';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import UserAvatar from './UserAvatar';
import { Upload, X } from 'lucide-react';
import type { UserProfile } from '../../backend';
import { ExternalBlob } from '../../backend';

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
  const [profilePicture, setProfilePicture] = useState<ExternalBlob | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (currentProfile) {
      setName(currentProfile.name);
      setBio(currentProfile.bio);
      const matchingColor = AVATAR_COLORS.find(
        c => c.bg === currentProfile.backgroundColor
      );
      if (matchingColor) {
        setSelectedColor(matchingColor);
      }
      if (currentProfile.profilePicture) {
        setProfilePicture(currentProfile.profilePicture);
        setPreviewUrl(currentProfile.profilePicture.getDirectURL());
      }
    } else {
      // Reset to defaults when no profile exists (create mode)
      setName('');
      setBio('');
      setSelectedColor(AVATAR_COLORS[0]);
      setProfilePicture(null);
      setPreviewUrl(null);
    }
  }, [currentProfile, open]);

  // Cleanup preview URL on unmount or when preview changes
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      const blob = ExternalBlob.fromBytes(uint8Array).withUploadProgress((percentage) => {
        setUploadProgress(percentage);
      });
      
      setProfilePicture(blob);
      
      // Clean up old preview URL
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
      
      // Create new preview URL
      const blobUrl = URL.createObjectURL(file);
      setPreviewUrl(blobUrl);
      setUploadProgress(0);
    } catch (error) {
      console.error('Failed to process image:', error);
      toast.error('Failed to process image. Please try again.');
    }
  };

  const handleRemovePicture = () => {
    setProfilePicture(null);
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
  };

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
      profilePicture: profilePicture || undefined,
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
    avatarType: 'default',
    color: selectedColor.text,
    backgroundColor: selectedColor.bg,
    textOverlays: (name || 'P').charAt(0).toUpperCase(),
    profilePicture: profilePicture || undefined,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{currentProfile ? 'Edit Profile' : 'Create Profile'}</DialogTitle>
          <DialogDescription>
            {currentProfile 
              ? 'Update your display name, bio, and avatar appearance.'
              : 'Set up your profile to get started.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="flex justify-center">
              <UserAvatar profile={previewProfile} size="lg" />
            </div>

            <div className="space-y-2">
              <Label>Profile Picture</Label>
              <div className="flex flex-col gap-2">
                {previewUrl ? (
                  <div className="relative">
                    <img 
                      src={previewUrl} 
                      alt="Profile preview" 
                      className="w-full h-32 object-cover rounded-lg border border-border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={handleRemovePicture}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors">
                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">Click to upload image</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileSelect}
                      disabled={saveProfile.isPending}
                    />
                  </label>
                )}
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                )}
              </div>
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
              <Label>Avatar Color (fallback)</Label>
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
