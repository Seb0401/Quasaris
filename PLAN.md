# Plan: Quasaris FarmTwin, PWA

> **From Space to Soil.** Before you plant, see what would have happened, what makes sense today and what is coming.

Execution plan for the NASA Space Apps Challenge 2026, Arequipa venue. Challenge: **Field Shift: Adapting Farms with NASA Data**. It complements `CONTEXTO_RETO.md`, which details the challenge, the data and the calculation engine. That detail is not repeated here: this document decides what we build, how and in what order.

This is the plan written at the start of the hackathon. The README describes what was finally built (for example, the 3D farm simulation and crop associations were added later).

---

## 1. The idea in one sentence

FarmTwin is a **digital twin of the field** in the farmer's pocket. Using NASA data, it shows three things about every possible rotation:

| Time | Feature | Question it answers |
| --- | --- | --- |
| **Past** | **Time machine** | "If I had planted this rotation over the last 20 years, how much water would I have used, how much would I have earned and in which years would it have gone badly?" |
| **Present** | **AI field assistant (voice and photo)** | "Explain simply why you recommend this." The farmer speaks or takes a photo and gets a spoken answer, in Spanish or English. |
| **Future** | **Live calendar and alerts** | "When do I plant, and when should I watch out for frost or heat?" Push notifications arrive according to the crop and its stage. |

The rotation simulator in `CONTEXTO_RETO.md` is the **engine** behind all three features. They all use the same calculation, presented in three ways.

### Why it is innovative (arguments for the judges)

1. **Evidence instead of averages.** Most tools give a single number ("potato needs X m³"). FarmTwin replays **every real year** of NASA climate since 2005, including El Niño 2016 and 2023 and the strong frosts. The farmer sees risk as something they lived through ("in 2016 this rotation would have left you without water in September"), not as an abstract percentage. It also addresses the uncertainty the challenge asks for: a range you can see, not a footnote.
2. **AI that does not make things up.** The assistant only quotes numbers that came out of the engine; it gets them through tool calling. If a value is missing, it says so and recommends asking a local expert. This answers the challenge's phrase: "supports, not replaces".
3. **From analysis tool to season companion.** The PWA installs, works with poor signal and warns proactively. Academic tools are used once; this one stays on the phone.
4. **Designed for the field.** Voice input, large buttons, offline access to what was already calculated, and two languages (ES/EN).

---

## 2. Decisions made

| Topic | Decision |
| --- | --- |
| Platform | Installable, mobile-first **PWA** (low-end Android as reference) |
| Stack | **Next.js (App Router) + Python functions on Vercel** for the engine |
| Deployment | **Vercel** (preview per PR, production on `main`) |
| Language | **Bilingual ES/EN** with a visible switch; Spanish by default |
| AI | Claude through **Vercel AI Gateway** with the AI SDK |
| Pilot area | Majes irrigation district, Arequipa (lat −16.36, lon −72.19) |
| Team | 4 people with about 10 agents, in 4 parallel workstreams (section 8) |

---

## 3. User experience (demo flow)

```
[Home] ──► [1. My field] ──► [2. My resources and priorities] ──► [3. Compare rotations]
                                                                        │
                    ┌──────────────────────────┬────────────────────────┼─────────────────────┐
                    ▼                          ▼                        ▼                     ▼
             [Time machine]            [Ask FarmTwin]             [My calendar]      [What does it mean?]
```

1. **My field.** Leaflet map centred on Majes. I tap my field or use "I'm here" (GPS). The NASA GIBS NDVI layer is shown on top.
2. **My resources.** Available water (m³/ha per season), irrigation system (furrow, sprinkler or drip), soil texture (suggested by SoilGrids and editable), current rotation and priority sliders: water, income, soil, risk.
3. **Compare.** Three or more cards (the current rotation always first) with water, income, soil health, risk and score. Every indicator shows a **range** (good and bad years), not a single number. If a rotation exceeds the available water, it is marked **"Not viable with your water"**.
   Each card has five sections: *Why it is suggested · NASA evidence · Benefits · What we don't know yet · What to check with an expert*.
4. **Time machine** (section 4.1).
5. **Assistant** (section 4.2).
6. **Calendar and alerts** (section 4.3).
7. **What does it mean?** Two-line explanations with an icon about ET, NDVI, soil moisture, water balance, frost risk, and the difference between satellite data and ground measurements.

---

## 4. The three flagship features

### 4.1 Time machine ("What would have happened?")

