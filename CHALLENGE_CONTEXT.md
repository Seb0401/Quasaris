# Challenge context: Field Shift (Quasaris FarmTwin)

Context document for team Quasaris at the NASA Space Apps Challenge 2026, Arequipa venue (UCSM), 14 and 15 November 2026. Written at the start of the hackathon; the README describes what was finally built.

## 1. The challenge

- **Official name:** Field Shift: Adapting Farms with NASA Data
- **Name in the local material:** Cambio de rumbo: adaptando las granjas con datos de la NASA
- **Official page:** https://www.spaceappschallenge.org/2026/challenges/adapting-farms-with-nasa-data/
- **Difficulty:** intermediate and advanced
- **Subjects:** Earth science, software, arts and multimedia

### What it asks for

Build a decision-support tool (app, model, interactive map or other) that combines four ingredients to help farmers explore crop rotation strategies that improve soil health and adapt their fields to changing conditions:

1. NASA Earth observations
2. Local soil information
3. Crop characteristics
4. Farmer priorities

### Underlying problem

Farmers face shifting temperatures, less predictable rain, water scarcity, extreme weather and loss of soil health. Choosing a new crop for a rotation is hard: a crop that improves the soil in one place may use too much water, bring disease, have no market or not fit the season somewhere else.

### What the brief suggests (not mandatory, but what the judges expect)

- Compare **at least three rotations, including the farmer's current one**.
- For each rotation explain: why it is suggested, what evidence supports it, what benefits it offers, what information is missing and what risks a farmer or local expert should review.
- Show when fields are usually bare and in which seasons current crops are most vulnerable.
- Point out rotation opportunities that break pest cycles, reduce water demand, improve infiltration or add income.
- Analyse with NASA data: temperature, heat stress, rain, soil moisture, evaporation, frost risk, extreme precipitation, vegetation stress and long-term water trends.
- Consider priorities such as: water use, forage value, nitrogen fixation, erosion reduction, organic matter and market.
- **The tool supports, and does not replace, the judgment of the farmer or the local expert.**

### Optional considerations in the brief

- **Data and conditions:** explain in plain language evapotranspiration, soil moisture anomalies, NDVI, frost risk and water balance; clarify the difference between satellite data and ground measurements and why to combine them.
- **Modelling and data fusion:** compare statistical or AI approaches; explain how uncertainty is handled and where local validation is needed; bring datasets of different resolution to a common grid.
- **Rotation exploration:** compare by nutrient cycling, erosion, organic matter, pests, water, forage and market; explain the role of legumes, cover crops, deep-rooted and drought-tolerant crops.
- **Maps and visualisation:** interactive trend maps, field-level vulnerable zones, timelines, overlaid layers and scenario sliders.
- **Farmer-centred design:** easy to interpret without technical experience; inputs for priorities and constraints (water, equipment, market).

### Datasets named in the brief

SMAP, ECOSTRESS, GPM, Landsat, MODIS, NASA POWER, GRACE and GRACE-FO, SRTM (or other elevation products) and GEDI. The **Resources** tab of the official page has the links.

## 2. Our project

- **Team:** Quasaris
- **Product:** Quasaris FarmTwin
- **Tagline:** From Space to Soil / Before you plant, explore what's possible.
- **Pilot area:** Majes irrigation district, Arequipa, Peru (approximate coordinates of El Pedregal: lat −16.36, lon −72.19)

### Idea

In Majes water is limited and shared, and every farmer decides on their own what to plant. FarmTwin is a web platform where the farmer selects their field, enters their resources and simulates rotations before planting. For each rotation it estimates the water required, profitability, effect on the soil and climate risk, and gives a clear recommendation. The long-term vision is to scale it to irrigation users' boards to share water better between fields.

### Majes context

- It almost never rains: practically all the water comes from irrigation.
- The water comes from the Condoroma dam (upper Colca basin) and is managed by AUTODEMA.
- Common crops: alfalfa (dairy farming), onion, potato, forage maize.
- Soils are largely sandy, with low water retention.

### Sample rotations for the demo (to validate with an agronomist)

1. **Current:** permanent alfalfa.
2. **Income:** onion, potato and forage maize.
3. **Soil and water:** a rotation with a short-cycle legume (bean or broad bean) between two cash crops.

## 3. Data

### NASA

| Source | What it provides | Approx. pixel | Frequency | Use in FarmTwin |
| --- | --- | --- | --- | --- |
| NASA POWER | Temperature, radiation, humidity, wind, rain | 50 km | Daily | Basis of the calculation: ET0, frost, heat |
| MODIS (MOD13Q1) | NDVI | 250 m | 16 days | Vegetation history, map layer |
| HLS (Landsat + Sentinel-2) | Reflectance for NDVI | 30 m | 2 to 3 days | Field-level detail (if time allows) |
| SMAP | Soil moisture | 9 to 36 km | 2 to 3 days | Regional context |
| GPM IMERG | Rain | 10 km | 30 min | Rain in the upper basin |
| SRTM | Elevation | 30 m | Once | Slope and erosion (optional) |

Resolutions are approximate; confirm on each product's page.

### NASA POWER variables (AG community)

| Parameter | Meaning | Unit |
| --- | --- | --- |
| T2M_MAX, T2M_MIN | Maximum and minimum temperature at 2 m | °C |
| ALLSKY_SFC_SW_DWN | Surface solar radiation | MJ/m² per day |
| RH2M | Relative humidity | % |
| WS2M | Wind at 2 m | m/s |
| PRECTOTCORR | Corrected precipitation | mm per day |
| GWETROOT | Root-zone soil wetness | 0 to 1 |

