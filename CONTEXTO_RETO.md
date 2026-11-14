# Contexto del reto: Field Shift (Quasaris FarmTwin)

Documento de contexto para el equipo Quasaris en el NASA Space Apps Challenge 2026, sede Arequipa (UCSM), 14 y 15 de noviembre de 2026.

## 1. El reto

- **Nombre oficial:** Field Shift: Adapting Farms with NASA Data
- **Nombre en el material local:** Cambio de rumbo: adaptando las granjas con datos de la NASA
- **Página oficial:** https://www.spaceappschallenge.org/2026/challenges/adapting-farms-with-nasa-data/
- **Dificultad:** intermedio y avanzado
- **Temas:** ciencias de la Tierra, software, artes y multimedia

### Qué pide

Crear una herramienta de apoyo a la decisión (app, modelo, mapa interactivo u otra) que combine cuatro ingredientes para ayudar a los agricultores a explorar estrategias de rotación de cultivos que mejoren la salud del suelo y adapten sus campos a condiciones cambiantes:

1. Observaciones de la Tierra de la NASA
2. Información local de suelos
3. Características de los cultivos
4. Prioridades del agricultor

### Problema de fondo

Los agricultores enfrentan temperaturas cambiantes, lluvias menos predecibles, escasez de agua, clima extremo y pérdida de salud del suelo. Elegir un cultivo nuevo para una rotación es difícil: uno que mejora el suelo en un lugar puede consumir demasiada agua, traer enfermedades, no tener mercado o no calzar con la temporada en otro.

### Lo que el enunciado sugiere (no obligatorio, pero es lo que el jurado espera)

- Comparar **al menos tres rotaciones, incluida la actual** del agricultor.
- Para cada rotación explicar: por qué se sugiere, qué evidencia la respalda, qué beneficios ofrece, qué información falta y qué riesgos debe revisar un agricultor o experto local.
- Mostrar cuándo los campos suelen estar desnudos y en qué temporadas los cultivos actuales son más vulnerables.
- Señalar oportunidades de rotación que corten ciclos de plagas, reduzcan la demanda de agua, mejoren la infiltración o sumen ingresos.
- Analizar con datos de la NASA: temperatura, estrés por calor, lluvia, humedad del suelo, evaporación, riesgo de heladas, precipitación extrema, estrés de la vegetación y tendencias de agua de largo plazo.
- Considerar prioridades como: uso de agua, valor forrajero, fijación de nitrógeno, reducción de erosión, materia orgánica y mercado.
- **La herramienta apoya, no reemplaza, el criterio del agricultor ni del experto local.**

### Consideraciones opcionales del enunciado

- **Datos y condiciones:** explicar en lenguaje simple evapotranspiración, anomalías de humedad del suelo, NDVI, riesgo de heladas y balance hídrico; aclarar la diferencia entre datos satelitales y mediciones en tierra y por qué combinarlos.
- **Modelado y fusión de datos:** comparar enfoques estadísticos o de IA; explicar cómo se maneja la incertidumbre y dónde hace falta validación local; llevar datasets de distinta resolución a una grilla común.
- **Exploración de rotaciones:** comparar por ciclo de nutrientes, erosión, materia orgánica, plagas, agua, forraje y mercado; explicar el aporte de leguminosas, cultivos de cobertura, de raíz profunda y tolerantes a sequía.
- **Mapas y visualización:** mapas interactivos de tendencias, zonas vulnerables a nivel de parcela, líneas de tiempo, capas superpuestas y deslizadores de escenarios.
- **Diseño centrado en el agricultor:** fácil de interpretar sin experiencia técnica; entradas para prioridades y restricciones (agua, equipos, mercado).

### Datasets que nombra el enunciado

SMAP, ECOSTRESS, GPM, Landsat, MODIS, NASA POWER, GRACE y GRACE-FO, SRTM (u otros productos de elevación) y GEDI. La pestaña **Resources** de la página oficial tiene los enlaces; no está incluida aquí y hay que revisarla.

## 2. Nuestro proyecto

- **Equipo:** Quasaris
- **Producto:** Quasaris FarmTwin
- **Lema:** From Space to Soil / Before you plant, explore what's possible.
- **Zona piloto:** irrigación Majes, Arequipa, Perú (coordenadas aproximadas de El Pedregal: lat -16.36, lon -72.19)

### Idea

En Majes el agua es limitada y compartida, y cada agricultor decide por separado qué sembrar. FarmTwin es una plataforma web donde el agricultor selecciona su parcela, ingresa sus recursos y simula rotaciones antes de sembrar. Para cada rotación estima agua requerida, rentabilidad, efecto en el suelo y riesgo climático, y entrega una recomendación clara. La visión a futuro es escalarla a juntas de usuarios de riego para repartir mejor el agua entre parcelas.

