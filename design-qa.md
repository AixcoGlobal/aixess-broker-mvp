# Design QA · Mobile option 3

## Source visual truth

- Source: `C:/Users/Administrator/.codex/generated_images/01a03365-ed72-7e52-80c9-3dfd6b8927f3/exec-3e843c83-b409-44f3-adb0-907674bdb84f.png`
- Source pixels: 854 × 2048 (generated mobile concept; no device chrome included).
- Intended state: full-height Project Reverance building hero, left floor rail, top floor chip, and light thumb-first residence sheet with three rooms, filters, reset, and a floor-plan CTA.

## Implementation evidence

- URL: `http://localhost:5173/?qa=mobile-option-3`
- Browser: Codex In-app Browser, browser-rendered tab.
- Primary capture: 390 × 844 CSS px, portrait, deviceScaleFactor 1; same content region and interaction state as the source concept, with the default filter state and no floor highlighted.
- Additional captures: 375 × 667 and 320 × 568 portrait; 1440 × 900 desktop.
- Browser console: 0 errors, 0 warnings.
- Primary interactions tested: pointer hover over the visible WebGL facade shows the floor tooltip and orange floor state; the mobile floor chip changes the live result set; room row selection highlights its exact floor; filter drawer opens; area/bedroom/availability controls update matches; reset clears the floor highlight; `VIEW FLOOR PLAN` opens Floor 04 / Residence 411; modal closes with its existing close control.

## Full-view comparison evidence

The source and browser capture were reviewed as the same 390 × 844 portrait composition. The implementation preserves the source hierarchy: the building remains the dominant full-height visual, AiXESS chrome stays above it, the floor rail is readable at the left edge, and the rounded light residence sheet anchors the lower viewport. The real Reverance WebGL model and official snapshot data intentionally replace the source concept's generated building and fabricated room photography.

## Focused comparison evidence

- Top chrome: logo and dark outlined floor chip are aligned to opposite edges with safe-area-aware padding.
- Floor rail: vertical, scrollable rail is left-anchored above the sheet; active/hover states stay orange and the model remains unhighlighted until a real interaction.
- Residence sheet: rounded handle, count/reset header, three status-coded room cards, compact filter toolbar, expandable filter drawer, and orange CTA all remain readable without horizontal overflow.

## Findings

- No actionable P0/P1/P2 differences remain.
- P3: live unit thumbnails are the official Otium-provided `image3d`/`image2d` assets, so their visual crop varies by residence rather than matching the generated concept's staged interior photos.
- P3: the 320px viewport necessarily scrolls the long floor rail; this keeps every official floor selectable without shrinking labels below a usable size.

## Comparison history

1. Initial mobile pass: at narrow portrait widths the third room card could be clipped by the toolbar. Fixed by giving the room list an explicit flex region and adding a compact ≤380px card treatment.
2. Hover regression check: a mobile room card could select itself when the pointer happened to rest over it after reload. Removed mouse-enter selection while preserving tap and keyboard selection; first-load state now has no selected card or highlighted floor.
3. Final pass: 390 × 844, 375 × 667, and 320 × 568 captures show no page-width overflow, no card/toolbar overlap, a visible CTA, the expected building-to-sheet balance, and working facade hover.

## Implementation checklist

- [x] Full-height portrait model stage with native WebGL interaction preserved.
- [x] Left floor rail and top floor chip.
- [x] Thumb-first live room selector with available/reserved/sold treatments.
- [x] Functional mobile filters, reset, room selection, and floor-plan modal CTA.
- [x] Responsive checks at 320px, 375px, 390px, landscape fallback, and desktop.
- [x] `npm test` (68/68), `npm run build`, `npm run test:sites` (4/4), `npm run verify:explorer` (14/14), and `npm run verify:scroll` passed.

final result: passed
