# Appearance Feature — Implementation Plan

Status: **Plan only. Nothing implemented.**
Target repo: `anjit-afk/Upsworth-mind-route-2`
Baseline verified against: current `main`, `npx vite build` passing.

---

## 0. Purpose of this document

This is a build specification. It is written so that an implementer who has
never seen this conversation can execute it without guessing, and so that a
reviewer can tell whether the result is correct.

Where a decision has already been made, it is recorded as **LOCKED**. Where a
mistake would cause a real defect, it is recorded as a **TRAP** with the
reason. Traps are not stylistic preferences; each one describes a specific way
this feature can silently break something that currently works.

---

## 1. Locked decisions

### 1.1 Cards

| Setting | Values | Default |
|---|---|---|
| Background colour intensity | 50%–150% saturation multiplier | 100% |
| Border colour intensity | 50%–150% saturation multiplier | 100% |
| Border style | Solid, Dashed | Solid |
| Border thickness | 1, 2, 3 px | **2 px** |
| Corner radius | 0, 2, 4, 8 px | 8 px |
| Shadow | Off, Soft, Medium, Strong | **Soft** |

- **No border at rest.** The border box always exists but is `transparent`.
- **On hover** the border colours in: same hue as the card, saturation scaled by
  the border-intensity setting, lightness reduced by a fixed 25 points.
- **No hover scaling. No hover delay.** Removed from scope deliberately (see
  §9.3 for why).
- **"Borderless" is not offered for cards.** Cards are already borderless at
  rest, so the option would either do nothing or silently disable the hover
  cue. Groups keep all three styles, where borderless is meaningful.

### 1.2 Card state indicators

- **Selected:** thin outline outside the card with a gap, one fixed colour for
  all cards, plus a dark halo filling the gap so it stays visible over any
  wallpaper.
- **Focused:** same mechanism, different colour, **no animation**.
- **The infinite pulse is removed entirely.**

### 1.3 Groups

- Border style only: Solid, Dashed, Borderless.
- **No shadow. No hover effect.**

### 1.4 Canvas

| Setting | Values | Default (current behaviour) |
|---|---|---|
| Background colour | colour picker | `#1e2e1f` |
| Pattern | Dots, Grid, Squares, Plus, Hidden | Dots |
| Pattern colour | colour picker | `#4a5568` |
| Dot / mark size | 1–6 px | 1.5 px |
| Spacing | 12–64 px | 24 px |
| Pattern opacity | 0–100% | 60% |

Background colour applies on the View route too (it currently uses a different
dark grey — see §6.6).

### 1.5 Wallpaper

- Its own panel, its own storage. **Never mixed with appearance settings.**
- Fills the canvas, cropping overflow (`background-size: cover`).
- **Opacity only.** No blur, no brightness, no scale, no position control.
- On/off toggle, independent of whether an image is loaded.
- Visible in **both** the editor and the View route.
- Stored **on this device only**. Survives refresh. **Never included in any
  export or backup.**
- Oversize warning at **> 8 megapixels**, shown **once, at the moment the image
  is selected**. Warning only — the image is never modified or downscaled.

### 1.6 Presets

- 2–3 named presets covering **card and canvas settings only**.
- The wallpaper is **not** part of a preset and never changes when switching.

### 1.7 Storage and entry points

- Appearance settings: `localStorage`, device-local, never synced.
- Wallpaper image: `IndexedDB`, device-local, never synced.
- Appearance settings export/import: **its own file**, separate from mind-map
  exports.
- Both panels open from the **left sidebar**.

### 1.8 Explicitly out of scope

Do not touch these. Each is listed because it was considered and rejected.

- Card padding and font sizes (§9.1).
- Hover scaling and hover delay (§9.3).
- Blur and brightness on the wallpaper.
- Wallpaper scale/position controls.
- Syncing appearance to Firebase, or a fourth synced document kind.
- Per-workspace or per-project appearance overrides.

---

## 2. Architecture

### 2.1 The core rule

> **Global appearance values become CSS custom properties on `<main>`.
> Per-card computed colours become CSS custom properties inline on each card.
> A single CSS class consumes both.**

