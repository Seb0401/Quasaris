# 🛰️🌱 Quasaris FarmTwin

**From Space to Soil.** PWA bilingüe (ES/EN) que ayuda a los agricultores de la irrigación Majes (Arequipa, Perú) a comparar rotaciones de cultivo con datos de la NASA antes de sembrar.

NASA Space Apps Challenge 2026 · reto **Field Shift: Adapting Farms with NASA Data** · equipo Quasaris.

🔗 **App:** https://quasaris-farmtwin.vercel.app

> **English summary.** FarmTwin is a bilingual Progressive Web App for farmers in the Majes irrigation district (Arequipa, Peru). The farmer taps their field and enters their water, irrigation system, soil and priorities. The app then compares crop rotations using 21 years of daily NASA POWER climate, adjusted to the field's real altitude with NASA SRTM terrain data. For each rotation it estimates water (FAO-56 Penman-Monteith), income, soil health and climate risk, shown as a range across years rather than a single number. A **time machine** replays every rotation over 2005–2025 next to monthly MODIS NDVI from NASA GIBS. A **live calendar** shows weekly frost, heat and water demand and sends push alerts. It supports the farmer's judgment and does not replace it.

## Qué hace

| Pantalla | Para qué sirve |
| --- | --- |
| 📍 **Mi parcela** | Elegir la parcela en un mapa satelital con NDVI de la NASA, y cargar agua disponible, riego, suelo y prioridades |
| ⚖️ **Comparar** | 3 rotaciones (incluida la actual) con agua, ingreso, salud del suelo, riesgo, meses típicos, "no viable con tu agua" y qué revisar con un experto |
| 🕰️ **Máquina del tiempo** | Qué habría pasado con cada rotación en cada año entre 2005 y 2025, con reproducción animada, gráfico por año, tira de 21 años y NDVI de ese mes |
| 📅 **Calendario** | Ciclo y etapas de cada cultivo, riesgo semanal de helada y calor, riego de la semana y alertas push |

## Cómo funciona

```
Parcela (lat, lon) ──► SRTM: altitud real ──► elige 2 celdas NASA POWER que la encierran
                                                   │  interpola día a día (2005–2025)
                                                   ▼
             ET0 Penman-Monteith FAO-56 ──► ETc = Kc × ET0 ──► riego bruto / eficiencia
                                                   │
             heladas y calor por cultivo ──► ingreso ──► salud del suelo (reglas) ──► puntaje según prioridades
                                                   ▼
                     resultados por año (máquina del tiempo) + mediana y rango p10–p90
```

- **Motor:** Python (FastAPI) en `engine/` y `api/py/`, desplegado como función de Vercel.
- **App:** Next.js 16 (App Router), PWA con offline y push, Leaflet, Recharts.
- **Datos y validación:** [`docs/DATA_SOURCES.md`](docs/DATA_SOURCES.md) · [`docs/VALIDATION.md`](docs/VALIDATION.md) · uso de IA: [`docs/AI_USAGE.md`](docs/AI_USAGE.md)

## Pendientes

| Pendiente | Responsable | Detalle |
| --- | --- | --- |
| Datos SENAMHI Pampa de Majes (116006) | Equipo | Descarga manual; pasos en `docs/VALIDATION.md` §3. Luego: `python scripts/validate_senamhi.py` |
| Escenario de agua de Majes | Equipo | Confirmar el agua asignada por hectárea y el sistema de riego más común. Hoy: aspersión y 15.000 m³/ha (estimado) en `lib/farm-store.ts` y `scripts/make_mock.py` |
| Precios, rendimientos y costos | Agrónomo | Valores estimados en `data/crops.json` |
| Fechas de siembra de la rotación "Ingreso" | Agrónomo | La papa (agosto, 145 días) se cruza 43 días con el maíz chala sembrado en diciembre; el editor `/rotaciones` lo marca. Ajustar en `data/rotations_majes.json` |
| Completar `docs/AI_USAGE.md` | Equipo | Secciones marcadas con ✏️ |

## Correr en local

Requisitos: Node 22 o superior y Python 3.12 o superior.