**What the farmer sees**
- A **year slider (2005 to 2025)**. Moving it changes, at the same time:
  - the **map**: GIBS NDVI layer on that date (WMTS `TIME` parameter);
  - the **cards**: water, income and risk of each rotation *in that year*;
  - a **12-month strip** per rotation, coloured by month: green ok, yellow water stress, red frost or heat out of range, grey bare field.
- A **20-year strip** (years × months heat map) that shows at a glance which rotation is most stable.
- Automatically generated **highlights**: "2016: the driest year. The Income rotation would have needed 2,300 m³/ha more than average."
- A **Play** button animates the 20 years in about 15 seconds. It is the strongest moment of the 30-second video.

**How it is calculated**
The engine already calculates per year to get the uncertainty range (engine step 10 in `CONTEXTO_RETO.md`). The time machine **exposes that calculation year by year** instead of summarising it. It costs almost no extra backend work.

**Data:** daily NASA POWER (T2M_MAX, T2M_MIN, ALLSKY_SFC_SW_DWN, RH2M, WS2M, PRECTOTCORR, GWETROOT), MODIS NDVI through GIBS (visual) and, if time allows, the MOD13Q1 series through AppEEARS to detect truly bare months.

### 4.2 AI field assistant (voice and photo)

**What it does**
- **Voice:** a large "Hold to talk" button. It uses the Web Speech API (`SpeechRecognition` with `es-PE` / `en-US`) and answers aloud with `speechSynthesis`. If the browser has no speech recognition, there is a text field.
- Sample questions as buttons: "Why shouldn't I keep growing alfalfa?", "What if I get less water?", "When is it dangerous to plant potato?".
- **Field photo** (optional): Claude with vision describes what it sees (bare field, cover, approximate stage) and relates it to the rotation. **It does not diagnose pests or diseases**; it refers those questions to an expert.

**Why it does not hallucinate (key pitch point)**
- AI SDK with **tools** that call the engine: `simularRotacion`, `consultarAño`, `explicarTermino`, `cambiarPrioridades`.
- The system prompt requires that **every number comes from a tool**, that it cites the source ("according to NASA POWER 2005 to 2025") and that it closes with "Check it with your agricultural technician" when relevant.
- The assistant can **drive the interface**. For example, "what if I have 20% less water?" adjusts the water field and the comparison is recalculated on screen.

**Technical:** Next.js Route Handler with `streamText`, a Claude model through AI Gateway (for example `anthropic/claude-sonnet-5.5`; confirm the exact id in the Gateway) and the interface language passed to the prompt.

### 4.3 Live calendar and alerts

**What the farmer sees**
- A yearly calendar per rotation with the recommended sowing windows, the crop stages (initial, mid and late Kc) and the **climatological risk weeks**. For example: "Weeks 26 to 30: 35% of years had frost below 0 °C (NASA POWER)".
- After turning on "Notify me" (with notification permission):
  - **Climatological alerts (100% NASA):** "Your potato is entering flowering. Historically, this week has a high frost risk."
  - **Forecast alerts (optional):** a daily cron checks the 3-day forecast and warns if frost or heat outside the crop's range is coming. The forecast is **not from NASA** (POWER does not forecast): an open source such as Open-Meteo would be used and declared in the submission.

**Technical:** Web Push with VAPID keys and the PWA service worker. A daily Vercel Cron goes through the subscriptions, stored in a Vercel-provided store. On iOS, push only works if the PWA is installed on the home screen; the demo uses Android.

---

## 5. Architecture

```
┌───────────────────────── PWA (Next.js, Vercel) ─────────────────────────┐
│  app/[locale]/…  UI: Leaflet map + GIBS, cards, time machine,            │
│                  calendar, assistant (voice/photo)                        │
│  Service worker: offline cache + push reception                           │
│  app/api/chat        → AI SDK + AI Gateway (Claude) + tools               │
│  app/api/push/*      → subscribe / test notification                      │
│  app/api/cron/alerts → daily alerts cron                                  │
└──────────────┬──────────────────────────────────────────────────────────┘
               │ JSON (contract in section 6)
┌──────────────▼───────────── Python functions (Vercel) ────────────────────┐
│  api/py/simulate   → engine: POWER → ET0 → ETc → irrigation → scores       │
│  api/py/climate    → climatology: frost/heat per week                      │
│  engine/  power.py · et0.py · crops.py · rotation.py · score.py            │
│  data/    crops.json · rotations_majes.json · power_cache/*.json           │
└──────────────┬──────────────────────────────────────────────────────────┘
               ▼
   NASA POWER API · NASA GIBS (WMTS) · SoilGrids · (AppEEARS) · (Open-Meteo)
```