Rationale: the card's `className` at `src/App.jsx:8164–8170` is already a
six-condition template string. Adding six more settings as ternaries would make
it unreadable and unreviewable. With this rule, the Appearance panel writes
variables and **never edits card JSX again**.

### 2.2 The second core rule

> **`box-shadow` is for depth only. `outline` is for state only.**

Rationale in §9.2. This is not a preference — violating it produces a visual
defect that is hard to diagnose.

### 2.3 Layer order inside `<main>` (after this change)

```
<main>                          ← background colour (from setting)
  ├── wallpaper layer           ← NEW. absolute inset-0, pointer-events:none
  ├── pattern layer             ← existing dot grid, now configurable
  ├── mode badge                ← existing
  └── transform layer           ← existing. translate + scale
        ├── groups
        ├── edges (SVG)
        ├── cards
        └── images
```

The wallpaper goes **immediately before** the pattern layer, i.e. directly
after the opening of `<main>`'s children. See §9.4 for what happens if it is
placed anywhere else.

---

## 3. Data model

### 3.1 Appearance settings — `localStorage` key `cm-appearance`

Follows the existing `cm-*` convention (`src/persistenceService.js:18–39`).

```js
{
  version: 1,
  card: {
    bgIntensity: 1.0,        // 0.5 – 1.5
    borderIntensity: 1.0,    // 0.5 – 1.5
    borderStyle: 'solid',    // 'solid' | 'dashed'
    borderWidth: 2,          // 1 | 2 | 3
    radius: 8,               // 0 | 2 | 4 | 8
    shadow: 'soft'           // 'off' | 'soft' | 'medium' | 'strong'
  },
  group: {
    borderStyle: 'dashed'    // 'solid' | 'dashed' | 'none'
  },
  canvas: {
    bg: '#1e2e1f',
    pattern: 'dots',         // 'dots' | 'grid' | 'squares' | 'plus' | 'none'
    patternColor: '#4a5568',
    markSize: 1.5,           // px
    spacing: 24,             // px
    patternOpacity: 0.6      // 0 – 1
  }
}
```

### 3.2 Presets — `localStorage` key `cm-appearance-presets`

```js
{
  version: 1,
  presets: [ { id: 'p1', name: 'Presentation', settings: { /* §3.1 minus version */ } } ]
  // max 3 entries
}
```

Applying a preset replaces current settings wholesale. Saving snapshots the
current settings. **No wallpaper key ever appears here.**

### 3.3 Wallpaper — IndexedDB

```
database:      thoughtflow-appearance   (version 1)
object store:  wallpaper                (keyPath: 'id')
single record: {
                 id: 'current',
                 blob: Blob,            // the original file, unmodified
                 name: string,
                 width: number,
                 height: number,
                 addedAt: number
               }
```

Plus a small non-image record in `localStorage` key `cm-wallpaper-view`:

```js
{ version: 1, enabled: false, opacity: 1.0 }
```

Rationale for the split: the toggle and opacity are tiny and read on first
paint; the image is large and read asynchronously. Keeping the toggle in
`localStorage` means the layer can be rendered in its correct final state
before the image resolves, which prevents a flash.

---

## 4. Files

### 4.1 New files

| File | Contents |
|---|---|
| `src/appearance/defaults.js` | The default objects from §3.1 and §3.2 |
| `src/appearance/colorUtils.js` | `hexToHsl`, `hslToHex`, `adjustSaturation`, `deriveHoverBorder` |
| `src/appearance/appearanceStore.js` | Read/write/merge `cm-appearance`, presets, export/import |
| `src/appearance/wallpaperStore.js` | IndexedDB open/get/put/delete, object-URL lifecycle |
| `src/appearance/cssVars.js` | Settings object → CSS custom property object |
| `src/appearance/patterns.js` | Pattern name → `background-image` / `background-size` |
| `src/AppearancePanel.jsx` | The settings panel |
| `src/WallpaperPanel.jsx` | The image panel |
| `src/appearance/appearance.css` | `.tf-card`, `.tf-group`, state classes |

Panels follow the existing pattern (`PinPanel.jsx`, `ReminderPanel.jsx`) and
mount via `useAnimatedMount` as at `src/App.jsx:3863–3872`.

