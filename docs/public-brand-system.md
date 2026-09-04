# İlkOku public brand system

This document is the canonical visual and emotional contract for the public İlkOku site. It records the identity already established on the live homepage so future pages extend the same world instead of inventing a new one.

## 1. Core identity

İlkOku is a **digital literature platform with the emotional weight of a book object**.

The public experience should feel:

- literary, editorial and human;
- archival and trustworthy without looking bureaucratic;
- contemporary and digital without looking like a generic SaaS dashboard;
- warm, calm and premium rather than loud or decorative;
- connected to writing, reading, editing, publishing and the recorded journey of a work.

Canonical brand thought: **“İlk cümle, ilk okurun, ilk adımın.”**

The homepage promise is the reference point: a writer can begin with a first sentence, develop a work with readers and editors, and become discoverable to publishers inside one coherent literary ecosystem.

## 2. The visual metaphor

The governing visual metaphor is **book + archive + digital terminal**.

The two worlds must be visible at the same time:

- **book / encyclopedia:** paper, covers, spine, editorial hierarchy, serif display type, restrained borders and book-like depth;
- **digital system:** terminal microcopy, monospace accents, the `>` prompt and `_` cursor, recorded process, structured evidence and precise status language.

The site must never drift fully into either extreme. It is not an antique-book imitation and it is not a hacker/terminal product.

## 3. Canonical header signature

Every canonical public page uses the shared `PublicSiteFrame -> PublicSiteHeader` surface.

The header has three roles:

1. **Left — İlkOku logo:** the real logo, unboxed, with only restrained depth/glow.
2. **Center — digital book spine:** the recessed terminal-spine reading `> DİJİTAL EDEBİYAT PLATFORMU_`.
3. **Right — account mini-terminal:** `> GİRİŞ YAP_` or `> HESABIM_`, visually part of the same terminal family.

Do not add a second global navigation bar above or below this header. Page-level back navigation, breadcrumbs and reading tools may exist when they serve local context, but they are not replacements for the global brand header.

## 4. Color language

Current production CSS is the final source of exact values. New work should stay inside these families:

- **ink / cover:** near-black violet and deep plum (`#19142d`, `#1b1435`, related values);
- **brand purple:** İlkOku violet around `#6847e8` and its darker/lighter relatives;
- **paper / cream:** warm paper surfaces around `#fffaf0`, `#f6f0e3`, `#f1e8d8`;
- **muted copy:** warm violet-grey, never cold dashboard grey;
- **terminal light:** restrained cream/lilac, not neon green.

Avoid introducing unrelated blues, cyan technology gradients, bright green terminal colors, or stark pure-white blocks unless functionally necessary.

## 5. Typography

Use typography by role, not by trend:

- **editorial display / major headings:** serif, book-like, high contrast in scale rather than ornament;
- **body and UI:** highly readable sans-serif/system typography;
- **terminal/system microcopy:** monospace only where the digital-system metaphor is intentional.

Do not render entire long-form pages in monospace. Do not turn every label into a terminal command. The contrast between literary serif and digital monospace is part of the identity.

## 6. Shape and depth

Preferred geometry:

- book/page edges, restrained radii, inset borders and subtle layered frames;
- low-noise shadows suggesting paper, cover or recessed screen depth;
- cards should read as editorial objects, not generic product widgets.

Avoid excessive pills, floating glass panels, large rounded SaaS cards, glossy gradients and decorative shadows without meaning.

## 7. Imagery

Preferred imagery:

- writing, books, paper, editorial work, readers and publishing;
- original or brand-matched illustration;
- historical/literary references when they support the story;
- real content where discovery is being represented.

Avoid generic technology stock imagery, fake dashboards, meaningless abstract AI graphics and visuals that imply capabilities the product does not have.

## 8. Motion

Motion is quiet and functional:

- terminal cursor blink is acceptable as a signature micro-animation;
- hover states may gently wake a recessed screen or lift an editorial object;
- no constant pulsing, aggressive parallax or attention-seeking animation;
- `prefers-reduced-motion` must be respected.

## 9. Content voice

The public voice is:

- clear Turkish;
- confident but not inflated;
- warm without marketing clichés;
- specific about what the platform actually does;
- careful with trust, privacy, review, publishing and visibility claims.

Never fabricate counts, publishers, reviewers, guarantees, approval states or product capabilities. Evidence-backed language is more important than promotional language.

## 10. Public vs application surfaces

The public brand frame belongs to public discovery, trust, information and legal surfaces.

Authenticated writer/editor/publisher/admin workspaces keep their own application navigation because they serve operational tasks. Book-showcase/reading toolbars may also remain contextual tools. They must not become competing global brand headers.

## 11. New-page rule

A new public page is not complete until it:

- uses the canonical public page template/frame;
- inherits the shared header and trust footer unless there is a documented exception;
- follows this visual/voice contract;
- has canonical SEO metadata and indexability intent;
- is connected to the appropriate internal-link graph;
- passes lint, production build, relevant contracts and Production Smoke;
- receives human visual QA on desktop and mobile.

If a new design requires breaking this contract, record the reason as an explicit design decision before implementation.
