# Crop dataset analysis for Majes

Research date: 15 November 2026. Scope: Pampa de Majes / El Pedregal and the Majes irrigation district served by Quasaris. This is a dataset and integration proposal; it does not change simulation parameters or certify agronomic recommendations.

Subsequent implementation: the five proposed crop additions are now integrated as explicitly labeled planning profiles. See [Majes crops implementation](MAJES_CROPS_IMPLEMENTATION.md) for shipped behavior, model boundaries and verification. The broader local validation and profile improvements below remain research work.

## Recommendation

Improve the evidence and production profiles of the existing Majes crops before substantially expanding the selectable list. Prioritize alfalfa, forage maize, red onion, potato, quinoa and paprika; develop artichoke as the first additional crop. Prepare avocado and grape reference records, but enable their simulations only after the engine supports orchards.

The useful unit of data is **crop + variety or cultivar group + harvested product + season + management system + location**. One universal record for “maize”, “onion” or “alfalfa” cannot adequately describe the choices a farmer makes.

Keep three questions separate: Is the crop grown locally? Is there enough information to explain its management? Is there enough validated information to calculate this particular output? Local presence alone does not establish a calibrated yield, planting calendar or profitable market.

## What the current repository contains

Inspected `data/crops.json`, both crop/calendar implementations, the rotation engine, grouping rules, simulation orchestration, farm visualization and existing data/validation documentation. The catalog has **16 crops, 25 companion rules and zero crops with a URL in their `sources` object**. Source descriptions exist, but do not identify the underlying economic tables, observation periods or adjustments.

Each crop has one set of Kc values, stage durations, root depth, temperature thresholds, yield, price and cost. Agronomy adds indicative nitrogen demand/fixation, categorical P/K demand and labor, and lists of care tasks, pests and diseases. These are useful starting fields, but the catalog itself labels the numbers as estimates awaiting review.

| Finding in the current implementation | Consequence for farmers | Recommended response |
| --- | --- | --- |
| `stagesDays` is fixed; placement uses the first day of `sowMonth` | Harvest and water peaks cannot reflect exact planting dates, seasonal development, nursery time or cultivar differences | Store season-specific profiles, distinguish nursery from field occupancy, and eventually accept actual establishment dates |
| Alfalfa uses a constant `kcAvg=0.9` for 365 days; every perennial is handled similarly | Cutting/regrowth and establishment are absent; an orchard added with `perennial=true` would inherit inappropriate timing | Explicit lifecycle and harvest models, including establishment, repeated cuts and orchard age |
| Yield, price and cost are single constants | Economic rankings mostly inherit assumed numbers rather than current local conditions | Dated observations, product definitions, ranges or scenarios and farmer overrides |
| Annual yield units have an alfalfa exception in a global note | Per-cut, per-season and per-year quantities can be mixed | Put product, moisture basis, area and time basis on every yield and cost record |
| Nitrogen is summarized as total fixation minus total demand | The displayed balance is not a fertilizer requirement or residual nitrogen credit | Separate fixation, crop uptake, harvest removal, residue management and credit to the next crop |
| Companion scores alter modeled yield through `association_ler()` | Unsourced compatibility claims affect income | Keep uncertain interactions descriptive; require trial evidence before applying a numeric yield adjustment |
| TypeScript uses `as unknown as`; Python constructs a numeric `Crop` directly from JSON | Enriching the JSON alone neither validates its structure nor makes new fields usable | Add shared schema validation and explicit profile selection in both runtimes |

The existing `docs/STRATEGIC_IMPACT_AUDIT.md` independently identifies related limitations. This proposal concentrates on the crop information needed to address them.

## Crop priorities

