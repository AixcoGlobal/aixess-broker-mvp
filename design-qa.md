**Comparison target**

- Landing-page visual truth: `C:/Users/Administrator/AppData/Local/Temp/codex-clipboard-4b026ff3-ef29-4b10-85de-ca848e2f1139.png` (approved black, silver, and orange AiXESS direction).
- Residence Explorer visual truth: `C:/Users/Administrator/Documents/ChatGPT/AIXESS/references/reverance-360/frame-001.png` through `frame-100.png`, captured from Otium's official Project Reverance orbit at `https://otium.ge/ka/project/7`.
- Canonical settled source: `C:/Users/Administrator/Documents/ChatGPT/AIXESS/references/reverance-360/frame-097.png` (1920 x 1080 px).
- All-angle source-to-render evidence: `C:/Users/Administrator/Documents/ChatGPT/AIXESS/references/reverance-360/splat-reconstruction/evaluation/full-scene-fallback-glare-repaired/orbit-97-contact-sheet.jpg` and `official-source-vs-sog-contact-sheet.jpg`.
- Browser-rendered implementation: `C:/Users/Administrator/Documents/ChatGPT/AIXESS/qa/implementation-final-desktop-front.png` (1121 x 752 px), `implementation-final-mobile-320.png` (320 x 700 px), and `implementation-final-mobile-floor-11.png` (320 x 700 px).
- Artifact/hover repair evidence: `C:/Users/Administrator/Documents/ChatGPT/AIXESS/qa/artifact-hover-fixed.png` and the side-by-side `artifact-hover-comparison.jpg`.
- Full-floor highlight source: `C:/Users/Administrator/AppData/Local/Temp/codex-clipboard-b4ecb87f-c490-4079-a285-af8cf266b631.png` (495 x 532 px).
- Full-floor highlight implementation: `C:/Users/Administrator/Documents/ChatGPT/AIXESS/qa/floor-highlight-front-fixed.png` (592 x 592 px) and the normalized side-by-side `floor-highlight-before-after.jpg` (990 x 568 px).
- Adjacent-floor bleed source: `C:/Users/Administrator/AppData/Local/Temp/codex-clipboard-dbb2a553-4adc-43de-8d78-60da8e19fe21.png` (440 x 95 px).
- Depth-aware floor isolation evidence: `C:/Users/Administrator/Documents/ChatGPT/AIXESS/qa/floor11-reference-vs-depth-aware-zoom.png`, `floor11-direct-hover.png`, `floor11-oblique-highlight.png`, `floor11-rear-highlight.png`, and `webgpu-floor11-highlight.png`.
- Exact floor-bay source: `C:/Users/Administrator/AppData/Local/Temp/codex-clipboard-a0076947-4d1e-44eb-9854-f05412ab1e43.png` (362 x 102 px), where one floor is the façade bay between two consecutive horizontal slab lines.
- Exact floor-bay evidence: `C:/Users/Administrator/Documents/ChatGPT/AIXESS/qa/floor-slab-reference-vs-phase-fixed.png`, `floor-phase-front-matrix.png`, and `floor11-phase-shift-oblique.png`.
- Early interaction evidence: `C:/Users/Administrator/Documents/ChatGPT/AIXESS/qa/partial-scroll-floor11-interactive.png` (explorer progress 0.1295, `data-settled=false`, model ready).
- Artifact and horizon evidence: `C:/Users/Administrator/Documents/ChatGPT/AIXESS/qa/final-orbit-contact-sheet.jpg`, `final-turning-horizon.png`, and `final-mobile-horizon-highlight.png`.
- Combined full-view comparison: `C:/Users/Administrator/Documents/ChatGPT/AIXESS/qa/design-comparison-full-front.jpg` (2242 x 752 px).
- Combined focused building comparison: `C:/Users/Administrator/Documents/ChatGPT/AIXESS/qa/design-comparison-building-crop.jpg` (1248 x 624 px).
- Desktop viewport: 1121 x 752 CSS px at device scale factor 1. The official 1920 x 1080 source was normalized to 1121 x 631 px and vertically centered beside the same-width browser capture for the full comparison.
- Focused normalization: the source's centered 1080 x 1080 crop was downsampled to 624 x 624 px and compared with the browser's 624 x 624 px WebGL stage crop.
- Mobile viewport: 320 x 700 CSS px at device scale factor 1.
- Full-floor normalization: the implementation was resized to 532 x 532 px and center-cropped to 495 x 532 px before being paired with the user screenshot. Both halves show Floor 13 hovered at the settled front elevation.
- State: scroll animation settled at official frame-097 front elevation. Additional evidence covers frame-073 side entry, intermediate rotation, the calibrated horizontal orbit, rear elevation, bounded zoom, reset, direct 3D floor picking, keyboard floor selection, the Floor 11 modal, and direct Floor 13 hover across the complete A-block footprint.

