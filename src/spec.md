# Specification

## Summary
**Goal:** Let authenticated users bookmark (save) server invite links and export their account-related data as a local JSON backup.

**Planned changes:**
- Add backend canister APIs to list/add/remove per-user saved server links (bookmarks), each with id, inviteCode, optional label, and savedAt timestamp, with caller-only access and clear English errors.
- Add React Query hooks for saved server links (list query + save/remove mutations) using the existing authenticated actor pattern, including reliable cache invalidation and normalized English errors.
- Update the server invite UI to include a “Save link” action after an invite code is generated (with sensible default label), with English success/error toasts and disabled behavior when no invite code exists.
- Extend Settings with a “Saved server links” section to view saved links and actions to Copy, Open (navigate via existing `?invite=...` pattern), and Remove (with English confirmation), plus loading/empty states.
- Extend Settings with an “Account data” section to show/copy the user’s Principal and export a client-side downloadable JSON including principal, caller profile (if available), linked alt accounts (if available), and saved server links, with English success/error toasts.

**User-visible outcome:** Users can save server invite links to a personal list, manage them from Settings (copy/open/remove), and export their account data to a JSON file for safekeeping or recovery.
