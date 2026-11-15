# Data sources

Declaration of NASA, partner-agency and other data used by **Quasaris FarmTwin** (NASA Space Apps Challenge 2026, *Field Shift: Adapting Farms with NASA Data*).

## NASA data

| Dataset | Provider | What we use | How | Where in code |
| --- | --- | --- | --- | --- |
| **NASA POWER**, Daily, Agroclimatology community (AG), 2005-01-01 to 2025-12-31 | NASA Langley Research Center (LaRC), POWER Project | `T2M_MAX`, `T2M_MIN`, `ALLSKY_SFC_SW_DWN`, `RH2M`, `WS2M`, `PRECTOTCORR` | Reference evapotranspiration (FAO-56 Penman-Monteith), crop water demand, frost and heat days, effective rain, the 21-year time machine, the 3D farm year and the weekly climatology for the calendar and alerts. Every series goes through quality checks first (`engine/quality.py`). | `engine/power.py`, `engine/quality.py`, `engine/et0.py`, `engine/rotation.py`, `engine/simulate.py` |
| NASA POWER, `GWETROOT` (root-zone soil wetness, MERRA-2) | NASA LaRC / GMAO | Monthly and weekly averages of natural soil moisture | Shown in Compare and in the calendar; supports the evidence "without irrigation the soil stays dry" (Majes ≈ 0.33 all year). Not used in the water balance. The Recommendations screen uses the yearly mean to flag arid fields (below 0.4: salinity care, potassium sulphate, salinity meter). | `engine/simulate.py`, `lib/recommendations.ts` |
| **SRTM** (Shuttle Radar Topography Mission), 90 m, via the public OpenTopoData API | NASA / NGA | Terrain elevation of the field | Picks the two NASA POWER cells that bracket the field's altitude and interpolates every daily variable between them (vertical data fusion). Falls back to a −6.5 °C/km lapse rate. The same elevation sets the zone in Recommendations (below 2,000 m coast and arid valleys, 2,000–3,500 m inter-Andean valley, above 3,500 m high plateau). | `engine/elevation.py`, `engine/power.py`, `lib/recommendations.ts` |
| **SMAP L4 Analyzed Root Zone Soil Moisture** (`SMAP_L4_Analyzed_Root_Zone_Soil_Moisture`) via **NASA GIBS** WMTS | NASA JPL / GMAO / EOSDIS | Daily soil-moisture map tiles since 2015 (~9 km) | Alternative map layer to NDVI, synchronised with the time machine date. **Display only.** | `lib/gibs.ts`, `components/map/parcel-map.tsx` |
| **MODIS Terra NDVI, monthly** (`MODIS_Terra_L3_NDVI_Monthly`) via **NASA GIBS** WMTS | NASA EOSDIS / GIBS | Vegetation index map tiles for any month 2000–2026 | Layer on the field map and in the time machine, synchronised with the selected year and month. **Display only, not used in calculations.** | `lib/gibs.ts`, `components/map/parcel-map.tsx` |

The 4 NASA POWER cells around the Majes irrigation district are cached in `data/power_cache/` so the demo works offline. Any other location is fetched live from the POWER API.

## Other data

| Source | Use | Status |
| --- | --- | --- |
| **FAO Irrigation and Drainage Paper 56** (Allen et al., 1998) | Penman-Monteith equations, crop coefficients (Kc, Table 12), stage lengths (Table 11), effective-rain method | Used; ET0 verified against FAO-56 examples 8 and 18 (`engine/tests/test_engine.py`) |
| **ISRIC SoilGrids** (250 m) | Regional soil texture, profile and potential water retention for the field, shown in the Soil panel and available to the assistant | Used as a regional reference, cached in `data/soilgrids/`; labelled as a model, not a field sample |
| **MIDAGRI** (Peru Ministry of Agriculture) public references | Approximate yields, farm-gate prices and costs in `data/crops.json` | **Estimates, to be validated** with an agronomist |
| Crop association literature (intercropping, land equivalent ratio) | Companion pairs in `data/crops.json` and the yield bonus of associations such as the *milpa* (maize, bean, squash) | Simplified rule; to be validated |
| **SENAMHI** station Pampa de Majes (code 116006) | Ground validation of NASA POWER temperature, ET0 and rain | **Pending**: manual download (see `docs/VALIDATION.md`) |
| Purdue University, *AguaRiego* manual (Table 11, Pampa de Majes) | Independent comparison of the alfalfa water requirement | Used for comparison only (`docs/VALIDATION.md`) |
| Esri World Imagery, World Topo Map and reference labels | Base maps under the NASA layers. World Imagery tiles are also analysed in the browser by the one-tap field selector to find the field outline (`lib/auto-parcel.ts`) | Display, plus outline detection on the user's device |
| General agronomy references (crop nutrient demand, legume nitrogen fixation, common pests and diseases, bio-inputs used in Peru) | Rules and crop data behind the Recommendations screen (`lib/recommendations.ts`, `agronomy` block of `data/crops.json`) | **Guidance, to be validated** with an agronomist (INIA, UCSM); products must be registered with SENASA |
| **OpenStreetMap** via Nominatim | Place search on the map, only when the user confirms a search (no autocomplete, per the Nominatim usage policy) | Display and navigation only; attribution shown |

## Not used yet (planned)

From the challenge's suggested datasets: SMAP in calculations (today only as a map layer), GPM IMERG (precipitation), ECOSTRESS (evapotranspiration), GRACE/GRACE-FO (groundwater trends), Landsat/HLS via AppEEARS (field-level NDVI and bare-soil months), GEDI, and a forecast source (such as Open-Meteo) for forecast-based alerts. See `PLAN.md` §10.