### Contexto de Majes

- Casi no llueve: prácticamente toda el agua es de riego.
- El agua viene de la represa de Condoroma (cuenca alta del Colca) y la administra AUTODEMA.
- Cultivos habituales: alfalfa (ganadería lechera), cebolla, papa, maíz chala.
- Suelos en buena parte arenosos, con poca retención de agua.

### Rotaciones de ejemplo para la demo (a validar con un agrónomo)

1. **Actual:** alfalfa permanente.
2. **Ingreso:** cebolla, papa y maíz chala.
3. **Suelo y agua:** rotación con una leguminosa de ciclo corto (frijol o haba) entre dos cultivos comerciales.

## 3. Datos

### NASA

| Fuente | Qué aporta | Píxel aprox. | Frecuencia | Uso en FarmTwin |
| --- | --- | --- | --- | --- |
| NASA POWER | Temperatura, radiación, humedad, viento, lluvia | 50 km | Diaria | Base del cálculo: ET0, heladas, calor |
| MODIS (MOD13Q1) | NDVI | 250 m | 16 días | Historia de vegetación, capa de mapa |
| HLS (Landsat + Sentinel-2) | Reflectancia para NDVI | 30 m | 2 a 3 días | Detalle por parcela (si hay tiempo) |
| SMAP | Humedad del suelo | 9 a 36 km | 2 a 3 días | Contexto regional |
| GPM IMERG | Lluvia | 10 km | 30 min | Lluvia en la cuenca alta |
| SRTM | Elevación | 30 m | Única | Pendiente y erosión (opcional) |

Las resoluciones son aproximadas; confirmar en la página de cada producto.

### Variables de NASA POWER (comunidad AG)

| Parámetro | Significado | Unidad |
| --- | --- | --- |
| T2M_MAX, T2M_MIN | Temperatura máxima y mínima a 2 m | °C |
| ALLSKY_SFC_SW_DWN | Radiación solar en superficie | MJ/m² por día |
| RH2M | Humedad relativa | % |
| WS2M | Viento a 2 m | m/s |
| PRECTOTCORR | Precipitación corregida | mm por día |
| GWETROOT | Humedad del suelo en zona de raíces | 0 a 1 |

Ejemplo de consulta:

```
https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M_MAX,T2M_MIN,ALLSKY_SFC_SW_DWN,RH2M,WS2M,PRECTOTCORR&community=AG&latitude=-16.36&longitude=-72.19&start=20250101&end=20251231&format=JSON
```

Fechas en formato AAAAMMDD. El valor -999 es dato faltante.

### Acceso

- **API de NASA POWER:** sin cuenta, responde en segundos.
- **NASA GIBS:** mosaicos de imágenes listos para Leaflet (solo para mostrar, no para calcular).
- **AppEEARS:** recorta MODIS, HLS o SMAP a un punto o área; requiere Earthdata Login; tarda de minutos a horas.
- **Worldview:** explorador web de las capas de GIBS.

### Locales

- **Coeficientes de cultivo (Kc):** manual FAO-56, tabla 12.
- **Suelos:** SoilGrids (ISRIC), 250 m; más un selector de textura que corrige el agricultor.
- **Cultivos y precios:** MIDAGRI (rendimientos y precios en chacra), INIA (calendarios).
- **Clima en tierra:** SENAMHI, para validar POWER.
- **Agua:** AUTODEMA y ANA; en el prototipo, el agua disponible la ingresa el agricultor.

### Tabla de cultivos (valores aproximados, verificar en FAO-56)

| Cultivo | Kc inicial | Kc medio | Kc final | Familia | Fija nitrógeno |
| --- | --- | --- | --- | --- | --- |
| Alfalfa | 0.40 | 0.95 | 0.90 | Leguminosa | Sí |
| Papa | 0.50 | 1.15 | 0.75 | Solanácea | No |
| Cebolla | 0.70 | 1.05 | 0.75 | Aliácea | No |
| Maíz | 0.30 | 1.20 | 0.35 a 0.60 | Gramínea | No |
| Frijol o haba | 0.40 | 1.15 | 0.35 | Leguminosa | Sí |

Columnas que faltan completar por cultivo: duración del ciclo (días), rendimiento, precio, costo, profundidad de raíz, rango de temperatura tolerable.

## 4. Motor de cálculo

