# beadSort()

> A hyper-tactile little sorting game. Pile of glass beads, six porcelain dishes, one sunny afternoon in 2002.

---

## vision

`beadSort()` is a sensory-first web game built around a single pleasurable loop: tipping glass beads onto a marble surface and flicking them into porcelain dishes. Every collision has a sound. Every sound has a weight. Nothing is skippable, nothing is rushed. The game should feel like you've found a forgotten Dreamcast VMU minigame that shipped exclusively in Okinawa.

### aesthetic pillars

- **PS1-meets-Frutiger Aero** — low-poly geometry, affine texture warping, vertex snapping — BUT with glassy, translucent materials, aqua gradients, and a crystal-clear sky. The uncanny intersection of chunky 5th-gen polygons and early-2000s glossy optimism.
- **Dreamcast beach level** — see `/moodboard`. Think Emerald Coast, Seaside Hill, Beach Bowl Galaxy, Super Monkey Ball's Bay level, the menu screens of Waverace Blue Storm. Bright cyan water with caustic tiling, pixelated palm leaves, puffy clouds on a gradient skydome, that particular shade of Sega Blue.
- **Lo-fi and lived-in** — slight chromatic aberration, mild VHS dither, faint 240p scanline overlay optional. The scene should feel rendered, not real. Imperfect in the specific ways late-90s consoles were imperfect.
- **Procedural-first** — textures, geometry, sounds, and ambient music are all generated at runtime where possible. No asset pipeline, no binary dependencies in the repo beyond code. The whole game should boot from a fresh clone in minutes.

### sensory goals

- Beads should make you want to *keep* dropping them.
- The marble should feel cold.
- The porcelain should feel breakable.
- There should be zero tutorial. The game should teach itself in three seconds.

---

## gameplay

### core loop

1. Player loads in. Camera is overhead, angled ~15° forward so the beach backdrop is visible past the horizon of the table.
2. A small pile of glass beads (start with ~20, scale up per level) drops onto the marble surface with a satisfying cascade of clicks.
3. Six porcelain dishes sit across the top of the table, each marked with a color indicator.
4. Player touches/drags beads into their matching dish.
5. When all beads are sorted, the pile respawns — optionally larger, optionally with a new color introduced.
6. No fail state. No timer. No score. Just the loop. (Score + stats can be added later as an optional toggle.)

### bead variety

- 6 colors matching the 6 dishes (start with 3-4 and introduce more as levels progress).
- Multiple bead *shapes* for visual variety: round, barrel, bicone, cube, disc. All same physics footprint, different meshes.
- Beads are small but not tiny — roughly 1/40th the width of the playfield. Big enough to see color at a glance, small enough that 100 can coexist comfortably.

### dishes

- 6 porcelain bowls arranged across the top portion of the table.
- Each has a shallow rim and a flat-ish interior that can cradle dozens of beads stacking naturally via physics.
- Visual indicator for which color goes where: a small painted dot/ring on the rim, plus a single "reference bead" resting at the bottom that doesn't count toward the sort.
- Dishes are non-movable static physics bodies, but the bead-catching cavity is a curved trigger/mesh collider.
- When a bead lands correctly, a soft chime. When it lands wrong, a neutral clink (no punishment, just feedback — the player can fish it out).

---

## technical architecture

### stack

Chosen to minimize dependencies while delivering on the 3D/physics/audio requirements:

| Layer | Choice | Why |
|---|---|---|
| Rendering | **Three.js** (via ESM CDN or npm) | De facto standard, massive ecosystem, great perf, renders anywhere WebGL runs |
| Physics | **Rapier.js** (`@dimforge/rapier3d-compat`) | Rust/WASM physics, dramatically faster than Cannon for 100+ bodies, deterministic, tiny API surface |
| Audio | **jsfxr** + WebAudio API | Pure-JS sfxr port, generates all SFX at runtime from parameter strings, zero binary audio assets |
| Build | **Vite** | Fast dev loop, trivial GitHub Pages deploy (`vite build` → `/dist`), zero config for ESM |
| Framework | *None* | No React/Vue/Svelte. One `index.html`, a handful of ES modules, a `main.js` entry point |

Total runtime dependency count: **3** (three, rapier, jsfxr). That's the whole list.

### file structure

