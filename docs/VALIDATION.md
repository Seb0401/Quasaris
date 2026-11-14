# Validación del motor de FarmTwin

Criterio **Validez** de la rúbrica: ¿qué tan confiables son las cifras? Este documento separa lo que ya está verificado de lo que falta.

## 1. Verificado

| Qué | Contra qué | Resultado | Dónde |
| --- | --- | --- | --- |
| ET0 Penman-Monteith | FAO-56, ejemplo 18 (Bruselas, 6 de julio) | 3,9 mm/día, igual que el manual | `engine/tests/test_engine.py` |
| Radiación extraterrestre Ra | FAO-56, ejemplo 8 (20° S, 3 de septiembre) | 32,2 MJ/m²/día | `engine/tests/test_engine.py` |
| Fusión vertical de NASA POWER | Elevación SRTM de la parcela | Majes (1.409 m) queda entre celdas de 835 m y 1.941 m; pesos 0,48 / 0,52 | `engine/power.py` |

## 2. Comparación con un estudio independiente (no es una observación)

**Fuente:** Purdue University, *AguaRiego*, Tabla 11, "Uso de agua para cultivos en la estación meteorológica Pampa de Majes", suelo franco arenoso. El estudio usó CropWAT 8.0 con FAO-56 Penman-Monteith. Su clima viene de mapas climáticos (Moraes et al., 2020), viento de CFSR y radiación estimada (Thornton y Running). Es otro modelo, no mediciones.

| Indicador | AguaRiego (Purdue) | FarmTwin (NASA POWER + SRTM) | Diferencia |
| --- | --- | --- | --- |
| Alfalfa: requerimiento neto anual | 10.701 m³/ha | 13.219 m³/ha (mediana 2005–2025; rango 11.933 a 13.806) | +24 % |
| Kc de alfalfa | 0,40 / 0,95 / 0,90 (con curva de cortes) | 0,90 constante (promedio FAO con cortes) | — |

**Lectura:** el orden de magnitud coincide. FarmTwin sale más alto, probablemente porque usa un Kc constante de 0,90 en vez de la curva de cortes y porque su clima es más seco (humedad interpolada de unos 65 %). Para el pitch, el mensaje es: "dos métodos independientes dan entre 10.700 y 13.200 m³/ha para la alfalfa en Majes; la incertidumbre se muestra como rango".

## 3. Pendiente: estación SENAMHI Pampa de Majes

- **Estación:** PAMPA DE MAJES, código **116006** (convencional, categoría MAP), lat −16,3357, lon −72,1525. Está a unos 4 km del punto piloto. También existe una automática con código 4729E39A.
- **Datos disponibles:** tablas diarias mensuales desde 2017-01 hasta hoy en el [mapa de estaciones de SENAMHI](https://www.senamhi.gob.pe/mapas/mapa-estaciones-2/).
- **Por qué no está automatizado:** el visor tiene una verificación anti-bots (Cloudflare Turnstile). La descarga la hace **una persona desde el navegador**.

### Cómo completarla (unos 20 minutos, persona D)

1. Abre el mapa de SENAMHI, busca "Pampa de Majes" (convencional, 116006) y abre "Datos".
2. Elige un mes (ideal: 12 o más meses entre 2017 y 2025) y copia la tabla diaria.
3. Pega en `data/senamhi/pampa_de_majes.csv` con este encabezado:
   ```
   fecha,tmax,tmin,hr,precip
   2023-01-01,27.4,12.1,58,0.0
   ```
   Fecha en formato AAAA-MM-DD; deja vacío o "S/D" cuando no haya dato.
4. Corre `python scripts/validate_senamhi.py`. Imprime el sesgo, MAE, RMSE y correlación de Tmax, Tmin y ET0 (Hargreaves en ambos lados), y guarda `data/validation_senamhi.json`.
5. Con ese resultado se arma la gráfica de la diapositiva de Validez. Si hay un sesgo sistemático de temperatura, se puede corregir en `engine/power.py` (*bias correction*), siempre que se documente.

## 4. Lo que sigue estimado

Precios, rendimientos y costos de `data/crops.json` (referencias aproximadas de MIDAGRI) y el agua asignada por hectárea (15.000 m³/ha por defecto). La interfaz los marca como "a validar". Lo ideal es revisarlos con un agrónomo (UCSM o INIA) y con la junta de usuarios o AUTODEMA.
