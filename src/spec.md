# Specification

## Summary
**Goal:** Rebrand the app’s user-facing text and domain references from freechat.com / “Chat” to Tchat.com / “Tchat”.

**Planned changes:**
- Replace product/site name mentions in the UI from “Chat” to “Tchat” where it refers to the app branding (e.g., unauthenticated welcome headline, authenticated header title).
- Update the footer domain label and link from freechat.com to tchat.com, setting the href to https://tchat.com while keeping target="_blank" and rel="noopener noreferrer", and ensuring the footer displays “@ 2026 ai licensed tchat.com”.
- Update static page metadata (e.g., frontend/index.html title and any domain mentions) to reflect “Tchat” branding and remove any remaining freechat.com references.

**User-visible outcome:** The app presents itself as “Tchat” throughout the UI, and all visible/clickable domain references point to https://tchat.com with no remaining freechat.com mentions.
