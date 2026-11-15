# Technologies and data · Quasaris FarmTwin

State: `main` on 2026-11-15.

## 1. Datasets

| Dataset | What it is | How we extract it | How the app uses it |
| --- | --- | --- | --- |
| **NASA POWER** (AG community, daily) | Reanalysis climate (MERRA-2), cells of ~0.5° × 0.625° (~55 km). Variables: `T2M_MAX`, `T2M_MIN`, `ALLSKY_SFC_SW_DWN`, `RH2M`, `WS2M`, `PRECTOTCORR`, `GWETROOT`. 2005–2025. | Public API `power.larc.nasa.gov/api/temporal/daily/point` (no account). `scripts/fetch_power_cache.py` stores the 4 Majes cells in `data/power_cache/` (~880 KB each). Other areas: live download plus a temporary cache. | Basis of every calculation: ET0, water per rotation, frost and heat, Time machine, calendar. `GWETROOT` is shown as natural soil moisture. |
| **SRTM** (NASA, 90 m) | Terrain elevation. | Public OpenTopoData API (`/v1/srtm90m`). Majes (1409 m) is hard-coded. | Interpolate between the two POWER cells that bracket the field's altitude; if there is no pair, correct by −6.5 °C/km. |
| **MODIS Terra monthly NDVI** (NASA GIBS) | Vegetation index 0–1, ~1 km. | WMTS tiles from `gibs.earthdata.nasa.gov`, requested by the browser. | Display only: map layer (My field, Farm) and NDVI by year in the Time machine. |
| **SMAP L4 root-zone soil moisture** (NASA GIBS) | Model + satellite soil moisture, ~9 km, since 2015. | WMTS tiles from GIBS. | Display only: switchable map layer. |
| **ISRIC SoilGrids 2.0** | Modelled soil properties, 250 m (CC BY 4.0). | `scripts/fetch_soilgrids_majes.mjs` (WCS at `maps.isric.org` + `geotiff`) → `data/soilgrids/majes.json` (8 KB, 8906 Majes cells). | Reference in My field (sand 83 %, silt 10 %, clay 4 %; available water 0–30 cm ~29 mm) and an assistant tool. **Not used in the calculation.** |
| **FAO-56** | Irrigation manual: Kc, crop stages, Penman-Monteith, effective rainfall. | Values transcribed into `data/crops.json`; formulas in `engine/`. | Daily Kc curve, ET0, net and gross water. |
| **Crop catalogue** (`data/crops.json`) | 16 crops with Kc, stages, root depth, frost/heat thresholds, yield, price and cost. | Manual. Kc from FAO-56; economics estimated from MIDAGRI Arequipa; thresholds from general agronomic ranges. | Water, income, risk and soil health. **Economics and thresholds are estimates to be validated.** |
| **SENAMHI** (Pampa de Majes station, 116006) | Ground measurements. | Manual download (the viewer has bot protection) to `data/senamhi/*.csv`; `scripts/validate_senamhi.py` compares it with POWER. | Validation of POWER. **No CSV loaded yet.** |
| **Esri World Imagery** | Satellite base imagery. | Tiles from `server.arcgisonline.com`. | Base map. Not NASA. |
| **OpenStreetMap Nominatim** | Place search. | `nominatim.openstreetmap.org/search` API from the browser. | Find the field by name. |

## 2. Engine data pipeline

1. The farmer sets field, water, irrigation, soil, priorities and rotations (stored on the phone).
2. `POST /api/py/simulate` → SRTM elevation.
3. Load the 4 neighbouring POWER cells: memory → `data/power_cache/` → temp folder → live API.
4. **Validation and cleaning** (`engine/quality.py`): structure, dates, types, `-999` sentinels, physical ranges, Tmin ≤ Tmax, 3 % Ra ≤ radiation ≤ Ra, stuck values, temperature spikes, gap filling, and exclusion of years with > 15 % filled days.
5. Altitude blend of two cells.
6. ET0 Penman-Monteith (FAO-56; `hargreaves()` exists in the code but is not used) → `ETc = Kc × ET0` → effective rainfall → gross irrigation by efficiency (irrigation × soil).
7. Per year: water, income, frost/heat days, status of each month. Rotation (sequence) or association (crops together).
8. Median and p10–p90 range, rule-based soil health, score weighted by priorities, viability against available water.
9. JSON to the PWA (~22 KB, ~2 KB gzipped).

`GET /api/py/climate`: frost/heat risk and ET0 per week (calendar).

## 3. Technologies

| Piece | Technology | Use |
| --- | --- | --- |
| Frontend | Next.js 16 (App Router, Turbopack), React 19, TypeScript | Bilingual PWA (`/en` by default, `/es`); pages: home, My field, Compare, Rotations, Groupings, Plan, Time machine, Farm, Calendar, Assistant, What does it mean? |
| Styles and icons | Tailwind CSS 4, lucide-react + custom icons | "Mission control" design with light and dark theme (`lib/theme.ts`) |
| Map | Leaflet + react-leaflet | Field selection, GIBS layers, boundary drawing, place search |
| Charts | Recharts | Water and income per year, comparisons |
| 3D | three.js, @react-three/fiber, @react-three/drei | Farm mode |
| Engine | Python 3.12, FastAPI, Pydantic, NumPy, httpx | `/api/py/simulate`, `/api/py/climate` |
| AI assistant | Vercel AI SDK (`ai`, `@ai-sdk/react`, `@ai-sdk/openai`), zod, react-markdown | Chat with tools over the engine (`simularRotacion`, `consultarAno`, `explicarTermino`, `consultarSueloRegional`, `cambiarPrioridades`), voice and photos. Model: OpenRouter (`openrouter/free` by default) or Vercel AI Gateway. |
| Alerts | Web Push (`web-push`, VAPID), Vercel Blob (subscriptions), daily Vercel Cron at 12:00 UTC | Frost, heat and harvest alerts |
| Offline | Custom service worker (`public/sw.js`) + localStorage | Interface and last result without network |
| Tests | pytest (36 tests), `scripts/test-crop-calendar.cjs`, `scripts/check_power_quality.py` | Engine, calendar and data quality |
| Deployment | Vercel (Next.js + Python function in the same project) | `vercel.json`: `/api/py/*` rewrite and cron |

## 4. Environment variables

| Variable | Purpose |
| --- | --- |
| `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` | Assistant via OpenRouter |
| `AI_GATEWAY_API_KEY`, `AI_GATEWAY_MODEL` | Assistant via Vercel AI Gateway (alternative) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Push notifications |
| `BLOB_READ_WRITE_TOKEN`, `BLOB_STORE_ID` | Store push subscriptions |
| `CRON_SECRET` | Protect the alerts cron |
| `NEXT_PUBLIC_ENGINE_URL`, `ENGINE_URL` | Engine in a separate project (plan B) |

Without these variables the app works, but without the AI assistant or push.

## 5. Known limits

- SoilGrids, SMAP and NDVI do not feed the calculation; the farmer picks the soil texture.
- Crop prices, yields and thresholds are estimates.
- SENAMHI validation is pending data.
- POWER averages ~55 km; the SRTM blend corrects altitude, not microclimate.
- Available water is split into 12 equal parts; it does not reflect real AUTODEMA turns.