### 4.2 Modified files

| File | Location | Change |
|---|---|---|
| `src/App.jsx` | `7811` | `<main>`: replace hardcoded bg classes with inline colour + CSS vars |
| `src/App.jsx` | after `7827` | Insert wallpaper layer |
| `src/App.jsx` | `7828–7833` | Pattern layer reads from settings |
| `src/App.jsx` | `7875–7878` | Group border style from settings |
| `src/App.jsx` | `8164–8185` | Card: `.tf-card` class, per-card vars, state precedence |
| `src/App.jsx` | `8167` | **Remove the pulse animation** |
| `src/App.jsx` | `4997` | `handleImport`: reject appearance files |
| `src/App.jsx` | sidebar `7657` | Two new entries |
| `src/MiniMap.jsx` | `4–15` | Use shared colour derivation (§9.10) |
| `src/index.css` | — | `@import` the new appearance CSS |

---

## 5. Colour derivation — exact specification

In `src/appearance/colorUtils.js`. Pure functions, no React, no side effects.

```
cardBackground(themeHex, bgIntensity):
    (h, s, l) = hexToHsl(themeHex)
    s' = clamp(s * bgIntensity, 0, 100)
    return hslToHex(h, s', l)

hoverBorder(themeHex, borderIntensity):
    (h, s, l) = hexToHsl(themeHex)
    s' = clamp(s * borderIntensity, 0, 100)
    l' = clamp(l - 25, 0, 100)          // fixed 25, NOT configurable
    return hslToHex(h, s', l')
```

### Why lightness is reduced by a fixed 25 and must stay fixed

Saturation alone does not guarantee a visible border. All ten themes, computed
from the actual `cardBg` values in `src/App.jsx:93–230`:

| Theme | `cardBg` | H | S | L | L after −25 |
|---|---|---|---|---|---|
| `blue` | `#bfdbfe` | 213 | 97% | 87% | 62% |
| `green` | `#bbf7d0` | 141 | 79% | 85% | 60% |
| `pink` | `#fbcfe8` | 326 | 85% | 90% | 65% |
| `yellow` | `#fef08a` | 53 | 98% | 77% | 52% |
| `purple` | `#e9d5ff` | 269 | 100% | 92% | 67% |
| `orange` | `#fed7aa` | 32 | 98% | 83% | 58% |
| `teal` | `#99f6e4` | 168 | 84% | 78% | 53% |
| `rose` | `#fecdd3` | 353 | 96% | 90% | 65% |
| `indigo` | `#c7d2fe` | 228 | 96% | 89% | 64% |
| **`slate`** | `#e2e8f0` | 214 | **32%** | 91% | 66% |

Note `slate` at 32% saturation against 79–100% for every other theme. It is
almost colourless. Multiplying 32% by even 1.5 gives 48% at 91% lightness — a
border indistinguishable from the card it sits on. The lightness drop is what
guarantees contrast, and it does so uniformly across all ten.

**If the 25 is made configurable and a user sets it near 0, the hover effect
disappears on `slate` first and `yellow` second.** Keep it fixed.

### Verification requirement

This table was produced by running the conversion over the real values. Re-run
it after implementing `hoverBorder()` and confirm the output matches. It takes
two minutes and prevents a class of bug that is tedious to spot by eye.

---

## 6. Rendering specification

### 6.1 CSS variables on `<main>`

```js
style={{
  backgroundColor: canvas.bg,
  '--tf-card-radius':       `${card.radius}px`,
  '--tf-card-border-width': `${card.borderWidth}px`,
  '--tf-card-border-style': card.borderStyle,
  '--tf-card-shadow':       SHADOW_MAP[card.shadow],
  '--tf-sel-color':         '#ffffff',
  '--tf-focus-color':       '#818cf8',
}}
```

`SHADOW_MAP`:

```js
{
  off:    'none',
  soft:   '0 1px 3px rgba(0,0,0,0.28)',
  medium: '0 3px 8px rgba(0,0,0,0.34)',
  strong: '0 6px 16px rgba(0,0,0,0.42)'
}
```