**Key technical decisions**
- **POWER cache in the repo.** Before the demo, 20 years of data are downloaded and versioned for the points around Majes (`data/power_cache/`). Live, the real API is used and, if it fails or is slow, the app falls back to the cache. **The demo does not depend on the venue's wifi.**
- **Offline:** the service worker stores the interface, the last simulation result and the "What does it mean?" texts. The assistant and alerts need a connection.
- **Python and Next in the same Vercel project.** Python functions live in `api/py/` (at the root). To be verified on the first deploy (hour 2). **Plan B:** a second Vercel project with FastAPI only, called from Next through an `ENGINE_URL` environment variable.
- **i18n:** `/es` and `/en` routes. Explanation texts live in `messages/{es,en}.json`, and engine-generated messages come as keys plus parameters, not fixed text.
- **PWA:** web manifest, icons and a service worker.

### Repository structure (as planned)

```
Quasaris/
├─ app/[locale]/(parcela|comparar|tiempo|calendario|asistente|aprende)/
├─ app/api/(chat|push|cron)/
├─ components/ (map/, cards/, timemachine/, calendar/, assistant/, ui/)
├─ lib/ (contract.ts, engine-client.ts, i18n/, push/)
├─ messages/ (es.json, en.json)
├─ api/py/ (simulate.py, climate.py)
├─ engine/ (power.py, et0.py, crops.py, rotation.py, score.py, tests/)
├─ data/ (crops.json, rotations_majes.json, power_cache/)
├─ public/ (manifest, icons/)
├─ scripts/ (fetch_power_cache.py, validate_senamhi.py)
├─ docs/ (DATA_SOURCES.md, AI_USAGE.md, VALIDATION.md)
├─ CONTEXTO_RETO.md · PLAN.md · README.md · requirements.txt · vercel.json
```

---

## 6. Contract between modules (frozen at hour 2)

This is what lets 10 agents work in parallel without stepping on each other. It lives in `lib/contract.ts` and in `engine/schema.py` (Pydantic) **with the same field names**. Spanish enum values are part of the API.

```ts
// POST /api/py/simulate
type SimulateRequest = {
  lat: number; lon: number;
  soilTexture: "arenoso" | "franco" | "arcilloso";   // sandy | loam | clay
  irrigation: "gravedad" | "aspersion" | "goteo";    // furrow | sprinkler | drip
  waterAvailableM3ha: number;               // per yearly season
  priorities: { water: number; income: number; soil: number; risk: number }; // 0..1
  rotations: Rotation[];                    // [current, ...alternatives]
  years?: [number, number];                 // default [2005, 2025]
  locale: "es" | "en";
};
type Rotation = { id: string; name: string; isCurrent: boolean;
  mode?: "rotation" | "association";        // added later: intercropping
  crops: { cropId: string; sowMonth: number }[] };

type SimulateResponse = {
  source: { power: "live" | "cache"; period: [number, number] };
  rotations: RotationResult[];
};
type RotationResult = {
  id: string; viable: boolean; score: number;            // 0..1
  water:  Stat; income: Stat; soil: number; risk: Stat;  // soil 0..1
  byYear: YearResult[];                                   // ← time machine
  months: MonthStatus[];                                  // 12 typical months
  highlights: { year: number; key: string; params: Record<string, number> }[];
  explain: { whyKey: string; evidence: string[]; benefits: string[];
             missing: string[]; reviewWithExpert: string[] };
};
type Stat = { median: number; p10: number; p90: number; unit: string };
type YearResult = { year: number; waterM3ha: number; incomePEN: number;
  frostDays: number; heatDays: number; months: MonthStatus[] };
type MonthStatus = "ok" | "water_stress" | "climate_risk" | "bare";
```

```ts
// GET /api/py/climate?lat&lon  → calendar and alerts
type ClimateResponse = { weeks: { week: number; pFrost: number; pHeat: number;
  et0MeanMm: number }[] };
```

While the engine was not ready, the frontend worked with a **mock** (`data/mock_simulate.json`) that follows this contract.

---

## 7. Scope by priority

