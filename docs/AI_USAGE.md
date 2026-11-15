# Use of AI

Declaration of the use of AI (Super Intelligence, SI) for the NASA Space Apps Challenge 2026, following the 2026 Project Submission Guide: AI-generated images and video carry a visible mark, and AI-assisted code, audio and data are acknowledged here and in their metadata.

## 1. AI used during development

| Tool | Model | What it did |
| --- | --- | --- |
| **Claude Code** (Anthropic) | Claude Opus 5.5 (also Claude Fable 5.2 for one fix) | Drafted the execution plan (`PLAN.md`); scaffolded the Next.js PWA and the Python engine; implemented the FAO-56 Penman-Monteith ET0, the year-by-year rotation simulation, the SRTM-guided vertical fusion of NASA POWER cells, the data quality checks, the time machine, the 3D farm, the calendar and push alerts; built the "mission control" visual design and the step-by-step assistant (`/inicio`); ran a technical audit of the prototype; wrote tests, `docs/VALIDATION.md` and these declarations. Commits made with AI assistance carry a `Co-Authored-By: Claude` trailer. |
| **OpenAI Codex** | (model not recorded) | Helped develop the AI field assistant on the branch `codex/c1-assistant` (merged in PR #2): chat with engine tools, voice dictation and photos. |
| **ChatGPT** (OpenAI) | (image model not recorded) | Generated the two photographs used in the app (`public/images/majes-fields.png` and `public/images/quasaris-orbit.png`). |
| **Claude Code** (Anthropic) | Claude Opus 5.5 | Built the pitch deck (HTML), edited and animated the 30-second demo video from screen recordings of the real app, wrote the code that synthesizes the video's music, and helped draft English and Spanish texts. |

### What the team did

Main areas of each member, taken from the git history of this repository and the team's roles.

| Member | Main areas in the repository |
| --- | --- |
| Sebastian Barreda (Project Lead & Sustainability) | Simulation engine (NASA POWER + SRTM, FAO-56 ET0, year-by-year results), time machine, live calendar and push alerts, SENAMHI validation script, 3D farm mode, rotation editor, crop groupings, field plan (`/plan`), map drawing and search, SMAP layer, data and validation docs |
| Marco Collado (UI/UX Designer) | Product direction for the visual identity: "mission control" design system across the app, home page, Compare and Time Machine dashboards, step-by-step assistant redesign, calendar redesign, navigation fixes |
| Fernando Lizarraga (Data Science & AI) | AI field assistant (chat with engine tools, voice dictation, photos, markdown replies), ISRIC SoilGrids soil reference for Majes |
| Esteban Villagarcia (Software Engineer) | Farmer calendar (crop planning view, readability and accessibility) |
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

## 2. AI inside the product

**The numbers do not come from AI.** Water, income, soil health, risk and every chart in FarmTwin come from a deterministic engine (NASA data + FAO-56 equations + transparent rules). No machine-learning model produces a recommendation.

**Field assistant** (`/asistente`, `app/api/chat/`). An LLM chat explains results in plain language, accepts voice dictation (the browser's speech recognition) and photos. It runs through the Vercel AI SDK, with Vercel AI Gateway (`anthropic/claude-sonnet-5.5` by default) or OpenRouter as the provider. Safeguards:

- It may only quote numbers returned by the engine through tool calls: `simularRotacion` (simulate a rotation), `consultarAno` (look up one year of the time machine), `explicarTermino` (explain a term), `consultarSueloRegional` (ISRIC SoilGrids summary) and `cambiarPrioridades` (adjust the farmer's priorities).
- The system prompt tells it to separate satellite or model estimates from field measurements, to say what needs local validation, and to send the farmer to an agronomist for important decisions.
- When the engine is unavailable, the assistant labels the answer as demo data.

## 3. Images and media

The two photographs in the app are **AI-generated with ChatGPT**: `public/images/majes-fields.png` (section headers) and `public/images/quasaris-orbit.png` (home page). They are illustrations, not satellite imagery or photos of real fields; all maps and data layers come from Esri, NASA GIBS and the simulation engine.

In the app, both illustrations carry a visible **"AI-generated image"** mark. The app icon and logo are hand-written SVG (`scripts/make_icons.mjs`).

**Demo video** (`FarmTwin_demo_SpaceApps_30s.mp4`): the app footage is a screen recording of the real app. The same two ChatGPT illustrations appear as backgrounds in the opening and the closing scenes and carry a visible "AI-generated image" mark on screen. The editing and animation were done with code written with Claude's help. The music is original and was synthesized by Python code written with Claude's help (no samples, no AI music generator). The video file's metadata (title, comment) states all of this.

**Pitch deck:** built as an HTML page with Claude's help. It uses public-domain NASA imagery (Blue Marble, MODIS Terra) and screenshots of the real app.