```
beadsort/
├── index.html              # Single HTML file, links to main.js
├── vite.config.js          # Base path for GH Pages, nothing fancy
├── package.json
├── README.md
├── public/                 # Static assets if any (favicon, OG image)
└── src/
    ├── main.js             # Entry: bootstraps scene, physics, audio, input
    ├── scene/
    │   ├── environment.js  # Skydome, beach backdrop, lighting, post-fx
    │   ├── table.js        # Marble surface + dishes (static physics)
    │   ├── beads.js        # Bead pool, instanced mesh, physics bodies
    │   └── camera.js       # Orthographic-ish perspective, device tilt, parallax
    ├── physics/
    │   ├── world.js        # Rapier world init, fixed timestep loop
    │   └── contact.js      # Contact event listener → audio trigger bus
    ├── audio/
    │   ├── sfxr.js         # jsfxr wrapper, parameter presets
    │   ├── bus.js          # Voice pooling, throttling, dynamic mixing
    │   └── ambient.js      # Procedural ocean loop + optional lo-fi bed
    ├── input/
    │   ├── touch.js        # Pointer events, raycast pickup/drag/release
    │   └── gestures.js     # Tap, drag, flick (with velocity carryover)
    ├── gen/
    │   ├── textures.js     # Procedural marble, porcelain, sand, water caustics
    │   ├── geometry.js     # Bead shape variants, dish lathe, palm trees
    │   └── clouds.js       # Animated cloud sprites on skydome
    └── shaders/
        ├── water.glsl      # Caustic-tiled water in the background
        ├── ps1.glsl        # Vertex snapping + affine UV warping
        └── sky.glsl        # Gradient + dithered noise
```

### deployment

- `npm run build` produces static `/dist`.
- GitHub Actions workflow: on push to `main`, build and publish to `gh-pages` branch.
- `vite.config.js` sets `base: '/beadsort/'` so asset paths resolve under the repo subpath.
- No backend. No localStorage dependency for core gameplay (optional for settings). No analytics. Just static files.

---

## design specs

### scene composition

Portrait canvas, targeting 9:16 or taller. Layered back-to-front:

1. **Skydome** — large inverted sphere with a vertical gradient (deep cyan → warm horizon). Animated UV-scrolling puffy cloud sprites layered on top. A distant sun disc with a faint lens bloom. Optional rare seagull silhouettes drifting across.
2. **Distant beach** — a simple billboard or low-poly strip of island geometry way off in the distance. Low detail. Slight haze.
3. **Ocean** — a large plane with the water shader: animated caustic tiling (see Image 2, 3, 10 — that *exact* pattern of bright white cell-like cracks over cyan), gentle sine-wave vertex displacement, fresnel-driven transparency. This fills the visible horizon beyond the table.
4. **Middle-ground props** — a couple of chunky low-poly palm trees flanking the view (the pixelated-leaves kind from Image 2 and 6). A rock or two. All very PS1.
5. **The table** — a white marble slab, portrait-oriented, occupying the lower ~60% of the screen. Slight cream veining, subtle specular. Floats in space or rests on a minimalist pedestal; we don't need to explain why it's on a beach.
6. **Six dishes** — arranged in a row across the top edge of the table, porcelain white with a colored rim accent and a reference bead inside. Proportional to hold 20-30 beads each.
7. **Beads** — spawn area is the bottom 2/3 of the table.

### camera

- Perspective camera with a narrow FOV (~35°) to minimize parallax distortion and keep bead sizes feeling consistent across the table.
- Positioned above and slightly behind the player side of the table, tilted down ~70° from horizontal (so ~20° from straight-down). Enough tilt to show backdrop + dishes, shallow enough that sorting feels top-down.
- Very subtle device-tilt parallax on mobile (`DeviceOrientationEvent`) — max ±2° camera drift. Enough to feel alive, not enough to break gameplay.
- No user camera control. The framing is the framing.

### lighting

- Single directional "sun" light, warm-white, casting soft shadows on the marble.
- Hemisphere light tinted sky-blue above, sand-yellow below, for ambient.
- Optional rim light from behind to make the beads catch the sun.
- Shadows: soft, cheap (PCF or baked). Beads cast small contact shadows only.

### materials (all procedural)

- **Marble** — generate a 512x512 canvas texture: base cream, Perlin/simplex noise veins in pale gray, subtle warm highlights. Repeat across the slab.
- **Porcelain** — near-white with a very faint blue-gray undertone, high gloss, slight subsurface scattering approximation (a bright emissive fresnel hack is plenty).
- **Glass beads** — `MeshPhysicalMaterial` with transmission, roughness ~0.1, clearcoat, tinted by color. They should *catch* the light. Keep IOR reasonable (1.4ish).
- **Sand** (if visible) — dithered yellow-cream, low-res feel.
- **Water** — see shader section.

