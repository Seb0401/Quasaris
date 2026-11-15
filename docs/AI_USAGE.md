# Use of AI

Required declaration for the NASA Space Apps Challenge 2026. **The team must review and complete this file before submitting** (sections marked **TODO**).

## 1. AI used during development

| Tool | Model | What it did |
| --- | --- | --- |
| **Claude Code** (Anthropic), used by Sebastian and Marco | Claude Opus 5.5 (also Claude Fable 5.2 for one fix) | Drafted the execution plan (`PLAN.md`); scaffolded the Next.js PWA and the Python engine; implemented the FAO-56 Penman-Monteith ET0, the year-by-year rotation simulation, the SRTM-guided vertical fusion of NASA POWER cells, the data quality checks, the time machine, the 3D farm, the calendar and push alerts, the one-tap field outline detection (`lib/auto-parcel.ts`), the fit-score explanation, the Compare "What you can do" plan and the Recommendations rules (`lib/recommendations.ts`); built the "mission control" visual design and the light theme; ran a technical audit of the prototype; wrote tests, `docs/VALIDATION.md`, the README product tour and these declarations. A step-by-step setup wizard (`/inicio`) was also built with it and later removed when its steps were merged into My field. Commits made with AI assistance carry a `Co-Authored-By: Claude` trailer (about 60 commits). |
| **OpenAI Codex** | **TODO:** model | Helped develop the AI field assistant on the branch `codex/c1-assistant` (merged in PR #2): chat with engine tools, voice dictation and photos. |
| **ChatGPT** (OpenAI) | **TODO:** model | Generated the two photographs used in the app (`public/images/majes-fields.png` and `public/images/quasaris-orbit.png`). |
| **TODO:** other AI tools or agents used by the team | **TODO** | **TODO** (for example: pitch deck, images, translations, video) |

### What the team did

Main areas of each member, taken from the git history of this repository. **TODO:** each member confirms or corrects their line and adds work that is not in the code (research, field contacts, pitch).

| Member | Main areas in the repository |
| --- | --- |
| Sebastian | Simulation engine (NASA POWER + SRTM, FAO-56 ET0, year-by-year results), time machine, live calendar and push alerts, SENAMHI validation script, 3D farm mode (past and future seasons, saved plans), rotation editor, crop groupings, field plan (`/plan`), map drawing and search, one-tap field selection from satellite imagery, SMAP layer, fit-score explanation, data and validation docs |
| Marco (MarckCC7) | Product direction for the visual identity: "mission control" design system across the app, light/dark theme, home page, Compare (plain-language verdict, "What you can do" plan, water shortfall instead of "not viable") and Time Machine dashboards, calendar redesign, Recommendations page (fertilisers, microorganisms, devices), navigation fixes, README product tour and English documentation |
| Fernando Lizarraga | AI field assistant (chat with engine tools, voice dictation, photos, markdown replies), ISRIC SoilGrids soil reference for Majes |
| Esteban Villagarcia | Farmer calendar (crop planning view, readability and accessibility), full-page guided setup for the first rotation (`/onboarding`) |
| Jose Grados | Data quality checks: validation and cleaning of NASA POWER and SRTM data |

Shared decisions:

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

**Other smart features are not AI.** They are deterministic code that the team can explain line by line:

- **One-tap field selection** (`lib/auto-parcel.ts`) uses classic image processing in the browser: region growing on the Esri satellite tiles at several sensitivities, then the most field-like shape is kept and simplified. No machine-learning model is involved and no image is sent to another server.
- **Recommendations** (`lib/recommendations.ts`) are transparent agronomy rules applied to the field profile (SRTM altitude, NASA POWER soil wetness, frost and heat days from the engine, soil and irrigation) and to the crop data in `data/crops.json` (nitrogen, phosphorus and potassium needs, pests and diseases). Each card shows its reason, and the page asks the farmer to confirm with an agronomist and to use SENASA-registered products.

## 3. Images and media

The two photographs in the app are **AI-generated with ChatGPT**: `public/images/majes-fields.png` (section headers) and `public/images/quasaris-orbit.png` (home page). They are illustrations, not satellite imagery or photos of real fields; all maps and data layers come from Esri, NASA GIBS and the simulation engine. Wherever they appear in the app (section headers, home page, onboarding, glossary) they carry a visible "AI-generated image" label, as the Space Apps 2026 rules require.

`public/images/farm-twin.webp` is not AI-generated: it is a screenshot of the app's own 3D farm. The screenshots in `docs/screenshots/` are also captures of the real app.

**TODO:** declare any other AI-generated images, video or audio in the pitch or the demo video. The app icon and logo are hand-written SVG (`scripts/make_icons.mjs`). The demo video is a screen recording of the real app.
