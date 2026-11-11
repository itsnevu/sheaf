# Raqio visual guide

Read this file and inspect the primary reference before creating or editing Raqio social posts, article covers, illustrations, or video artwork. This is the single source of truth for the user's current visual preference. Updated 11 November 2026.

## Current template: Blue Shadow, right overlay

**Latest user correction:** the photographic mountain image was only an example of an opacity treatment. Do not copy its mountain picture or make photographic alpine scenery the default. Apply a translucent blue overlay on the RIGHT to a topic-specific illustration.

- Primary complete template: `docs/content/assets/raqio-right-blue-overlay-template.png`.
- Original illustration style reference: `docs/content/assets/raqio-clear-release-terms-no-text.png`.
- Saved personal image template: `$artifact-template-raqio-blue-shadow` (display name: Raqio Blue Shadow). Update that same template when the user changes its direction; do not create confusing duplicate templates.
- Inspect the actual reference PNGs before generating and use the relevant ones as image references.
- Preserve the overlay treatment, type hierarchy, palette and illustration character. Create a new scene appropriate to each post rather than repeating the same mountains, bridges, or gates.
- `raqio-blue-shadow-template.png` is the superseded photo/left-shadow attempt. It must not be treated as the current reference.

## Palette and opacity treatment

- Electric blue `#0040FF` is the core visual identity.
- Ice `#F2F4FF` is the pale illustration field; navy `#00126B` supports deeper blue details and contrast.
- The RIGHT roughly 45–50% receives a semi-transparent cobalt/electric-blue overlay, deepening to navy toward the far-right edge and feathering smoothly toward the middle.
- Keep engraved detail faintly visible through the overlay. It should feel like one continuous image, with no boxed panel or hard split.
- Keep the main illustration on the LEFT relatively bright/pale. Do not silently move the dark shadow back to the left.
- White or ice is used for copy and branding within the blue overlay. Text must remain readable against the underlying art.
- Blue opacity gradients are permitted; unrelated neon, purple, pink, gold, green, warm photographic grading and glossy effects are not part of this default.

## Background and visual storytelling

- The image subject follows the tweet/article's message. Do not automatically insert a photo of mountains because the user once showed one.
- The existing illustration family is detailed blue scientific/copperplate engraving: contour lines, crosshatching, stippling, stone construction, mechanical release structures, paths, gates, celestial arcs and time dials.
- Use one strong conceptual scene tied to funding, timing, conditions, recipient access, or claiming. A small recipient figure is optional when it helps the message.
- Existing distant engraved mountains can remain as supporting scenery when appropriate. They are not a mandatory subject, and must not become a copied photographic alpine background.
- Preserve a clear focal object and room to breathe. Avoid stock-photo people, glossy 3D, generic crypto coins, floating cubes, profit charts, shields, padlocks, UI screenshots and feature-card grids unless requested.
- Old Sheaf-era `public/art/og.jpg`, `hero.jpg`, and `flow.jpg` do not override this identity.

## Type, logo and layout

- Default format: wide landscape close to 16:9, adapted when the user specifies another placement.
- Keep the focal illustration on the left. Position the copy within the right overlay with comfortable margins; it may be left-aligned within that right-hand column.
- Logo: selected white Meter symbol with the Raqio wordmark near the top of the copy column.
- Headline: white, tall narrow Barlow Condensed Light/Thin uppercase. Normally two short lines; adjust size or wrapping to fit without clipping or covering the main illustration.
- Supporting sentence: smaller white Barlow Regular beneath the headline.
- Footer: restrained white text near the bottom of the copy column: `raqio.xyz / @RaqioFi`, unless the user supplies another footer.
- Use `public/brand/meter-white.svg`, `public/brand/meter.svg`, or `brandkit/logo/meter.svg` for deterministic logo use. Do not invent a replacement mark.
- Public copy is English. Inspect exact spelling and punctuation, especially `Raqio`, `raqio.xyz`, and `@RaqioFi`.
- Current post copy: “KNOW THE TERMS.” / “BEFORE YOU CLAIM.”, with “Understand the funding, timing, and conditions behind your allocation.”
- If the user explicitly requests no writing for a particular asset, omit all text and branding for that version. Do not confuse that exception with a permanent template change.

## Content and source boundaries

- Check `docs/content/raqio-x-calendar-2026-11-10.md` before reusing items marked used. A reusable visual treatment does not authorize reposting the same finished content.
- Do not imply guaranteed returns or safety, universal token compatibility, or proposed features already being live.
- The older “YOUR TOKENS. YOUR TIMELINE.” copy is already-used content; the user's layout example does not make it a new tweet.
- Referenced Remotion sources and exports were absent from this checkout when the guide was created. Do not claim to have inspected unavailable frames. If the user supplies them later, inspect the relevant visual key, while honoring this latest correction.

## Reusable generation brief

> Create a new Raqio social illustration using the supplied current template and blue engraving reference. Develop a topic-specific conceptual scene for [MESSAGE], with its main subject on the left. Fine electric-blue #0040FF engraved linework on ice #F2F4FF, with restrained navy #00126B detail. Apply a semi-transparent blue opacity gradient ONLY on the RIGHT, deepening toward the right edge and fading smoothly toward the center; retain faint underlying art. Place the white selected Raqio Meter logo/wordmark, tall thin Barlow Condensed uppercase headline [HEADLINE], smaller Barlow Regular subtitle [SUBTITLE], and footer “raqio.xyz / @RaqioFi” within that right copy area. Keep the left illustration visible and typography legible, with comfortable margins. No copied photographic mountain scene, dark-left overlay, boxed panels, extra copy, wrong symbols, clipping, glossy 3D, neon or unrelated colors.

## Delivery and verification

1. Read this guide and view the current references before designing.
2. Generate/edit using the actual topic and approved copy, not the previous picture's subject by default.
3. Inspect the illustration, RIGHT-side opacity, type, logo, spelling, contrast, margins and factual implications.
4. Save the final PNG and its prompt under `docs/content/assets/` with a descriptive filename; preserve older versions unless replacement is requested.
5. Copy the final PNG to the user's Downloads folder without overwriting a different file. Earlier local chat links did not work as web downloads for this user.
6. Validate the PNG and report its actual dimensions and exact Downloads path.
7. If this is a template revision, update the existing personal template's retained reference and preview, plus this guide and its entry-point rules. Do not leave the previous mistaken direction active.
8. Do not publish, schedule, commit or push merely because a visual/template was requested.
