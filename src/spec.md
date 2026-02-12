# Specification

## Summary
**Goal:** Add an application-level superuser/admin capability for the requesting account and introduce basic chat message search to improve usability.

**Planned changes:**
- Backend: Add a “claim first admin” mechanism for the first authenticated user, plus an admin-status query endpoint.
- Backend: Update authorization checks so admins can bypass applicable ownership/member-only restrictions while preserving existing behavior for non-admin users.
- Backend: Ensure all new/updated authorization and claim-admin errors surfaced to the UI are clear English messages.
- Frontend: Add an “Admin access” section in Settings showing current admin status and a “Claim admin access” action with English success/error toasts.
- Frontend: Show a subtle “Admin” indicator in the authenticated header when the signed-in user is an admin.
- Frontend: Add a client-side “Search messages…” input to room chat and server announcements views to filter currently loaded messages, with an English empty-state when no matches are found.

**User-visible outcome:** A signed-in user can view and (if no admin exists yet) claim admin access from Settings, see an “Admin” indicator when applicable, and search within the currently loaded messages in both room chat and server announcement threads.
