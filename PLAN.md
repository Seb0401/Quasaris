# Plan: Quasaris FarmTwin, PWA

> **From Space to Soil.** Antes de sembrar, mira lo que habría pasado, lo que conviene hoy y lo que viene.

Plan de ejecución para NASA Space Apps Challenge 2026, sede Arequipa. Reto: **Field Shift: Adapting Farms with NASA Data**. Complementa a `CONTEXTO_RETO.md`, que tiene el detalle del reto, los datos y el motor de cálculo. Aquí no se repite: se decide qué construimos, cómo y en qué orden.

---

## 1. La idea en una frase

FarmTwin es un **gemelo digital de la parcela** en el bolsillo del agricultor. Con datos de la NASA le muestra tres cosas sobre cada rotación posible:

| Tiempo | Función | Pregunta que responde |
| --- | --- | --- |
| **Pasado** | 🕰️ **Máquina del tiempo** | "Si hubiera sembrado esta rotación los últimos 20 años, ¿cuánta agua habría gastado, cuánto habría ganado y en qué años me habría ido mal?" |
| **Presente** | 🎙️ **Asistente de campo con IA (voz y foto)** | "Explícame en simple por qué me recomiendas esto." El agricultor habla o toma una foto y recibe la respuesta hablada, en español o inglés. |
| **Futuro** | 📅 **Calendario vivo y alertas** | "¿Cuándo siembro y cuándo debo cuidarme de la helada o el calor?" Llegan notificaciones push según el cultivo y su etapa. |

El simulador de rotaciones de `CONTEXTO_RETO.md` es el **motor** que alimenta las tres funciones. Las tres usan el mismo cálculo, presentado de tres maneras.

### Por qué es innovador (argumentos para el jurado)

1. **Evidencia en vez de promedios.** Casi todas las herramientas dan un solo número ("la papa necesita X m³"). FarmTwin reproduce **cada año real** de clima NASA desde 2005, incluidos El Niño 2016 y 2023 y las heladas fuertes. Así el agricultor ve el riesgo como algo que vivió ("en 2016 esta rotación te habría dejado sin agua en septiembre") y no como un porcentaje abstracto. Además resuelve la incertidumbre que pide el reto: es un rango que se ve, no una nota al pie.
2. **IA que no inventa.** El asistente solo cita números que salieron del motor; las cifras le llegan mediante *tool calling*. Si un dato falta, lo dice y recomienda consultar a un experto local. Responde a la frase del reto: "apoya, no reemplaza".
3. **De herramienta de análisis a compañero de temporada.** La PWA se instala, funciona con mala señal y avisa de forma proactiva. Las herramientas académicas se usan una vez; esta se queda en el celular.
4. **Pensado para el campo.** Funciona por voz, con botones grandes, sin conexión para lo ya calculado y en dos idiomas (ES/EN).

---

## 2. Decisiones tomadas

| Tema | Decisión |
| --- | --- |
| Plataforma | **PWA** instalable, mobile-first (Android de gama baja como referencia) |
| Stack | **Next.js (App Router) + funciones Python en Vercel** para el motor (pyet, pandas) |
| Despliegue | **Vercel** (preview por PR y producción en `main`) |
| Idioma | **Bilingüe ES/EN** con selector visible; español por defecto |
| IA | Claude a través de **Vercel AI Gateway** con AI SDK |
| Zona piloto | Irrigación Majes, Arequipa (lat −16.36, lon −72.19) |
| Equipo | 4 personas con unos 10 agentes, en 4 flujos de trabajo paralelos (sección 8) |

---

## 3. Experiencia de usuario (flujo de la demo)

```
[Inicio] ──► [1. Mi parcela] ──► [2. Mis recursos y prioridades] ──► [3. Comparar rotaciones]
                                                                          │
                       ┌──────────────────────────┬───────────────────────┼───────────────────────┐
                       ▼                          ▼                       ▼                       ▼
              [🕰️ Máquina del tiempo]   [🎙️ Pregúntale a FarmTwin]   [📅 Mi calendario]   [📖 ¿Qué significa?]
```

