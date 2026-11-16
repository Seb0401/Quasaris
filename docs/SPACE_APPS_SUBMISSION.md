# NASA Space Apps 2026: project submission text

Ready-to-paste text for each field of the team's **Project** tab on spaceappschallenge.org, following the official Project Submission Guide (2026). Everything on the project page must be in English.

**Deadline:** Sunday 15 November 2026, 23:59 local time of the Arequipa Local Event (UTC−5). Only the last saved submission is judged.

---

## Project Name

Quasaris FarmTwin

## High-Level Project Summary

Quasaris FarmTwin is a free, bilingual web app that helps farmers choose crop rotations that fit the water they will really have, before they plant. The farmer marks their field on a satellite map, enters water allocation, irrigation, soil and priorities, and FarmTwin compares their current rotation with alternatives under 21 years of daily NASA POWER climate, adjusted to the field's altitude with NASA SRTM and computed with the FAO-56 standard. A time machine replays every past year next to MODIS NDVI, and a 3D digital twin of the farm lets the farmer test a dry year, El Niño or a hotter future, with alerts that say exactly what to change. Irrigated farms grow about 40% of the world's food with 70% of its fresh water, so every drought hits food security. FarmTwin turns free NASA data into one clear decision, and works for any irrigated field in the world.

## Link to Project Demo

**TODO (team):** upload `FarmTwin_demo_SpaceApps_30s.mp4` (30.0 s, English on-screen text) to YouTube as *Unlisted* or *Public* (or to Google Drive with "Anyone with the link"), open the link in a private window to check it plays without logging in, and paste it here.

## Link to Final Project

https://quasaris-farmtwin.vercel.app

