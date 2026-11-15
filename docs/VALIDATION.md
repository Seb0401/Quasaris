# FarmTwin engine validation

This answers the **Validity** criterion of the rubric: how reliable are the numbers? It separates what is already verified from what is still missing.

## 1. Verified

| What | Against | Result | Where |
| --- | --- | --- | --- |
| ET0 Penman-Monteith | FAO-56, example 18 (Brussels, 6 July) | 3.9 mm/day, same as the manual | `engine/tests/test_engine.py` |
| Extraterrestrial radiation Ra | FAO-56, example 8 (20° S, 3 September) | 32.2 MJ/m²/day | `engine/tests/test_engine.py` |
| Vertical fusion of NASA POWER | SRTM elevation of the field | Majes (1,409 m) lies between cells at 835 m and 1,941 m; weights 0.48 / 0.52 | `engine/power.py` |
| Input data quality | Physical ranges, Tmin ≤ Tmax, radiation ≤ Ra, stuck values, temperature spikes, gaps | Bad values become gaps, short gaps are interpolated, years with more than 15% filled days are excluded | `engine/quality.py`, `engine/tests/` |

## 2. Comparison with an independent study (not an observation)

**Source:** Purdue University, *AguaRiego*, Table 11, "Crop water use at the Pampa de Majes weather station", sandy loam soil. The study used CropWAT 8.0 with FAO-56 Penman-Monteith. Its climate comes from climate maps (Moraes et al., 2020), wind from CFSR and estimated radiation (Thornton and Running). It is another model, not measurements.

| Indicator | AguaRiego (Purdue) | FarmTwin (NASA POWER + SRTM) | Difference |
| --- | --- | --- | --- |
| Alfalfa: annual net requirement | 10,701 m³/ha | 13,219 m³/ha (median 2005–2025; range 11,933 to 13,806) | +24% |
| Alfalfa Kc | 0.40 / 0.95 / 0.90 (with cutting curve) | 0.90 constant (FAO average with cuttings) | — |

**Reading:** the order of magnitude matches. FarmTwin comes out higher, probably because it uses a constant Kc of 0.90 instead of the cutting curve and because its climate is drier (interpolated humidity of about 65%). Message for the pitch: "two independent methods give between 10,700 and 13,200 m³/ha for alfalfa in Majes; the uncertainty is shown as a range".

## 3. Pending: SENAMHI Pampa de Majes station

- **Station:** PAMPA DE MAJES, code **116006** (conventional, MAP category), lat −16.3357, lon −72.1525. It is about 4 km from the pilot point. There is also an automatic station with code 4729E39A.
- **Available data:** monthly tables of daily data from 2017-01 to today on the [SENAMHI station map](https://www.senamhi.gob.pe/mapas/mapa-estaciones-2/).
- **Why it is not automated:** the viewer has an anti-bot check (Cloudflare Turnstile). The download is done **by a person in the browser**.

### How to complete it (about 20 minutes)

1. Open the SENAMHI map, search for "Pampa de Majes" (conventional, 116006) and open "Datos".
2. Choose a month (ideally 12 or more months between 2017 and 2025) and copy the daily table.
3. Paste it into `data/senamhi/pampa_de_majes.csv` with this header:
   ```
   fecha,tmax,tmin,hr,precip
   2023-01-01,27.4,12.1,58,0.0
   ```
   Date in YYYY-MM-DD format; leave the value empty or "S/D" when there is no data.
4. Run `python scripts/validate_senamhi.py`. It prints the bias, MAE, RMSE and correlation of Tmax, Tmin and ET0 (Hargreaves on both sides), and saves `data/validation_senamhi.json`.
5. That result feeds the chart on the Validity slide. If there is a systematic temperature bias, it can be corrected in `engine/power.py` (bias correction), as long as it is documented.

## 4. What is still estimated

Prices, yields and costs in `data/crops.json` (approximate MIDAGRI references), the water allocated per hectare (15,000 m³/ha by default), the yield bonus of crop associations and the rules of the Recommendations screen (nitrogen demand and fixation per crop, fertiliser, microorganism and device suggestions). The interface labels them "to validate". Ideally they are reviewed with an agronomist (UCSM or INIA) and with the irrigation users' board or AUTODEMA.