Shadows are darker than typical web values because the canvas background is
dark. On `#1e2e1f`, a standard light shadow is invisible.

### 6.2 The card class

In `appearance.css`:

```css
.tf-card {
  border-radius: var(--tf-card-radius);
  border-width:  var(--tf-card-border-width);
  border-style:  var(--tf-card-border-style);
  border-color:  transparent;              /* no border at rest */
  box-shadow:    var(--tf-card-shadow);
  transition:    border-color 140ms ease-out;
}

.tf-card:hover {
  border-color: var(--tf-card-hover);      /* per-card, set inline */
}
```

`--tf-card-hover` is set **per card**, inline, from `hoverBorder(theme.cardBg,
borderIntensity)`. It cannot be global because it depends on that card's own
hue.

Note `transition` covers `border-color` **only**. See §9.3.

### 6.3 Card state precedence

`outline` can only render one state at a time, so precedence must be explicit.
Highest wins:

1. **Duplicate-id diagnostic** — `3px dashed #ef4444`, offset 3
   (already at `src/App.jsx:8179–8180`)
2. **Connect-hover** — green, replaces the current `ring-2 ring-green-400`
3. **Focused** — `var(--tf-focus-color)`
4. **Selected** — `var(--tf-sel-color)`
5. None

Selected and focused additionally get a dark halo appended to `box-shadow` to
fill the outline gap:

```
box-shadow: var(--tf-card-shadow), 0 0 0 3px rgba(0,0,0,0.45);
outline: 2px solid var(--tf-sel-color);
outline-offset: 3px;
```

The halo is what makes the outline readable over a light wallpaper. Without
it, a white outline on a white wallpaper is invisible.

### 6.4 Patterns — exact implementations

Two of the four patterns cannot be done with CSS gradients. This is a fact
about gradients, not a shortcut:

| Pattern | Technique | Reason |
|---|---|---|
| Dots | `radial-gradient` | Already in use, works |
| Grid | Two crossed `linear-gradient`s | Full-width stripes are exactly what grid lines are |
| Squares | **Inline SVG data URI** | A `linear-gradient` stripe spans the whole tile in the other axis, so it cannot paint an isolated 2D square |
| Plus | **Inline SVG data URI** | Same reason. Two crossed stripes produce a grid, not isolated plus marks |

```
Dots:  radial-gradient(COLOR SIZEpx, transparent SIZEpx)
       background-size: (spacing * scale) px, both axes

Grid:  linear-gradient(COLOR SIZEpx, transparent SIZEpx),
       linear-gradient(90deg, COLOR SIZEpx, transparent SIZEpx)
       background-size: (spacing * scale) px, both axes

Squares / Plus:
       url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' ...>")
```

All patterns keep the existing pan behaviour:
`backgroundPosition: ${transform.x}px ${transform.y}px`
`backgroundSize` multiplied by `transform.scale`.

Mark size does **not** scale with zoom, matching current behaviour where the
`1.5px` dot is fixed while spacing scales.

### 6.5 Wallpaper layer

```jsx
<div
  aria-hidden="true"
  style={{
    position: 'absolute',
    inset: 0,
    backgroundImage: objectUrl ? `url("${objectUrl}")` : 'none',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    opacity: wallpaperView.opacity,
    pointerEvents: 'none',
    display: (wallpaperView.enabled && objectUrl) ? undefined : 'none'
  }}
/>
```

`pointerEvents: 'none'` is mandatory — see §9.4.

### 6.6 View route background

`src/App.jsx:7811` currently reads:

```js
${isPreviewMode ? 'bg-[#282828]' : 'bg-[#1e2e1f]'}
```

**Both classes must be removed**, replaced by the inline `backgroundColor` from
§6.1. Leaving either class in place creates an unpredictable conflict between
the class and the inline style.

Keep the amber preview ring class (`ring-2 ring-inset ring-amber-400/50`).
It is accepted as croppable and is out of scope.

---

## 7. Implementation phases

Each phase is independently shippable and independently verifiable. Do not
start a phase before the previous one is verified.

### Phase 0 — Plumbing, no visible change

