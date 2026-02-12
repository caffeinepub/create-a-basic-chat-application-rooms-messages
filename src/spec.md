# Specification

## Summary
**Goal:** Add profile photo uploads, a friend system (search/add/requests), inviting friends to chatrooms, and inline image messages.

**Planned changes:**
- Extend the user profile model and profile read/update APIs to support either the existing color/initials avatar or an uploaded profile image.
- Update the profile editor UI to let users pick an image from device storage and save it; render uploaded avatars in the header and message threads with fallback behavior and English errors.
- Add backend APIs for searching users by unique username, sending/accepting/declining friend requests, and listing friends plus pending requests; persist per authenticated user.
- Add frontend friend search UI with actions (add/accept/decline) and clear loading/error states in English.
- Add backend support for inviting/adding friends to rooms, listing room members, and enforcing room membership for visibility and message access; preserve/clearly handle any existing public/general rooms.
- Add image attachments to chat messages: backend message model and fetch responses include image data/metadata; frontend composer supports selecting an image, previewing it, validating non-empty sends, and rendering images inline in the thread (polling remains unchanged; English errors on failure).

**User-visible outcome:** Users can upload a custom profile picture, find and add friends by username (manage requests), invite friends into their rooms with member-only access, and send/receive images inside chat threads.
