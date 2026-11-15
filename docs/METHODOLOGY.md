# Methodology: how FarmTwin computes every number

This document explains, step by step, how Quasaris FarmTwin turns NASA data into the water, income, soil health and risk figures shown in the app. Every number comes from a **deterministic engine**: the same inputs always give the same outputs, and every constant below is in the code (paths in brackets). No machine-learning model produces a result or a recommendation.

Related documents: [`DATA_SOURCES.md`](DATA_SOURCES.md) (what data, from where), [`VALIDATION.md`](VALIDATION.md) (how reliable it is), [`AI_USAGE.md`](AI_USAGE.md) (where AI was and was not used).

## 1. Inputs

| Input | Who provides it | Used for |
| --- | --- | --- |
| Field location (lat, lon) and optional outline | Farmer, on the satellite map (search, one tap or drawing) | Climate, altitude, field area |
| Water allocation per hectare per year | Farmer (default 15,000 m³/ha, an estimate for Majes) | Viability, water stress, yield loss |
| Irrigation system: furrow, sprinkler or drip | Farmer | Irrigation efficiency |
| Soil texture: sandy, loam or clay | Farmer (ISRIC SoilGrids shown as a regional reference) | Efficiency, soil advice |
| Priorities: water, income, soil, risk (0 to 1 each) | Farmer | Weights of the fit score |
| Rotations: crops and sowing month, in sequence or associated | Farmer, or the sample rotations for Majes | Everything below |

The request and response formats are fixed by a shared contract (`lib/contract.ts` ↔ `engine/schema.py`), checked by `engine/tests/test_contract.py`.

## 2. Climate for the exact field (NASA POWER + SRTM)

1. **Altitude.** The field's elevation comes from NASA SRTM (90 m) through the OpenTopoData API (`engine/elevation.py`). Majes: 1,409 m.
2. **NASA POWER cells.** POWER daily data (Agroclimatology community, 2005–2025) comes in cells of about 0.5° × 0.625° (~55 × 65 km), each with one average elevation. Around Majes the neighbouring cells go from 835 m (humid, cloudy coast) to 3,269 m (highlands), so no single cell represents the field.
3. **Vertical fusion** (`engine/power.py`). The engine takes the two cells whose elevations bracket the field and interpolates every daily variable between them:
   `w = (z_field − z_low) / (z_high − z_low)`, `x = (1 − w) · x_low + w · x_high`.
   For Majes the weights are 0.48 / 0.52. If no pair brackets the altitude, it uses the closest cell and corrects temperature with the standard lapse rate of −6.5 °C/km.
4. **Quality checks before use** (`engine/quality.py`): structure and dates, the POWER missing-value sentinel (−999), physical ranges, Tmin ≤ Tmax, solar radiation between 3% of and 100% of the extraterrestrial value, stuck values, temperature spikes and gaps. Bad values become gaps, short gaps are interpolated, and any year with more than 15% filled days is excluded.
5. **Variables used:** maximum and minimum temperature, solar radiation, relative humidity, wind at 2 m and corrected precipitation; root-zone soil wetness (`GWETROOT`) as supporting evidence.
6. **Cache.** The four Majes cells are stored in `data/power_cache/` so the demo works offline; other places are downloaded live.

## 3. Crop water demand (FAO-56)

1. **Reference evapotranspiration (ET0)** with the FAO-56 Penman-Monteith equation, computed for every day of the 21 years (`engine/et0.py`). It is verified against FAO-56 worked examples (ET0 = 3.9 mm/day in example 18, Ra = 32.2 MJ/m²/day in example 8).
2. **Crop calendar** (`engine/rotation.py`). Each crop is sown on day 1 of its month and occupies its cycle (FAO-56 Table 11 stage lengths). The rotation repeats every year, and a cycle that passes December continues in January. Perennials (alfalfa) cover the whole year; established orchards use 12 monthly coefficients.
3. **Crop coefficient (Kc)** per day: constant in the initial stage, linear rise in development, constant at mid-season, linear decline to the end value (FAO-56 Table 12). When two crops overlap in a sequence, the higher Kc counts.
4. **Crop evapotranspiration:** `ETc = Kc × ET0`, summed per month.
5. **Effective rain** (USDA-SCS method, as in FAO): `Pe = P · (125 − 0.2 P) / 125` if the monthly rain P ≤ 250 mm, else `Pe = 125 + 0.1 P`. It only counts for the share of the month with a crop in the field.
6. **Net irrigation** per month: `max(0, ETc − Pe)`. **Gross irrigation** = net / efficiency, with 1 mm = 10 m³/ha.
7. **Irrigation efficiency** = system × soil factor (capped at 0.95):