**Full-view comparison evidence**

- The implementation preserves the approved AiXESS language: Gilroy typography, square geometry, black field, brushed-silver section, restrained orange accents, and dense uppercase broker UI.
- The Residence Explorer is a real continuously rendered WebGL scene reconstructed from the official orbit. The frame-073 side camera and frame-097 settled camera use Otium's calibrated positions and field of view, so the scroll transition follows the source orbit rather than approximating it with raster cross-fades.
- The official roof portal, both 16-storey towers, glazed and planted balcony grid, pale rear elevations, central garden, real trees, road, surrounding landscape, and skyline remain continuous through all 97 supported angles.
- At 320 x 700, the copy, metrics, model, reset action, horizontal floor rail, and interaction instructions remain visible and usable with zero page-level horizontal overflow.

**Focused region comparison evidence**

- `design-comparison-building-crop.jpg` verifies the front façade, crown spacing, tower depth, balcony rhythm, base, and landscape against the same official front state at equal 624 px square presentation size.
- `official-source-vs-sog-contact-sheet.jpg` verifies six canonical source/render pairs, while `orbit-97-contact-sheet.jpg` verifies continuity and absence of crop explosions, floating façade planes, pasted-on trees, roof substitutions, or missing garden/context around the entire supported orbit.
- A separate 1600 x 900 retrain was visually and quantitatively evaluated. Although it appeared slightly sharper, it was 19.49% larger and less faithful on every canonical A-tower mask (mean PSNR delta -3.140 dB), so the closer 8,496,041-byte baseline was retained.
- `floor-highlight-before-after.jpg` verifies that the former narrow center band now spans the full visible A-block storey from the left façade through the right return. The highlight remains confined to Floor 13 with no tint on Floors 12 or 14.
- `floor11-reference-vs-depth-aware-zoom.png` directly compares the reported two-storey bleed with the corrected close-up. The production shader now reconstructs floor-local Y for every Gaussian fragment, so the tint ends at the selected slab boundary even when a large Gaussian footprint crosses into the adjacent storey.
- `floor-slab-reference-vs-phase-fixed.png` pairs the user's two-line floor definition with the corrected Floor 11 crop. The selector is phase-aligned to the midpoint of the visible bay, so the orange tint starts and ends on the two consecutive slab edges instead of centering on a divider. `floor-phase-front-matrix.png` repeats the check on upper, middle, and lower storeys; `floor11-phase-shift-oblique.png` confirms the same boundary alignment across the façade return.
- `final-orbit-contact-sheet.jpg` covers ten 36-degree orbit increments. The accepted towers, roof portals, courtyard, and planting remain unchanged; detached near-camera foliage is absent, and the official mountain/city horizon remains recognizable through the full turn.
- `partial-scroll-floor11-interactive.png` captures the explorer before the scroll reaches its endpoint: the 3D model is ready, the floor rail is available, the interaction badge reads `INTERACTIVE`, and Floor 11 opens its production modal from the rail while `data-settled` remains false.

**Required fidelity surfaces**

