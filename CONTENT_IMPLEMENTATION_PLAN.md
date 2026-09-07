# September 7 content and calculator update

Source: AiXESS_Website_Content_Final.docx and AiXESS_Calculator_Package supplied by the owner.

## Scope

1. Preserve the original homepage. Place network positioning, eligibility, commercial advantage, process and Client Mode on Broker Access; benefits, services and backing on Why AiXESS; opportunity facts and live inventory on Residences; calculators and insights on Resources.
2. Keep existing WebGL explorer, inventory, admin authorization, privacy controls and Workwise routes. Use shared content sections on related routes so the new messaging is consistent.
3. Integrate only Payment Plan, Rental Yield, Financing and Capital Growth from the supplied prototype. Port the supplied formulas to independently testable functions. Exclude commission and the other four calculators. Client PDF generation is explicitly a future feature.
4. Bundle complete EN/DE/PL/SL/RU copy, including validation, results, assumptions and calculator labels. Format numbers using the selected locale and EUR currency.
5. Validate formula examples, zero interest, percentage totals, invalid/empty inputs and negative-growth scenarios. Verify responsive layouts and navigation in all five languages from 320px to wide desktop. Run app tests, build and Sites packaging tests.

## Evidence and owner decisions

- Workbook-backed availability is 165, matching the document. Keep it computed from inventory rather than hard-coded.
- Use supplied EUR 45,000 starting price as owner-provided marketing copy; do not infer unit prices or payment schedules from it.
- The calculator prototype values are editable examples, not approved unit terms. No unit-level prices or approved schedules are included in the inventory; do not invent automatic price loading.
- The supplied document states payment of full commission within 72 hours after required 10% initial payment. Preserve that wording and its sign-in qualification; do not invent a commission rate.
- Owner confirmed the market/company figures are to be used as supplied and the asterisks are editing markers, not footnotes. Display these figures without asterisks or invented citations/reporting periods.
- Owner confirmed Client Mode should be marked coming soon. PDF generation remains a future feature.
- Local implementation and QA first.

## Acceptance

- Every requested section has an explicit implementation or documented pending dependency.
- Only four selected calculators appear publicly and all displayed results are finite.
- New locale dictionaries have matching structure and no missing or fallback English strings.
- No horizontal overflow, clipped headings or unusable controls at tested widths.
- Existing residence selection and authentication routes continue working.

## Implemented and verified

- Owner corrected the initial homepage interpretation: the document lists sections but does not explicitly instruct a homepage replacement. Homepage restored to the original headline, ticker, silver access section and explorer; shared navigation retains Register/Login.
- New content is placed on the relevant dedicated pages. Resources includes the four calculators and insights. Broker Access includes the new network introduction, with Client Mode marked coming soon.
- 165 available residences remain computed from the workbook-backed inventory. Market/company statistics use the owner's approved figures. Client Mode and PDF creation are explicitly planned; there is no public commission calculator.
- The four calculator formulas are ported from the supplied prototype, with validation, locale-aware amounts/percentages, accessible tab navigation, editable per-tool assumptions and stale-result clearing. Mobile calculation scrolls to results.
- English, German, Polish, Slovenian and Russian content dictionaries have matching structure. All new inputs, outputs, errors, notes and interface states are translated.
- After placement correction: full Vitest suite 17 files, 139 tests passed; Sites tests 4 passed; build succeeded. Browser checks passed for 75 page/language/width combinations (five pages, five locales, 320/768/1440px), with no horizontal overflow and exactly one main heading. The four calculator tabs and illustrative-input disclaimer were verified. Calculator navigation is present in both desktop and mobile menus in all five locales and opens the calculator route. Original homepage structure and Workwise CTA destinations are covered by regression tests. Restored desktop homepage and mobile Broker Access screenshots were inspected.
- Initial implementation browser matrix (before the homepage placement correction): 30 homepage language/width combinations (320, 390, 768, 1024, 1440, 1920px), 120 calculator/tool/language/width combinations, and 60 home/Why/Broker/Resources language/width combinations passed overflow and text-clipping checks. All calculator cases rendered four results.
- Screenshots inspected: mobile Russian homepage and calculators; desktop German homepage, opportunity, insights and financing results.
- Mobile journey checked: homepage calculator link, calculation, visible results, menu language switch to Polish, translated existing results.
- These are local automated/browser checks, not a claim of testing every physical device. No deployment was performed in this implementation turn.
