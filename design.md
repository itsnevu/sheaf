# Sheaf — design

Sheaf is the private execution desk for Robinhood Chain (chain id 4663). **Private externally. Transparent internally.** A sheaf is one controlled operation made of legs, executed from one desk, so the wallet that owns the funds or the eligibility never appears as the destination on-chain.

Two faces:

- **The site** (`/`, `/docs`, `/security`, `/privacy`, sign-in): four pages, each built as one of the aquirin.com instruments. The chrome is corner-anchored and the instrument fills the centre.
- **The desk** (`/app`, `/app/batches`, `/app/batches/new`, `/app/batches/[id]`, `/app/payments/[rid]`, `/app/reconciliation`, `/app/activity`, `/app/settings`): pick an operation kind, add legs by paste or CSV, validate, prepare routes, four-eyes approval, fund, execute leg by leg with retries, reconcile, export, audit trail. Roles: Owner, Desk operator, Approver, Viewer.

Four operation kinds, each backed by a contract in `contracts/`: **CLAIM** (private allocation claim, `PrivateClaim`), **ACCUMULATE** (stealth accumulation, `StealthDesk`), **OTC** (private OTC block, `OtcEscrow`), **TREASURY** (delegated treasury, `DelegatedTreasury`).

Demo mode (the default) simulates routing, funding and settlement and labels every record as simulated. Real mode quotes routes from Relay and signs with the connected wallet.

## Principles

1. **Restraint.** White page, black text, one signal red. Zero border radius, no drop shadows. Hierarchy comes from position and case, not size.
2. **Monospace for everything.** Sheaf reads like lab equipment. Numbers, addresses, statuses, labels and headings are all mono and upper case.
3. **Instruments, not pages.** Each marketing route is a physical device on screen (printer, reader, fiche viewer). Chrome gets out of the way once the instrument is up.
4. **Say what stays visible.** Privacy means the owning wallet is not the destination. Amounts, timing and the desk contract address are public, and the words "anonymous", "untraceable" and "unlinkable" are never used. Stock Token transfer restrictions are stated wherever a fresh address is offered.
5. **State the mechanism.** Copy says what each contract does and what it cannot promise. Demo data is labelled. Nothing implies an execution that did not happen.
6. **One idea per scene.** Short statements, one action, one visual.

The palette history is visible in the code: `tailwind.config.ts` comments and the viewport `themeColor` (`#f6f5f1`) still describe the earlier warm off-white canvas with a teal accent (`#1d7a6f`). The current tokens are below. The dark theme was removed when the site moved to the instruments.

## Type

| Role | Face | Where |
| --- | --- | --- |
| Everything in the app and site chrome | Space Mono 400/700 (`--font-mono`) | Tailwind maps `sans`, `display` and `mono` to it. |
| Printer paper | VT323 (`--font-pixel`) | the receipt roll on `/` |
| Reader roll | Courier Prime 400/700 (`--font-type`) | `/docs` |
| Panel labels | Barlow 400/500/600 (`--font-label`) | knobs, sliders, dials |
| Loaded but unused by the tokens | Inter (`--font-sans`), Bricolage Grotesque (`--font-display`) | left over from the earlier site |

Type scale (`globals.css`, all upper case): `.display-1` `clamp(2.5rem, 5.6vw, 4.75rem)`, `.display-2` `clamp(1.875rem, 3.2vw, 3rem)`, `.title-1` `clamp(1.5rem, 2.2vw, 2.125rem)`, `.title-2` 1rem, `.title-3` 0.9375rem bold, `.lede` 1.0625–1.125rem / 1.6 in `ink-soft`, `.eyebrow` 0.6875rem tracking 0.12em in `ink-faint`, `.mono-data` 0.8125rem tabular. Body is 14px.

## Colour

Hex literals in `tailwind.config.ts` (so opacity modifiers work), mirrored as custom properties in `globals.css`.

| Token | Value | Use |
| --- | --- | --- |
| `canvas`, `surface` | `#ffffff` | page and cards |
| `field` | `#f2f2f2` | inputs, hover fills, insets |
| `line` / `line-strong` | `#d9d9d9` / `#1f1f1f` | table rules / card borders |
| `ink` / `ink-soft` / `ink-faint` | `#1f1f1f` / `#4a4a4a` / `#9a9a9a` | text hierarchy |
| `on-ink` | `#ffffff` | text on ink |
| `veil` / `veil-deep` / `veil-tint` | `#ff0000` / `#cc0000` / `#ffe9e9` | the one accent: the mark, primary hover, progress badges |
| `success` / tint | `#1f7a4d` / `#e3f3e9` | executed, reconciled |
| `warning` / tint | `#9a6700` / `#fbf0d6` | needs attention |
| `danger` / tint | `#b42318` / `#fbe6e3` | failed, destructive |
| `info` / tint | `#3352c7` / `#e6eafb` | informational |
| `night` / `night-2` / `night-line` | `#0f1012` / `#17181c` / `#2a2c33` | the `.night` section (legacy) |