```bash
npm install
python -m venv .venv
# Windows: .venv\Scripts\activate   ·   macOS/Linux: source .venv/bin/activate
pip install -r requirements-dev.txt

npm run dev:py   # motor Python en http://127.0.0.1:8000 (docs en /api/py/docs)
npm run dev      # PWA en http://localhost:3000 (reenvía /api/py/* al motor)
```

Si el motor no responde, la PWA usa el último resultado guardado y, si no hay ninguno, `data/mock_simulate.json` (una foto del motor real para Majes).

| Script | Qué hace |
| --- | --- |
| `npm run dev` / `npm run build` | PWA Next.js |
| `npm run dev:py` | Motor FastAPI con recarga automática |
| `npm run test:py` | Tests del motor (FAO-56, fusión, simulación) y del contrato |
| `npm run mock` | Regenera `data/mock_simulate.json` con el motor real |
| `npm run icons` | Regenera los íconos de la PWA |
| `python scripts/fetch_power_cache.py` | Descarga las celdas NASA POWER alrededor de Majes a `data/power_cache/` |
| `python scripts/validate_senamhi.py` | Compara NASA POWER con la estación SENAMHI (requiere los CSV) |

El service worker y las alertas push solo funcionan en producción (`npm run build && npm start`, o en Vercel).

### Probar el asistente

Configura `OPENROUTER_API_KEY` o `AI_GATEWAY_API_KEY` en `.env.local`. OpenRouter usa `openrouter/free` por defecto para que el chat funcione sin saldo y puedes cambiarlo con `OPENROUTER_MODEL`, por ejemplo `anthropic/claude-sonnet-4.6` con saldo disponible. AI Gateway usa `anthropic/claude-sonnet-5.5` y acepta `AI_GATEWAY_MODEL`. El modelo elegido debe admitir imágenes y herramientas.

Abre `/es/asistente` o `/en/asistente`. Prueba la pregunta del 20 % menos de agua y abre **Ver comparación** para comprobar el ajuste. Si el motor Python no está disponible, el chat utiliza el mock y lo identifica como datos de demostración. Si el motor corre en otro proyecto o puerto, configura `ENGINE_URL` en el servidor.

El micrófono depende del reconocimiento de voz del navegador. Prueba voz en Chrome Android y una foto JPEG, PNG o WebP desde **Adjuntar foto**.

## Estructura

```
app/[locale]/        páginas: parcela, comparar, tiempo, calendario, asistente, aprende
app/api/             push/subscribe, push/test, cron/alerts
app/manifest.ts      manifest de la PWA            public/sw.js   service worker (offline y push)
components/          map/, cards/, timemachine/, calendar/
lib/                 contract.ts, engine-client.ts, farm-store.ts, crop-calendar.ts, push-server.ts, gibs.ts, i18n.ts
messages/            textos ES/EN
api/py/index.py      FastAPI: /api/py/health · /api/py/simulate · /api/py/climate
engine/              schema, power (POWER + fusión SRTM), elevation, et0, crops, rotation, simulate, tests/
data/                crops.json, rotations_majes.json, mock_simulate.json, power_cache/, senamhi/
docs/                DATA_SOURCES.md, AI_USAGE.md, VALIDATION.md
```

## Despliegue

El proyecto de Vercel `quasaris-farmtwin` está enlazado a este repo: **cada push a `main` despliega a producción** y cada rama tiene su preview. `vercel.json` envía `/api/py/*` a la función Python y programa el cron diario de alertas (12:00 UTC).

Variables de entorno (ya configuradas en Vercel): `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `CRON_SECRET` y `BLOB_READ_WRITE_TOKEN` (almacén Blob privado para las suscripciones).

## Para los agentes

> Lee `CONTEXTO_RETO.md`, `PLAN.md` (§4 a §8), `README.md` y `lib/contract.ts`. Solo modifica los archivos de tu tarea. Cumple el contrato (`lib/contract.ts` ↔ `engine/schema.py`); si necesitas cambiarlo, detente y avisa. Corre `npm run build`, `npx eslint .` y `npm run test:py` antes de subir.