| System | Base | Sandy | Loam | Clay |
| --- | --- | --- | --- | --- |
| Furrow (gravity) | 0.45 | × 0.85 | × 1.00 | × 1.05 |
| Sprinkler | 0.75 | × 0.95 | × 1.00 | × 1.00 |
| Drip | 0.90 | × 1.00 | × 1.00 | × 1.00 |

Sandy soils lose more water by deep percolation under furrow irrigation, which is why the factor is lower.

**Crop associations** (crops sharing the plot at the same time, such as maize, bean and squash): each crop gets an equal share of the plot, the plot's Kc is the share-weighted sum, and days with two or more crops transpire 10% more (denser cover). Their yield uses a conservative land equivalent ratio: `LER = 1 + 0.08 × mean pair effect`, where each pair's effect goes from −2 to +2 (`data/crops.json` → `companions`), giving 0.84 to 1.16. The literature reports about 1.2–1.4 for the *milpa*.

## 4. Climate risk, income and water shortage, year by year

For every rotation and every complete year from 2005 to 2025:

- **Frost days:** days in each crop's cycle with Tmin below the crop's frost threshold. **Heat days:** days with Tmax above its heat threshold (thresholds in `data/crops.json`).
- **Climate yield factor** per crop: `max(0.3, 1 − 0.03 × frost days − 0.01 × heat days)`.
- **Water yield factor:** 1 if the year's gross irrigation fits the allocation, otherwise `max(0.3, allocation / need)`.
- **Income** (S/ per hectare per year): `Σ yield × price × share × LER × climate factor × water factor − cost × share`. Yields, farm-gate prices and costs are approximate MIDAGRI references for Arequipa, labelled "to validate".
- **Monthly status** for the year: *bare* if less than half of the month has a crop; *climate risk* if there is at least 1 frost day or 3 heat days; *water stress* if the month's gross irrigation exceeds 1.2 × one twelfth of the allocation; otherwise *OK*.
- **Harvest lost (risk)** for the year: the larger of the revenue-weighted climate loss and the water shortfall `1 − allocation / need`.

## 5. From 21 years to one comparison

- **Ranges, not single numbers.** Water, income and risk are reported as the median and the 10th and 90th percentiles of the 21 years ("bad year" and "good year" in the app).
- **Typical months:** for each month, the most frequent status across the years (ties go to the more severe one).
- **Viable:** the median water need fits the allocation. When it does not, the app shows how many m³/ha are missing and in how many of the 21 years the water would have been enough (`lib/water-fit.ts`).
- **Soil health** (0 to 1, transparent rules in `soil_score`): start at 0.40; +0.20 with a legume (nitrogen fixation); +0.15 with three or more crop families, +0.08 with two (breaks pest cycles); +0.15 with a perennial (permanent cover, no tillage); +0.05 when root depths differ by 0.4 m or more; −0.10 each time a crop follows one of the same family; −0.05 per typical bare month (erosion, loss of organic matter).
- **Fit score** (0 to 1): each indicator is normalised across the rotations being compared (water: less is better; income: more is better; soil as is; risk as 1 − median risk), then averaged with the farmer's priority weights. A rotation that does not fit the water is multiplied by 0.6. The app breaks the score down part by part (`components/cards/score-breakdown.tsx`).
- **Explanations** (`_explain` in `engine/simulate.py`): every rotation carries keys for why it ranks where it does, the evidence (21 years of NASA POWER, Penman-Monteith, altitude fusion, frost history, natural soil dryness, legume nitrogen), its benefits, what is missing (water allocation, prices, local yields, ground station) and what to review with an expert. The interface translates the keys into Spanish or English.
- **Highlights:** the driest year (extra water against the median), the worst income year, and how many years had more than 10% of the harvest lost.

