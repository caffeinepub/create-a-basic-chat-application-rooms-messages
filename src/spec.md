# Specification

## Summary
**Goal:** Add room-scoped WebRTC voice chat (polling-based signaling) and enable viewing other users’ profiles including profile pictures.

**Planned changes:**
- Add backend canister methods for room-scoped voice signaling: start/create session, join/leave/end, post SDP/ICE messages, and fetch messages incrementally for polling, with authentication + room-membership access control.
- Add a room-level frontend “Voice” UI that uses WebRTC in the browser and React Query polling to connect, including Join/Leave and Mute/Unmute, plus clear English error states and retry.
- Add a frontend user profile view reachable from message sender identity and Friends list entries, showing profile picture (or fallback), display name, and bio with sensible fallbacks and stable error handling.
- Ensure backend profile reads for other authenticated users reliably return profiles (or null) and allow frontend rendering of profile picture blobs via direct URLs without trapping.

**User-visible outcome:** Users can start/join voice chat within a room using a Voice control, mute/unmute and leave, and they can click on a sender or friend to view that user’s profile (picture, display name, bio) with robust fallbacks and error messages.
