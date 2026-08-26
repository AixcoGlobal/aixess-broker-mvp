# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

## Selected AiXESS direction

- The attached black, silver, and orange broker landing-page mockup is the visual source of truth.
- Use Gilroy throughout, the supplied AiXESS logo, and the real Project Reverance exterior imagery.
- Preserve the oversized three-line hero headline, diagonal architectural image split, slim repeating project ticker, and brushed-silver broker access section.
- Registration and login are the primary interactive paths. Keep the experience responsive and polished from 320px mobile through wide desktop.
- The residence explorer must use a real, continuously rendered WebGL model. Do not simulate rotation with raster cross-fades. Scroll rotates the building from a side view into a settled front view; after settling, users can orbit, pan, zoom, and select floors directly on the model.
- Do not use full-elevation image planes or baked trees/landscaping as visible model surfaces. Façade bays, balcony slabs, glazing, side openings, roof canopy/fins, and foliage must have real depth and parallax, measured against the official Otium orbit frames from multiple angles.
- The Project Reverance roof silhouette and side/rear massing are fidelity-critical. Treat Otium's orbit frames as simultaneous multi-view constraints; a front-only match that breaks when rotated is not acceptable.
- Treat `https://otium.ge/ka/project/7` and its 100-frame 1920×1080 3D orbit as the authoritative geometry source. The separate `/block/ReveranceA` 2D floor-selector illustration uses a conflicting slender-fin crown and must not be mixed into the 3D reconstruction.
- The roof uses four tall rectilinear L-shaped portal ribs with long depthwise returns, alternating with five lower bronze crown screens; never approximate it with triangular wedges, spikes, or equal fins.
- Preserve the full first-phase composition visible on the project page: both 16-storey blocks, the planted inner façades, central garden and pool, entrance landscaping, and furnished timber roof terraces. The official 4000×4000 aerial and gallery renders are mandatory roof/landscape QA references.
- Open sky must remain visible through the crown portals from every angle. Reject any segmentation or reconstruction pass that turns the perimeter beam and ribs into a solid roof cap.
- Photoreal material response and landscape density are acceptance criteria. Use clean champagne/silver/bronze PBR surfaces, smoked glazing with recessed interior detail, continuous planted balcony troughs, and real volumetric trees/shrubs/palms rooted in modeled soil beds.
- Include both official landscape systems: the layered tropical entrance garden and the raised inner-side shared courtyard/podium with hedge, real trees, pavilion, and X-trellis. Visually inspect matched front, side, rear, roof, and browser views during every reconstruction pass.
- The third full landing-page section is a production-quality Residence Explorer: the Project Reverance building is clickable by floor, and selecting a floor opens an AiXESS-branded modal with the floor plan, apartment availability, and unit details.
- Treat the Residence Explorer as a core product flow, not a visual demo. Preserve live-data refresh with a local snapshot fallback, keyboard access, responsive behavior, loading/empty/error states, and comprehensive automated and browser testing.
- Preserve the accepted production SOG building exactly. Keep free interaction inside the calibrated artifact-free orbit, and make hover unmistakable by tinting the actual splats across the complete floor while synchronizing the floor rail and availability label.
- Keep the orange hover tint depth-aware and confined to the exact selected storey at every orbit angle. Large Gaussian footprints must be clipped at the calibrated floor boundaries and must never tint the floor above or below.
- Treat one selectable floor as the complete façade bay between two consecutive horizontal slab lines; the tint should meet those two slab edges without crossing either one.
- Enable floor hover and selection as soon as the Residence Explorer is visible during scroll; keep the automatic side-to-front camera motion running until settled, then expose orbit and zoom controls.
- Keep the Residence Explorer crisp and temporally stable: render the accepted SOG at a capped 2x backing resolution with large-precision splat data, and bind the pre-settle camera directly to scroll progress so asynchronous WebGL sorting cannot replay a trailing sequence of stale poses.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.
