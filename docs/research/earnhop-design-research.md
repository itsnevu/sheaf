# EarnHop design research

Reference: https://www.earnhop.app/ — reviewed 21 September 2026.

## Access status (read this first)

- The live site was **not reachable** during this research. `https://www.earnhop.app/` and `https://earnhop.app/` both return HTTP 404 with the body `DEPLOYMENT_NOT_FOUND` (Vercel). DNS resolves to Vercel (`*.vercel-dns-016.com`), so the domain exists but the deployment behind it has been removed or unpublished.
- The Internet Archive holds **one** HTML capture, 13 September 2026 17:09 UTC (`web.archive.org/web/20260913170935/https://www.earnhop.app/`). Only the home page was captured; no sub-pages (`/dashboard`, `/dashboard/docs`, `/dashboard/leaderboard`, `/dashboard/whitepaper`, `/dashboard/privacy`, `/dashboard/terms`) exist in the archive.
- Method: the archived HTML (300 KB), its three Next.js CSS bundles (about 97 KB total), and headless-Chrome renders of the archived page at 1440 px and 390 px widths. JavaScript-driven scroll scenes did not fully play back through the archive, so most observations below the hero come from the markup and CSS rather than a rendered screenshot.
- The archived page's `og:url` is `breachbunny-clone.vercel.app`, and the product on the page is called **HOP** ("precision markets on Robinhood Chain"), a prediction-market product. Whatever EarnHop was intended to be, the capture that exists is this page. It is treated here purely as a visual and structural reference.

## 1. Observed design characteristics

- **Dark, single-hue world.** The whole page sits on a near-black to deep-violet field (`#000` → `#5140e1` → `#ff09fe` vertical gradient behind everything, with a fixed radial overlay `#4131a8 → #322779 → #000`). The desktop render shows a dark core with violet bloom at both edges and a faint grain.
- **One loud accent.** Calls to action use a magenta-to-violet gradient (`linear-gradient(89deg, #774bf6 1.78%, #ff07fe 85.08%)`) with an inner glow (`inset 0 0 32px hsla(0,0%,100%,.5)`) and an outer bloom. Everything else is white or grey text on the dark field. The second headline line is set in the accent colour.
- **Typewriter display, humanist body.** Display text is **Space Mono** (400/700), uppercase, tight leading (`line-height: 1`), `text-wrap: balance`. Body and UI text are **Anek Latin**. The contrast between a monospaced, all-caps headline and a soft sans body is the page's most distinctive typographic move.
- **Scroll-driven storytelling.** Sections are `min-height: 100svh` "active sections" that alternate alignment (`justify-content: flex-end` / `flex-start` on even children; centred under 768 px). The page reads as a sequence of full-viewport scenes rather than a stacked list of cards.
- **Minimal chrome.** Only three border radii in the CSS (`100%`, `9999px`, `2px`): fully round pills and circles, or almost sharp corners. Few shadows. No card grids with drop shadows.
- **Restraint in copy density.** Each scene carries one heading, one or two short paragraphs, and one link. Feature explanations are a single sentence each.

## 2. Accessible page and section structure

Order as found in the archived DOM (headings quoted verbatim):

1. **Top bar**: small live-status line ("Live precision pools on Robinhood Chain · settled in USDG ·"), wordmark, nav links (Pools, Leaderboard, How it works, Whitepaper), X/Twitter icon, "Open app" pill, hamburger "Menu" on mobile.
2. **Hero**: `h1` "Don't pick a side. / Pick the number." Two-line headline, second line in accent. One paragraph, one tag line ("Nobody is wrong. Some are just further away."), one CTA ("Open app"). Left-aligned, vertically centred, occupying the first viewport.
3. **Ticker / proof strip**: eight short one-line statements ("Forecast a number. Not up or down — the exact price.", "Closer pays more…", "Settled in USDG…") that read like a rotating marquee.
4. **Definition scene**: `h2` "HOP is a precision market." plus one paragraph.
5. **Three-step how-it-works**: three `h2` scenes ("Pick a pool / Any market, any horizon", "Post your number / Stake USDG", "Get scored / Closer pays more"), each with one paragraph and one link.
6. **Feature grid**: `h2` "What's under the hood." followed by eight `h3` feature cards (Wallet sign-in, Timing bonus, Precision scoring, Conviction, Public rules, Live price feeds, USDG settlement, Leaderboard). Every card is a link with an "Open pool" label.
7. **About / mission / stack**: three `h2` scenes ("Who we are — on-chain, by the numbers.", "Our mission: markets priced by precision.", "Built on Robinhood Chain.") and "The stack:" with three bracketed items ([Robinhood Chain], [USDG], [Your wallet]).
8. **Scroll cue**: "Scroll to see how it works" with three animated chevrons (`slideDown` 1.8 s staggered).
9. **Summary panel**: wordmark, one-line definition, two paragraphs, a bulleted list of five facts with the key word emphasised ("Settled in **USDG**", "Scoring is **public**", "House cut **3 %**").
10. **Closing / "Pools open"** CTA scene with a short paragraph.
11. **Footer**: "Features", "The app", "Open app", Leaderboard, Whitepaper, Settlement, "2026 HOP Markets", Privacy, Cookies (button), Terms, How it works, Get started.

## 3. Typography and colour observations