| Priority | What | Owner |
| --- | --- | --- |
| **P0: no demo without it** | Map and field selection · POWER→ET0→water engine · 3 rotations compared with a range · sliders and available water · "Not viable" · installable PWA · ES/EN · deployed on Vercel | A + B |
| **P1: what sets us apart** | Time machine (slider, month strip, 20-year strip, playback) · text assistant with tools · time-enabled GIBS NDVI layer · "What to check with an expert" | A + B + C |
| **P2: what impresses** | Voice (speak and listen) · climatological calendar · "Notify me" push with test alert · POWER vs SENAMHI validation · "What does it mean?" explanations | B + C + D |
| **P3: if there is time** | Field photo with vision · forecast alerts with cron · field-level NDVI with AppEEARS/HLS (real bare months) · automatic SoilGrids | C + A |
| **Vision only (pitch)** | Users' board: water shared between fields · Quechua · connection with AUTODEMA and SENAMHI | D |

**Cut rule:** if P0 is not deployed and stable halfway through, P2 and P3 are frozen and everyone works on closing P0 and P1.

---

## 8. Team: 4 workstreams and ~10 agents

Each person supervises one or more workstreams, reviews their agents' changes and is the **only one who touches their contract**. Agents work on their own branches (`feat/<stream>-<task>`) or isolated worktrees.

| Workstream | Person | Suggested agents (≈10 total) | Files it owns |
| --- | --- | --- | --- |
| **A. Engine and data (Python)** | Person A | **A1** POWER download and cache · **A2** ET0, ETc and irrigation with tests · **A3** score, soil, risk, `byYear` and "explain" texts | `engine/`, `api/py/`, `data/`, `scripts/` |
| **B. PWA and visualisation** | Person B | **B1** shell, PWA, i18n and design · **B2** map with GIBS, selection and GPS · **B3** comparison cards and charts · **B4** time machine | `app/[locale]/`, `components/`, `messages/` |
| **C. AI and alerts** | Person C | **C1** assistant: AI SDK, tools, voice and photo · **C2** push, cron and calendar | `app/api/chat`, `app/api/push`, `app/api/cron`, `components/assistant`, `components/calendar` |
| **D. Science, content and pitch** | Person D | Support agent for the crop table with sources, ES/EN explanations, `DATA_SOURCES.md` and `AI_USAGE.md` | `docs/`, `data/crops.json` (together with A) |

**First prompt for each agent:** "Read `CONTEXTO_RETO.md`, `PLAN.md` (sections 5 to 7) and `lib/contract.ts`. Your task is X. Only change these files: Y. Respect the contract; if you need to change it, stop and tell us."

**Person D also:** contacts an agronomist (UCSM or INIA) to validate the rotations, gets the reference SENAMHI station (Pampa de Majes), produces the video and slides and keeps track of time.

---

## 9. Schedule (≈36 h; adjust to the official submission time)

| Block | Hours | A. Engine | B. PWA | C. AI and alerts | D. Science and pitch |
| --- | --- | --- | --- | --- | --- |
| **0. Kick-off** | 0 to 2 | Empty `engine/` and "hello" endpoint on Vercel | Next + PWA + i18n deployed | AI Gateway account and `streamText` test | Earthdata account, challenge Resources, agronomist |
| **1. Contract** | 2 | **Freeze `contract.ts` and `schema.py` and create the mock** (everyone) | | | |
| **2. Core** | 2 to 10 | POWER and cache, ET0, water per rotation | Map, form, cards with mock | Assistant tools on the mock | Crop table with sources, rotations |
| **3. P0 integration** | 10 to 14 | Real `/simulate` with `byYear` | Connect to the real engine | Text chat in the UI | ES/EN explanations |
| **P0 milestone** | 14 | **End-to-end demo deployed** | | | |
| **4. Differentiators** | 14 to 24 | Risk, soil, `highlights`, `/climate` | Time machine and time-enabled NDVI | Voice, calendar and push | SENAMHI validation (chart) |
| **P1 milestone** | 24 | **All of P1 in production** | | | |
| **5. Polish and P2/P3** | 24 to 30 | Tests, edge cases, full cache | Performance, offline, accessibility | Photo or forecast cron (if time) | Script, video recording |
| **6. Freeze** | 30 to 33 | Bug fixes only | Bug fixes only | Bug fixes only | Slides, README, declarations |
| **7. Submission** | 33 to 36 | Rehearse the demo ×3 · check public links · submit | | | |

---

## 10. Data used (to declare in the submission)