- Fonts and typography: Gilroy assets load locally; display, body, metrics, floor labels, and modal copy retain the approved weight, line-height, wrapping, and uppercase hierarchy across desktop and mobile.
- Spacing and layout rhythm: the two-column desktop composition, square model stage, bottom motion caption, and compact mobile stack remain aligned without clipping or stretched proportions.
- Colors and visual tokens: black, warm silver, white, and AiXESS orange remain mapped to the approved design. The final model overlay was reduced so Otium's original sky, façade, vegetation, and warm lighting are not artificially darkened.
- Image quality and asset fidelity: the supplied AiXESS logo and official Otium imagery are used directly. The building is not CSS art, a custom SVG, a hand-modeled approximation, or a raster turntable.
- Copy and content: broker-facing copy is concise and coherent; project name, A Block, Batumi, floors 02-16, availability metrics, and completion information are consistent throughout the journey.

**Findings**

- No actionable P0, P1, or P2 issues remain.
- P3 / source constraint: Otium exposes a raster orbit rather than owner CAD/BIM or a native mesh. Gaussian reconstruction introduces minor fine-detail softness at very close zoom, but preserves the official appearance and provides true parallax and continuous WebGL rotation within the validated level camera ring.
- P3 / dependency lifecycle: PlayCanvas emits one upstream deprecation warning for the explicit unified splat renderer flag. The flag is required by the current React adapter for correct SOG rendering; there are no runtime errors and no visible or functional impact.

**Comparison history**

- Iteration 1 - P1 image/geometry fidelity: the earlier manual GLB differed in roof profile, façade materials, vegetation, garden treatment, and rear geometry. Fixed by replacing it with a full-scene Gaussian reconstruction trained from the official Otium orbit. Post-fix evidence: the six-view and 97-view source/render contact sheets.
- Iteration 2 - P2 orbit stability: early reconstruction attempts produced seam/crop artifacts and unstable glare outside selected views. Fixed through full-scene training, deterministic removal of the isolated glare cluster, and validation of every official orbit frame. Post-fix evidence: `orbit-97-contact-sheet.jpg` and the five all-angle chunk sheets in the same evaluation directory.
- Iteration 3 - P2 responsive controls: the vertical floor rail collapsed at 320 px and competed with the reset action. Fixed by switching to a horizontally scrollable mobile rail, compact badge copy, and mobile-specific interaction guidance. Post-fix evidence: `implementation-final-mobile-320.png` with `scrollWidth` equal to the 320 px viewport.
- Iteration 4 - P2 accessibility: floor-rail Enter/Space selection was not explicit after custom arrow-key navigation. Fixed in `Reverance3D.jsx`; Enter now opens Floor 11 and focus returns after modal close. Post-fix evidence: `implementation-final-mobile-floor-11.png` and browser keyboard verification.
- Iteration 5 - P2 loading performance: the 3D engine and 8.5 MB scene began loading during the first paint. Fixed by code-splitting `Reverance3D` and mounting it only as the explorer approaches the viewport. Post-fix evidence: initial page load has zero WebGL canvases; navigating to Residences mounts the canvas and reaches the ready state.
- Iteration 6 - P2 color fidelity: the technical-stage vignette noticeably darkened the official façade and vegetation. Fixed by reducing the model overlay to a subtle lower-edge gradient. Post-fix evidence: the revised full-view and equal-size focused comparison files listed above.
- Iteration 7 - P1 orbit artifacts: the previous dolly range exposed unsupported near-camera splats as detached leaves, car fragments, sky streaks, and a gray foreground smear. Fixed without changing the 8.5 MB building asset by locking interaction to Otium's solved 3.7123-3.7165 camera ring, replacing dolly with 31-41.096-degree optical zoom, disabling pan, and moving the near plane to 1.0. Numerical depth checks retain at least 1.364 world units of building/landscape safety margin. Post-fix evidence: `artifact-hover-comparison.jpg` and the ten-view final orbit sheet.
- Iteration 8 - P1 floor feedback: canvas hover previously changed only a tiny rail row and could be cleared by bubbled pointer movement. Fixed with a texture-preserving GSplat shader that tints only the actual Gaussians inside the complete calibrated floor volume, a pointer-adjacent floor/availability label, a stronger synchronized rail state, touch-safe behavior, and stale-state cleanup. Direct canvas hover, rail hover, reset/instruction transitions, and modal selection were verified in-browser.
- Iteration 9 - P1 incomplete floor mask: the prior oriented volume covered only the center of each storey, leaving the left façade and most of the building depth untinted. Fixed by measuring A Block across the production SOG, recentering the volume, and expanding its width/depth to the complete footprint while preserving the storey height. Picking and the GSplat shader now consume the same transform. Post-fix evidence: `floor-highlight-before-after.jpg`, a full-width direct-hover sweep on Floor 13, top/middle/bottom floor checks, adjacent-floor isolation tests, and a direct Floor 13 click opening the correct modal.
- Iteration 10 - P1 distant-scene quality: the accepted SOG's far-camera shell produced blurred mountains and could expose unsupported foliage during interaction. Fixed by alpha-culling only splats beyond the 20-unit local-scene envelope and rendering a calibrated 3072 x 1536 distant sphere reprojected from all 97 official Otium frames. The building, roof, garden, and local volumetric planting asset and checksum remain unchanged. Post-fix evidence: the full 360-degree orbit sheet and turning/mobile horizon captures.
- Iteration 11 - P1 adjacent-floor highlight bleed and slab-line phase: center-selected Gaussians could have footprints several times taller than a storey, so tinting the whole Gaussian colored the floor below. Fixed with a depth-aware fragment shader that inverts the projected Gaussian ellipse, reconstructs each fragment's floor-local Y at its own clip depth, and clips the tint at the calibrated floor boundaries. A second comparison against the user's marked slab lines exposed a half-storey phase error: the volume was centered on a divider. All shared picking/highlight transforms were shifted downward by exactly half the measured 0.0807528-storey pitch, while the tint height remains one full pitch. Each selectable floor is now the bay between consecutive slab edges, adjacent bands meet only at a zero-mask boundary, and numbering remains unchanged. The solution was verified at front, close zoom, oblique, rear, upper/middle/lower floors, WebGL2, and WebGPU; direct canvas selection still opens the correct Floor 11 modal.
- Iteration 12 - P2 partial-scroll interaction gate: the single `settled` flag hid the floor rail, hover feedback, and selection until the scroll animation reached 96.5% progress. Fixed by tracking section visibility separately from camera settling. Once the explorer intersects the viewport and the SOG is ready, floor hover, rail selection, and the Floor 11 modal are active immediately; the side-to-front camera choreography continues uninterrupted, and orbit/zoom controls remain reserved for the settled handoff. Browser verification covered progress 0.1295 with `data-settled=false`, `data-interactive=true`, all 15 rail buttons pointer-enabled, and a successful Floor 11 modal open.