Instrument colours: chalk `#dcddde` and blackish `#1e1e1e` for the fiche bezel; printer body `#e6e7e8`, dark `#414042`, dial `#bcbec0`, red `#ff0000`; readout green `#9fe7b4` on `#101410`; reader body `#e9eaeb → #dedfe1`.

Radii are `0` everywhere (`panel`, `card`, `pill` tokens are all `0px`); the only rounded things are instrument parts. Shadows `raised` and `lifted` are `none`; `inset` and `focus` remain. Selection is ink on white inverted. Focus is a 1px ink outline offset 3px.

## The site: four instruments

Navigation on every site page is `PrintNav`: a red hamburger of three 70×8px bars top-left that morphs into a crossed mark when open. The menu is a thin-bordered white box with a mono list of codes: `__Index`, `APP_###`, `DOCS_###`, `SEC_###`, `PRIV_###`, `SIGN_IN` (or `OPEN_APP` when signed in). The current item is dimmed. Contact links sit bottom-right. The centre of the viewport is empty until the instrument fills it.

| Route | Instrument | Design |
| --- | --- | --- |
| `/` | **Printer** (`components/print/Printer.tsx`, `styles/print.css`) | A draggable grey printer widget (203×142px) with a round print button, blend tabs, two number scrollers and a vertical dial label. Nothing prints until the power button is pressed. Pages cover the product, the four operations, how a sheaf runs, a sample operation, security, docs and start. Output is rendered to a black paper roll (`min(640px, 92vw)`, pixel font) with a zig-zag torn edge; the LED blinks and the red print head sweeps while busy. Strips of the roll are links (`OPEN >` on hover). |
| `/docs` | **Reader** (`components/reader/Reader.tsx`, `styles/reader.css`) | A 613×899px handheld centred on the sheet and scaled to fit, tilting with the pointer in 3D. Documentation scrolls on its roll in the typewriter face. |
| `/security` | **Fiche** (`components/fiche/Fiche.tsx`, `styles/fiche.css`) | An 878×878px microfiche viewer: chalk bezel, blackish body, a square glass screen with dust, scanlines, grain and a glass highlight that follows the pointer. Rotary knobs (`ns-resize`), a vertical range slider with ticks, a green LED readout and a red lamp. Every control works by touch. |
| `/privacy`, sign-in | **Index sheet** (`styles/sheet.css`) | A white sheet, a 640px mono column at 15px / 1.7, a grey code title (`PRIV_### · Privacy notice`), sections with `__` headings, contact links bottom-right. |

Site motion: instruments arrive like a print (a top-to-bottom `clip-path` reveal over 520ms) and leave with a 180ms fade; menu items stagger in 28ms apart; the printer shakes while busy; knobs scale on drag. All of it collapses under `prefers-reduced-motion`.

## The app

`AppShell` wraps every `/app` route with the signed-in user, their capabilities by role (owner, desk operator, approver, viewer) and the demo banner. Operations open with a four-card kind picker (CLAIM, ACCUMULATE, OTC, TREASURY) drawn with the same `.card` and `.btn` primitives; the stepper reads Legs → Validate → Route → Approve → Fund → Execute → Reconcile. Components (`components/app/*`): `BatchStepper`, `CsvUpload` (with a worker), `RecipientTable`, `ReviewPanel`, `ExecutionPanel`, `RealExecutionConsole`, `ActivityFeed`, `WalletSettings`, `PageHeader`.

Primitives (`globals.css`): `.btn` (mono upper case, tracking 0.1em, 2.5rem min height; `primary`, `accent`, `secondary`, `ghost`, `danger`, `sm`, `lg`), `.input` (ink border, veil on focus, danger when invalid), `.label`, `.help`, `.error-text`, `.card` / `.panel` (ink border), `.inset`, `.table` (eyebrow headers, line rules, hover tint), `.badge` (`neutral`, `info`, `progress` with a pulsing dot, `success`, `warning`, `danger`), `.skeleton` (shimmer), `dialog.dialog` (blurred backdrop), `.link` (underline offset 4). Containers are `container-site` (1200px) and `container-wide` (1360px).

## Research

- `docs/research/earnhop-design-research.md`: the principles adopted from the HOP reference (one accent, mono for data, one idea per scene, hard restraint on radii and shadows, hover gated behind `hover: hover`).
- The instrument pages follow the four instruments of aquirin.com; the observations are in the sibling study in the Cabalwatcher repository (`docs/reference-aquirin.md`).

## Stack and files

Next.js 14 (App Router), React 18, Tailwind 3, Prisma 5 (SQLite in development, PostgreSQL in production), wagmi 2, viem 2, react-three-fiber, Vitest, Playwright.

- Tokens: `tailwind.config.ts`, `src/app/globals.css`
- Instrument styles: `src/styles/{print,reader,fiche,sheet}.css`
- Instrument fonts: `src/components/print/fonts.ts`
- Layout and site fonts: `src/app/layout.tsx`
- App shell: `src/app/app/layout.tsx`, `src/components/app/AppShell.tsx`

`lancefield/` is a separate product in this repository with its own `BRAND.md` and `design.md`.
