# LOWKEY: design, motion and verification review

The thesis is **a toy-sized island for a very readable memory game**. Three-dimensional character bodies make private information feel like meeting a little inhabitant, while the cards stay in fixed numbered slots and every action has a native button. No camera tour, drag mechanic, cinematic interstitial or animation promise controls game state.

## Research translated into choices

Inspora was opened live, rendered in headless Chrome, inspected for font/background, scrolled, and pointer movement exercised. The screenshot is `shots/inspiration-inspora.png`. Verified rendering: white archive, Inter, quiet centered navigation, compact category filters, mixed-height artwork grid. The analyst additionally inspected source CSS and GSAP/WAAPI transitions. This prototype borrows framing, whitespace, and restrained chrome—not assets, a masonry feed, or lengthy detail transitions. Its plain controls leave the boldness to the island and typography.

Current live APIs were opened at Three.js RenderPixelatedPass, Raycaster, CSS2DRenderer and rendering-on-demand docs, plus GSAP Timeline. Installed source confirmed Three r187 and the nearest-filter targets used by RenderPixelatedPass. The latter would add beauty/normal/depth work that a fixed low-poly tabletop does not need. Chosen path: render at CSS size divided by 1.35, no MSAA, then nearest-neighbour `image-rendering:pixelated`; the UI is never pixelated. This is low-resolution WebGL output rather than the multi-pass RenderPixelatedPass shader.

CSS2DRenderer was evaluated but rejected: its installed documentation explicitly limits support to 100% browser/display zoom. Native projected DOM buttons provide real focus, click targets and zoomable text. Card-face artwork is a locally generated CanvasTexture, with nearest magnification. Raycaster uses `setFromCamera` and `intersectObjects`; Pointer Events cover mouse/touch. InstancedMesh is used for rim stones and the call burst. A hemisphere fill plus warm directional key light and 1024px soft shadows creates the toy surface. A fixed three-quarter perspective avoids orbit controls and motion sickness.

Render scheduling follows the Three rendering-on-demand guide: one coalesced RAF after state/input/resize, GSAP `onUpdate` requests another frame during short effects, no perpetual gameplay render loop. Hidden tabs do not request frames. The lobby alone has a tiny 5Hz, visibility/reduced-motion-gated character turn; no scenery wobble while playing. The camera layout changes instantly at compact round end to leave space for results, rather than animating readable content.

## Exact motion application

Required Emil references read: emil-design-eng, animate + RECIPES, choreograph + RECIPES, gestures, animation-performance, review-animations + STANDARDS, break-ui + CATALOG, prototype + PICKER. The prototype skill is for divergent UI variants; the user already supplied a single binding concept, so no unnecessary style-picker was added. Gesture skill led to rejecting drag for a simple click-to-act game. Break-ui informed long names, malformed strings, narrow layouts and native overflow rows.

| Element | Purpose and role | Timing and properties | Interruption/reduction |
| --- | --- | --- | --- |
| Native button press | Feedback, lead | 160ms, scale .97, `cubic-bezier(.23,1,.32,1)` | CSS transition retargets; keyboard and reduced motion skip scale |
| Card hover | Tiny feedback, lead | 160ms lift .09 world units; 120ms return; z tilt -.025 radians | Only fine hover pointers; `overwrite:true`; no tween per pointermove if target unchanged |
| Draw from pile | Spatial consistency, lead | 220ms position, `power3.out` | State already committed; next action cancels current position tween |
| Character reveal | Information state, lead | 180ms rise .01→.04 and squash .80/.71/.80→.78; `power3.out` plus `back.out(1.2)` | Kill targets on replacement; no action waits; reduced/keyboard renders final state |
| Round reveal | Rare reveal, lead | 180ms per reveal, delays 0/50/90/120ms, total 300ms | One group entrance; no parent entrance; skips all delays for reduced/keyboard |
| Blind swap | Spatial consistency, lead | 240ms positions, `power2.inOut` | Real state already swapped; subsequent update interrupts |
| Peek/Spy creature gesture | Ability feedback | 120ms lean/turn, 120ms return, `power3.out` | Rotation targets killed before new timeline; reduced/keyboard skip |
| Call burst | Rare feedback | 320ms instanced original diamond particles, `power2.out` | Under requested 1.2s beat; no shake/camera motion; skips reduced/keyboard |
| Status/toast | State indication | 180ms opacity + 12px translate, strong custom ease-out | Transition, not restart-prone keyframes; 150ms opacity only under reduction |

