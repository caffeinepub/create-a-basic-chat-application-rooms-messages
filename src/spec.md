# Specification

## Summary
**Goal:** Add a safe, Unicode-only Flags category to the existing emoji picker so users can insert supported flag emojis into chat messages.

**Planned changes:**
- Add a dedicated "Flags" category/header to `frontend/src/components/chat/EmojiPicker.tsx` alongside existing emoji categories.
- Populate the Flags category with standard Unicode flag emoji characters, including non-recognized/partially-recognized territories only when a standard Unicode flag emoji exists.
- Ensure selecting a flag inserts the emoji into the message composer at the current cursor position anywhere the EmojiPicker is used (e.g., room chat and server chat composers).
- Curate/filter the Flags list to exclude extremist/terrorist/violent/hate-symbol flags and prevent insertion of disallowed symbols via the Flags category.

**User-visible outcome:** Users can open the emoji picker, switch to a new Flags category, and insert supported (and safety-filtered) Unicode flag emojis into their messages.