**Primary interactions and technical checks**

- Scroll-driven side-to-front rotation with reduced-motion handling.
- Post-settle horizontal orbit, artifact-safe bounded zoom, and deterministic reset.
- Direct ray-based floor selection from front and rear views, plus 15 accessible floor controls available as soon as the explorer is visible and arrow/Home/End/Enter/Space keyboard behavior.
- Floor-plan modal, previous/next floor controls, live availability refresh, verified local snapshot fallback, filtering, residence details, close/Escape, and focus trapping/restoration.
- Loading, empty/filter, network fallback, image fallback, WebGL failure fallback, and reduced-motion states retained.
- Desktop and 320 px mobile browser checks completed with no horizontal overflow and no current runtime console errors. WebGL2 remains first choice, with a successful WebGPU shader/render smoke test.
- Automated checks: 32 unit/integration tests pass; 4 Sites worker/package tests pass; production build passes; production dependency audit reports 0 vulnerabilities.

**Implementation checklist**

- [x] Official Otium building and landscape reconstructed as continuous WebGL.
- [x] Exact supported camera ring and scroll choreography applied.
- [x] Direct floor picking and broker inventory modal verified.
- [x] Desktop and 320 px responsive states visually inspected.
- [x] Keyboard, focus, reduced motion, loading, error, and fallback states verified.
- [x] Heavy WebGL/SOG payload deferred until the explorer approaches the viewport.
- [x] Tests, production build, Sites packaging, and dependency audit pass.

final result: passed
