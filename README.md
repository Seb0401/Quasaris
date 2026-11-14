# 🛰️🌱 Quasaris FarmTwin

**From Space to Soil.** PWA bilingüe (ES/EN) que ayuda a los agricultores de la irrigación Majes (Arequipa, Perú) a comparar rotaciones de cultivo con datos de la NASA antes de sembrar.

NASA Space Apps Challenge 2026 · reto **Field Shift: Adapting Farms with NASA Data** · equipo Quasaris.

- 📄 Contexto del reto: [`CONTEXTO_RETO.md`](CONTEXTO_RETO.md)
- 🗺️ Plan de ejecución: [`PLAN.md`](PLAN.md)
- 🤝 Contrato entre módulos: [`lib/contract.ts`](lib/contract.ts) ↔ [`engine/schema.py`](engine/schema.py)

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

Si el motor no está corriendo, la PWA usa el último resultado guardado y, si no hay ninguno, `data/mock_simulate.json`. Así el frontend nunca se bloquea.

| Script | Qué hace |
| --- | --- |
| `npm run dev` / `npm run build` | PWA Next.js |
| `npm run dev:py` | Motor FastAPI con recarga automática |
| `npm run test:py` | Tests del motor y del contrato |
| `npm run mock` | Regenera `data/mock_simulate.json` |
| `npm run icons` | Regenera los íconos de la PWA |
| `python scripts/fetch_power_cache.py` | Descarga 20 años de NASA POWER a `data/power_cache/` |

El service worker solo se registra en producción (`npm run build && npm start`).

### Probar el asistente

Configura `AI_GATEWAY_API_KEY` en `.env.local` o usa OIDC en un proyecto vinculado a Vercel. El modelo predeterminado es `anthropic/claude-sonnet-5.5`. Puedes cambiarlo con `AI_GATEWAY_MODEL` a otro Claude del Gateway que admita imágenes y herramientas.

Abre `/es/asistente` o `/en/asistente`. Prueba la pregunta del 20 % menos de agua y abre **Ver comparación** para comprobar el ajuste. Si el motor Python no está disponible, el chat utiliza el mock y lo identifica como datos de demostración. Si el motor corre en otro proyecto o puerto, configura `ENGINE_URL` en el servidor.

El micrófono depende del reconocimiento de voz del navegador. Prueba voz en Chrome Android y una foto JPEG, PNG o WebP desde **Adjuntar foto**.

## Estructura

```
app/[locale]/        páginas (parcela, comparar, tiempo, asistente, calendario, aprende)
app/manifest.ts      manifest de la PWA          public/sw.js   service worker (offline y push)
components/          map/, cards/, …              messages/      textos ES/EN
lib/                 contract.ts, engine-client.ts, farm-store.ts, gibs.ts, i18n.ts
api/py/index.py      FastAPI: /api/py/health · /api/py/simulate · /api/py/climate
engine/              schema.py, power.py, (et0.py, rotation.py, score.py), tests/
data/                crops.json, rotations_majes.json, mock_simulate.json, power_cache/
```

## Despliegue en Vercel

1. Importa el repo en Vercel; el preset de framework es Next.js.
2. `vercel.json` envía `/api/py/*` a la función Python `api/py/index.py` (instala `requirements.txt`).
3. Verifica en la URL de preview que `GET /api/py/health` responda `{"ok": true}`. Si no responde, aplica el plan B de `PLAN.md` §5: el motor como proyecto aparte y `NEXT_PUBLIC_ENGINE_URL`.

## Para los agentes: cómo arrancar una tarea

Pega esto como primer mensaje del agente y reemplaza los corchetes:

> Lee `CONTEXTO_RETO.md`, `PLAN.md` (§4 a §8) y `lib/contract.ts`. Eres el agente **[ID, p. ej. A2]** del flujo **[A/B/C/D]**. Tu tarea es **[tarea de PLAN.md §8]**. Solo modifica **[archivos o carpetas del flujo]**. Cumple el contrato; si necesitas cambiarlo, detente y avisa. Trabaja en la rama `feat/[flujo]-[tarea]`, corre `npm run build` y `npm run test:py` antes de abrir el PR.

| Agente | Tarea inicial | Punto de partida |
| --- | --- | --- |
| A1 | Caché de POWER para los puntos piloto y lectura en el motor | `engine/power.py`, `scripts/fetch_power_cache.py` |
| A2 | ET0 Penman-Monteith FAO-56, ETc por Kc y riego bruto, con tests | `engine/et0.py` (nuevo) |
| A3 | Rotación → `byYear`, puntaje, suelo, riesgo, `highlights`; reemplaza el mock en `/simulate` | `api/py/index.py` (TODO) |
| B1 | Diseño, offline (`useOffline`), página "¿Qué significa?" | `app/[locale]/aprende`, `app/globals.css` |
| B2 | Mapa: capas GIBS conmutables, SMAP, leyenda NDVI | `components/map/` |
| B3 | Comparación: gráficos (Recharts), editar rotaciones | `components/cards/`, `app/[locale]/comparar` |
| B4 | Máquina del tiempo: deslizador de años, NDVI con fecha, tira de 20 años, "▶ Reproducir" | `app/[locale]/tiempo` (usa `byYear` y `lib/gibs.ts`) |
| C1 | Asistente: AI SDK y AI Gateway, herramientas sobre el motor, voz | `app/api/chat`, `app/[locale]/asistente` |
| C2 | Calendario y push (VAPID y cron) | `app/api/push`, `app/[locale]/calendario`, `public/sw.js` |
| D | `crops.json` con fuentes, `docs/DATA_SOURCES.md`, `docs/AI_USAGE.md`, textos | `data/`, `docs/`, `messages/` |

## Datos

NASA POWER, NASA GIBS (MODIS NDVI), y más adelante SMAP, MODIS/HLS por AppEEARS y SRTM. La lista completa está en `PLAN.md` §10.