1. Create `defaults.js`, `colorUtils.js`, `appearanceStore.js`, `cssVars.js`.
2. Load settings on mount, **merged over defaults** (§9.5).
3. Write CSS variables onto `<main>` — with values equal to today's hardcoded
   ones.
4. Debounced write to `localStorage` (~200 ms).

**Verify:** the app looks *pixel-identical* to before. Variables visible in dev
tools. Editing `localStorage` by hand and refreshing changes nothing yet.

**Why first:** this proves the read/write/merge loop with zero visual risk. If
the app looks different at the end of Phase 0, something is wrong and it is
cheap to find now.

Also run the §5 verification across all ten themes here.

### Phase 1 — Canvas appearance

1. `patterns.js` with all five options.
2. Pattern layer at `7828` reads from settings.
3. `<main>` background from settings, both classes removed.
4. Panel shell + sidebar entry + the canvas controls.

**Verify:** each pattern renders; pan keeps the pattern aligned; zoom scales
spacing but not mark size; opacity 0 and Hidden both work; survives refresh;
background colour applies on the View route.

**Why second:** highest confidence, lowest risk, immediately visible. It proves
the whole pipeline end to end before touching cards.

### Phase 2 — Card appearance

1. `appearance.css` with `.tf-card`.
2. Card at `8164–8185`: apply the class, set per-card `--tf-card-hover` and
   computed background inline.
3. Convert **all** state indicators to `outline` per §6.3. Remove the ring
   utilities.
4. **Remove the pulse at `8167`.**
5. Panel controls for the six card settings.

**Verify:** hover colours the border on all ten themes, including `slate` and
`yellow`; nothing shifts or reflows on hover; text does not clip at border
width 3; all five states render with correct precedence; selected outline
visible on both a dark canvas and a light wallpaper; no pulsing anywhere.

### Phase 3 — Group border style

Single setting at `7875–7878`. **The drag-target state must keep forcing solid**
(§9.11).

### Phase 4 — Wallpaper

1. `wallpaperStore.js` — IndexedDB, fail-soft.
2. `cm-wallpaper-view` for toggle + opacity.
3. Wallpaper layer per §6.5.
4. `WallpaperPanel.jsx` — file picker, toggle, opacity, remove, and the
   one-time >8MP notice.

**Verify:** image survives refresh; does not move when panning; cards/groups/
edges pan over it; canvas still pans when clicking on the wallpaper area;
toggle works without losing the image; replacing revokes the old object URL;
>8MP notice appears once at selection only; private-browsing mode degrades to
"no wallpaper" without crashing; visible in editor and View route; visible in
Focus Mode.

**Why independent:** Phase 4 touches nothing from Phases 1–3. It can be built
in parallel or shipped first if the recording deadline demands it.

### Phase 5 — Presets

Save / apply / rename / delete, max 3. **No wallpaper key.**

**Why last of the settings work:** a preset serialises the settings schema.
Building it earlier means migrating stored presets every time a setting
changes.

### Phase 6 — Export / import

Separate file. **Both import paths guarded** (§9.6).

---

## 8. Verification checklist

Run before considering the feature done.

- [ ] `npx vite build` passes
- [ ] Phase 0 produced no visual change
- [ ] All ten themes give a visible hover border
- [ ] No layout shift on hover (watch text wrapping at width 3)
- [ ] All five card states, correct precedence
- [ ] Selected outline visible over a light wallpaper
- [ ] No pulsing anywhere in the app
- [ ] All five patterns; pan alignment; zoom behaviour
- [ ] Mark size clamped against spacing (§9.7)
- [ ] Wallpaper fixed while panning; objects move over it
- [ ] Canvas still pans/clicks through the wallpaper
- [ ] Wallpaper survives refresh
- [ ] Old object URLs revoked on replace
- [ ] >8MP notice once, at selection only
- [ ] IndexedDB failure does not crash the app
- [ ] Appearance import rejects a workspace file
- [ ] Workspace import rejects an appearance file
- [ ] Corrupt `cm-appearance` falls back to defaults
- [ ] MiniMap colours match canvas colours
- [ ] Focus Mode: fullscreen, wallpaper visible, no app UI
- [ ] No change to card padding or font size anywhere

---

## 9. Traps

