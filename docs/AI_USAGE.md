# Use of AI · Uso de inteligencia artificial

Required declaration for NASA Space Apps Challenge 2026. **The team must review and complete this file before submitting** (sections marked ✏️).

Declaración requerida por Space Apps. **El equipo debe revisarla y completarla antes de entregar** (secciones con ✏️).

## 1. AI used during development · IA en el desarrollo

| Tool | Model | What it did · Qué hizo |
| --- | --- | --- |
| **Claude Code** (Anthropic) | Claude Opus 5.5 | Drafted the execution plan (`PLAN.md`); scaffolded the Next.js PWA and the Python engine; implemented the FAO-56 Penman-Monteith ET0, the year-by-year rotation simulation, the SRTM-guided vertical fusion of NASA POWER cells, the time machine, the calendar and push alerts; wrote tests, `docs/VALIDATION.md` and these data declarations. Commits made with AI assistance carry a `Co-Authored-By: Claude` trailer. |
| ✏️ Other AI tools / agents used by the team | ✏️ | ✏️ (e.g. pitch deck, images, translations) |

### What the humans did · Qué hizo el equipo

✏️ Complete with each member's contribution. Suggested starting points:

- Chose the challenge, the pilot area (Majes irrigation, Arequipa) and the product concept.
- Made the product decisions (PWA, bilingual, time machine, alerts) and reviewed every merge to `main`.
- ✏️ Agronomic validation of rotations, prices and yields.
- ✏️ SENAMHI data download and review of the validation results.
- ✏️ Pitch, video and presentation.

### How we checked the AI's work · Cómo verificamos

- Automated tests against published FAO-56 worked examples (ET0 = 3.9 mm/day, Ra = 32.2 MJ/m²/day).
- Comparison with an independent study (Purdue *AguaRiego*) for the same station; see `docs/VALIDATION.md`.
- Every estimate that is not measured (prices, yields, water allocation) is labelled "to validate" in the app and in `data/crops.json`.

## 2. AI inside the product · IA dentro del producto

**Currently none.** All numbers in FarmTwin come from a deterministic engine (NASA data + FAO-56 equations + transparent rules). No machine-learning model or LLM produces any recommendation.

**Actualmente ninguna.** Todas las cifras salen de un motor determinista.

Planned (not built yet): a field assistant (Claude via Vercel AI Gateway) that explains results in plain language and may only quote numbers returned by the engine through tool calls. If it is built, this section must be updated.

## 3. Images and media · Imágenes y medios

✏️ Declare any AI-generated images, video or audio in the pitch or the app. The app icon is a hand-written SVG (`scripts/make_icons.mjs`).
