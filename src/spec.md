# Specification

## Summary
**Goal:** Add profile customization and per-user in-app settings to the existing chat app while preserving existing user data and keeping chat functionality working.

**Planned changes:**
- Extend the backend user profile model and APIs to support display name, bio, and an avatar configuration field (e.g., emoji and/or color) for the authenticated user.
- Add a conditional backend migration to upgrade existing stored profiles from the legacy structure to the new structure with sensible defaults while preserving display names.
- Update frontend UserProfile types to match the new backend profile shape.
- Add a Profile editor UI in the main app experience to view/edit display name, bio, and avatar configuration with validation and readable English error messages.
- Add backend storage and APIs for per-user settings: theme preference (light/dark/system) and message polling interval (seconds), with defaults when unset.
- Add a Settings UI accessible from the app to change theme (applies immediately) and polling interval (updates polling behavior without refresh), persisting changes and showing readable English error messages on failures.

**User-visible outcome:** Authenticated users can open Profile and Settings from within the chat app to customize their profile (name, bio, avatar config) and control app theme and message refresh interval, with their choices saved and applied without breaking existing chats.
