# Raqio — Electric Blue Engraving

The visual system replaces the former observatory palette. Raqio's routes, wallet sign-in, permissions, operation data, fee copy and existing documentation remain in place. The later Arcom reference informs the centered hero and single sculptural focal point; no Arcom logo, copy or artwork is used.

## Tokens and type

`src/styles/tokens.css` is the color source. Electric, navy and paper alternate by section. Semantic aliases keep the existing desk components working. Tailwind reads variables rather than duplicating colors. Primary text uses ice on blue/navy and navy on paper; sky is reserved for large secondary headlines. Small metadata uses ice-85 for legibility. Ice-50 is retained for non-text rules and controls.

Display: Barlow Condensed 200/300, uppercase, -0.02em, 0.94 line height. Hero 64–112px; section titles 48–110px; cards 32–36px. Body: Barlow 400, 16px/1.55. UI: JetBrains Mono 400, 10–12px, uppercase with letter spacing. Playfair Display appears only in the showcase brand moment. All fonts use next/font and font-display swap.

Shapes are square (1px radius). Exceptions: the floating navigation, circular media controls and status dots. Borders replace card shadows. The original Raqio mark's geometry remains until a new logo is explicitly selected; the brandkit directory contains three unapproved SVG proposals.

## Components

- Section: electric/navy/paper tones; colors inherit locally.
- Navbar: full-width square bar, then a centered capsule after 120px. Mobile uses a native modal dialog, with focus trapping and Escape dismissal.
- ReleaseSculpture / ReleaseScene: lazy Three.js release engine, built from original geometry, pointer response, DPR capped at 1.5, rendering paused off-screen and when the tab is hidden. A static original SVG is present before JS and under reduced motion.
- EngravedMachine: three original SVG plates—a release press, a wheel train and a rail carriage. Hatching, mechanical construction and fine lines reinterpret the user's industrial engraving references. No external artwork is traced.
- EngravingArt: local dithered Flammarion plate, used in the showcase and editorial headers.
- GrainVideoPanel: generated CSS motion study, not a prerecorded product demonstration; pause control and explicit no-audio label.
- CodeBlock: copyable existing network settings, with feedback.
- CookieBanner: essential-only session cookies; accept/reject choice persists locally. No optional tracking is installed by either choice.
- Shared buttons, cards, inputs, tables, badges and desk navigation use the same token and shape system.

## Art sources and licenses

Anonymous, *Flammarion engraving*, first published in Camille Flammarion's *L'Atmosphère: météorologie populaire*, 1888. Source and public-domain declaration: https://commons.wikimedia.org/wiki/File:Flammarion.jpg . Original downloaded preview: https://thumb.wikimedia.org/wikipedia/commons/thumb/8/87/Flammarion.jpg/960px-Flammarion.jpg . Source is preserved at `public/art/engraving/flammarion-source.jpg`. Visible credits name the anonymous artist, year, public-domain status and Raqio's dither processing.

Rebuild: `node scripts/dither-art.mjs` (Bayer) or append `--floyd` (Floyd–Steinberg). Outputs: transparent ink plate, small particle map, normalized particle coordinates. No network is needed at build/runtime to fetch the artwork. Original mechanical SVG illustrations and the Three.js geometry are authored for Raqio.

## Motion and reliability

One easing: cubic-bezier(.16,1,.3,1). Entrances move 12px over 700ms without hiding text. Navbar morph: 400ms. Hover sweep: 600ms. Reduced motion disables decorative movement and displays the static SVG engine. Particle code (retained for optional interactive engraving) pauses off-screen and on hidden tabs. The default hero uses the Three.js engine instead.

No text depends on hydration or IntersectionObserver to become visible. Section observation adds motion only. Hero, documentation and static artwork remain readable with JavaScript disabled.

## Routes and content boundaries

Existing public routes: `/`, `/docs`, `/security`, `/privacy`, `/sign-in`, `/sign-up`. Existing private routes inherit the redesigned desk shell and primitives: overview, operations, new/detail operation, executions, payment detail, reconciliation, activity and settings. No fictional token address, tokenomics or subscription plans are created. The fee section restates the existing 25bps / 48-hour / 50bps product copy.

Docs and Security now expose the previous reader/canvas content as searchable semantic HTML. The historic desk documentation describes Elysium while the existing homepage describes Elysium vesting. That content mismatch predates this visual task and is deliberately preserved rather than silently changing the product's factual claims.

## Verification artifacts

`scripts/verify-electric-design.cjs` captures 375/768/1440px hero, showcase, features, product, fees, footer and floating navigation, plus public pages. It checks page errors, overflow, FAQ interaction, copy feedback, pause controls, mobile dialog, no-JS and reduced-motion content. Reports/screenshots: `test-results/electric-after/`. Before Home screenshots: `test-results/electric-before/`.

Typecheck and lint passed after the new engine was added. The first full browser pass (before the later centered 3D hero) returned 200 on public pages, zero page errors, no horizontal overflow and zero hidden reveal content at all three widths. Demo authentication returned 401 against the local database, so authenticated-page screenshots were not recorded in that pass. The unit suite could not start because Prisma's test-database schema engine failed; no tests passed in that attempt. Lighthouse scores must be measured on a production server; no unmeasured score is claimed.

Measured WCAG contrast ratios: ice/electric 6.03:1, ice/navy 14.75:1, navy/paper 14.42:1. The supplied sky/electric pairing measures below the 3:1 large-text threshold; electric sections therefore use an additional lighter `electric-secondary` token for secondary headlines (3.95:1). Sky remains unchanged on navy.

The first production build including the release engine succeeded. Concurrent workspace additions subsequently introduced `/app/streams` and `/app/streams/new` before their `StreamsList` / `CreateStreamForm` components existed, blocking the next production build. These unrelated routes were preserved. A separate `.next-design-preview` cache (`RAQIO_DIST_DIR`) keeps the local design preview isolated from production build artifacts. A newly added block-feed component was made deterministic for SSR and explicitly labeled simulated to avoid hydration failures and misleading live-data claims.

Final update: the concurrently authored stream components became available and the production build passed again, including stream list/new/detail routes. The final browser pass after the Three.js/SVG changes returned zero page errors, no horizontal overflow at 375/768/1440px, and visible no-JS/reduced-motion content. The public route and interaction checks passed again. Authenticated demo access still returned 401 against the local database. An existing ox/viem dynamic-dependency build warning remains. Public verification report: `test-results/electric-after/report.json`.
