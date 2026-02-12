# Specification

## Summary
**Goal:** Replace emoji-style profile flag badges with static historical flag images across the app, using a frontend-served allowlist and consistent backend validation.

**Planned changes:**
- Update `frontend/src/utils/flags.ts` so each allowed flag option uses a static image asset path (served from the frontend) instead of an emoji field, while keeping existing allowlist helper behavior and English labels.
- Update `frontend/src/components/profile/FlagBadge.tsx` to render a static flag image (with English `alt`/`title`) and continue to render nothing for missing/unknown/disallowed flags.
- Update `frontend/src/components/profile/ProfileEditorDialog.tsx` to preview and select flags using images (in the selected value and dropdown options), preserving the “None” option to clear the selection.
- Align backend `allowedFlags` in `backend/main.mo` to match the frontend’s allowed flag IDs and preserve existing sanitization behavior on save/read.
- Add required static flag image assets under `frontend/public/assets/generated/` and ensure they load directly in the browser and render crisply at small badge sizes.

**User-visible outcome:** Users see and select image-based historical flag badges (instead of emoji) in their profile editor, and the same images appear next to names anywhere flag badges are shown, with disallowed/missing flags remaining hidden.
