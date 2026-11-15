# Majes crops integration

Implemented 15 November 2026. The catalog now contains 21 crops: the original 16 plus **artichoke (`alcachofa`), avocado (`palta`), table grape (`uva`), mandarin (`mandarina`) and pomegranate (`granada`)**.

## Available in the app

- Artichoke appears under Vegetables / Hortalizas. The four orchard crops appear in Fruit / Frutales. Both rotation editors and the guided onboarding read the shared catalog.
- Each addition has a standalone farm preset, bilingual name/product description, icon, agronomy tasks and 3D plant. Custom saved plans also enter the farm palette.
- The Python engine simulates all five. Compare and the historical time machine consume these results through the existing shared simulation flow.
- The calendar, weekly outlook and push-alert calculations read the same crop timing. Printable plans show harvest windows, including repeated artichoke picking.
- The assistant can look up all 21 available crops with `consultarCultivos`; simulation tools return product, crop timing and profile assumptions. Their input schema now preserves association mode.
- Offline snapshots include the five new farm presets. A custom plan can use a matching preset snapshot, identified by crop/calendar rather than its arbitrary ID. Unsupported calendars return no demonstration result instead of borrowing another crop's results. Cached engine results are reused only for matching requests. Snapshot outputs are labeled demo data.

## Model boundaries

The new profiles are **planning assumptions, not locally validated production recommendations**. This is stated in the selectors/results and passed to the assistant. Each profile includes product and time basis, source descriptions/links, `evidenceStatus: planning_assumption`, and no fabricated review date.

Orchards represent one year of an **existing producing stand**. Their 12 monthly Kc values are expanded identically into 365 daily coefficients in Python and TypeScript. They stay planted throughout the year, have explicit approximate flowering/harvest months, and do not inherit alfalfa's constant coefficient, monthly income distribution or cutting animation. Harvest-window income is allocated across those months; it is not a complete monthly cash-flow model.

The orchard model excludes establishment investment, young-tree yields, canopy/age adjustments, changes in pruning strategy and multi-year investment returns. Orchard crops are selectable as standalone plans; sequential rotations or intercropping with them are blocked in the UI and rejected by the engine. Different crops can occupy neighboring farm plots. Automatic farm fixes do not suggest instantly establishing an orchard or uprooting one to save water.

Artichoke is represented as an illustrative 240-day transplanted field crop, excluding nursery occupancy, with four picking dates. These dates share one season's yield/income; repeated picking does not multiply production. Local management can differ and needs review.

## Parameter sources

[FAO-56 chapter 6, table 12](https://www.fao.org/4/x0490e/x0490e0b.htm) provides reference Kc endpoints for artichoke, avocado without ground cover, table grapes and citrus. The citrus profile uses the 70% canopy/no active ground-cover reference. Monthly scheduling and harvest dates are illustrative transfers, not measured Majes curves. Pomegranate coefficients are explicitly identified as assumptions; the original table does not list that crop.

[Regional government documentation](https://www.gob.pe/institucion/regionarequipa/noticias/908942-realizan-campana-de-control-de-plaga-de-la-mosca-en-majes) establishes the local presence of the fruit crops; it does not supply their model parameters. [The Majes farmer study](https://laccei.org/LACCEI2025-Mexico/full-papers/Contribution_1678_final_a.pdf) and [INIA artichoke manual](https://repositorio.inia.gob.pe/items/e065ce0d-8d04-4c14-b2bc-55ce3412f285) provide additional context for artichoke.

Yields, prices, costs, nutrient values, temperature thresholds and seasonal timing of the new records are explicitly illustrative. Source links must not be interpreted as evidence for those assumed values. Validate them with local producers, a technician, irrigation records and actual buyer terms before operational use. The pre-existing engine's simplified stress losses, nitrogen/grouping scores and annual economic model remain limitations.

## Verification

- `npm run test:crops`: checks all 21 crops plus bilingual task keys, icons, custom farm palettes, repeated harvests, annual income conservation, printable plan groups, monthly orchard coefficients and demo matching.
- `python -m pytest engine/tests -q`: includes API simulations for all five additions, 21 historical years, valid monthly water data, year-round orchard occupancy and rejection of incompatible orchard mixtures.
- Type checking, ESLint and the production build are part of the integration checks.
- An isolated Chrome session checks the 21-option Spanish selector and Fruit category, persists an avocado selection, calls the real Python engine through the Next development proxy, and renders the added crop plans in Compare, Time machine, Calendar, My plan and the 3D farm.

AI response generation and actual push delivery require their configured services; these were not invoked to validate the crop data flow.
