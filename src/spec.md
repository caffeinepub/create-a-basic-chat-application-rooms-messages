# Specification

## Summary
**Goal:** Add additional theme options in Settings, including a new “Black” theme that correctly applies a black-focused CSS variable palette across the app.

**Planned changes:**
- Extend the Settings Theme dropdown to include a new option labeled “Black” and wire it to the existing next-themes mechanism using a stable theme value (e.g., `black`).
- Add a corresponding `.black` theme class in `frontend/src/index.css` defining a near-true black `--background` and updated related variables (e.g., `--foreground`, `--card`, `--border`, `--muted`) to maintain readability and consistent UI styling.
- Ensure existing theme options (Light, Dark, System Default) continue working unchanged.

**User-visible outcome:** Users can select “Black” in Settings and see the entire UI (header, sidebar, dialogs, message thread, inputs) switch to a readable black theme without breaking contrast.