Sample query:

```
https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M_MAX,T2M_MIN,ALLSKY_SFC_SW_DWN,RH2M,WS2M,PRECTOTCORR&community=AG&latitude=-16.36&longitude=-72.19&start=20250101&end=20251231&format=JSON
```

Dates in YYYYMMDD format. The value −999 means missing data.

### Access

- **NASA POWER API:** no account needed, answers in seconds.
- **NASA GIBS:** image tiles ready for Leaflet (display only, not for calculation).
- **AppEEARS:** clips MODIS, HLS or SMAP to a point or area; requires Earthdata Login; takes minutes to hours.
- **Worldview:** web explorer for the GIBS layers.

### Local

- **Crop coefficients (Kc):** FAO-56 manual, table 12.
- **Soils:** SoilGrids (ISRIC), 250 m, plus a texture selector the farmer can correct.
- **Crops and prices:** MIDAGRI (farm-gate yields and prices), INIA (calendars).
- **Ground climate:** SENAMHI, to validate POWER.
- **Water:** AUTODEMA and ANA; in the prototype, the farmer enters the available water.

### Crop table (approximate values, check against FAO-56)

| Crop | Initial Kc | Mid Kc | Late Kc | Family | Fixes nitrogen |
| --- | --- | --- | --- | --- | --- |
| Alfalfa | 0.40 | 0.95 | 0.90 | Legume | Yes |
| Potato | 0.50 | 1.15 | 0.75 | Solanaceae | No |
| Onion | 0.70 | 1.05 | 0.75 | Alliaceae | No |
| Maize | 0.30 | 1.20 | 0.35 to 0.60 | Grass | No |
| Bean or broad bean | 0.40 | 1.15 | 0.35 | Legume | Yes |

Columns still to complete per crop: cycle length (days), yield, price, cost, root depth, tolerable temperature range.

## 4. Calculation engine

1. The farmer marks their field: latitude and longitude.
2. About 20 years of daily climate are requested from NASA POWER.
3. Daily ET0 is calculated (FAO-56 Penman-Monteith; Hargreaves as plan B).
4. Each rotation is defined: list of crops with sowing date.
5. Water per crop: `ETc = Kc × ET0`, summed over the cycle.
6. Gross irrigation: `(ETc − effective rain) / efficiency`. Approximate efficiencies: furrow 0.45, sprinkler 0.75, drip 0.90.
7. Other indicators:
   - **Income:** yield × price − cost.
   - **Soil health:** rules (points for legumes, for changing family, for alternating roots; minus points for bare months).
   - **Climate risk:** fraction of years with days outside the crop's tolerable range.
8. Score: each indicator normalised from 0 to 1 and weighted with the farmer's sliders.
   `Score = w_water·A + w_income·I + w_soil·S + w_risk·(1 − R)`
9. Constraint: if gross irrigation exceeds the available water, the rotation is marked as not viable.
10. Uncertainty: repeat the calculation per year and show a range, not a single number.

Key conversion: 1 mm = 10 m³ per hectare.

## 5. Technologies (initial plan)

| Piece | Use |
| --- | --- |
| Python + NumPy | Download and calculation |
| FastAPI | Backend API (`/simulate` endpoint) |
| React (Next.js) | Interface: forms, cards, sliders |
| Leaflet | Map, field selection, GIBS layers |
| Recharts | Comparison charts |
| GitHub | Public repository |
| Streamlit | Plan B: full app in Python only |

Flow: click on the map → the app sends coordinates, current rotation, water and priorities → FastAPI queries POWER → Python calculates → returns JSON → the app shows the compared rotations.

## 6. Scope for the 48 hours

**Must have**
- Map click, POWER climate, ET0 and water per rotation.
- Three compared rotations, including the current one.
- Priority sliders and available water field.

**Important**
- GIBS NDVI layer on the map.
- Uncertainty range and "what to check with an expert" text per rotation.
- POWER vs SENAMHI station chart.
- Plain-language explanations of ET, NDVI and soil moisture.

**If there is time**
- Field-level NDVI series (AppEEARS or HLS) to see bare months.

**Vision only**
- Water allocation at community or users' board level.
- Business model.

## 7. Judging

### Local rubric (Arequipa), 1 to 4 per criterion

| Criterion | What earns a 4 | How we cover it |
| --- | --- | --- |
| Impact | Relevant problem with indicators | m³ of water saved per hectare between rotations |
| Creativity | Novel idea with original components | Scoring engine and shared-water constraint |
| Validity | Tested in a real environment | Comparison with SENAMHI, review by an agronomist |
| Relevance | Useful and solves the challenge | Three rotations, NASA data, soil, crop, priorities |
| Presentation | Clear purpose and importance | Challenge, solution, why it matters |
| Diversity | Multidisciplinary team using its strengths | Say what each member contributed |

### Global awards we aim for

Local Impact, Best Use of Data, Best Use of Science.

### Global submission (confirm in the participant guide)

- Demo: video of up to 30 seconds or up to 7 slides.
- Public repository with the code.
- Declare the NASA and partner-agency data used.
- Declare the use of AI, if any.
- All links public and working.

## 8. Dates

- 14 and 15 November 2026: hackathon, in person at UCSM.
- 16 November: local judging.
- 17 to 23 November: selection of global nominees.
- January 2027: announcement of global winners.

## 9. Open items at the start

- Read the Resources tab of the challenge.
- Complete the crop table with a source for each value.
- Get the water allocated per hectare in Majes and the predominant irrigation system.
- Choose the SENAMHI station for validation.
- Validate the three rotations with an agronomist.
