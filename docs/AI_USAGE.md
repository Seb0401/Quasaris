# Use of AI

Required declaration for the NASA Space Apps Challenge 2026. **The team must review and complete this file before submitting** (sections marked **TODO**).

## 1. AI used during development

| Tool | Model | What it did |
| --- | --- | --- |
| **Claude Code** (Anthropic) | Claude Opus 5.5 | Drafted the execution plan (`PLAN.md`); scaffolded the Next.js PWA and the Python engine; implemented the FAO-56 Penman-Monteith ET0, the year-by-year rotation simulation, the SRTM-guided vertical fusion of NASA POWER cells, the data quality checks, the time machine, the 3D farm, the calendar and push alerts; wrote tests, `docs/VALIDATION.md` and these declarations. Commits made with AI assistance carry a `Co-Authored-By: Claude` trailer. |
| **TODO:** other AI tools or agents used by the team | **TODO** | **TODO** (for example: pitch deck, images, translations, video) |

### What the team did

**TODO:** complete with each member's contribution. Suggested starting points:

- Chose the challenge, the pilot area (Majes irrigation district, Arequipa) and the product concept.
- Made the product decisions (PWA, bilingual, time machine, farm simulation, alerts) and reviewed every merge to `main`.
- **TODO:** agronomic validation of rotations, prices and yields.
- **TODO:** SENAMHI data download and review of the validation results.
- **TODO:** pitch, video and presentation.

### How we checked the AI's work

- Automated tests against published FAO-56 worked examples (ET0 = 3.9 mm/day, Ra = 32.2 MJ/m²/day).
- Comparison with an independent study (Purdue *AguaRiego*) for the same station; see `docs/VALIDATION.md`.
- Code reviews of each feature before merging, plus type checking, linting and the engine test suite.
- Every estimate that is not measured (prices, yields, water allocation) is labelled "to validate" in the app and in `data/crops.json`.

## 2. AI inside the product

**The numbers do not come from AI.** Water, income, soil health, risk and every chart in FarmTwin come from a deterministic engine (NASA data + FAO-56 equations + transparent rules). No machine-learning model produces a recommendation.

**Field assistant** (`/asistente`, `app/api/chat/`). An LLM chat explains results in plain language, accepts voice dictation (the browser's speech recognition) and photos. It runs through the Vercel AI SDK, with Vercel AI Gateway (`anthropic/claude-sonnet-5.5` by default) or OpenRouter as the provider. Safeguards:

- It may only quote numbers returned by the engine through tool calls: `simularRotacion` (simulate a rotation), `consultarAno` (look up one year of the time machine), `explicarTermino` (explain a term), `consultarSueloRegional` (ISRIC SoilGrids summary) and `cambiarPrioridades` (adjust the farmer's priorities).
- The system prompt tells it to separate satellite or model estimates from field measurements, to say what needs local validation, and to send the farmer to an agronomist for important decisions.
- When the engine is unavailable, the assistant labels the answer as demo data.

## 3. Images and media

**TODO:** declare any AI-generated images, video or audio in the pitch, the demo video or the app. The app icon and logo are hand-written SVG (`scripts/make_icons.mjs`). The demo video is a screen recording of the real app.