| Role | Observation |
|---|---|
| Display | Space Mono 700, uppercase, `line-height: 1`, balanced wrapping. Hero headline roughly 44–56 px on desktop, 28–32 px on a 390 px viewport. |
| Section labels | 14 px, weight 500, uppercase, `letter-spacing: -0.28px`, `line-height: 120%` (`scrollText`). |
| Body | Anek Latin, 16–18 px, ~1.5 line height, white at reduced opacity for secondary copy (`#a1a1a1`, `#8f8f8f`, `#9ca3af`). |
| Page field | `#000000`, `#0a0a0a`, `#131313`, `#1a1a2e` with violet `#2d257f`, `#331d9f`, `#32073e`. |
| Accent | Magenta `#ff07fe` (9 uses), violet `#774bf6` (6), red-magenta `#ff0642`/`#ff1442` for a hover variant, cyan `#00fffe` once. |
| Neutrals | `#404040`, `#262626`, `#202020` for hairlines and dividers, `#ededed`/`#e5e7eb` for text on dark. |
| Contrast | White on near-black clears WCAG AA easily. Magenta text on dark violet (second headline line) is around 4:1, borderline for small text but fine at display sizes. |

## 4. Layout and spacing observations

- Breakpoints in the CSS: 944 px (primary desktop switch), 1280 px, 1477 px, 1920 px, plus `hover: hover` guards for pointer-only effects. Below 944 px the layout is single column and centred.
- Content sits on a left-anchored column (hero text starts at roughly 5 % of viewport width at 1440 px, max width around 600 px). Alternate scenes swap to right alignment, so the eye zigzags down the page.
- Vertical rhythm is viewport-based (`100svh` sections), not padding-based. Sections are separated by scroll distance rather than dividers.
- The body has `overflow-x: hidden` to contain the full-bleed gradient overlays.

## 5. Interaction and animation observations

- Keyframes present: `fade-keyframe`, `hamburger-bar-slide` (+ reverse), `scale`, `shrink`, `slide-up-from-bottom-right`, `slideDown` (scroll chevrons).
- CTAs scale slightly on hover and carry a glow; hover behaviour is gated behind `@media (hover: hover)` so touch devices do not get sticky hover states.
- The hamburger animates its bars into a cross.
- A bottom-right floating chat/help bubble appears in the desktop render.
- Sections appear to be revealed as they enter the viewport (the archive did not run the scroll script, so timing and easing could not be measured).

## 6. Responsive design observations

- At 390 px the hero keeps the same composition (headline, paragraph, CTA) stacked with the same left margin; the headline drops to ~28 px and wraps to four lines.
- Nav collapses to a "Menu" button; the top status line is hidden.
- Display copy width is capped (`width: 600px` desktop, `310px` under 768 px) rather than fluid, which keeps line lengths short.
- No horizontal overflow observed in the mobile render.

## 7. Design principles adaptable to Sheaf

1. **One accent, used sparingly and only for action or emphasis.** Sheaf uses a single accent for primary actions and the emphasised word in headings, never for decoration.
2. **A distinctive display/body pairing.** Sheaf pairs a grotesk display with a monospace used for numbers, addresses, statuses and eyebrow labels (the inverse of HOP's mono-display choice, which suits a finance tool where the mono carries data rather than slogans).
3. **Scene-based storytelling with one idea per scene.** Each marketing section carries one heading, one paragraph and one visual. Feature descriptions are one sentence.
4. **Viewport-scaled sections and alternating alignment** to create rhythm without dividers.
5. **Hard restraint on radii and shadows.** Sheaf uses two radii (pill and 14–20 px panels) and one ink-tinted shadow scale.
6. **Proof strip under the hero** (short factual lines) becomes Sheaf's batch-status strip fed by the demo data.
7. **Copy that states the mechanism**, not the benefit ("Stakes and payouts are plain USDG transfers…"). Sheaf describes what the batch engine does and what it cannot promise.
8. **Hover effects gated behind `hover: hover`** and animations behind `prefers-reduced-motion`.

## 8. Elements that should not be copied

- The HOP/EarnHop name, wordmark, logo, favicon and OG image.
- The neon magenta-on-violet palette and glow buttons. They read as consumer crypto/gaming and contradict Sheaf's enterprise-finance positioning; Sheaf uses charcoal, warm neutrals and one restrained accent.
- The uppercase Space Mono headlines (a signature choice of the reference).
- Any copy, section titles, illustrations or the "[bracketed]" stack list styling.
- The Robinhood Chain and USDG imagery (`logo-robinhood.png`, `logo-usdg.png`, `pay-*.png` uploads) and the cloudfront illustrations (`eyeballs`, `virtual_ears`, `device_plug`), which belong to the original site.

## 9. Uncertainties and inaccessible areas

- Sub-pages (dashboard, docs, leaderboard, whitepaper, legal) were never archived and could not be inspected; nothing here describes the product UI.
- Scroll-scene timing, parallax and reveal easing could not be measured because the archive did not execute the site's scripts.
- Loading states, empty states, forms, dialogs, tables and the wallet-connect flow were not observable.
- Exact font sizes are estimated from renders; the CSS uses Tailwind utility classes whose values were only partially recoverable.
- Whether the captured page reflects the final EarnHop design, or a placeholder deployed on that domain a week before the deployment was removed, cannot be determined.