1. **Mi parcela.** Mapa Leaflet centrado en Majes. Toco mi parcela o uso "📍 Estoy aquí" (GPS). Encima se ve la capa NDVI de NASA GIBS.
2. **Mis recursos.** Agua disponible (m³/ha por campaña), sistema de riego (gravedad, aspersión o goteo), textura del suelo (sugerida por SoilGrids y corregible), rotación actual y deslizadores de prioridad: 💧 agua, 💰 ingreso, 🌱 suelo, ⚠️ riesgo.
3. **Comparar.** Tres tarjetas o más (la actual siempre primero) con agua, ingreso, salud del suelo, riesgo y puntaje. Cada indicador muestra un **rango** (años buenos y malos), no un solo número. Si una rotación supera el agua disponible, se marca **"No viable con tu agua"**.
   Cada tarjeta tiene cinco secciones: *Por qué se sugiere · Evidencia NASA · Beneficios · Qué falta saber · Qué revisar con un experto*.
4. **🕰️ Máquina del tiempo** (sección 4.1).
5. **🎙️ Asistente** (sección 4.2).
6. **📅 Calendario y alertas** (sección 4.3).
7. **📖 ¿Qué significa?** Explicaciones de 2 líneas, con ícono, sobre ET, NDVI, humedad del suelo, balance hídrico, riesgo de helada, y sobre la diferencia entre datos satelitales y mediciones en tierra.

---

## 4. Las tres funciones estrella

### 4.1 🕰️ Máquina del tiempo ("¿Qué habría pasado?")

**Qué ve el agricultor**
- Un **deslizador de años (2005 a 2025)**. Al moverlo cambian al mismo tiempo:
  - el **mapa**: capa NDVI de GIBS en esa fecha (parámetro `TIME` de WMTS);
  - las **tarjetas**: agua, ingreso y riesgo de cada rotación *en ese año*;
  - una **cinta de 12 meses** por rotación, coloreada por mes: 🟩 bien, 🟨 estrés hídrico, 🟥 helada o calor fuera de rango, ⬜ campo desnudo.
- Una **"tira de 20 años"** (mapa de calor años × meses) que muestra de un vistazo qué rotación es más estable.
- **Momentos destacados** generados automáticamente: "2016: el año más seco. La rotación Ingreso habría necesitado +2.300 m³/ha más que el promedio."
- El botón **"▶ Reproducir"** anima los 20 años en unos 15 segundos. Es el momento fuerte del video de 30 s.

**Cómo se calcula**
El motor ya calcula por año para obtener el rango de incertidumbre (paso 10 del motor en `CONTEXTO_RETO.md`). La máquina del tiempo **expone ese cálculo año por año** en vez de resumirlo. Casi no cuesta trabajo extra en el backend.

**Datos:** NASA POWER diario (T2M_MAX, T2M_MIN, ALLSKY_SFC_SW_DWN, RH2M, WS2M, PRECTOTCORR, GWETROOT), MODIS NDVI por GIBS (visual) y, si hay tiempo, la serie MOD13Q1 por AppEEARS para detectar meses de campo desnudo de verdad.

### 4.2 🎙️ Asistente de campo con IA (voz y foto)

**Qué hace**
- 🎤 **Voz:** botón grande "Mantén para hablar". Usa Web Speech API (`SpeechRecognition` con `es-PE` / `en-US`) y responde en voz con `speechSynthesis`. Si el navegador no tiene reconocimiento de voz, hay un campo de texto.
- 💬 Preguntas de ejemplo en botones: "¿Por qué no me conviene seguir con alfalfa?", "¿Qué pasa si me dan menos agua?", "¿Cuándo es peligroso sembrar papa?".
- 📷 **Foto del campo** (opcional): Claude con visión describe lo que ve (campo desnudo, cobertura, etapa aproximada) y lo cruza con la rotación. **No diagnostica plagas ni enfermedades**; ese tipo de preguntas las deriva a un experto.

**Por qué no alucina (punto clave del pitch)**
- AI SDK con **herramientas** que llaman al motor: `simularRotacion`, `consultarAño`, `explicarTermino`, `cambiarPrioridades`.
- El *system prompt* exige que **toda cifra venga de una herramienta**, que cite la fuente ("según NASA POWER 2005 a 2025") y que cierre con "Revísalo con tu técnico agrario", cuando corresponda.
- El asistente puede **mover la interfaz**. Por ejemplo, "¿qué pasa si tengo 20 % menos agua?" ajusta el campo de agua y la comparación se recalcula en pantalla.

