# Tecnologías y datos · Quasaris FarmTwin

Estado: `main` en `604d87b` (15/11/2026).

## 1. Datasets

| Dataset | Qué es | Cómo se extrae | Cómo se usa |
| --- | --- | --- | --- |
| **NASA POWER** (comunidad AG, diario) | Clima de reanálisis (MERRA-2), celdas de ~0,5° × 0,625° (~55 km). Variables: `T2M_MAX`, `T2M_MIN`, `ALLSKY_SFC_SW_DWN`, `RH2M`, `WS2M`, `PRECTOTCORR`, `GWETROOT`. 2005–2025. | API pública `power.larc.nasa.gov/api/temporal/daily/point` (sin cuenta). `scripts/fetch_power_cache.py` guarda las 4 celdas de Majes en `data/power_cache/` (~880 KB c/u). Otras zonas: descarga en vivo y caché temporal. | Base de todo el cálculo: ET0, agua por rotación, heladas y calor, Máquina del tiempo, calendario. `GWETROOT` se muestra como humedad natural del suelo. |
| **SRTM** (NASA, 90 m) | Elevación del terreno. | API pública OpenTopoData (`/v1/srtm90m`). Majes (1409 m) está fijo en el código. | Interpolar entre las dos celdas de POWER que encierran la altitud de la parcela; si no hay pareja, corrección de −6,5 °C/km. |
| **MODIS Terra NDVI mensual** (NASA GIBS) | Índice de vegetación 0–1, ~1 km. | Teselas WMTS de `gibs.earthdata.nasa.gov`, pedidas por el navegador. | Solo visual: capa del mapa (Parcela, Inicio, Granja) y NDVI por año en Máquina del tiempo. |
| **SMAP L4 humedad zona de raíces** (NASA GIBS) | Humedad del suelo modelo + satélite, ~9 km, desde 2015. | Teselas WMTS de GIBS. | Solo visual: capa conmutable del mapa. |
| **ISRIC SoilGrids 2.0** | Propiedades del suelo modeladas, 250 m (CC BY 4.0). | `scripts/fetch_soilgrids_majes.mjs` (WCS de `maps.isric.org` + `geotiff`) → `data/soilgrids/majes.json` (8 KB, 8906 celdas de Majes). | Referencia en Mi parcela (arena 83 %, limo 10 %, arcilla 4 %; agua disponible 0–30 cm ~29 mm) y herramienta del asistente. **No entra al cálculo.** |
| **FAO-56** | Manual de riego: Kc, etapas de cultivo, Penman-Monteith, lluvia efectiva. | Valores transcritos a `data/crops.json` y fórmulas en `engine/`. | Curva de Kc diaria, ET0, agua neta y bruta. |
| **Catálogo de cultivos** (`data/crops.json`) | 16 cultivos con Kc, etapas, raíz, umbrales de helada/calor, rendimiento, precio y costo. | Manual. Kc de FAO-56; economía estimada desde MIDAGRI Arequipa; umbrales de rangos agronómicos. | Agua, ingreso, riesgo y salud del suelo. **Economía y umbrales son estimados, a validar.** |
| **SENAMHI** (estación Pampa de Majes, 116006) | Mediciones en tierra. | Descarga manual (el visor tiene anti-bots) a `data/senamhi/*.csv`; `scripts/validate_senamhi.py` compara con POWER. | Validación de POWER. **Aún no hay CSV cargado.** |
| **Esri World Imagery** | Imagen satelital de fondo. | Teselas de `server.arcgisonline.com`. | Mapa base. No es de la NASA. |
| **OpenStreetMap Nominatim** | Buscador de lugares. | API `nominatim.openstreetmap.org/search` desde el navegador. | Buscar la parcela por nombre. |

## 2. Pipeline de datos del motor

