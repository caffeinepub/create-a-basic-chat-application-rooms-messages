import { useState, useEffect } from 'react';
import { useGetCallerUserProfile, useSaveCallerUserProfile } from '../../hooks/useUserProfile';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import UserAvatar from './UserAvatar';
import { Upload, X, User, Palette, Image as ImageIcon } from 'lucide-react';
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
  { bg: '#65A30D', text: '#FFFFFF', label: 'Lime' },
  { bg: '#7C3AED', text: '#FFFFFF', label: 'Violet' },
  { bg: '#0D9488', text: '#FFFFFF', label: 'Teal' },
  { bg: '#C026D3', text: '#FFFFFF', label: 'Fuchsia' },
];

export default function ProfileEditorDialog({ open, onOpenChange }: ProfileEditorDialogProps) {
  const { data: currentProfile } = useGetCallerUserProfile();
  const saveProfile = useSaveCallerUserProfile();
  
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[0]);
  const [profilePicture, setProfilePicture] = useState<ExternalBlob | undefined>(undefined);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Rehydrate form state whenever dialog opens or profile changes
  useEffect(() => {
    if (open) {
      if (currentProfile) {
        setName(currentProfile.name);
        setBio(currentProfile.bio);
        const matchingColor = AVATAR_COLORS.find(
          c => c.bg === currentProfile.backgroundColor
        );
        if (matchingColor) {
          setSelectedColor(matchingColor);
        }
        
        // Handle profile picture: if it exists in saved profile, use it
        if (currentProfile.profilePicture) {
          setProfilePicture(currentProfile.profilePicture);
          setPreviewUrl(currentProfile.profilePicture.getDirectURL());
        } else {
          // Explicitly clear if saved profile has no picture
          setProfilePicture(undefined);
          setPreviewUrl(null);
        }
      } else {
        // Reset to defaults when no profile exists (create mode)
        setName('');
        setBio('');
        setSelectedColor(AVATAR_COLORS[0]);
        setProfilePicture(undefined);
        setPreviewUrl(null);
      }
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
      toast.error('Image must be smaller than 5MB');
      return;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      const blob = ExternalBlob.fromBytes(uint8Array).withUploadProgress((percentage) => {
        setUploadProgress(percentage);
      });

      setProfilePicture(blob);
      
      // Create preview URL
      const blobUrl = URL.createObjectURL(file);
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(blobUrl);
      
      toast.success('Image selected successfully');
    } catch (error) {
      console.error('Failed to process image:', error);
      toast.error('Failed to process image');
    } finally {
      setUploadProgress(0);
    }
  };

  const handleRemovePicture = () => {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setProfilePicture(undefined);
    setPreviewUrl(null);
    toast.success('Profile picture removed');
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
      profilePicture: profilePicture,
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

  // Preview profile for live updates
  const previewProfile: UserProfile = {
    name: name || 'Your Name',
    bio: bio,
    avatarType: 'default',
    color: selectedColor.text,
    backgroundColor: selectedColor.bg,
    textOverlays: (name || 'Y').charAt(0).toUpperCase(),
    profilePicture: profilePicture,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Customize Your Profile
          </DialogTitle>
          <DialogDescription>
            Personalize your account with a unique name, bio, avatar color, and profile picture.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">
                <User className="h-4 w-4 mr-2" />
                Basic Info
              </TabsTrigger>
              <TabsTrigger value="appearance">
                <Palette className="h-4 w-4 mr-2" />
                Appearance
              </TabsTrigger>
              <TabsTrigger value="picture">
                <ImageIcon className="h-4 w-4 mr-2" />
                Picture
              </TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 py-4">
              <div className="flex justify-center mb-4">
                <UserAvatar profile={previewProfile} size="lg" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Display Name *</Label>
                <Input
                  id="name"
                  placeholder="Enter your display name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={saveProfile.isPending}
                  maxLength={50}
                />
                <p className="text-xs text-muted-foreground">
                  This is how others will see you in TerrorChat
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell others about yourself..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  disabled={saveProfile.isPending}
                  rows={4}
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground">
                  {bio.length}/500 characters
                </p>
              </div>
            </TabsContent>

            <TabsContent value="appearance" className="space-y-4 py-4">
              <div className="flex justify-center mb-4">
                <UserAvatar profile={previewProfile} size="lg" />
              </div>

              <div className="space-y-2">
                <Label>Avatar Color</Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Choose a color for your avatar background
                </p>
                <div className="grid grid-cols-4 gap-3">
                  {AVATAR_COLORS.map((color) => (
                    <button
                      key={color.bg}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      disabled={saveProfile.isPending}
                      className={`
                        relative h-16 rounded-lg transition-all
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
            </TabsContent>

            <TabsContent value="picture" className="space-y-4 py-4">
              <div className="flex justify-center mb-4">
                <UserAvatar profile={previewProfile} size="lg" />
              </div>

              <div className="space-y-2">
                <Label>Profile Picture</Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Upload a custom profile picture (optional)
                </p>

                {previewUrl ? (
                  <div className="space-y-3">
                    <div className="relative w-full aspect-square max-w-xs mx-auto rounded-lg overflow-hidden border-2 border-border">
                      <img 
                        src={previewUrl} 
                        alt="Profile preview" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={handleRemovePicture}
                      disabled={saveProfile.isPending}
                      className="w-full"
                    >
                      <X className="mr-2 h-4 w-4" />
                      Remove Picture
                    </Button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <Label htmlFor="picture-upload" className="cursor-pointer">
                      <span className="text-sm text-primary hover:underline">
                        Click to upload
                      </span>
                      <span className="text-sm text-muted-foreground"> or drag and drop</span>
                    </Label>
                    <p className="text-xs text-muted-foreground mt-2">
                      PNG, JPG, GIF up to 5MB
                    </p>
                    <Input
                      id="picture-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      disabled={saveProfile.isPending}
                      className="hidden"
                    />
                  </div>
                )}

                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Uploading...</span>
                      <span className="text-foreground font-medium">{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-primary h-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={saveProfile.isPending}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={saveProfile.isPending || !name.trim()}
            >
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