A [2025 study of 689 Majes farmers](https://laccei.org/LACCEI2025-Mexico/full-papers/Contribution_1678_final_a.pdf), p. 6, identifies forage maize, alfalfa, red onion, potato and quinoa as leading crops within its sample. It also records artichoke, squash, paprika, avocado, garlic and tomato. Several irrigation commissions, including Pampa Baja, did not participate, so its ranking should not be treated as an exhaustive district census.

| Priority | Crops | Dataset work |
| --- | --- | --- |
| First | Alfalfa, forage maize | Establishment versus established stands; cuts and regrowth; green forage versus dry matter; silage/fresh uses; purchased-feed substitution |
| First | Red onion, potato | Cultivar/product groups, field establishment, commercial grades, saleable yield, planting and harvest windows, labor and price seasonality |
| First | Quinoa, paprika | Verify parameter provenance; cultivar and harvest basis; drying/cleaning, rejection losses, quality requirements and buyer conditions |
| Next addition | Artichoke | Specify cultivar, annual versus retained management, nursery/field stages, harvest window, repeated picking and saleable product |
| Maintain and review | Garlic, squash, tomato | Keep available; validate profiles and product definitions as evidence is collected |
| Additional options | Faba bean, dry bean, pea, wheat, barley, forage oats, carrot | Preserve existing IDs; distinguish a locally documented commercial profile from a general reference or proposed rotation option |
| Orchard workstream | Avocado, grape; subsequently mandarin and pomegranate | Reference records first; age, establishment investment, canopy, annual phenology, marketable grades and multi-year cash flow before simulation |

The regional government documents avocado, grape, mandarin and pomegranate in the irrigation district in its [February 2024 fruit report](https://www.gob.pe/institucion/regionarequipa/noticias/908942-realizan-campana-de-control-de-plaga-de-la-mosca-en-majes). [AUTODEMA reported more than 1,200 hectares of avocado in December 2024](https://www.gob.pe/institucion/regionarequipa/noticias/1073749-autodema-promueve-siembra-de-paltas-de-exportacion). These establish local relevance, not orchard parameters. Store the dates and geographic scopes; do not label those areas as current 2026 measurements.

Do not add rice solely because a source mentions the wider Valle de Majes. Confirm the target geography and actual users before extending a Pampa de Majes catalog with a different cropping system.

## Specific corrections and research opportunities

**Forage maize:** Quasaris currently assumes 110 days and 60 tonnes/ha. [INIA's INIA 617–Chuska documentation](https://pgc-snia.inia.gob.pe/entities/product/9c4e7ac2-6aab-4694-abc9-c5f0ad71b7c7) reports cutting at 93 days in summer and 110 in winter, with a reference forage yield of 95 tonnes/ha. This demonstrates why cultivar and season belong in the data. It does not justify replacing the default with 95: trial/reference performance and typical farm performance are different evidence classes, and stage lengths cannot simply be invented to match a total.

**Alfalfa:** Separate establishment costs from established-stand annual operation, record stand age and actual cutting dates, and state whether yield is green forage, hay or dry matter. [FAO-56 chapter 6](https://www.fao.org/4/x0490e/x0490e0b.htm) distinguishes coefficients averaged across cutting effects from individual cutting cycles. A seasonal comparison may use an explicit average; weekly management needs regrowth timing. The local validation document already reports a 24% difference from another modeled annual water estimate, not a field measurement.

**Quinoa provenance:** `crops.json` attributes its values to FAO-56 “table 12 (quinoa)” and “table 11 (quinoa, arid zone)”. I found no quinoa entry in the original chapter containing those tables. Treat these attributions as unverified and locate the actual study or clearly document an assumed proxy. This is a provenance defect; it does not by itself prove that the current numbers are wrong. Garlic, by comparison, does appear explicitly in table 12, although its source note loosely refers to similarity with onion. Both require precise citations and adjustment notes.

**Artichoke:** The [INIA manual](https://repositorio.inia.gob.pe/items/e065ce0d-8d04-4c14-b2bc-55ce3412f285), published in 2001, is a source for crop structure and management topics. Its age and non-specific local calibration limit its use for current economics. Record whether the chosen profile represents fresh heads or processing raw material and the intended production cycle. A generic four-stage, one-harvest record needs careful adaptation.

**Paprika:** Make fresh versus dried yield and price explicit. Include drying costs/losses, saleable fraction and quality rejection. [INACAL identifies Majes as a paprika production area and addresses mycotoxin prevention](https://www.gob.pe/institucion/inacal/noticias/325973-inacalestablece-buenas-practicas-en-la-cadena-de-produccion-y-comercializacion-depaprika-para-prevenir). A nominal yield multiplied by a price is insufficient if quality determines whether the product is accepted. Verify current requirements when operationalizing buyer or standards information.

**Nitrogen:** [USDA NRCS guidance](https://www.nrcs.usda.gov/sites/default/files/2023-04/nrcs142p2_053276.pdf) distinguishes nitrogen retained in residues from that removed in harvested forage. Use this as conceptual support, not a local numerical recommendation. Avoid converting the catalog's `nFixKg` into an equivalent fertilizer saving without residue, harvest and local review information.

## Proposed data structure

Preserve existing crop IDs and Spanish/English names. Add structure through versioned records and a compatibility adapter rather than replacing the current JSON shape and silently changing outputs.

| Record | Minimum useful contents |
| --- | --- |
| Crop identity | Stable ID, scientific name, botanical family, agronomic rotation group, local aliases, category and possible harvested products |
| Local relevance | Geographic area, evidence type, observation year, source and optional reported area with its statistical definition |
| Production profile | Crop ID, cultivar/group, target product, season, establishment method, irrigation/management context, geographic applicability and supported calculations |
| Phenology | Field versus nursery duration, stage names/durations with ranges, planting guidance, harvest window, single/repeated cuts or picking, postharvest turnaround |
| Water parameters | Kc method and stage values, effective rooting depth/development, depletion fraction, critical stages and references |
| Soil suitability | pH guidance, drainage constraints, salinity response with measurement basis, known evidence limits |
| Agronomy | Nutrient uptake/removal basis, residue handling, pests/diseases by stage, rotation constraints, scouting and management tasks |
| Economic observation | Product/grade/moisture, yield basis, price level, currency/unit, period, geography, irrigation context, itemized cost scope and source |
| Source/evidence record | Publisher, title, URL, publication and observation dates, exact page/table, geography, method, adjustments, evidence class and review status |
| Farm observation/override | Farmer's dates, cultivar, actual harvest, sale price, costs, water deliveries and relevant field/laboratory measurements, kept separate from shared defaults |

Use parameter-level evidence: one crop may have a credible Kc reference and an unsupported price. Evidence classes should distinguish local observations, local trials, regional statistics, transferred literature and assumptions. Keep source type, reviewer status and uncertainty separate; a review label does not turn a regional average into a field measurement.

Unknown values should remain unknown. A crop can be available as a reference entry without being enabled for water, yield or margin calculations. Indicate which outputs are supported and why. Do not fill required numeric fields with zero or borrowed values merely to make the crop selectable.

Keep fast-changing prices and costs outside biological crop identity. Add a refresh/review policy, freshness date and offline snapshot timestamp. Missing local observations can be shown alongside a clearly labeled regional reference rather than silently substituted.

## What farmers should gain

| Farmer's question | Information and behavior needed |
| --- | --- |
| “When can I plant, and what follows it?” | Local windows, actual establishment date, uncertain harvest window, field turnaround and rotation constraints |
| “Will my water turn cover the sensitive stage?” | Stage-specific demand plus delivery dates/volumes and measured or estimated soil storage |
| “Should I keep alfalfa or buy feed?” | Forage availability by cut, dry matter/quality basis, feed replacement price and harvest/transport costs |
| “What selling price covers my costs?” | Itemized cost scope, saleable yield, break-even price and explicit low/base/high scenarios |
| “Is this crop appropriate for my field?” | Local applicability and field pH, salinity, drainage and management constraints, with missing measurements visible |
| “What should I inspect this week?” | Crop-stage tasks and locally supported pest scouting information linked to the farmer's dates |

Do not represent all of this as extra static fields in `crops.json`. Water deliveries, soil tests, planting records and farmer economics are farm inputs. Their interpretation requires app behavior and, where appropriate, an agronomist.

For a first release, descriptive stage-based irrigation guidance is achievable before prescribing exact applications. [FAO-56 chapter 8](https://www.fao.org/4/x0490e/x0490e0e.htm) connects water stress to a root-zone balance, rooting depth and allowable depletion. Its salinity treatment also requires correctly defined measurements. Store soil salinity ECe separately from irrigation-water ECw; neither is supplied by the existing texture selector. Do not assume all Majes fields are saline.

## Economics and sources

The current potato record implies a margin of **S/13,000/ha** before modeled stress: 35 t/ha × S/1,000/t − S/22,000/ha. A 30% lower selling price would reduce that arithmetic margin to **S/2,500/ha**. These are sensitivity calculations from existing assumptions, not local price forecasts. They illustrate how strongly economics can affect recommendations even with identical climate.

Define outputs separately: gross sales, cash operating margin, margin including family labor, and longer-term return after establishment/infrastructure costs. Marketable yield and product form must match the price. On-farm forage use may represent avoided feed purchases rather than cash sales. Historical-weather percentiles are not a full economic uncertainty interval; price/cost scenarios need their own labels and assumptions.

Useful acquisition paths:

- [MIDAGRI SIEA methodological guidance](https://siea.midagri.gob.pe/portal/media/attachments/nosotros/gestion/Lineamientos_Metodologicos_SIEA.pdf): identify properly defined farm-gate yield/price statistics. Preserve aggregation level and period.
- [MIDAGRI ESCO publications, published 6 May 2026](https://www.gob.pe/institucion/uegps/informes-publicaciones/8096722-encuestas-de-costos-de-produccion-esco): includes an Arequipa alfalfa cost study. This is a strong candidate for cost components and management context; its full tables and survey reference period still need extraction and review before import. The PDF could not be retrieved in full during this analysis.
- [MIDAGRI's description of SISAP](https://www.gob.pe/institucion/midagri/campa%C3%B1as/3432-precios-de-productos-a-tu-alcance): wholesale prices are useful market context; they must not be relabeled as what a Majes farmer receives.
- [INEI Arequipa statistical compendium 2025, published January 2026](https://www.gob.pe/institucion/inei/informes-publicaciones/7662976-arequipa-compendio-estadistico-2025): provides an official publication and downloadable tables to investigate. Verify district coverage rather than assigning regional totals to Majes.
- INIA/AUTODEMA local technicians, irrigation organizations, farmer records and buyer specifications: proposed sources for missing local profiles and actual practices. No contact or data collection has been performed.

## Integration order and acceptance criteria

1. **Evidence foundation:** introduce a schema version, source registry, parameter provenance, explicit units/product bases, null handling and capability flags. Inventory every current number as an estimate until its specific evidence is attached. Correct inaccurate source descriptions without inventing replacement values.
2. **Six priority crops:** build reviewed profiles for alfalfa, forage maize, onion, potato, quinoa and paprika. Make profile selection explicit; allow farmer overrides and retain their origin. Keep representative cases under both sprinkler and drip where evidence permits.
3. **Calendar and harvest support:** accept establishment dates, season/profile durations and harvest windows. Implement alfalfa cuts and repeated picking where needed. Reject impossible sequences rather than giving overlapping full-field rotations a valid economic ranking.
4. **Artichoke release:** add the identity/reference entry, then enable each calculation only when its required profile, harvest handling and evidence are ready. Update labels, family groups, icons, task translations and default rotations together.
5. **Orchards:** support canopy/age, establishment versus bearing years, seasonal water curves, harvest windows and multi-year economics before enabling avocado or grapes in comparisons.

Files affected by implementation include `data/crops.json`, `engine/crops.py`, `engine/rotation.py`, `engine/schema.py`, `engine/simulate.py`, `lib/crop-calendar.ts`, `lib/grouping.ts`, `lib/granja-sim.ts`, selectors, assistant tools, translations, presets and offline snapshots. In particular, the Python and TypeScript calendar logic must remain consistent; adding JSON fields alone will not change either calculation.

Before activating a profile, require:

- Every calculation-driving value has a unit, product/time basis, source or explicit assumption, applicability and review status.
- Price, yield and cost refer to compatible products and periods; regional data is labeled as regional.
- Calendar tests cover season differences, year boundaries, field/nursery separation and repeated harvest; Python and TypeScript agree.
- Unknown economics suppress margin rankings while still permitting supported reference or water views.
- Stress and yield-loss behavior is reviewed: the current universal 3% frost-day loss, 1% heat-day loss and 30% yield floors cannot be repaired by better crop JSON alone.
- A small, proposed farmer/technician pilot checks whether recorded dates, yields, water and costs match actual practice. This is a usability and calibration step, not statistical proof of performance.

The recommended first deliverable is six credible local production profiles plus an evidence-backed artichoke entry, with clear limits on their calculations. Expansion to more names should follow the same standard.