The ordinary UI stays below 300ms; the single 320ms call particle effect is a rare game beat, not an input gate. All interactions remain legal immediately regardless of cosmetic animation. A private reveal waits for the user, not for a timer. Score text, slot numbers, keyboard actions, settings content and turn ownership do not animate. No `transition:all`, layout-property animations, or CSS-variable-per-frame propagation.

Apple HIG references read: accessibility, layout, typography, color, designing-for-macos, cross-platform, motion, feedback, designing-for-games and game-controls. These are web-translated principles, not a claim that the site implements native macOS menu conventions.

- `game-controls.md › Touch controls`: direct object selection, dynamic relevant actions, at least 44px controls. Native buttons satisfy pointer/touch/keyboard alternatives.
- `accessibility.md › Cognitive`: explicit Hide for private information, not auto-dismiss. Audio optional; no flashing. Reduced motion removes depth/position effects.
- `accessibility.md › Vision`: values and words accompany color. Screen-reader announcements and full card labels use only the filtered view.
- `layout.md › Adaptability`: compact layout, long-name wrapping, scrollable penalty hands rather than shrinking targets.
- `typography.md › Ensuring legibility`: native system controls, strong weights and a sparse size hierarchy; bitmap-like monospace only for short utility labels.
- `motion.md` and `feedback.md`: feedback supports cause and effect, never carries the only meaning or takes agency away.

Measured WCAG contrast from actual tokens: ink #243243 on sky #e5edf0 **10.98:1**; secondary #546171 on sky **5.32:1**; white on primary #245c9b **6.82:1**; white on call #b54d38 **5.14:1**; secondary on paper #f4f4ec **5.71:1**. Functional DOM values are not lit/shaded WebGL text. Browser measurement found no enabled desktop control below 44x44px. Zoom, screen-reader and physical-phone certification remain future checks, not assumed passes.

## Screenshot review and fixes

| Before | After | Why |
| --- | --- | --- |
| Generic disabled-button rule reset the translated card label anchor | `.card-slot:disabled` explicitly preserves `translate(-50%,-50%)` | Disabled and enabled controls keep identical spatial anchors |
| Full character names widened adjacent labels until they overlapped | Numeric value + compact slot/name; full accessible label/title retained | Readable native numbers, no loss of information |
| Mobile results covered own revealed hand | Compact end-state camera framing reserves a separate reveal area above the panel | Both outcome and evidence remain visible |
| Rectangular green underlay protruded from the island | Matching faceted circular inset | Material silhouette now reads as one physical object |
| Empty dock left a stray dot under results | `:empty` dock hidden | Remove an accessory with no function |
| Shift+digit relied on `event.key`, which becomes punctuation | Use `event.code` for slot digits | Opponent card keyboard control actually works |

**Verdict: good, with clear prototype limits.** Final screenshots were re-read after fixes; labels are centered, hands and results readable, characters original, and the game state was reached through actual moves. Browser page exceptions are zero. The lobby is deliberately editorial but the in-game board remains still. It is not yet a fully polished shipped game: physical mobile performance, 200% zoom, VoiceOver traversal, very large penalty-hand presentation and sophisticated per-rank idles need further validation. No unsupported claim of a 60fps physical-device benchmark is made.

## Why 3D earns its place—and where it does not

Creature reveals, lighting, card elevation and a miniature place to meet give this particular memory game a recognizable identity. The renderer is replaceable and the fallback proves the game is not trapped inside a canvas. Three.js is not used for rule enforcement, UI typography, room management or click delays. The strongest argument against 3D is complexity/battery cost for a four-card game; fixed framing, demand rendering, low poly meshes, locally cached textures and a native control layer are the answer. Cut elaborate camera motion, post-processing stacks and cinematic waits before cutting the complete multiplayer loop.

## Opened sources

- https://www.inspora.design/
- https://threejs.org/docs/pages/RenderPixelatedPass.html
- https://threejs.org/docs/pages/Raycaster.html
- https://threejs.org/docs/pages/CSS2DRenderer.html (web extraction partial; installed source used to confirm zoom caveat)
- https://threejs.org/manual/en/rendering-on-demand.html
- https://gsap.com/docs/v3/GSAP/Timeline/
- https://gsap.com/docs/v3/GSAP/gsap.to/ (request challenged; Timeline docs and installed source used instead)
- https://board-game-rules.com/wp-content/uploads/2025/01/cabo_Official-Rules.pdf
- https://beziergames.com/pages/cabo
- https://treyhunner.com/2015/06/cabo-card-game/
- https://fathergeek.com/cabo/
- https://www.spelhuis.be/Files/7/112000/112353/Attachments/Product/h4CLZ4qF10u79561q91aD67G1N4u71E9.pdf