(Source code: https://github.com/Seb0401/Quasaris. The README links both and has a full product tour.)

## Detailed Project Description

**The problem.** Food security depends on stability: people need enough food *at all times*. Climate change breaks exactly that. Irrigated agriculture covers less than 20% of the world's cropland but produces about 40% of its food and uses 70% of the fresh water withdrawn (FAO), so every drought reaches the food supply. Our pilot, the Majes irrigation district in Arequipa, Peru, shows it: the region grows about 70% of Peru's onion and Majes is the country's first dairy district, yet the Condoroma reservoir was at 46% in November 2026, irrigation water was cut by 10%, and SENAMHI gives a 42–60% chance of below-normal rain because of El Niño. Farmers still decide what to plant by habit, without knowing whether the water will last the whole season, and crops dry out halfway.

**What FarmTwin does.** It is a decision-support tool that combines the four ingredients the challenge asks for (NASA Earth observations, local soil, crop characteristics and farmer priorities) in six steps:

1. **My field.** The farmer finds the field on a satellite map. One tap recognises the field's outline from the satellite image (or the farmer draws it by hand). They enter the water allocation, irrigation system, soil texture and what matters most to them (save water, earn more, care for the soil, lower risk). MODIS NDVI and SMAP root-zone soil moisture can be shown as map layers.
2. **Compare rotations.** The current rotation and the alternatives (including legumes, cover crops and crop associations such as maize, bean and squash) are simulated over 2005–2025. For each one FarmTwin shows water demand, income, soil health and climate risk as a range across 21 years, not a single number, plus a fit score explained part by part, the years in which the water would have been enough, and a plain-language action plan.
3. **Time machine.** Replays every rotation year by year, month by month, next to monthly MODIS NDVI, so the farmer sees how it would have gone in the years they lived (for example, the 2016 El Niño drought).
4. **3D farm.** A digital twin shaped like the real field. The farmer paints crops on plots, picks a past year or a future scenario (typical, dry, El Niño, +1.5 °C) and plays the season. Alert cards explain each risk (frost, heat, water shortage, empty reservoir, pests) with its probability and propose a fix with an "Apply" button. Plans can be saved and compared across past and future years.
5. **Calendar and alerts.** Crop cycles, the rotation wheel, weekly frost and heat risk, this week's irrigation need and push notifications.
6. **Recommendations.** Fertilisers, beneficial microorganisms and field devices chosen for the farmer's soil, zone (altitude from SRTM, natural dryness from NASA POWER root-zone wetness, frost history) and crops: the rotation's nitrogen balance with legume fixation, organic matter by soil type, Rhizobium inoculants, mycorrhizae and biological pest control matched to each crop's pests, plus a flow meter, moisture sensors, drip irrigation and pest traps. Each card says why it applies and how to do it.

FarmTwin covers 21 crops grown around Majes, from alfalfa, onion, potato and quinoa to artichoke and four fruit crops (avocado, table grape, mandarin, pomegranate).

An AI field assistant answers questions in plain words, but it may only quote numbers returned by the simulation engine.

**How it works.** A Python engine downloads 21 years of daily NASA POWER data (temperature, radiation, humidity, wind, rain), runs data quality checks, and fuses the two POWER cells that bracket the field's altitude using NASA SRTM elevation. It computes reference evapotranspiration with FAO-56 Penman-Monteith (verified against FAO-56 worked examples), crop water demand with FAO-56 crop coefficients, effective rain, frost and heat days, and a year-by-year water balance against the farmer's allocation and irrigation efficiency. Results are reported as medians and 10–90% ranges. Every number is deterministic and traceable; no machine-learning model makes the recommendation. Prices, yields and costs are labelled "to validate" with a local agronomist.

**Benefits.** Fewer crops lost halfway through the season; income that is more stable; water left in the reservoir for neighbours; healthier soil through better rotations. Our targets against today's alfalfa in Majes: 20% less water per hectare, water that is enough in at least 17 of 21 years, zero months with a dry crop in a typical year and soil health of at least 70/100. The tool supports, and does not replace, the judgment of the farmer and the local expert.

**What we hope to achieve.** A pilot with 50 farmers in Majes in 2027 and then other irrigation districts. The model is hybrid: free for farmers (with an optional Pro plan) and paid by water user boards, agro-exporters, dairy companies, banks and insurers. Because it runs on global NASA data and FAO standards, it can be replicated in any irrigated farming area in the world.

**Tools and languages.** TypeScript, Next.js 16 (App Router, Progressive Web App that works offline), React 19, three.js / React Three Fiber (3D farm), Leaflet with NASA GIBS and Esri tiles (maps), Python, FastAPI and NumPy (simulation engine), Vercel AI SDK (assistant), Web Push (alerts), hosted on Vercel. Bilingual (English and Spanish), mobile first, light and dark themes.

## Use of Super Intelligence (SI)

(Not shown to the judges; for data collection.)

Yes. We used SI tools to accelerate development, never to choose the challenge or the idea:

- **Code:** Claude Code (Anthropic) and OpenAI Codex helped write and review code for the web app, the simulation engine, tests and documentation. Commits made with AI assistance carry a `Co-Authored-By` trailer in the repository, and `docs/AI_USAGE.md` describes who did what.
- **Images:** two background illustrations (an orbital view and a sunset field) were generated with ChatGPT, and 21 small crop illustrations with OpenAI's image generation tool. All carry a visible AI mark in the app (and in the demo video, for the two backgrounds). All maps and data layers are real imagery (Esri, NASA GIBS) and real data.
- **Video and audio:** the demo video is a screen recording of the real app, edited and animated with code written with Claude's help; its music was synthesized by code written with Claude's help. Both are acknowledged in the video's metadata.
- **Inside the product:** an LLM field assistant explains results in plain words but can only quote numbers produced by the deterministic engine.

## NASA Data

- **NASA POWER** (Daily, Agroclimatology, 2005–2025): T2M_MAX, T2M_MIN, ALLSKY_SFC_SW_DWN, RH2M, WS2M, PRECTOTCORR for FAO-56 evapotranspiration, crop water demand, effective rain, frost and heat risk, the 21-year time machine, the 3D farm scenarios and the calendar; GWETROOT (root-zone soil wetness) as supporting evidence.
- **SRTM** (Shuttle Radar Topography Mission, 90 m): field elevation, used to fuse the NASA POWER cells that bracket the field's altitude.
- **MODIS Terra NDVI monthly** via **NASA GIBS**: vegetation layer on the field map and in the time machine.
- **SMAP L4 Analyzed Root Zone Soil Moisture** via **NASA GIBS**: soil moisture map layer.
- Details and code locations: `docs/DATA_SOURCES.md` in the repository.

## Space Agency Partner Data and Other References

We did not use data from the Space Agency Partners. Other data, resources and tools:

- FAO Irrigation and Drainage Paper 56 (Allen et al., 1998): Penman-Monteith equations, crop coefficients and stage lengths.
- FAO statistics on irrigated agriculture (share of cropland, food production and freshwater withdrawals); FAO (1996) definition of food security.
- INEI, ENAHO 2025 (food insecurity in Peru); SENAMHI (El Niño rainfall outlook).
- ISRIC SoilGrids 250 m: regional soil texture and water retention (labelled as a model, not a field sample).
- MIDAGRI (Peru Ministry of Agriculture) public references: approximate yields, prices and costs (to be validated).
- Purdue University, *AguaRiego* manual: independent comparison of alfalfa water requirements in Pampa de Majes.
- Esri World Imagery, World Topo Map and reference labels: base maps (display only).
- OpenStreetMap / Nominatim: place search (display only, attribution shown).
- Open-source software: Next.js, React, three.js, React Three Fiber, Leaflet, Python, FastAPI, NumPy, Vercel AI SDK, lucide icons. Licences listed in the repository's dependencies.
- Two illustrations generated with ChatGPT (marked "AI-generated image") and 21 crop illustrations generated with OpenAI's image tool (marked "AI").
- General agronomy references for the Recommendations screen (crop nutrient demand, legume nitrogen fixation, pests, diseases and bio-inputs used in Peru); products must be registered with SENASA and doses confirmed by an agronomist.

---

## Submission checklist

- [ ] All five members are **confirmed participants of the same Local Event** (Arequipa). Waitlisted members must ask the Local Lead.
- [ ] Demo video uploaded and the link tested in a private window (no login).
- [ ] Every required field filled in, in English.
- [ ] Project image uploaded (JPG or PNG, up to 10 MB): `FarmTwin-video/submission/` has two ready-made images.
- [ ] Check "Terms and Conditions" and "Confirm All Work is Original", then **Submit for Judging** before 23:59.
- [ ] No images, video or voices of people under 18 in the demo or the app.
- [ ] Optional: request a FortiGuard web filter classification for quasaris-farmtwin.vercel.app so judges' networks do not block it.
- [ ] After submitting, each member downloads the participant certificate from their profile.
