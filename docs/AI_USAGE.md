# Use of AI

Declaration of the use of AI (Super Intelligence, SI) for the NASA Space Apps Challenge 2026, following the 2026 Project Submission Guide: AI-generated images and video carry a visible mark, and AI-assisted code, audio and data are acknowledged here and in their metadata.

## 1. AI used during development

| Tool | Model | What it did |
| --- | --- | --- |
| **Claude Code** (Anthropic), used by Sebastian and Marco | Claude Opus 5.5 (also Claude Fable 5.2 for one fix) | Drafted the execution plan (`PLAN.md`); scaffolded the Next.js PWA and the Python engine; implemented the FAO-56 Penman-Monteith ET0, the year-by-year rotation simulation, the SRTM-guided vertical fusion of NASA POWER cells, the data quality checks, the time machine, the 3D farm, the calendar and push alerts, the one-tap field outline detection (`lib/auto-parcel.ts`), the fit-score explanation, the Compare "What you can do" plan and the Recommendations rules (`lib/recommendations.ts`); built the "mission control" visual design and the light theme; ran a technical audit of the prototype; wrote tests, `docs/VALIDATION.md`, the README product tour and these declarations. A step-by-step setup wizard (`/inicio`) was also built with it and later removed when its steps were merged into My field. Commits made with AI assistance carry a `Co-Authored-By: Claude` trailer (about 60 commits). |
| **OpenAI Codex**, used by Fernando and Esteban | (model not recorded) | Helped develop the AI field assistant on the branch `codex/c1-assistant` (merged in PR #2): chat with engine tools, voice dictation and photos. Helped develop the Majes crop integration (five new crop profiles across the engine and every screen) and the illustrated crop picker. |
| **OpenAI image generation** (built-in tool), used by Esteban | (model not recorded) | Generated the 21 transparent crop illustrations (`public/images/crops/*.webp`), later resized and encoded as WebP. Prompts in [`CROP_ARTWORK.md`](CROP_ARTWORK.md). |
| **ChatGPT** (OpenAI) | (image model not recorded) | Generated the two photographs used in the app (`public/images/majes-fields.png` and `public/images/quasaris-orbit.png`). |
| **Claude Code** (Anthropic) | Claude Opus 5.5 | Built the pitch deck (HTML), edited and animated the 30-second demo video from screen recordings of the real app, wrote the code that synthesizes the video's music, and helped draft English and Spanish texts. |

### What the team did

Main areas of each member, taken from the git history of this repository and the team's roles.

| Member | Main areas in the repository |
| --- | --- |
| Sebastian Barreda (Project Lead & Sustainability) | Simulation engine (NASA POWER + SRTM, FAO-56 ET0, year-by-year results), time machine, live calendar and push alerts, SENAMHI validation script, 3D farm mode (past and future seasons, saved plans), rotation editor, crop groupings, field plan (`/plan`), map drawing and search, one-tap field selection from satellite imagery, SMAP layer, fit-score explanation, data and validation docs |
| Marco Collado (UI/UX Designer) | Product direction for the visual identity: "mission control" design system across the app, light/dark theme, home page, Compare (plain-language verdict, "What you can do" plan, water shortfall instead of "not viable") and Time Machine dashboards, calendar redesign, Recommendations page (fertilisers, microorganisms, devices), navigation fixes, README product tour and English documentation |
| Fernando Lizarraga (Data Science & AI) | AI field assistant (chat with engine tools, voice dictation, photos, markdown replies), ISRIC SoilGrids soil reference for Majes |
| Esteban Villagarcia (Software Engineer) | Farmer calendar (crop planning view, readability and accessibility), full-page guided setup for the first rotation (`/onboarding`), Majes crop catalogue (artichoke, avocado, table grape, mandarin and pomegranate profiles with sources) and the illustrated crop picker |
| Jose Grados (Software Engineer · AgTech) | Data quality checks: validation and cleaning of NASA POWER and SRTM data |

Shared decisions:

- Chose the challenge, the pilot area (Majes irrigation district, Arequipa) and the product concept.
- Made the product decisions (PWA, bilingual, time machine, farm simulation, alerts) and reviewed every merge to `main`.
- Pending after the hackathon: agronomic validation of rotations, prices and yields with a local agronomist.
- Pending after the hackathon: SENAMHI station data download and review of the validation results.
- Wrote the story of the pitch and the demo (problem data, goals, business model) and reviewed every slide and cut.

### How we checked the AI's work

- Automated tests against published FAO-56 worked examples (ET0 = 3.9 mm/day, Ra = 32.2 MJ/m²/day).
- Comparison with an independent study (Purdue *AguaRiego*) for the same station; see `docs/VALIDATION.md`.
- Code reviews of each feature before merging, plus type checking, linting and the engine test suite.
- Every estimate that is not measured (prices, yields, water allocation) is labelled "to validate" in the app and in `data/crops.json`.

The Majes crop integration and illustrated crop picker were also developed with OpenAI Codex. Its 21 transparent crop illustrations (`public/images/crops/*.webp`) were generated using OpenAI's built-in image generation tool (model name not recorded), then resized and encoded as WebP. Each displayed crop illustration carries a visible `AI` mark. The complete prompt set is in [`CROP_ARTWORK.md`](CROP_ARTWORK.md). The five additional crop profiles contain explicit planning assumptions, not locally validated agronomic or economic observations; see [`MAJES_CROPS_IMPLEMENTATION.md`](MAJES_CROPS_IMPLEMENTATION.md).

## 2. AI inside the product

**The numbers do not come from AI.** Water, income, soil health, risk and every chart in FarmTwin come from a deterministic engine (NASA data + FAO-56 equations + transparent rules). No machine-learning model produces a recommendation.

**Field assistant** (`/asistente`, `app/api/chat/`). An LLM chat explains results in plain language, accepts voice dictation (the browser's speech recognition) and photos. It runs through the Vercel AI SDK, with Vercel AI Gateway (`anthropic/claude-sonnet-5.5` by default) or OpenRouter as the provider. Safeguards:

- It may only quote numbers returned by the engine through tool calls: `simularRotacion` (simulate a rotation), `consultarAno` (look up one year of the time machine), `explicarTermino` (explain a term), `consultarSueloRegional` (ISRIC SoilGrids summary) and `cambiarPrioridades` (adjust the farmer's priorities). `consultarCultivos` lists the 21 supported crops and their product definitions, source references and model assumptions.
- The system prompt tells it to separate satellite or model estimates from field measurements, to say what needs local validation, and to send the farmer to an agronomist for important decisions.
- When the engine is unavailable, the assistant labels the answer as demo data.

**Other smart features are not AI.** They are deterministic code that the team can explain line by line:

- **One-tap field selection** (`lib/auto-parcel.ts`) uses classic image processing in the browser: region growing on the Esri satellite tiles at several sensitivities, then the most field-like shape is kept and simplified. No machine-learning model is involved and no image is sent to another server.
- **Recommendations** (`lib/recommendations.ts`) are transparent agronomy rules applied to the field profile (SRTM altitude, NASA POWER soil wetness, frost and heat days from the engine, soil and irrigation) and to the crop data in `data/crops.json` (nitrogen, phosphorus and potassium needs, pests and diseases). Each card shows its reason, and the page asks the farmer to confirm with an agronomist and to use SENASA-registered products.

## 3. Images and media

**Crop illustrations.** The 21 crop illustrations (`public/images/crops/*.webp`) were generated with OpenAI's built-in image generation tool. Each one carries a visible "AI" mark wherever it is shown (crop picker, groupings, onboarding, comparison cards, calendar, farm palette). They are decorative and always appear next to the crop's written name.

**Photographs.** The two photographs in the app are **AI-generated with ChatGPT**: `public/images/majes-fields.png` (section headers) and `public/images/quasaris-orbit.png` (home page). They are illustrations, not satellite imagery or photos of real fields; all maps and data layers come from Esri, NASA GIBS and the simulation engine. Wherever they appear in the app (section headers, home page, onboarding, glossary) they carry a visible "AI-generated image" label, as the Space Apps 2026 rules require.

`public/images/farm-twin.webp` is not AI-generated: it is a screenshot of the app's own 3D farm. The screenshots in `docs/screenshots/` are also captures of the real app.

The Quasaris logo was designed by the team, not generated with AI. The app icons, favicon and PWA icons are built from it by `scripts/make_icons.mjs` (resize and background only).

**Demo video** (`FarmTwin_demo_SpaceApps_30s.mp4`): the app footage is a screen recording of the real app. The same two ChatGPT illustrations appear as backgrounds in the opening and the closing scenes and carry a visible "AI-generated image" mark on screen. The editing and animation were done with code written with Claude's help. The music is original and was synthesized by Python code written with Claude's help (no samples, no AI music generator). The voiceover is **AI-generated speech**: a Microsoft neural text-to-speech voice (en-US Andrew) reading the script the team wrote; there is no human voice in the video. The video file's metadata (title, comment) states all of this.

**Pitch deck:** built as an HTML page with Claude's help. It uses public-domain NASA imagery (Blue Marble, MODIS Terra) and screenshots of the real app.