### PS1 flavor (important but subtle)

A light touch. We want the charm, not the pain:

- **Vertex snapping** — in the vertex shader, snap `gl_Position.xy` to a coarse grid. Gives that wobbly-geometry feel.
- **Affine texture mapping** — disable perspective-correct UV interpolation on background geometry (not the beads/marble — those look bad affine). Apply to palm trees, rocks, distant beach.
- **Limited color depth** — optional post-process to quantize to ~16-bit color (5-6-5). Toggleable.
- **Low internal resolution** — render at 75-85% of canvas size, upscale with nearest-neighbor. Gives crunch, boosts perf.
- **No anti-aliasing** by default (MSAA off). The jaggies are the point.

### procedural generation notes

Aim to have **zero** image files in the repo.

- **Textures**: generate on `<canvas>` at init, upload as `CanvasTexture`. Marble, porcelain, sand, clouds, bead color maps, caustic water — all drawn in code.
- **Geometry**: build palm trees procedurally (a twisty cylinder trunk + a fan of triangle fronds), dishes via `LatheGeometry`, beads via parameterized primitives.
- **Audio**: all SFX from jsfxr parameter strings (see audio section).
- **Ambient music**: optional procedural lo-fi bed — a slow WebAudio oscillator chain + recorded-on-the-fly ocean noise. Can be replaced with a single ogg later if desired, but MVP is procedural.

---

## audio design

This is a **huge** part of the game feel. Do not underinvest here.

### engine

