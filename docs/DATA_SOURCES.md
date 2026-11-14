# Data sources · Fuentes de datos

Declaration of NASA, partner-agency and other data used by **Quasaris FarmTwin** (NASA Space Apps Challenge 2026, *Field Shift: Adapting Farms with NASA Data*).

Declaración de los datos de la NASA, de agencias socias y de otras fuentes que usa **Quasaris FarmTwin**.

## NASA data · Datos de la NASA

| Dataset | Provider | What we use · Qué usamos | How · Cómo | Where in code |
| --- | --- | --- | --- | --- |
| **NASA POWER** – Daily, Agroclimatology community (AG), 2005-01-01 to 2025-12-31 | NASA Langley Research Center (LaRC), POWER Project | `T2M_MAX`, `T2M_MIN`, `ALLSKY_SFC_SW_DWN`, `RH2M`, `WS2M`, `PRECTOTCORR` | Reference evapotranspiration (FAO-56 Penman-Monteith), crop water demand, frost and heat days, effective rain, the 21-year "time machine" and the weekly climatology for the calendar and alerts. · ET0, demanda de agua, heladas, calor, lluvia efectiva, máquina del tiempo y calendario. | `engine/power.py`, `engine/et0.py`, `engine/rotation.py`, `engine/simulate.py` |
| NASA POWER – `GWETROOT` (root-zone soil wetness) | NASA LaRC / MERRA-2 | Downloaded and cached; **not yet used** in calculations. · Se descarga, **aún no se usa**. | Planned: soil-moisture context layer. | `engine/power.py` |
| **SRTM** (Shuttle Radar Topography Mission), 90 m, via the public OpenTopoData API | NASA / NGA | Terrain elevation of the field. · Elevación de la parcela. | Picks the two NASA POWER cells that bracket the field's altitude and interpolates every daily variable between them (vertical data fusion). Falls back to a −6.5 °C/km lapse rate. · Fusión vertical entre celdas de POWER. | `engine/elevation.py`, `engine/power.py` |
| **MODIS Terra NDVI, monthly** (`MODIS_Terra_L3_NDVI_Monthly`) via **NASA GIBS** WMTS | NASA EOSDIS / GIBS | Map tiles of vegetation index for any month 2000–2026. · Teselas de NDVI mensual. | Visual layer on the field map and in the time machine, synchronised with the selected year and month. **Display only, not used in calculations.** · Solo visual. | `lib/gibs.ts`, `components/map/parcel-map.tsx` |

The 4 NASA POWER cells around the Majes irrigation district are cached in `data/power_cache/` so the demo works offline. Any other location is fetched live from the POWER API.

Las 4 celdas de NASA POWER alrededor de Majes están guardadas en `data/power_cache/` para que la demo funcione sin conexión. Cualquier otro punto se consulta en vivo.

## Other data · Otras fuentes

| Source | Use · Uso | Status |
| --- | --- | --- |
| **FAO Irrigation and Drainage Paper 56** (Allen et al., 1998) | Penman-Monteith equations, crop coefficients (Kc, Table 12), stage lengths (Table 11), effective-rain method | Used; ET0 verified against FAO-56 examples 8 and 18 (`engine/tests/test_engine.py`) |
| **MIDAGRI** (Peru Ministry of Agriculture) public references | Approximate yields, farm-gate prices and costs in `data/crops.json` | **Estimates, to be validated** with an agronomist · Estimados, a validar |
| **SENAMHI** station Pampa de Majes (code 116006) | Ground validation of NASA POWER temperature, ET0 and rain | **Pending**: manual download (see `docs/VALIDATION.md`) · Pendiente |
| Purdue University, *AguaRiego* manual (Table 11, Pampa de Majes) | Independent comparison of alfalfa water requirement | Used for comparison only (`docs/VALIDATION.md`) |
| Esri World Imagery | Satellite base map under the NDVI layer | Display only |
| Open-Meteo forecast | — | Not used (planned for forecast-based alerts) |

## Not used yet (planned) · Aún no usados (planificados)

From the challenge's suggested datasets: SMAP (soil moisture), GPM IMERG (precipitation), ECOSTRESS (evapotranspiration), GRACE/GRACE-FO (groundwater trends), Landsat/HLS via AppEEARS (field-level NDVI and bare-soil months), GEDI. See `PLAN.md` §10.
