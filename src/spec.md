# Specification

## Summary
**Goal:** Remove the profile flag badge feature from both backend and frontend while preserving existing user profile data during upgrade.

**Planned changes:**
- Backend: remove the `profileFlag` field from `UserProfile` and delete all flag-related validation/sanitization/allowlist logic from profile APIs.
- Backend: add an upgrade-safe, conditional state migration so older deployed state containing `profileFlag` can be upgraded without trapping, preserving all non-flag profile fields.
- Frontend: remove all flag badge UI from profile editing and profile display (including header greeting, message sender names, friends UI, and invites).
- Frontend: remove flag allowlist utilities and flag badge renderer usage so the app has no runtime dependency on flag assets/metadata.

**User-visible outcome:** Users can view and edit profiles normally (name, bio, avatar colors, profile picture), but no flag badge is shown or editable anywhere in the app, and existing deployments upgrade safely without losing profile data.
