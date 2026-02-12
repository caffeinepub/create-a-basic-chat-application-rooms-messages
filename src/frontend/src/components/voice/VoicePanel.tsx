import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mic, MicOff, Phone, PhoneOff, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  useVoiceSessionState,
  useStartVoiceSession,
  useEndVoiceSession,
  useSendSdpOffer,
  useSendSdpAnswer,
  useAddIceCandidate,
} from '../../hooks/useVoiceSession';
import type { RoomId } from '../../backend';

interface VoicePanelProps {
  roomId: RoomId;
  pollingInterval: number;
}

export default function VoicePanel({ roomId, pollingInterval }: VoicePanelProps) {
  const [isJoined, setIsJoined] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [micPermissionDenied, setMicPermissionDenied] = useState(false);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  const { data: sessionState, error: sessionError } = useVoiceSessionState(
    isJoined ? roomId : null,
    pollingInterval
  );
  const startSession = useStartVoiceSession();
  const endSession = useEndVoiceSession();
  const sendOffer = useSendSdpOffer();
  const sendAnswer = useSendSdpAnswer();
  const addIceCandidate = useAddIceCandidate();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
    };
  }, []);

  // Handle session state changes
  useEffect(() => {
    if (!isJoined || !sessionState) return;

    const handleSignaling = async () => {
      try {
        // If we have an offer and no answer, create answer
        if (sessionState.offer && !sessionState.answer && peerConnectionRef.current) {
          const pc = peerConnectionRef.current;
          await pc.setRemoteDescription({ type: 'offer', sdp: sessionState.offer });
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          if (answer.sdp) {
            await sendAnswer.mutateAsync({ roomId, answer: answer.sdp });
          }
        }

        // Process ICE candidates
        if (sessionState.iceCandidates && peerConnectionRef.current) {
          for (const candidate of sessionState.iceCandidates) {
            try {
              await peerConnectionRef.current.addIceCandidate({
                candidate: candidate.candidate,
                sdpMLineIndex: Number(candidate.sdpMLineIndex),
              });
            } catch (err) {
              console.warn('Failed to add ICE candidate:', err);
            }
          }
        }
      } catch (err) {
        console.error('Signaling error:', err);
      }
    };

    handleSignaling();
  }, [sessionState, isJoined, roomId, sendAnswer]);

  const handleJoin = async () => {
    setError(null);
    setMicPermissionDenied(false);

    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      // Create peer connection
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      peerConnectionRef.current = pc;

      // Add local stream tracks
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          addIceCandidate.mutate({
            roomId,
            candidate: {
              candidate: event.candidate.candidate || '',
              sdpMLineIndex: BigInt(event.candidate.sdpMLineIndex || 0),
            },
          });
        }
      };

      // Handle remote stream
      pc.ontrack = (event) => {
        // In a real implementation, you would play the remote audio here
        console.log('Received remote track:', event.track);
      };

      // Start session on backend
      await startSession.mutateAsync(roomId);

      // Create and send offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      if (offer.sdp) {
        await sendOffer.mutateAsync({ roomId, offer: offer.sdp });
      }

      setIsJoined(true);
      toast.success('Joined voice chat');
    } catch (err: any) {
      console.error('Failed to join voice chat:', err);
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setMicPermissionDenied(true);
        setError('Microphone permission denied. Please allow microphone access to use voice chat.');
      } else if (err.name === 'NotFoundError') {
        setError('No microphone found. Please connect a microphone to use voice chat.');
      } else {
        setError('Failed to join voice chat. Please try again.');
      }

      // Cleanup on error
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
    }
  };

  const handleLeave = async () => {
    try {
      // Stop local stream
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }

      // Close peer connection
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }

      // End session on backend
      await endSession.mutateAsync(roomId);

      setIsJoined(false);
      setIsMuted(false);
      setError(null);
      toast.success('Left voice chat');
    } catch (err) {
      console.error('Failed to leave voice chat:', err);
      setError('Failed to leave voice chat. Please try again.');
    }
  };

  const handleToggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
        toast.success(audioTrack.enabled ? 'Microphone unmuted' : 'Microphone muted');
      }
    }
  };

  const handleRetry = () => {
    setError(null);
    setMicPermissionDenied(false);
  };

  if (sessionError) {
    return (
      <Card className="p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to connect to voice session. Please check your connection and try again.
          </AlertDescription>
        </Alert>
        <Button onClick={handleRetry} variant="outline" size="sm" className="mt-3 w-full">
          Retry
        </Button>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Voice Chat</h3>
          {isJoined && (
            <span className="text-xs text-muted-foreground">Connected</span>
          )}
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {micPermissionDenied && (
          <div className="text-xs text-muted-foreground">
            <p className="mb-2">To enable voice chat:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Click the lock icon in your browser's address bar</li>
              <li>Allow microphone access for this site</li>
              <li>Refresh the page and try again</li>
            </ol>
          </div>
        )}

        <div className="flex gap-2">
          {!isJoined ? (
            <Button
              onClick={handleJoin}
              disabled={startSession.isPending}
              className="flex-1"
            >
              {startSession.isPending ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
              ) : (
                <Phone className="h-4 w-4 mr-2" />
              )}
              Join Voice
            </Button>
          ) : (
            <>
              <Button
                onClick={handleToggleMute}
                variant={isMuted ? 'destructive' : 'outline'}
                className="flex-1"
              >
                {isMuted ? (
                  <>
                    <MicOff className="h-4 w-4 mr-2" />
                    Unmute
                  </>
                ) : (
                  <>
                    <Mic className="h-4 w-4 mr-2" />
                    Mute
                  </>
                )}
              </Button>
              <Button
                onClick={handleLeave}
                disabled={endSession.isPending}
                variant="destructive"
                className="flex-1"
              >
                {endSession.isPending ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                ) : (
                  <PhoneOff className="h-4 w-4 mr-2" />
                )}
                Leave
              </Button>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