1. Agricultor elige parcela, agua, riego, suelo, prioridades y rotaciones (se guarda en el teléfono).
2. `POST /api/py/simulate` → elevación SRTM.
3. Carga de las 4 celdas POWER vecinas: memoria → `data/power_cache/` → carpeta temporal → API en vivo.
4. **Validación y limpieza** (`engine/quality.py`): estructura, fechas, tipos, centinelas `-999`, rangos físicos, Tmin ≤ Tmax, 3 % Ra ≤ radiación ≤ Ra, valores pegados, picos de temperatura, relleno de huecos, exclusión de años con > 15 % rellenado.
5. Fusión por altitud de dos celdas.
6. ET0 Penman-Monteith (FAO-56; Hargreaves existe en el código pero no se usa) → `ETc = Kc × ET0` → lluvia efectiva → riego bruto según eficiencia (riego × suelo).
7. Por año: agua, ingreso, días de helada/calor, estado de cada mes. Rotación (secuencia) o asociación (cultivos juntos).
8. Mediana y rango p10–p90, salud del suelo por reglas, puntaje ponderado por prioridades, viabilidad frente al agua disponible.
9. JSON a la PWA (~22 KB, ~2 KB comprimido).

`GET /api/py/climate`: riesgo de helada/calor y ET0 por semana (calendario).

## 3. Tecnologías

| Pieza | Tecnología | Uso |
| --- | --- | --- |
| Frontend | Next.js 16 (App Router, Turbopack), React 19, TypeScript | PWA bilingüe (`/en` por defecto, `/es`) |
| Estilos e íconos | Tailwind CSS 4, lucide-react + íconos propios | Diseño "mission control" |
| Mapa | Leaflet + react-leaflet | Selección de parcela, capas GIBS, dibujo del contorno, buscador |
| Gráficos | Recharts | Agua e ingreso por año, comparaciones |
| 3D | three.js, @react-three/fiber, @react-three/drei | Modo granja |
| Motor | Python 3.12, FastAPI, Pydantic, NumPy, httpx | `/api/py/simulate`, `/api/py/climate` |
| Asistente IA | Vercel AI SDK (`ai`, `@ai-sdk/react`, `@ai-sdk/openai`), zod, react-markdown | Chat con herramientas sobre el motor (`simularRotacion`, `consultarAno`, `explicarTermino`, `consultarSueloRegional`, `cambiarPrioridades`), voz y fotos. Modelo: OpenRouter (`openrouter/free` por defecto) o Vercel AI Gateway. |
| Alertas | Web Push (`web-push`, VAPID), Vercel Blob (suscripciones), Vercel Cron diario 12:00 UTC | Avisos de helada, calor y cosecha |
| Offline | Service worker propio (`public/sw.js`) + localStorage | Interfaz y último resultado sin red |
| Pruebas | pytest (36 tests), `scripts/test-crop-calendar.cjs`, `scripts/check_power_quality.py` | Motor, calendario y calidad de datos |
| Despliegue | Vercel (Next.js + función Python en el mismo proyecto) | `vercel.json`: rewrite `/api/py/*` y cron |

## 4. Variables de entorno

| Variable | Para qué |
| --- | --- |
| `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` | Asistente vía OpenRouter |
| `AI_GATEWAY_API_KEY`, `AI_GATEWAY_MODEL` | Asistente vía Vercel AI Gateway (alternativa) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Notificaciones push |
| `BLOB_READ_WRITE_TOKEN`, `BLOB_STORE_ID` | Guardar suscripciones push |
| `CRON_SECRET` | Proteger el cron de alertas |
| `NEXT_PUBLIC_ENGINE_URL`, `ENGINE_URL` | Motor en otro proyecto (plan B) |

Sin estas variables la app funciona, pero sin asistente IA ni push.

## 5. Límites conocidos

- SoilGrids, SMAP y NDVI no entran al cálculo; la textura del suelo la elige el agricultor.
- Precios, rendimientos y umbrales de cultivos son estimados.
- Validación con SENAMHI pendiente de datos.
- POWER promedia ~55 km; la fusión con SRTM corrige altitud, no microclima.
- El agua disponible se reparte en 12 partes iguales; no refleja turnos reales de AUTODEMA.
