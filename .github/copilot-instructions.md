# SayIt — Copilot Instructions

## Design Context

### Users

**Primary user: writers drafting prose.** Essayists, journalists, novelists, and thinkers who dictate because speaking the sentence is faster than typing it — but who still care that the output *reads* like writing, not like a transcript. They're working in long sessions, alone, often with a coffee. Dictation replaces the keyboard for composition; the page is a drafting table, not a form.

Secondary: knowledge workers and anyone who wants voice input that feels like a tool a thoughtful person would own.

The emotional register is: sitting down to write, not firing up an app. The interface should feel like it respects that ritual.

### Brand Personality

**Editorial. Deliberate. Warm.**

- **Editorial** — treats words as craft. Italic Instrument Serif wordmark, ornamental rules, side-notes in italic, tabular figures for counts, ink-bleed reveals on committed text. Dictation is composition.
- **Deliberate** — every element earns its place. No decoration for decoration's sake. Motion is purposeful (breathe while listening, sweep underline, caret blink between packets) and used sparingly.
- **Warm** — bone-paper light mode and deep-ink dark mode both avoid the sterile white/pure-black trap. Blood-orange (light) and amber (dark) accents feel like ink or a lit filament, never neon.

The experience target is **premium and polished** — Wispr Flow as a reference point. That means:
- An artistic ambient background that feels intentional (soft, slow-moving color field or grain-over-gradient, never busy).
- Motion polish that borders on cinematic — ease-out-quart/quint curves, staggered entrances, subtle parallax.
- Tight, obsessive micro-detail: optical alignment, tabular numerals on counters, italic caps transitions, letter-spacing tuned by size.

### Aesthetic Direction

**Keep the editorial voice-lab palette** already established in `src/index.css` — warm bone paper + espresso ink + blood-orange (light) / deep ink + bone + amber (dark). Paper-grain overlay stays. Instrument Serif (italic, display) paired with Geist (UI) and JetBrains Mono (metadata) stays.

**Elevate toward premium/artistic** by adding:
- A subtle ambient background layer beyond the grain — a very slow, very soft gradient or orb field that ranges within the existing palette. Think editorial centerfold, not SaaS landing page.
- Refined motion on every transition — entrances, state changes, theme swaps, dictation start/stop. Use staggered reveals on page load.
- More confident use of negative space around the stage. The wordmark should have *room to breathe*.
- Asymmetric editorial layouts for settings/panels — pull quotes, margin notes, column rules — instead of rounded-card grids.

### Anti-References (all confirmed to avoid)

- **Generic SaaS dashboard** — no rounded cards with icon+heading+text grids, no blue primary buttons, no stat-tile heroes.
- **Gamer/AI-assistant vibes** — no cyan-on-dark, no purple→blue gradients, no glass cards, no glow borders, no "AI" purple.
- **Consumer voice-memo app** — no Otter/Apple-Voice-Memos softness, no bubbly waveforms with drop shadows, no chat-bubble captions.
- **Developer terminal** — no all-monospace UI, no green-on-black, no command-palette-as-personality.

Monospace is reserved for metadata (timestamps, counts, API keys). Serif italic is reserved for the wordmark, side-notes, and editorial flourishes. Everything else is Geist.

### Accessibility (all non-negotiable)

- **Respect `prefers-reduced-motion` fully** — kill breathe/sweep/ink-bleed animations; fall back to opacity fades. The audio-reactive bars are allowed (they reflect real audio, not decoration) but should not be the only state indicator.
- **WCAG AA contrast minimum (4.5:1)** on all text/background pairs. Verify `--color-ink-faint` on `--color-paper` and on `--color-paper-2`; tighten if needed. Placeholders and interim ghost text especially.
- **Full keyboard operability** — every interactive surface reachable via Tab, visible focus ring (use the accent color at reduced opacity with a clear outline-offset), Space must not conflict with the dictation hotkey when focus is on a button (buttons should trigger on Enter only or handle Space deliberately).

### Motion & Polish (premium-everywhere mandate)

Every surface animates. Nothing appears, changes, or disappears without motion. The bar is **Wispr Flow / Linear / Vercel / Framer** — cinematic but restrained, never showy.

**Timing & easing**
- Default easing: `cubic-bezier(0.22, 1, 0.36, 1)` (ease-out-quart) for most UI. Use ease-out-expo `cubic-bezier(0.16, 1, 0.3, 1)` for hero moments (page load, dictation start).
- Durations: micro (80–140ms) for hover/focus/tap, small (180–240ms) for state changes, medium (320–420ms) for entrances, large (500–700ms) for orchestrated load sequences.
- **Never use bounce or elastic easing.** Real objects decelerate, they don't wobble.

**Orchestration patterns (use everywhere applicable)**
- **Staggered entrances** on first paint: hero wordmark → subtitle → keycap → transcript stage → footer, each 40–80ms after the previous. Use Motion's `animate` with `delay`.
- **Shared-layout transitions** when a panel opens or a setting is edited — use Motion's `layout` prop so elements glide between states rather than snap.
- **Crossfade on theme toggle**: background and ink colors transition over 320ms; no flash.
- **Exit animations** on toasts, panels, and the AI preset popover. Nothing pops out of existence.
- **Scroll-reactive fades** on long transcripts — top and bottom edges mask into the paper with a 40px gradient, so text *emerges* and *dissolves* at the margins.