**Técnico:** Route Handler de Next.js con `streamText`, el modelo Claude por AI Gateway (por ejemplo, `anthropic/claude-sonnet-5.5`; confirmar el id exacto en el Gateway) y el idioma de la interfaz pasado al prompt.

### 4.3 📅 Calendario vivo y alertas

**Qué ve el agricultor**
- Un calendario anual por rotación con las ventanas de siembra recomendadas, las etapas del cultivo (Kc inicial, medio y final) y las **semanas de riesgo climatológico**. Por ejemplo: "Semanas 26 a 30: 35 % de los años tuvieron helada < 0 °C (NASA POWER)".
- Al activar "🔔 Avísame" (con permiso de notificaciones):
  - **Alertas climatológicas (100 % NASA):** "Tu papa entra a floración. Históricamente, esta semana tiene un riesgo alto de helada."
  - **Alertas de pronóstico (opcional):** un cron diario consulta el pronóstico de 3 días y avisa si viene helada o calor fuera del rango del cultivo. El pronóstico **no es de NASA** (POWER no pronostica): se usa una fuente abierta como Open-Meteo y se declara así en la entrega.

**Técnico:** Web Push con claves VAPID y el service worker de la PWA. Un Vercel Cron diario recorre las suscripciones, que se guardan en una base KV o Redis provista desde el Marketplace de Vercel. En iOS, el push solo funciona si la PWA está instalada en la pantalla de inicio; para la demo se usa Android.

---

## 5. Arquitectura

```
┌───────────────────────── PWA (Next.js, Vercel) ─────────────────────────┐
│  app/[locale]/…  UI: mapa Leaflet + GIBS, tarjetas, máquina del tiempo,  │
│                  calendario, asistente (voz/foto)                         │
│  Service worker: caché offline + recepción de push                        │
│  app/api/chat        → AI SDK + AI Gateway (Claude) + tools               │
│  app/api/push/*      → suscribir / probar notificación                    │
│  app/api/cron/alerts → cron diario de alertas                             │
└──────────────┬──────────────────────────────────────────────────────────┘
               │ JSON (contrato en sección 6)
┌──────────────▼───────────── Funciones Python (Vercel) ────────────────────┐
│  api/py/simulate   → motor: POWER → ET0 (pyet) → ETc → riego → puntajes    │
│  api/py/climate    → climatología: heladas/calor por semana                │
│  engine/  power.py · et0.py · crops.py · rotation.py · score.py            │
│  data/    crops.json · rotations_majes.json · power_cache/*.json           │
└──────────────┬──────────────────────────────────────────────────────────┘
               ▼
   NASA POWER API · NASA GIBS (WMTS) · SoilGrids · (AppEEARS) · (Open-Meteo)
```

**Decisiones técnicas importantes**
- **Caché de POWER en el repo.** Antes de la demo se descargan y versionan 20 años de datos para 5 a 10 puntos de Majes (`data/power_cache/`). En vivo se usa la API real y, si falla o tarda, se cae al caché. **La demo no depende del wifi de la sede.**
- **Offline:** el service worker guarda la interfaz, el último resultado de simulación y los textos de "¿Qué significa?". El asistente y las alertas sí necesitan red.
- **Python y Next en el mismo proyecto de Vercel.** Las funciones Python van en `api/py/` (en la raíz). Hay que verificarlo en el primer despliegue (hora 2). **Plan B:** un segundo proyecto de Vercel solo con FastAPI, llamado desde Next mediante una variable de entorno `ENGINE_URL`.
- **i18n:** `next-intl` con rutas `/es` y `/en`. Los textos de explicación viven en `messages/{es,en}.json`, y los mensajes que genera el motor salen como claves más parámetros, no como texto fijo.
- **PWA:** `manifest.webmanifest`, íconos y un service worker con Serwist (o uno escrito a mano si da problemas con la versión de Next).

