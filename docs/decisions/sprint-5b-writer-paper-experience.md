# Sprint 5B — Writer Paper Experience

Status: LOCKED
Date: 2026-08-17

## Scope

This Sprint 5B slice is visual-only. The full authenticated writer workspace is a continuation of the İlkOku login/landing purple identity, while the manuscript itself keeps the white-paper/typewriter experience.

- Every `AppShell` surface rendered for the `writer` role uses the canonical İlkOku purple/night palette, including the sidebar, header, dashboard, writer cards, work lists, writer tables, controls, statuses and writer-specific work surfaces.
- The writer role theme is scoped by role rather than by a fixed route list, so future writer workspace pages inherit the same identity without affecting reader, editor, publisher or admin roles.
- Writer production/manuscript surfaces use a white/paper-like visual language inside the purple workspace shell.
- Literary content typography uses a typewriter/monospace stack.
- Work title, chapter title, manuscript body, chapter names, writing statistics values, and editing date/time may use the typewriter stack.
- Navigation, buttons, form controls, status labels, toolbar actions, focus controls, and other functional UI keep the existing readable system/Inter typography.
- Canonical İlkOku brand palette: primary `#6847E8`, strong `#4B2DBF`, bright `#8065F2`, night `#11102F`, night-soft `#242052`, lavender `#EDE9FF`, lavender-soft `#F8F6FF`.
- The login page uses the same canonical İlkOku purple for its accent, focus, link and primary-action language without changing authentication behavior.
- The writer canvas should feel like a modern manuscript page inside a branded writer workspace, not a notebook or decorative vintage theme.
- Mobile/tablet behavior must remain usable.

## Hard exclusions

Do not change product behavior, data model, publish semantics, autosave, chapter lifecycle, permissions, security boundaries, CMS, discovery logic, reader, editor, publisher, admin, or any other non-writer product behavior in this slice.

If a blocker requires behavior outside this scope, stop and ask before implementing it.