## 6. Screens built on the engine

| Screen | Method |
| --- | --- |
| **Time machine** | Shows the year-by-year engine results unchanged, next to the MODIS NDVI tile of the same month (NASA GIBS). |
| **3D farm** (`lib/granja-sim.ts`) | Multiplies the engine's per-hectare monthly water and status by the plots painted with each rotation. The farm's water is used month by month against the allocation; the month it runs out, the plots turn "dry". Scenarios use real years: *typical* = the year with median water demand, *dry* = the highest demand, *El Niño* = the El Niño year (2010, 2016, 2017 coastal El Niño or 2023) with the highest water demand, other than the dry-scenario year, *hotter* = the typical year with +1.5 °C added to every temperature by the engine. Heat events raise that month's water by 15%. Alert cards count in how many of the 21 years each risk happened. |
| **Calendar and alerts** (`climate_weeks`) | For each of the 52 weeks: the share of the 21 years with Tmin ≤ 2 °C at 2 m (possible frost at crop level), with Tmax ≥ 30 °C, the mean ET0 and the soil wetness. The daily push alert uses this climatology for the current week. |
| **Recommendations** (`lib/recommendations.ts`) | Rules applied to the field profile and the crops of the chosen rotation. Zone from SRTM altitude (below 2,000 m coast and arid valleys, 2,000–3,500 m inter-Andean valley, above 3,500 m high plateau); arid if the mean root-zone wetness is below 0.4; frost risk if the engine found frost days or the field is above 3,300 m. Nitrogen balance = crop demand − legume fixation (from `data/crops.json`). Fertiliser advice by soil texture, phosphorus and potassium by crop demand, potassium sulphate and salinity care in arid fields. Microorganisms are chosen from each crop's family, pests and diseases (Rhizobium strains per legume, Azospirillum for grasses, mycorrhizae, Trichoderma, Purpureocillium, Beauveria, Bt, B. subtilis). Devices by soil, irrigation, risk and pests (flow meter, moisture sensor, drip kit with the efficiency saving above, fertigation injector, frost station, salinity meter, colour and pheromone traps). |
| **What you can do** (Compare) | Actions for the current rotation computed with the same engine rules: drip savings from the efficiency table, soil points from the soil-health rules, and the months with water stress. |
| **One-tap field outline** (`lib/auto-parcel.ts`) | Classic image processing in the browser: a 3 × 3 mosaic of Esri satellite tiles around the tap, region growing at several colour sensitivities, then the most field-like shape (compact, rectangular, even colour, not tiny) is simplified to a few corners. It is not AI, and no image leaves the device. |
| **AI assistant** | Explains results in plain language. It can only quote numbers returned by engine tools (simulate a rotation, look up a year, explain a term, regional soil, crop catalogue, adjust priorities). See `AI_USAGE.md`. |

## 7. Assumptions and limits

- Prices, yields, costs, frost and heat thresholds, and the nutrient, pest and disease data per crop are estimates to be validated with a local agronomist (INIA, UCSM). The app labels them "to validate".
- The allocation is split into 12 equal monthly parts; real irrigation turns (AUTODEMA) are not modelled.
- NASA POWER cells average about 55 km. The SRTM fusion corrects altitude, not the microclimate of a single valley.
- SoilGrids, SMAP and NDVI are shown as references and map layers; they do not enter the water balance. The farmer chooses the soil texture.
- Ground validation against the SENAMHI Pampa de Majes station is prepared but pending the manual data download (`VALIDATION.md` §3).
- Recommendations are general agronomy rules. Products must be registered with SENASA, labels must be followed, and doses confirmed by an agronomist. A soil test sharpens fertiliser advice.