- Wrap **jsfxr** in a tiny audio bus module.
- Each SFX is defined by a sfxr parameter string (generate at https://sfxr.me/ and paste into code).
- Bus handles voice pooling (cap at ~16 concurrent voices), stochastic pitch variation (±8% per playback), and per-category volume.
- Global volume control + a mute toggle. Nothing else.

### sound library

Every one of these should be a short jsfxr preset, with randomized pitch on playback for naturalism:

| Event | Character | Notes |
|---|---|---|
| Bead → marble | Sharp, glassy *tick* | Higher pitch for faster impacts |
| Bead → bead | Softer *plink* | Stack gets muted as beads sleep |
| Bead → porcelain | Bright ceramic *ding* | Slight bell tail |
| Bead → dish (correct) | Same ding + a subtle positive harmonic | Don't oversell it |
| Bead → dish (wrong) | Same ding + a dry *thock* | Gentle, not punishing |
| Bead pickup | Soft *pop* / *chuff* | Indicates grab succeeded |
| Bead release (dropped empty-handed) | *fwip* | |
| Pile respawn | Gentle tumbling cascade | Sequence of 10-15 ticks over ~400ms |
| Level complete (all sorted) | 3-note arpeggio | Major, warm, brief |

### dynamic mixing

- Throttle contact sounds: if >6 bead-on-X collisions in the same frame, merge into one slightly louder, pitch-spread sound.
- Beads that are "asleep" (Rapier sleeping state) never emit sound.
- Soft ducking on the ambient bed when a level-complete chime plays.

### ambient bed (optional but recommended)

- A procedurally generated loop of surf/wave sound: filtered white noise with a slow LFO on the lowpass cutoff, mixed with very quiet seagull sfxr blips at random intervals (maybe one every 20-40 seconds).
- Optional lo-fi music: a simple four-chord loop from a WebAudio oscillator chain (triangle lead, sine bass, a filtered noise hat). Should feel like it's playing from a boombox two beaches over.

---

## physics

### setup

- Rapier world, gravity `(0, -9.81, 0)`, fixed timestep 1/60s.
- Decouple physics tick from render tick. Accumulate delta, run N physics steps per frame as needed, interpolate render transforms between steps.
- Enable sleeping. Set bead linear/angular damping modestly (~0.3 / 0.5) so they settle quickly and stay quiet.
- Contact events enabled globally → feed into the audio bus.

### colliders

- **Table surface**: large cuboid, static.
- **Table walls (invisible)**: four thin cuboids around the perimeter so beads don't escape.
- **Dishes**: built from a ring of slim cuboids (or a trimesh generated from the lathe, if perf holds) forming the rim + a curved floor. Static.
- **Dish trigger volume**: a sensor/trigger box just inside each dish that flags beads as "in dish N". Cheaper than polling positions.
- **Beads**: small spheres (even for non-round visual meshes — use a sphere collider for consistency and perf; visual mesh can be any shape).

### perf targets

- 100 dynamic bead bodies + ~30 static colliders → Rapier eats this for breakfast, even on mid-range mobile.
- Budget: physics step < 3ms on a 2021 mid-range Android.
- If profiling shows issues: drop to compound sphere colliders, increase solver iterations cap, or reduce max bead count to 80.

### rendering optimization

- **Beads use a single `InstancedMesh` per shape variant.** Update transforms from Rapier each frame. This is the single biggest perf win.
- Shared material instances per bead color.
- Frustum-cull aggressive on background props (they rarely move).
- Render at 0.8x resolution, upscale. Cheap and on-brand.

---

## controls

### touch (primary)

- **Tap** a bead → lift it with a gentle spring toward a fixed height above the table (the "holding plane").
- **Drag** while holding → moves the bead smoothly across the holding plane. Subtle lag so it feels physical, not pinned to the finger.
- **Release** → the bead drops under gravity. If released with horizontal velocity, that velocity carries (a flick should arc across the table).
- **Release over a dish** → bead drops into dish normally, trigger flags correct/incorrect, audio plays.
- Multi-touch: allow up to 2 beads held simultaneously. More gets messy.
- Light haptic on pickup and on correct-sort (where `navigator.vibrate` is available).

### desktop

- Left-click drag = same as touch drag.
- No keyboard controls required for MVP.
- Mouse wheel does nothing. Don't let the user zoom. Trust the framing.

### feel

- Pickup should feel instant but soft — small spring, critically damped.
- Drag should have ~40-60ms of perceptual smoothing.
- Release should commit the bead's current velocity, scaled 0.7x to avoid rocket flicks.

---

## performance targets

- **60 FPS** sustained on a 2021 mid-range Android (Pixel 5a, Samsung A52).
- **120 FPS** on iPhone 13+ and flagship Android, where display supports.
- Cold load to interactive: **< 2s** on 4G.
- Total bundle size (gzipped): **< 500 KB** excluding Rapier WASM (~300 KB). With Rapier, target < 900 KB.
- Zero memory growth during extended play. Reuse bead bodies from a pool; never `create`/`destroy` in hot paths.

### non-negotiables

- No dropped frames during a pile respawn.
- No audio pops / clicks on mobile Safari.
- No layout shifts after load.
- Touch latency < 50ms from finger-down to bead-lifted.

---

## development roadmap

Suggested order of work for Claude Code. Each milestone should be independently playable.

1. **Scaffold** — Vite project, Three.js scene, a spinning cube, deployable to GH Pages.
2. **Table + camera** — marble surface, six placeholder dishes, final camera framing.
3. **Physics** — Rapier integrated, one bead you can drop onto the table via button.
4. **Bead pile** — instanced beads, pile spawn, 20 beads falling and settling.
5. **Input** — tap-to-lift, drag, release with velocity.
6. **Sort detection** — dish triggers, correct/incorrect feedback (visual only for now).
7. **Audio pass 1** — jsfxr integrated, all collision sounds wired up.
8. **Background** — skydome, water shader, palm trees, clouds.
9. **PS1 pass** — vertex snapping, resolution scaling, optional color quantization.
10. **Audio pass 2** — ambient bed, dynamic mixing, haptics.
11. **Polish** — bead shape variety, respawn cascade, level-complete chime, fine-tune everything.
12. **Ship** — GH Actions deploy, test on 3+ real devices, README screenshots.

---

## design non-goals

Explicitly **not** building, to keep the scope honest:

- Accounts, saves, leaderboards, multiplayer.
- Unlocks, progression meta, cosmetics.
- Difficulty settings, game modes.
- Tutorials, menus beyond a single start/mute toggle.
- Mobile app wrappers.
- Any form of monetization.

The game is 30 seconds to learn and infinitely replayable because the moment-to-moment is good. That's the whole product.

---

## references / moodboard

See `/moodboard` directory. Primary inspirations:

- Sonic Adventure (Emerald Coast, Station Square beach)
- Sonic Adventure 2 (Ocean Palace, Green Forest water)
- Super Monkey Ball 1 & 2 (Jungle, Bath)
- Waverace Blue Storm (menu water shader specifically)
- Sonic Heroes (Seaside Hill)
- Any Frutiger Aero wallpaper circa 2006 (glassy aqua everything)
- The Dreamcast boot screen sound as a general spiritual guide

---

## license

TBD. MIT probably. Or WTFPL if we're feeling honest.