1. El agricultor marca su parcela: latitud y longitud.
2. Se piden a NASA POWER unos 20 años de clima diario.
3. Se calcula la ET0 diaria (Penman-Monteith FAO-56 con la librería `pyet`; Hargreaves como plan B).
4. Se define cada rotación: lista de cultivos con fecha de siembra.
5. Agua por cultivo: `ETc = Kc × ET0`, sumada en el ciclo.
6. Riego bruto: `(ETc − lluvia efectiva) / eficiencia`. Eficiencias aproximadas: gravedad 0.45, aspersión 0.75, goteo 0.90.
7. Otros indicadores:
   - **Ingreso:** rendimiento × precio − costo.
   - **Salud del suelo:** reglas (suma por leguminosa, por cambio de familia, por alternar raíces; resta por meses con campo desnudo).
   - **Riesgo climático:** fracción de años con días fuera del rango tolerable del cultivo.
8. Puntaje: cada indicador normalizado de 0 a 1 y ponderado con los deslizadores del agricultor.
   `Puntaje = w_agua·A + w_ingreso·I + w_suelo·S + w_riesgo·(1 − R)`
9. Restricción: si el riego bruto supera el agua disponible, la rotación se marca como no viable.
10. Incertidumbre: repetir el cálculo por año y mostrar un rango, no un solo número.

Conversión clave: 1 mm = 10 m³ por hectárea.

## 5. Tecnologías

| Pieza | Uso |
| --- | --- |
| Python + requests + pandas | Descarga y cálculo |
| pyet | Evapotranspiración de referencia |
| xarray | Solo si se abren NetCDF o HDF |
| FastAPI | API del backend (endpoint `/simular`) |
| React | Interfaz: formularios, tarjetas, deslizadores |
| Leaflet | Mapa, selección de parcela, capas de GIBS |
| Recharts o Chart.js | Gráficos comparativos |
| GitHub | Repositorio público |
| Streamlit | Plan B: app completa solo con Python |

Flujo: clic en el mapa → React envía coordenadas, rotación actual, agua y prioridades → FastAPI consulta POWER → Python calcula → responde JSON → React muestra las rotaciones comparadas.

## 6. Alcance para las 48 horas

**Imprescindible**
- Clic en el mapa, clima de POWER, ET0 y agua por rotación.
- Tres rotaciones comparadas, incluida la actual.
- Deslizadores de prioridades y campo de agua disponible.

**Importante**
- Capa de NDVI de GIBS en el mapa.
- Rango de incertidumbre y texto de "qué revisar con un experto" por rotación.
- Gráfica de POWER frente a una estación del SENAMHI.
- Explicaciones en lenguaje simple de ET, NDVI y humedad del suelo.

**Si sobra tiempo**
- Serie de NDVI por parcela (AppEEARS o HLS) para ver meses con campo desnudo.

**Solo como visión**
- Reparto de agua a nivel de comunidad o junta de usuarios.
- Modelo de negocio.

## 7. Evaluación

### Rúbrica local (Arequipa), 1 a 4 por criterio

| Criterio | Qué da el 4 | Cómo lo cubrimos |
| --- | --- | --- |
| Impacto | Problema relevante con indicadores | m³ de agua ahorrados por hectárea entre rotaciones |
| Creatividad | Idea novedosa con componentes propios | Motor de puntaje y restricción de agua compartida |
| Validez | Probado en entorno real | Comparación con SENAMHI, revisión de un agrónomo |
| Pertinencia | Útil y resuelve el reto | Tres rotaciones, datos NASA, suelo, cultivo, prioridades |
| Presentación | Propósito e importancia claros | Reto, solución, por qué importa |
| Diversidad | Equipo multidisciplinario que usa sus fortalezas | Decir qué aportó cada integrante |

### Premios globales a los que apunta

Impacto Local, Mejor Uso de los Datos, Mejor Uso de la Ciencia.

### Entrega global (sin verificar en la página oficial; confirmar en la guía de participantes)

- Demo: video de hasta 30 segundos o hasta 7 diapositivas.
- Repositorio público con el código.
- Declarar qué datos de la NASA y de agencias socias se usaron.
- Declarar el uso de IA, si lo hubo.
- Todos los enlaces públicos y funcionando.

## 8. Fechas

- 14 y 15 de noviembre de 2026: hackathon, presencial en la UCSM.
- 16 de noviembre: evaluación local.
- 17 al 23 de noviembre: selección de nominados globales.
- Enero de 2027: anuncio de ganadores globales.

## 9. Pendientes abiertos

- Leer la pestaña Resources del reto.
- Completar la tabla de cultivos con fuente por cada dato.
- Conseguir el agua asignada por hectárea en Majes y el sistema de riego predominante.
- Elegir la estación del SENAMHI para validar.
- Validar las tres rotaciones con alguien de agronomía.
