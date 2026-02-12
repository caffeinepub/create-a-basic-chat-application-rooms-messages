import { useState, useRef } from 'react';
import { useSetServerIcon } from '../../hooks/useServers';
import { useGenerateServerInvite } from '../../hooks/useServerInvites';
import { useSetServerBio, useSetServerBanner, useSetServerAccentColor } from '../../hooks/useServerCustomization';
import { useSaveServerLink } from '../../hooks/useSavedServerLinks';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, X, Save, Link2, Copy, Check, Bookmark } from 'lucide-react';
import { toast } from 'sonner';
import ServerAvatar from './ServerAvatar';
import type { Server } from '../../backend';
import { ExternalBlob } from '../../backend';

interface ServerViewProps {
  server: Server;
  isOwner: boolean;
}

export default function ServerView({ server, isOwner }: ServerViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const setServerIcon = useSetServerIcon();
  const setServerBio = useSetServerBio();
  const setServerBanner = useSetServerBanner();
  const setServerAccentColor = useSetServerAccentColor();
  const generateInvite = useGenerateServerInvite();
  const saveServerLink = useSaveServerLink();
  
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [bannerUploadProgress, setBannerUploadProgress] = useState<number | null>(null);
  const [editingBio, setEditingBio] = useState(false);
  const [bioText, setBioText] = useState(server.bio || '');
  const [editingAccentColor, setEditingAccentColor] = useState(false);
  const [accentColorValue, setAccentColorValue] = useState(server.accentColor || '#404eed');
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleBannerUploadClick = () => {
    bannerInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be smaller than 5MB');
      return;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      
      const blob = ExternalBlob.fromBytes(bytes).withUploadProgress((percentage) => {
        setUploadProgress(percentage);
      });

      await setServerIcon.mutateAsync({ serverId: server.id, icon: blob });
      
      setUploadProgress(null);
      toast.success('Server icon updated successfully!');
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      console.error('Failed to upload server icon:', error);
      setUploadProgress(null);
      const errorMessage = error?.message || 'Failed to upload server icon. Please try again.';
      toast.error(errorMessage);
    }
  };

  const handleBannerFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Banner must be smaller than 10MB');
      return;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      
      const blob = ExternalBlob.fromBytes(bytes).withUploadProgress((percentage) => {
        setBannerUploadProgress(percentage);
      });

      await setServerBanner.mutateAsync({ serverId: server.id, banner: blob });
      
      setBannerUploadProgress(null);
      setBannerPreview(null);
      toast.success('Server banner updated successfully!');
      
      if (bannerInputRef.current) {
        bannerInputRef.current.value = '';
      }
    } catch (error: any) {
      console.error('Failed to upload server banner:', error);
      setBannerUploadProgress(null);
      const errorMessage = error?.message || 'Failed to upload server banner. Please try again.';
      toast.error(errorMessage);
    }
  };

  const handleClearIcon = async () => {
    try {
      await setServerIcon.mutateAsync({ serverId: server.id, icon: null });
      toast.success('Server icon cleared successfully!');
    } catch (error: any) {
      console.error('Failed to clear server icon:', error);
      const errorMessage = error?.message || 'Failed to clear server icon. Please try again.';
      toast.error(errorMessage);
    }
  };

  const handleClearBanner = async () => {
    try {
      await setServerBanner.mutateAsync({ serverId: server.id, banner: null });
      setBannerPreview(null);
      toast.success('Server banner cleared successfully!');
    } catch (error: any) {
      console.error('Failed to clear server banner:', error);
      const errorMessage = error?.message || 'Failed to clear server banner. Please try again.';
      toast.error(errorMessage);
    }
  };

  const handleSaveBio = async () => {
    if (bioText.length > 500) {
      toast.error('Bio must be 500 characters or less');
      return;
    }

    try {
      await setServerBio.mutateAsync({ serverId: server.id, bio: bioText });
      setEditingBio(false);
      toast.success('Server bio updated successfully!');
    } catch (error: any) {
      console.error('Failed to update server bio:', error);
      const errorMessage = error?.message || 'Failed to update server bio. Please try again.';
      toast.error(errorMessage);
    }
  };

  const handleSaveAccentColor = async () => {
    if (!/^#[0-9A-Fa-f]{6}$/.test(accentColorValue)) {
      toast.error('Please enter a valid hex color (e.g., #404eed)');
      return;
    }

    try {
      await setServerAccentColor.mutateAsync({ serverId: server.id, accentColor: accentColorValue });
      setEditingAccentColor(false);
      toast.success('Server accent color updated successfully!');
    } catch (error: any) {
      console.error('Failed to update server accent color:', error);
      const errorMessage = error?.message || 'Failed to update server accent color. Please try again.';
      toast.error(errorMessage);
    }
  };

  const handleGenerateInvite = async () => {
    try {
      const code = await generateInvite.mutateAsync(server.id);
      setInviteCode(code);
      toast.success('Invite link generated!');
    } catch (error: any) {
      console.error('Failed to generate invite:', error);
      toast.error(error?.message || 'Failed to generate invite link');
    }
  };

  const handleCopyInvite = async () => {
    if (!inviteCode) return;
    
    const inviteUrl = `${window.location.origin}${window.location.pathname}?invite=${encodeURIComponent(inviteCode)}`;
    
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast.success('Invite link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy invite link:', error);
      toast.error('Failed to copy invite link');
    }
  };

  const handleSaveLink = async () => {
    if (!inviteCode) return;

    try {
      await saveServerLink.mutateAsync({ serverId: server.id, code: inviteCode });
      toast.success('Server link saved successfully!');
    } catch (error: any) {
      console.error('Failed to save server link:', error);
      toast.error(error?.message || 'Failed to save server link');
    }
  };

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex-1 overflow-y-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Server Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Server Banner */}
            {server.banner && (
              <div className="relative w-full h-32 rounded-lg overflow-hidden border border-border">
                <img
                  src={server.banner.getDirectURL()}
                  alt="Server banner"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Server Icon and Name */}
            <div className="flex items-center gap-4">
              <ServerAvatar server={server} size="lg" />
              <div>
                <h2 className="text-2xl font-bold text-foreground">{server.name}</h2>
                <p className="text-sm text-muted-foreground">
                  Created {new Date(Number(server.createdAt) / 1000000).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Server Bio */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">About</h3>
              {!isOwner || !editingBio ? (
                <div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {server.bio || 'No description yet.'}
                  </p>
                  {isOwner && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setBioText(server.bio || '');
                        setEditingBio(true);
                      }}
                      className="mt-2"
                    >
                      Edit Bio
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Textarea
                    value={bioText}
                    onChange={(e) => setBioText(e.target.value)}
                    placeholder="Describe your server..."
                    className="min-h-[100px]"
                    maxLength={500}
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {bioText.length}/500 characters
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setBioText(server.bio || '');
                          setEditingBio(false);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSaveBio}
                        disabled={setServerBio.isPending}
                        className="gap-2"
                      >
                        <Save className="h-4 w-4" />
                        Save
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Accent Color Preview */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">Accent Color</h3>
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded border border-border"
                  style={{ backgroundColor: server.accentColor }}
                />
                <span className="text-sm text-muted-foreground font-mono">
                  {server.accentColor}
                </span>
              </div>
            </div>

            {/* Invite Section - Available to all members */}
            <div className="space-y-4 pt-4 border-t border-border">
              <h3 className="text-sm font-semibold text-foreground">Invite</h3>
              <p className="text-sm text-muted-foreground">
                Generate an invite link to share with others so they can join this server.
              </p>
              
              {!inviteCode ? (
                <Button
                  onClick={handleGenerateInvite}
                  disabled={generateInvite.isPending}
                  className="gap-2"
                >
                  {generateInvite.isPending ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Link2 className="h-4 w-4" />
                      Generate Invite Link
                    </>
                  )}
                </Button>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      value={`${window.location.origin}${window.location.pathname}?invite=${inviteCode}`}
                      readOnly
                      className="font-mono text-xs"
                    />
                    <Button
                      onClick={handleCopyInvite}
                      variant="outline"
                      size="icon"
                      className="flex-shrink-0"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      onClick={handleSaveLink}
                      variant="outline"
                      size="icon"
                      className="flex-shrink-0"
                      disabled={saveServerLink.isPending}
                      title="Save link"
                    >
                      <Bookmark className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Share this link with others to invite them to the server.
                  </p>
                </div>
              )}
            </div>

            {/* Owner Controls */}
            {isOwner && (
              <div className="space-y-6 pt-4 border-t border-border">
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-foreground">Server Icon</h3>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={handleUploadClick}
                      disabled={setServerIcon.isPending || uploadProgress !== null}
                      className="gap-2"
                    >
                      {uploadProgress !== null ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          Uploading {uploadProgress}%
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4" />
                          Upload Icon
                        </>
                      )}
                    </Button>
                    
                    {server.icon && (
                      <Button
                        variant="outline"
                        onClick={handleClearIcon}
                        disabled={setServerIcon.isPending || uploadProgress !== null}
                        className="gap-2"
                      >
                        <X className="h-4 w-4" />
                        Clear Icon
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Upload a square image (max 5MB). Recommended size: 512x512px.
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-foreground">Server Banner</h3>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={handleBannerUploadClick}
                      disabled={setServerBanner.isPending || bannerUploadProgress !== null}
                      className="gap-2"
                    >
                      {bannerUploadProgress !== null ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          Uploading {bannerUploadProgress}%
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4" />
                          Upload Banner
                        </>
                      )}
                    </Button>
                    
                    {server.banner && (
                      <Button
                        variant="outline"
                        onClick={handleClearBanner}
                        disabled={setServerBanner.isPending || bannerUploadProgress !== null}
                        className="gap-2"
                      >
                        <X className="h-4 w-4" />
                        Clear Banner
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Upload a wide image (max 10MB). Recommended size: 1920x320px.
                  </p>
                  <input
                    ref={bannerInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleBannerFileChange}
                    className="hidden"
                  />
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-foreground">Accent Color</h3>
                  {!editingAccentColor ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setAccentColorValue(server.accentColor || '#404eed');
                        setEditingAccentColor(true);
                      }}
                    >
                      Change Color
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <Input
                        type="text"
                        value={accentColorValue}
                        onChange={(e) => setAccentColorValue(e.target.value)}
                        placeholder="#404eed"
                        className="font-mono"
                      />
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setAccentColorValue(server.accentColor || '#404eed');
                            setEditingAccentColor(false);
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSaveAccentColor}
                          disabled={setServerAccentColor.isPending}
                          className="gap-2"
                        >
                          <Save className="h-4 w-4" />
                          Save
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