Each item is a specific way to break something that currently works.

### 9.1 Do not change card padding or font size

`getNodeDimensions` (`src/App.jsx:853–870`) **predicts** card width from
character count:

```js
let width = 180 + Math.min(200, totalLen * 1.2);
```

There is no DOM measurement anywhere. Those coefficients are implicitly tuned
to today's `text-sm` title, `text-xs` description, and `padding: 12`. Changing
either desynchronises the predicted width from how text actually wraps,
producing clipping or dead whitespace with no feedback loop.

The predicted `height` also feeds MiniMap rendering, focus centring
(`src/App.jsx:6042`), and group hover-containment — so errors there degrade
features that are easy to miss in testing.

**No setting in this plan touches padding or font size. Keep it that way.**

### 9.2 `box-shadow` and Tailwind `ring-*` collide

Tailwind composes `ring-*` and `shadow-*` into a **single** `box-shadow`
declaration via `--tw-ring-shadow` and `--tw-shadow`. If `.tf-card` sets
`box-shadow: var(--tf-card-shadow)` while the element also carries `ring-2`,
one silently overwrites the other depending on rule order.

The card currently uses ring utilities in three states (`8167`, `8168`, and
connect-hover), so this collision is guaranteed unless handled.

**Rule: `box-shadow` = depth only. `outline` = state only.** Convert every
ring-based state indicator to `outline`. `outline` is a separate CSS property,
respects `border-radius` in current browsers, and `outline-offset` gives the
gap the design calls for.

### 9.3 Hover must change `border-color` only — never `border-width`

`box-sizing: border-box` is set globally (`src/index.css:5–9`). Card `width` is
applied explicitly from the predicted value. Therefore border width is drawn
**inside** the declared width, and changing it changes the content box.

If hover is implemented by growing the border from 0 to 2px, the content box
narrows by 4px on every hover, text may rewrap, and the card visibly jitters as
the cursor moves.

**The border box is always present at full width and transparent. Only its
colour changes.** The `transition` in §6.2 must list `border-color` explicitly
and must not use `transition: all`.

Related: this is also why hover **scaling** was dropped. Connection edges are
SVG paths computed from node coordinates (`src/App.jsx:8020–8021`) in a sibling
SVG. A CSS transform on a card is purely visual, so a scaled card's border
moves while its edge endpoints do not, and connections visibly detach. Do not
reintroduce hover scaling without solving that first.

### 9.4 The wallpaper must sit outside the transform layer, with pointer events off

Two distinct failures:

- **Placed inside the transform layer** (`src/App.jsx:7850`) → it pans and
  zooms with the cards, which is the exact opposite of the requirement.
- **Missing `pointerEvents: 'none'`** → it covers the pattern layer, which is
  part of hit-testing (`canvas-grid-clickable`, `7828`). Canvas panning,
  click-to-deselect, and right-click context menu all break. The symptom is
  "the canvas stopped responding after I set a wallpaper", which is easy to
  misdiagnose.

Do not apply any `transform` to the wallpaper layer, including
`translateZ(0)` for compositing.

### 9.5 Stored settings must be merged over defaults, never used directly

```js
// WRONG — a v1 object missing a newer key yields undefined
const settings = JSON.parse(localStorage.getItem('cm-appearance'));

// RIGHT
const settings = deepMerge(DEFAULTS, parsed ?? {});
```

`undefined` in a CSS custom property produces an invalid declaration. The
visible result is a card with no radius, no border, and no shadow — which looks
like a broken build rather than a missing key. Wrap the parse in `try/catch`
and fall back to defaults on any error.

### 9.6 Both import paths need a `kind` guard

The appearance export must carry a discriminator:

```js
{ kind: 'thoughtflow-appearance', version: 1, settings, presets }
```

- The appearance importer must **reject** anything without that exact `kind`.
- `handleImport` at `src/App.jsx:4997` must **reject** files whose `kind` is
  `thoughtflow-appearance`.

Both directions matter. The app already has several `.json` export buttons
(`4653`, `4691`, `4920`, `4986`, `9111`) and a single file input filtered to
`.json` (`7595`). Without guards, importing the wrong file could partially
overwrite workspace data. **This is the only trap in this document with a
data-loss consequence.**