### Estructura del repo

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
├─ public/ (manifest.webmanifest, icons/)
├─ scripts/ (fetch_power_cache.py, validate_senamhi.py)
├─ docs/ (DATA_SOURCES.md, AI_USAGE.md, PITCH.md)
├─ CONTEXTO_RETO.md · PLAN.md · README.md · requirements.txt · vercel.ts
```

---

## 6. Contrato entre módulos (se congela en la hora 2)

Es lo que permite que 10 agentes trabajen en paralelo sin pisarse. Vive en `lib/contract.ts` y en `engine/schema.py` (Pydantic) **con los mismos nombres de campos**.

```ts
// POST /api/py/simulate
type SimulateRequest = {
  lat: number; lon: number;
  soilTexture: "arenoso" | "franco" | "arcilloso";
  irrigation: "gravedad" | "aspersion" | "goteo";
  waterAvailableM3ha: number;               // por campaña anual
  priorities: { water: number; income: number; soil: number; risk: number }; // 0..1
  rotations: Rotation[];                    // [actual, ...alternativas]
  years?: [number, number];                 // default [2005, 2025]
  locale: "es" | "en";
};
type Rotation = { id: string; name: string; isCurrent: boolean;
  crops: { cropId: string; sowMonth: number }[] };

type SimulateResponse = {
  source: { power: "live" | "cache"; period: [number, number] };
  rotations: RotationResult[];
};
type RotationResult = {
  id: string; viable: boolean; score: number;            // 0..1
  water:  Stat; income: Stat; soil: number; risk: Stat;  // soil 0..1
  byYear: YearResult[];                                   // ← Máquina del tiempo
  months: MonthStatus[];                                  // 12 meses típicos
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
// GET /api/py/climate?lat&lon  → calendario y alertas
type ClimateResponse = { weeks: { week: number; pFrost: number; pHeat: number;
  et0MeanMm: number }[] };
```

Mientras el motor no esté listo, el frontend trabaja con un **mock** (`data/mock_simulate.json`) que cumple este contrato.

---

## 7. Alcance por prioridad

| Prioridad | Qué | Responsable |
| --- | --- | --- |
| **P0: sin esto no hay demo** | Mapa y selección de parcela · motor POWER→ET0→agua · 3 rotaciones comparadas con rango · deslizadores y agua disponible · "No viable" · PWA instalable · ES/EN · desplegado en Vercel | A + B |
| **P1: lo que nos diferencia** | Máquina del tiempo (deslizador, cinta de meses, tira de 20 años, reproducción) · asistente por texto con herramientas · capa NDVI de GIBS con tiempo · "Qué revisar con un experto" | A + B + C |
| **P2: lo que impresiona** | Voz (hablar y escuchar) · calendario climatológico · push "Avísame" con alerta de prueba · validación POWER frente a SENAMHI · explicaciones "¿Qué significa?" | B + C + D |
| **P3: si sobra tiempo** | Foto del campo con visión · alertas de pronóstico con cron · NDVI por parcela con AppEEARS/HLS (campo desnudo real) · SoilGrids automático | C + A |
| **Solo visión (pitch)** | Junta de usuarios: agua compartida entre parcelas · quechua · conexión con AUTODEMA y SENAMHI | D |

**Regla de corte:** si a la mitad del tiempo el P0 no está desplegado y estable, se congelan P2 y P3 y todos pasan a cerrar P0 y P1.

---

## 8. Equipo: 4 flujos de trabajo y ~10 agentes

Cada persona supervisa uno o varios flujos, revisa los PRs de sus agentes y es la **única que toca su contrato**. Los agentes trabajan en ramas propias (`feat/<flujo>-<tarea>`) o en *worktrees* aislados y entran a `main` mediante PR con preview de Vercel.

| Flujo | Persona | Agentes sugeridos (≈10 en total) | Archivos que le pertenecen |
| --- | --- | --- | --- |
| **A. Motor y datos (Python)** | Persona A | **A1** descarga POWER y caché · **A2** ET0, ETc y riego con tests · **A3** puntaje, suelo, riesgo, `byYear` y textos de "explain" | `engine/`, `api/py/`, `data/`, `scripts/` |
| **B. PWA y visualización** | Persona B | **B1** shell, PWA, i18n y diseño · **B2** mapa con GIBS, selección y GPS · **B3** tarjetas y gráficos de comparación · **B4** máquina del tiempo | `app/[locale]/`, `components/`, `messages/` |
| **C. IA y alertas** | Persona C | **C1** asistente: AI SDK, herramientas, voz y foto · **C2** push, cron y calendario | `app/api/chat`, `app/api/push`, `app/api/cron`, `components/assistant`, `components/calendar` |
| **D. Ciencia, contenido y pitch** | Persona D | Agente de apoyo (puede ser el 10.º o compartido) para tabla de cultivos con fuentes, explicaciones ES/EN, `DATA_SOURCES.md` y `AI_USAGE.md` | `docs/`, `data/crops.json` (en conjunto con A) |

**Primer prompt de cada agente:** "Lee `CONTEXTO_RETO.md`, `PLAN.md` (secciones 5 a 7) y `lib/contract.ts`. Tu tarea es X. Solo modifica estos archivos: Y. Cumple el contrato; si necesitas cambiarlo, detente y avisa."

**Persona D, además:** contacta a un agrónomo (UCSM o INIA) para validar las rotaciones, consigue la estación SENAMHI de referencia (Majes / Pampa de Majes), arma el video y las diapositivas y lleva el control de tiempos.

---

## 9. Cronograma (≈36 h; ajustar a la hora oficial de entrega)

| Bloque | Horas | A. Motor | B. PWA | C. IA y alertas | D. Ciencia y pitch |
| --- | --- | --- | --- | --- | --- |
| **0. Arranque** | 0 a 2 | `engine/` vacío y endpoint "hola" en Vercel | Next + PWA + i18n desplegados | Cuenta de AI Gateway y prueba de `streamText` | Cuenta Earthdata, Resources del reto, agrónomo |
| **1. Contrato** | 2 | **Se congela `contract.ts` y `schema.py` y se crea el mock** (todos) | | | |
| **2. Núcleo** | 2 a 10 | POWER y caché, ET0, agua por rotación | Mapa, formulario, tarjetas con mock | Herramientas del asistente sobre el mock | Tabla de cultivos con fuentes, rotaciones |
| **3. Integración P0** | 10 a 14 | `/simulate` real con `byYear` | Conectar al motor real | Chat por texto en la UI | Explicaciones ES/EN |
| ✅ **Hito P0** | 14 | **Demo de punta a punta desplegada** | | | |
| **4. Diferenciadores** | 14 a 24 | Riesgo, suelo, `highlights`, `/climate` | Máquina del tiempo y NDVI con tiempo | Voz, calendario y push | Validación SENAMHI (gráfico) |
| ✅ **Hito P1** | 24 | **Todo P1 en producción** | | | |
| **5. Pulido y P2/P3** | 24 a 30 | Tests, casos borde, caché completo | Rendimiento, offline, accesibilidad | Foto o cron de pronóstico (si hay tiempo) | Guion, grabación del video |
| **6. Congelado** | 30 a 33 | Solo corrección de errores | Solo corrección de errores | Solo corrección de errores | Diapositivas, README, declaraciones |
| **7. Entrega** | 33 a 36 | Ensayo de la demo ×3 · revisar enlaces públicos · enviar | | | |

---

## 10. Datos usados (para declarar en la entrega)

| Fuente | Agencia | Uso | Prioridad |
| --- | --- | --- | --- |
| NASA POWER (comunidad AG, diaria) | NASA | ET0, heladas, calor, lluvia, GWETROOT, máquina del tiempo, calendario | P0 |
| GIBS: MODIS NDVI (capa con tiempo) | NASA | Mapa y máquina del tiempo (visual) | P1 |
| GIBS: SMAP humedad del suelo (si hay capa) | NASA | Capa de contexto | P2 |
| MODIS MOD13Q1 / HLS vía AppEEARS | NASA / USGS / ESA (Sentinel-2) | Meses de campo desnudo por parcela | P3 |
| SRTM | NASA | Pendiente y erosión | P3 |
| SoilGrids | ISRIC | Textura sugerida | P2 |
| FAO-56 (Kc), MIDAGRI, INIA | FAO / Perú | Cultivos, precios, calendarios | P0 |
| SENAMHI | Perú | Validación de POWER | P2 |
| Open-Meteo (pronóstico) | No es NASA | Alertas de pronóstico | P3 |

Los nombres exactos de capas GIBS (NDVI, SMAP) se confirman en Worldview antes de programarlas.

---

## 11. Cómo cubrimos la rúbrica

| Criterio | Evidencia en FarmTwin |
| --- | --- |
| **Impacto** | m³/ha ahorrados al año entre la rotación actual y la recomendada; meses de campo desnudo evitados; años con pérdida evitados (de la máquina del tiempo) |
| **Creatividad** | Gemelo digital en pasado, presente y futuro · máquina del tiempo con 20 años reales · IA anclada al motor · alertas proactivas |
| **Validez** | POWER frente a SENAMHI (gráfico y error), tests del motor contra ejemplos de FAO-56, revisión de un agrónomo con su nombre en la diapositiva |
| **Pertinencia** | Cubre los cuatro ingredientes del reto (NASA, suelo, cultivo, prioridades), 3 rotaciones o más con la actual, campo desnudo, vulnerabilidad estacional, "qué revisar con un experto" |
| **Presentación** | Video de 30 s centrado en la máquina del tiempo y la voz; narrativa pasado, presente y futuro |
| **Diversidad** | Cada flujo (A a D) tiene dueño visible; se explica qué aportó cada persona y cómo coordinamos los agentes de IA |

Premios globales: **Impacto Local** (Majes y el agua compartida), **Mejor Uso de los Datos** (POWER, GIBS y validación en tierra), **Mejor Uso de la Ciencia** (FAO-56 Penman-Monteith e incertidumbre interanual).

---

## 12. Guion de la demo

**Video de 30 s**
1. (0 a 4 s) Imagen de Majes: "En Majes casi no llueve y el agua es compartida."
2. (4 a 10 s) Toco la parcela y se comparan 3 rotaciones; "Alfalfa actual: 14.000 m³/ha".
3. (10 a 20 s) **▶ Máquina del tiempo:** pasan 20 años, el NDVI cambia y 2016 se pone en rojo.
4. (20 a 27 s) Pregunta por voz: "¿Y si me dan 20 % menos agua?" FarmTwin responde con voz y las tarjetas se recalculan.
5. (27 a 30 s) Llega la notificación "Helada probable esta semana" y aparece el lema *From Space to Soil*.

**7 diapositivas:** 1 Problema · 2 Solución (pasado, presente, futuro) · 3 Datos NASA y ciencia (ET0 y el diagrama del motor) · 4 Demo (capturas o QR) · 5 Validación (SENAMHI y agrónomo) · 6 Impacto (m³ ahorrados) y visión (junta de usuarios) · 7 Equipo y uso de IA.

Las cifras del guion son de ejemplo y se reemplazan por las que dé el motor.

---

## 13. Riesgos y mitigaciones

| Riesgo | Mitigación |
| --- | --- |
| La API de POWER es lenta o el wifi falla en la sede | Caché versionado en `data/power_cache/` con respaldo automático; video grabado con antelación |
| Python dentro del proyecto Next falla en Vercel | Se prueba en la hora 0 a 2; plan B: proyecto FastAPI aparte con `ENGINE_URL` |
| Web Speech no funciona en el dispositivo de la demo | Campo de texto siempre visible; demo en Chrome Android probado de antemano |
| El asistente inventa cifras | Solo usa herramientas, el prompt lo prohíbe y se prueban 10 preguntas trampa antes de la entrega |
| Push en iOS | La demo se hace en Android; en iOS se explica que hay que instalar la PWA |
| Valores de cultivos o precios dudosos | Cada valor lleva su fuente en `crops.json`; la interfaz muestra "dato aproximado, validar" |
| Conflictos entre 10 agentes | Contrato congelado, carpetas con dueño, PRs pequeños, un integrador por flujo |
| Falta de tiempo | Regla de corte de la sección 7; P0 siempre desplegado |

---

## 14. Entregables

- [ ] App en producción en Vercel (URL pública, instalable)
- [ ] Repositorio público `Seb0401/Quasaris` con README (qué es, cómo correrlo, capturas)
- [ ] `docs/DATA_SOURCES.md`: datos NASA y de agencias socias usados
- [ ] `docs/AI_USAGE.md`: uso de IA en el desarrollo (agentes) y en el producto (asistente)
- [ ] Video de ≤ 30 s y/o 7 diapositivas
- [ ] Todos los enlaces públicos y verificados desde una ventana de incógnito

---

## 15. Preguntas abiertas (responder en la hora 0)

1. ¿Cuál es la **hora exacta de entrega** el 15/11? Con eso se ajusta el cronograma.
2. ¿**Quién es A, B, C y D**? (nombre, fortaleza)
3. ¿Hay un **agrónomo** disponible (UCSM o INIA) para validar rotaciones y cifras?
4. ¿Ya tienen **cuenta Earthdata**? (AppEEARS la necesita y puede tardar en procesar)
5. ¿Existe ya un **equipo o proyecto en Vercel** para conectar el repo y activar AI Gateway?
6. ¿Qué **celular Android** se usará para la demo de voz y push?