| Source | Agency | Use | Priority |
| --- | --- | --- | --- |
| NASA POWER (AG community, daily) | NASA | ET0, frost, heat, rain, GWETROOT, time machine, calendar | P0 |
| GIBS: MODIS NDVI (time-enabled layer) | NASA | Map and time machine (visual) | P1 |
| GIBS: SMAP soil moisture | NASA | Context layer | P2 |
| MODIS MOD13Q1 / HLS via AppEEARS | NASA / USGS / ESA (Sentinel-2) | Bare months per field | P3 |
| SRTM | NASA | Elevation (used for the vertical fusion of POWER cells) | P3 |
| SoilGrids | ISRIC | Suggested texture | P2 |
| FAO-56 (Kc), MIDAGRI, INIA | FAO / Peru | Crops, prices, calendars | P0 |
| SENAMHI | Peru | POWER validation | P2 |
| Open-Meteo (forecast) | Not NASA | Forecast alerts | P3 |

The final list of what is actually used is in `docs/DATA_SOURCES.md`.

---

## 11. How we cover the rubric

| Criterion | Evidence in FarmTwin |
| --- | --- |
| **Impact** | m³/ha saved per year between the current and the recommended rotation; bare months avoided; loss years avoided (from the time machine) |
| **Creativity** | Digital twin in past, present and future · time machine with 20 real years · AI anchored to the engine · proactive alerts · 3D farm simulation |
| **Validity** | POWER vs SENAMHI (chart and error), engine tests against FAO-56 examples, review by an agronomist named on the slide |
| **Relevance** | Covers the four ingredients of the challenge (NASA, soil, crop, priorities), 3 or more rotations including the current one, bare fields, seasonal vulnerability, "what to check with an expert" |
| **Presentation** | 30-second video; past, present and future narrative |
| **Diversity** | Each workstream (A to D) has a visible owner; we explain what each person contributed and how we coordinated the AI agents |

Global awards: **Local Impact** (Majes and shared water), **Best Use of Data** (POWER, GIBS and ground validation), **Best Use of Science** (FAO-56 Penman-Monteith and year-to-year uncertainty).

---

## 12. Demo script (initial draft)

**30-second video**
1. (0 to 4 s) Image of Majes: "In Majes it barely rains and water is shared."
2. (4 to 10 s) I tap the field and 3 rotations are compared; "Current alfalfa: 14,000 m³/ha".
3. (10 to 20 s) **Time machine:** 20 years go by, the NDVI changes and 2016 turns red.
4. (20 to 27 s) Voice question: "What if I get 20% less water?" FarmTwin answers and the cards are recalculated.
5. (27 to 30 s) The "Frost likely this week" notification arrives and the tagline *From Space to Soil* appears.

**7 slides:** 1 Problem · 2 Solution (past, present, future) · 3 NASA data and science (ET0 and the engine diagram) · 4 Demo (screenshots or QR) · 5 Validation (SENAMHI and agronomist) · 6 Impact (m³ saved) and vision (users' board) · 7 Team and use of AI.

The numbers in the script are examples and are replaced by the engine's output.

---

## 13. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| The POWER API is slow or the venue wifi fails | Versioned cache in `data/power_cache/` with automatic fallback; video recorded in advance |
| Python inside the Next project fails on Vercel | Tested in hours 0 to 2; plan B: separate FastAPI project with `ENGINE_URL` |
| Web Speech does not work on the demo device | Text field always visible; demo on Chrome Android tested beforehand |
| The assistant makes up numbers | It only uses tools, the prompt forbids it, and 10 trick questions are tested before submission |
| Push on iOS | The demo is on Android; on iOS we explain that the PWA must be installed |
| Doubtful crop or price values | Each value carries its source in `crops.json`; the interface shows "approximate value, to validate" |
| Conflicts between 10 agents | Frozen contract, folders with owners, small changes, one integrator per workstream |
| Running out of time | Cut rule in section 7; P0 always deployed |

---

## 14. Deliverables

- [ ] App in production on Vercel (public URL, installable)
- [ ] Public repository `Seb0401/Quasaris` with README (what it is, how to run it, screenshots)
- [ ] `docs/DATA_SOURCES.md`: NASA and partner-agency data used
- [ ] `docs/AI_USAGE.md`: AI use in development (agents) and in the product (assistant)
- [ ] Video of 30 s or less and/or 7 slides
- [ ] All links public and checked from an incognito window

---

## 15. Open questions (answer at hour 0)

1. What is the **exact submission time** on 15 November? The schedule is adjusted to it.
2. **Who are A, B, C and D?** (name, strength)
3. Is an **agronomist** available (UCSM or INIA) to validate rotations and numbers?
4. Do we already have an **Earthdata account**? (AppEEARS needs it and processing can take time)
5. Is there already a **Vercel team or project** to connect the repo and enable AI Gateway?
6. Which **Android phone** will be used for the voice and push demo?