### 9.7 Mark size must be clamped against spacing

If mark size approaches spacing, the pattern fills solid and looks like a
broken background. Clamp:

```js
effectiveMarkSize = Math.min(markSize, spacing / 3)
```

Enforce in `patterns.js`, not in the panel UI, so it holds regardless of how
values arrive (including a hand-edited `localStorage`).

### 9.8 Object URLs must be revoked

Every `URL.createObjectURL` needs a matching `URL.revokeObjectURL` when the
wallpaper is replaced or removed, and on unmount. Without this, each image swap
leaks its predecessor for the lifetime of the page.

Note the Blob in IndexedDB is what persists across refresh. The object URL is
recreated on each load — never stored.

### 9.9 IndexedDB must fail soft

IndexedDB can be unavailable or throw in private browsing and under some
storage policies. **There is no IndexedDB anywhere in this codebase today**, so
there is no existing error-handling pattern to copy.

Every call wraps in `try/catch`. Any failure degrades to "no wallpaper
available" and logs a warning. It must never block first paint or bubble an
exception into React.

Follow the tone already set by `src/imageStorageService.js`, which returns
`null` and warns when Firebase is unconfigured rather than throwing.

### 9.10 MiniMap colours will drift

`src/MiniMap.jsx:4–15` holds its **own** `THEME_COLORS` map, independent of
`THEMES` in `App.jsx`. Nothing keeps them in sync today.

Once card background intensity is adjustable, MiniMap colours will no longer
match the canvas. Pass the derived colours in, or have MiniMap call the same
`colorUtils` function. Do not add a third copy of the palette.

### 9.11 The group drag-target state must keep overriding the style setting

`src/App.jsx:7875–7878` forces `border-solid` when a group is a drag-drop
target. If the user's group style is Dashed or Borderless, the drag-target
state must still win — otherwise the "you can drop here" cue disappears
precisely when it is needed.

Ordering matters: the setting supplies the base style, the drag-target state
overrides it.

### 9.12 SVG data URIs need `#` encoded

For the Squares and Plus patterns, a hex colour inside a data URI must have
`#` written as `%23`, or the URI truncates and the pattern silently vanishes.

Build the string through a helper that encodes, and memoise it — otherwise a
new string is produced on every render and the browser re-parses the SVG on
every pan frame.

### 9.13 Debounce `localStorage` writes

Dragging an opacity or intensity slider fires continuously.
`localStorage.setItem` is synchronous and blocks the main thread. Writing on
every change makes sliders feel sticky. Apply CSS variables immediately for
live feedback, but debounce persistence to ~200 ms.

### 9.14 Shadows and borders scale with zoom; patterns do not

Cards live inside the `scale()` layer, so shadows and borders scale with zoom.
The pattern's mark size does not (only spacing does).

This is accepted current behaviour, not a bug — but it means "Strong" shadow
looks very heavy zoomed in and nearly absent zoomed out. Choose the
`SHADOW_MAP` values by checking at approximately 50%, 100%, and 200% zoom, not
at 100% alone.

---

## 10. Recording workflow this enables

For reference, the verified end state:

1. Editor → sidebar → **Wallpaper** → select image, set opacity, toggle on.
2. Sidebar → **Appearance** → choose or apply a preset.
3. Switch to the View route. The sidebar is available there too — it is gated
   only on `showSidebar && !isFocusMode` (`src/App.jsx:7649`, `7657`), not on
   the route.
4. Enter Focus Mode. It requests true browser fullscreen
   (`src/App.jsx:2718–2730`) and hides all application UI, so the canvas fills
   the entire monitor.
5. Record.

Because Focus Mode is genuinely fullscreen, an image authored at the monitor's
aspect ratio fills it with no cropping. While editing, the canvas is a
different shape (toolbar above, sidebar possibly open), so the same image will
appear slightly more zoomed-in there. That difference is expected.

Focus Mode is **View-route only** — it returns early in the editor
(`src/App.jsx:2719`). The thin amber preview ring is on `<main>` and is not
hidden by Focus Mode; it remains in the recording and is accepted as croppable.