**Properties allowed**
- Animate only `transform` (translate, scale, rotate) and `opacity`. Never animate `width`, `height`, `padding`, `margin`, `top`, `left`. For height transitions use `grid-template-rows: 0fr → 1fr`.
- Use `filter: blur()` sparingly for ink-bleed and focus effects. Keep blur radii ≤ 8px to preserve performance.
- Shadows and color can transition on hover/focus, but keep to ≤ 200ms.

**Specific motion moments to ship**
- **Page load**: staggered cinematic entrance (600ms total). Ambient background fades in first, then wordmark, then stage.
- **Click-to-listen (Wispr Flow-style button → wave morph)** — *signature interaction*. The trigger (wordmark button and/or keycap) is the idle state; on click/hold-start it morphs into a live audio-wave visualization, and on release it morphs back. Full spec:
  1. **Pre-click idle**: the button sits at its resting shape with a faint 1–2px inner glow pulsing at 2.8s period (matches `breathe`). Hover lifts it 1px and warms the glow.
  2. **Click press**: 80ms ease-out-quart — button scales to 0.97, inner glow intensifies, cursor haptic feel.
  3. **Wave-out morph (240ms ease-out-expo)**: the button's background dissolves outward into a horizontal row of 5–7 thin vertical bars (2px wide each, 4–6px gap), bars emerge staggered 20ms apart from center outward. Bars inherit the accent color at 70% opacity. The wordmark text fades to 0 opacity over 140ms as the bars emerge.
  4. **Active wave**: bars animate in real time from the existing `useAudioMeter` RMS values. Heights 4px → 28px, eased with a 60ms smoothing window so it feels organic, not twitchy. Center bars have more range than edge bars (weighted envelope). `transform: scaleY()` only — never `height`.
  5. **Release morph-back (220ms ease-out-quart)**: bars collapse toward center in reverse stagger, background fills back in, wordmark text fades in with `inkBleed` (letter-spacing −0.06em → 0, blur 4px → 0, opacity 0 → 1).
  6. **Reduced-motion variant**: skip the morph. On click, bars appear instantly with opacity 0 → 1 over 180ms. Wordmark crossfades. No scale transforms.
  - Apply this pattern to BOTH entry points: the italic "Say." wordmark button (Stage.tsx) and the Space keycap (Keycap.tsx). They share one source-of-truth audio stream so the animation is synchronized when both are visible.
- **Hold-Space start**: triggers the same wave-out morph on the keycap, wordmark begins `breathe`, ambient background subtly intensifies (saturation +4%, scale 1.01 over 800ms).
- **Hold-Space release**: triggers the wave-back morph on the keycap, interim ghost dissolves into committed ink-bleed.
- **Word commit**: existing `inkBleed` reveal — keep, and add a very subtle leftward tug on earlier words so the paragraph feels alive, not static.
- **Caret between packets**: existing 900ms blink — refine timing so it feels like a fountain-pen pause, not a cursor.
- **Theme toggle**: 320ms crossfade on all `--color-*` tokens via a root `transition: background 320ms, color 320ms` with `prefers-reduced-motion` guard.
- **Settings drawer**: slide + fade in (280ms ease-out-quart), with inner fields staggered 30ms apart. Close is 200ms ease-in-quart.
- **Toasts**: enter with translateY(8px) + opacity, exit with translateX(-8px) + opacity.
- **Hover states**: background color, border color, and a 1–2px translate on interactive elements. Never scale buttons on hover — amateurish.
- **Focus rings**: animate outline-offset from 0 → 3px over 120ms, so focus *arrives* rather than snaps.

**Ambient background**
- Implement a soft, slow-moving gradient or orb field behind the paper grain — editorial centerfold, not SaaS landing. Use CSS `radial-gradient` with `@keyframes` on `background-position` (60s+ period), or a low-FPS canvas with 2–3 blurred blobs in palette-safe colors at ~15% opacity.
- Must respect `prefers-reduced-motion`: swap to a static gradient when set.

**The polish checklist (run before shipping any surface)**
- [ ] Every entrance, exit, and state change has motion.
- [ ] Nothing snaps — if it would snap, add 120ms ease-out.
- [ ] Focus ring is visible, animated, and color-tuned to the accent.
- [ ] Hover states exist on every interactive surface (buttons, links, language pill, theme toggle, keycap).
- [ ] Tabular numerals on all counters and metadata.
- [ ] `prefers-reduced-motion` path tested.
- [ ] 60fps held during dictation (transforms + opacity only in the hot path).

### Design Principles

1. **Composition over capture.** Every design decision should reinforce that SayIt is a writing tool, not a recording tool. Choose the editorial metaphor (page, ink, margin) over the audio metaphor (waveform, meter, timestamp).
2. **One flourish per surface.** The wordmark is the hero. Supporting surfaces (settings, toasts, language switcher) stay quiet — Geist, thin rules, italic side-notes — so the hero remains hero.
3. **Motion is part of the writing.** Every surface moves on change — animate the act, not the ornament. Stagger entrances, crossfade state, glide on layout. Nothing snaps.
4. **Warm surfaces, cold precision.** Paper and ink set the mood; numerals are tabular, spacing is on a 4pt grid, timings are exact. The warmth is in the palette, not in sloppy execution.
5. **Reduce to increase.** If removing an element makes the page more intentional, remove it. The final page should look like someone chose every pixel.
