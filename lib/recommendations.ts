/**
 * Recomendaciones personalizadas de abonos, microorganismos y dispositivos.
 * Se arman con reglas agronómicas generales a partir de: textura del suelo, sistema de riego,
 * zona (altitud SRTM y humedad natural del suelo de NASA POWER), meses de riesgo del motor y
 * los datos de cada cultivo (data/crops.json: nitrógeno, fósforo, potasio, plagas y enfermedades).
 * Son orientativas: cada tarjeta lo dice y remite a un agrónomo y a productos registrados en SENASA.
 */
import type { Irrigation, Locale, Rotation, RotationResult, SimulateResponse, SoilTexture } from "@/lib/contract";
import { CROPS, cropName, efficiency } from "@/lib/crop-calendar";
import { agronomy, evaluateGroup } from "@/lib/grouping";

export type RecIcon = "nitrogen" | "soil" | "phosphorus" | "potassium" | "salt" | "microbe" | "shield" | "bug" | "meter" | "sensor" | "drip" | "frost" | "trap" | "inject";
export type Rec = { id: string; icon: RecIcon; title: string; why: string; how?: string; priority: "high" | "medium" };
export type ZoneKind = "coast" | "valley" | "highland";
export type FieldProfile = { zone: ZoneKind; elevationM: number | null; arid: boolean | null; frostRisk: boolean; heatRisk: boolean; soil: SoilTexture; irrigation: Irrigation };
export type Recommendations = { profile: FieldProfile; nitrogen: { demandKg: number; fixedKg: number; balanceKg: number }; fertilizers: Rec[]; microbes: Rec[]; devices: Rec[] };

type Input = { soil: SoilTexture; irrigation: Irrigation; rotation: Rotation; result?: RotationResult; sim?: SimulateResponse | null; locale: Locale };

const GRASSES = new Set(["graminea"]);
const SOILBORNE = new Set(["rootRot", "whiteRot"]);
const FOLIAR = new Set(["lateBlight", "powderyMildew", "downyMildew", "leafBlight", "chocolateSpot", "rust"]);
const BEAUVERIA = new Set(["andeanWeevil", "whitefly", "aphid", "thrips"]);
const BT = new Set(["armyworm", "cutworm", "tomatoMoth", "quinoaMoth"]);

export function buildRecommendations({ soil, irrigation, rotation, result, sim, locale }: Input, pestName: (id: string) => string): Recommendations {
  const es = locale === "es";
  const name = (id: string) => cropName(id, locale);
  const list = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} ${es ? "y" : "and"} ${xs.at(-1)}`);
  const n = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });

  const ids = [...new Set(rotation.crops.map((c) => c.cropId))].filter((id) => CROPS[id]);
  const ag = ids.map((id) => ({ id, a: agronomy(id), c: CROPS[id] })).filter((x) => x.a);
  const pests = new Set(ag.flatMap((x) => x.a!.pests));
  const diseases = new Set(ag.flatMap((x) => x.a!.diseases));
  const withPest = (set: Set<string>) => ag.filter((x) => x.a!.pests.some((p) => set.has(p)) || x.a!.diseases.some((d) => set.has(d))).map((x) => x.id);

  // ---------------------------------------------------------------- perfil de la parcela
  const elevationM = sim?.source.elevationM ?? null;
  const wet = sim?.source.rootZoneWetness;
  const arid = wet?.length ? wet.reduce((a, b) => a + b, 0) / wet.length < 0.4 : null;
  const zone: ZoneKind = elevationM === null || elevationM < 2000 ? "coast" : elevationM < 3500 ? "valley" : "highland";
  const climateMonths = result?.months.filter((m) => m === "climate_risk").length ?? 0;
  const frostDays = result?.byYear.reduce((a, y) => a + y.frostDays, 0) ?? 0;
  const heatDays = result?.byYear.reduce((a, y) => a + y.heatDays, 0) ?? 0;
  const frostRisk = frostDays > 0 || (elevationM !== null && elevationM >= 3300);
  const heatRisk = heatDays > 0 && climateMonths > 0;
  const profile: FieldProfile = { zone, elevationM, arid, frostRisk, heatRisk, soil, irrigation };

  // ---------------------------------------------------------------- abonos
  const nitrogen = evaluateGroup(rotation.crops, "rotation", name).nitrogen;
  const fertilizers: Rec[] = [];
  const demanding = ag.filter((x) => !x.c.fixesNitrogen && x.a!.nDemandKg > 0).sort((a, b) => b.a!.nDemandKg - a.a!.nDemandKg);
  const legumes = ag.filter((x) => x.c.fixesNitrogen);
  if (nitrogen.balanceKg < 0) {
    fertilizers.push({
      id: "n-deficit", icon: "nitrogen", priority: "high",
      title: es ? `Tu rotación necesita unos ${n.format(-nitrogen.balanceKg)} kg de nitrógeno por hectárea` : `Your rotation needs about ${n.format(-nitrogen.balanceKg)} kg of nitrogen per hectare`,
      why: es
        ? `${list(demanding.map((x) => `${name(x.id)} pide ~${n.format(x.a!.nDemandKg)} kg`))}${legumes.length ? `; ${list(legumes.map((x) => name(x.id)))} aporta ~${n.format(nitrogen.fixedKg)} kg del aire` : ""}.`
        : `${list(demanding.map((x) => `${name(x.id)} needs ~${n.format(x.a!.nDemandKg)} kg`))}${legumes.length ? `; ${list(legumes.map((x) => name(x.id)))} adds ~${n.format(nitrogen.fixedKg)} kg from the air` : ""}.`,
      how: soil === "arenoso"
        ? (es ? "Divídelo en 3 o 4 aplicaciones durante el ciclo: en suelo arenoso el nitrógeno se lava con el riego." : "Split it into 3 or 4 applications during the cycle: in sandy soil nitrogen is washed out by irrigation.")
        : (es ? "Divídelo en 2 aplicaciones: a la siembra y al inicio del crecimiento fuerte." : "Split it into 2 applications: at sowing and at the start of strong growth."),
    });
  } else if (ag.length) {
    fertilizers.push({
      id: "n-ok", icon: "nitrogen", priority: "medium",
      title: es ? "Las leguminosas cubren el nitrógeno de tu rotación" : "Legumes cover your rotation's nitrogen",
      why: es ? `${list(legumes.map((x) => name(x.id)))} fija ~${n.format(nitrogen.fixedKg)} kg/ha del aire frente a ~${n.format(nitrogen.demandKg)} kg/ha que pide la rotación.` : `${list(legumes.map((x) => name(x.id)))} fixes ~${n.format(nitrogen.fixedKg)} kg/ha from the air against ~${n.format(nitrogen.demandKg)} kg/ha the rotation needs.`,
      how: es ? "Solo un abonado ligero de arranque si el análisis de suelo lo pide." : "Only a light starter dose if a soil test calls for it.",
    });
  }
  const soilRec: Record<SoilTexture, Rec> = {
    arenoso: {
      id: "om-sandy", icon: "soil", priority: "high",
      title: es ? "Agrega materia orgánica: compost, estiércol descompuesto o guano de isla" : "Add organic matter: compost, well-rotted manure or guano",
      why: es ? "Tu suelo es arenoso: retiene poca agua y pocos nutrientes." : "Your soil is sandy: it holds little water and few nutrients.",
      how: es ? "Incorpóralo antes de sembrar; sube la retención de agua y alimenta la vida del suelo. El guano de isla (AGRO RURAL) aporta nitrógeno y fósforo." : "Work it in before sowing; it raises water retention and feeds soil life. Seabird guano adds nitrogen and phosphorus.",
    },
    franco: {
      id: "om-loam", icon: "soil", priority: "medium",
      title: es ? "Mantén la materia orgánica con rastrojos y compost" : "Keep organic matter up with crop residues and compost",
      why: es ? "Tu suelo franco es equilibrado; el reto es no perder su materia orgánica." : "Your loam soil is balanced; the challenge is not losing its organic matter.",
      how: es ? "Deja los rastrojos en el campo y aplica compost una vez por campaña." : "Leave crop residues in the field and apply compost once per season.",
    },
    arcilloso: {
      id: "om-clay", icon: "soil", priority: "high",
      title: es ? "Mejora la aireación con materia orgánica y no encharques" : "Improve aeration with organic matter and avoid waterlogging",
      why: es ? "Tu suelo es arcilloso: retiene agua y se compacta; las raíces se asfixian si se encharca." : "Your soil is clay: it holds water and compacts; roots suffocate when it waterlogs.",
      how: es ? "Incorpora compost, evita trabajar el suelo mojado y aplica el fósforo cerca de la raíz (la arcilla lo retiene)." : "Work in compost, avoid tilling wet soil and place phosphorus near the root (clay locks it up).",
    },
  };
  fertilizers.push(soilRec[soil]);
  const highP = ag.filter((x) => x.a!.P === "high").map((x) => name(x.id));
  if (highP.length) {
    fertilizers.push({
      id: "p", icon: "phosphorus", priority: "medium",
      title: es ? `Fósforo a la siembra para ${list(highP)}` : `Phosphorus at sowing for ${list(highP)}`,
      why: es ? "Estos cultivos piden mucho fósforo y casi no se mueve en el suelo." : "These crops need a lot of phosphorus and it barely moves in the soil.",
      how: es ? "Aplícalo localizado, junto a la semilla o el surco (roca fosfórica o guano de isla), no al voleo." : "Place it next to the seed or furrow (rock phosphate or guano), not broadcast.",
    });
  }
  const highK = ag.filter((x) => x.a!.K === "high").map((x) => name(x.id));
  if (highK.length) {
    fertilizers.push({
      id: "k", icon: "potassium", priority: "medium",
      title: es ? `Potasio para ${list(highK)}` : `Potassium for ${list(highK)}`,
      why: es ? "Mejora el llenado, la calidad y la resistencia a enfermedades de estos cultivos." : "It improves filling, quality and disease resistance in these crops.",
      how: arid ? (es ? "Usa sulfato de potasio en lugar de cloruro: en zona árida el cloruro suma sales al suelo." : "Use potassium sulphate instead of chloride: in dry areas chloride adds salt to the soil.") : (es ? "Aplícalo antes de la etapa de mayor crecimiento." : "Apply it before the main growth stage."),
    });
  }
  if (arid) {
    fertilizers.push({
      id: "salt", icon: "salt", priority: "medium",
      title: es ? "Cuida la salinidad del suelo" : "Watch soil salinity",
      why: es ? "Tu zona es árida: casi todo el agua viene del riego y las sales se acumulan." : "Your area is arid: almost all water comes from irrigation and salts build up.",
      how: es ? "Prefiere abonos de baja salinidad y da un riego de lavado de vez en cuando." : "Prefer low-salt fertilisers and give an occasional leaching irrigation.",
    });
  }

  // ---------------------------------------------------------------- microorganismos
  const microbes: Rec[] = [];
  for (const x of legumes) {
    const strain = x.id === "alfalfa" ? "Sinorhizobium (Ensifer) meliloti" : x.id === "frijol" ? (es ? "Rhizobium específico para frijol (R. tropici o R. phaseoli)" : "a bean-specific Rhizobium (R. tropici or R. phaseoli)") : "Rhizobium leguminosarum";
    microbes.push({
      id: `rhizo-${x.id}`, icon: "microbe", priority: "high",
      title: es ? `Inocula la semilla de ${name(x.id)} con ${strain}` : `Inoculate ${name(x.id)} seed with ${strain}`,
      why: es ? `Estas bacterias forman nódulos en la raíz y fijan unos ${n.format(x.a!.nFixKg)} kg de nitrógeno por hectárea.` : `These bacteria form root nodules and fix about ${n.format(x.a!.nFixKg)} kg of nitrogen per hectare.`,
      how: es ? "Mézclalo con la semilla a la sombra, el mismo día de la siembra." : "Mix it with the seed in the shade, on the day of sowing.",
    });
  }
  const grasses = ag.filter((x) => GRASSES.has(x.c.family)).map((x) => name(x.id));
  if (grasses.length) {
    microbes.push({
      id: "azospirillum", icon: "microbe", priority: "medium",
      title: es ? `Azospirillum para ${list(grasses)}` : `Azospirillum for ${list(grasses)}`,
      why: es ? "Estimula más raíces y ayuda a aprovechar mejor el nitrógeno y el agua en gramíneas." : "It stimulates more roots and helps grasses use nitrogen and water better.",
      how: es ? "Se aplica a la semilla o al suelo a la siembra." : "Apply it to the seed or the soil at sowing.",
    });
  }
  if (highP.length || soil === "arenoso") {
    microbes.push({
      id: "mycorrhiza", icon: "microbe", priority: "medium",
      title: es ? "Micorrizas (Rhizophagus irregularis)" : "Mycorrhizae (Rhizophagus irregularis)",
      why: soil === "arenoso"
        ? (es ? "En suelo arenoso extienden la raíz como una red y mejoran la toma de agua y fósforo." : "In sandy soil they extend the root like a net and improve water and phosphorus uptake.")
        : (es ? `Ayudan a ${list(highP)} a tomar el fósforo que la planta sola no alcanza.` : `They help ${list(highP)} take up phosphorus the plant cannot reach alone.`),
      how: es ? "Al trasplante o a la siembra, cerca de la raíz; evita fungicidas fuertes justo después." : "At transplanting or sowing, near the root; avoid strong fungicides right after.",
    });
  }
  const soilborne = withPest(SOILBORNE);
  if (soilborne.length) {
    microbes.push({
      id: "trichoderma", icon: "shield", priority: "high",
      title: es ? `Trichoderma para proteger la raíz de ${list(soilborne.map(name))}` : `Trichoderma to protect ${list(soilborne.map(name))} roots`,
      why: es ? `Ataca hongos del suelo como ${list([...diseases].filter((d) => SOILBORNE.has(d)).map(pestName))}.` : `It fights soil fungi such as ${list([...diseases].filter((d) => SOILBORNE.has(d)).map(pestName))}.`,
      how: es ? "Aplícalo a la semilla o al suelo húmedo antes de sembrar." : "Apply it to the seed or to moist soil before sowing.",
    });
  }
  if (pests.has("nematode")) {
    microbes.push({
      id: "purpureocillium", icon: "shield", priority: "medium",
      title: es ? "Purpureocillium lilacinum contra nematodos" : "Purpureocillium lilacinum against nematodes",
      why: es ? `${list(withPest(new Set(["nematode"])).map(name))} sufre nematodos en la raíz; este hongo los controla.` : `${list(withPest(new Set(["nematode"])).map(name))} suffers root nematodes; this fungus controls them.`,
      how: es ? "Se aplica al suelo antes o durante la siembra; combínalo con rotación." : "Apply it to the soil before or at sowing; combine it with rotation.",
    });
  }
  const bv = [...pests].filter((p) => BEAUVERIA.has(p));
  if (bv.length) {
    microbes.push({
      id: "beauveria", icon: "bug", priority: "medium",
      title: es ? "Beauveria bassiana para plagas de insectos" : "Beauveria bassiana for insect pests",
      why: es ? `Este hongo controla ${list(bv.map(pestName))} sin químicos fuertes.` : `This fungus controls ${list(bv.map(pestName))} without harsh chemicals.`,
      how: es ? "Aplícalo al atardecer, con humedad, cuando aparezcan las primeras plagas." : "Spray it at dusk, with some humidity, when the first pests appear.",
    });
  }
  const bt = [...pests].filter((p) => BT.has(p));
  if (bt.length) {
    microbes.push({
      id: "bt", icon: "bug", priority: "medium",
      title: es ? "Bacillus thuringiensis (Bt) contra larvas" : "Bacillus thuringiensis (Bt) against caterpillars",
      why: es ? `Controla ${list(bt.map(pestName))} y no daña a abejas ni enemigos naturales.` : `It controls ${list(bt.map(pestName))} and does not harm bees or natural enemies.`,
      how: es ? "Aplícalo cuando las larvas son pequeñas, mejor al atardecer." : "Apply it when caterpillars are small, ideally at dusk.",
    });
  }
  const foliar = [...diseases].filter((d) => FOLIAR.has(d));
  if (foliar.length) {
    microbes.push({
      id: "bsubtilis", icon: "shield", priority: "medium",
      title: es ? "Bacillus subtilis como protección preventiva" : "Bacillus subtilis as preventive protection",
      why: es ? `Ayuda a prevenir ${list(foliar.map(pestName))}; es un complemento, no reemplaza el control cuando el ataque ya empezó.` : `It helps prevent ${list(foliar.map(pestName))}; it is a complement and does not replace control once an outbreak starts.`,
      how: es ? "Aplícalo antes de las épocas húmedas o de neblina." : "Apply it before humid or foggy periods.",
    });
  }

  // ---------------------------------------------------------------- dispositivos
  const devices: Rec[] = [];
  devices.push({
    id: "flowmeter", icon: "meter", priority: "high",
    title: es ? "Medidor de agua (caudalímetro) en tu toma de riego" : "Water meter (flow meter) on your irrigation intake",
    why: es ? "Sabrás cuánta agua aplicas de verdad frente a tu asignación; es la base para ahorrar." : "You will know how much water you really apply against your allocation; it is the basis for saving.",
  });
  devices.push({
    id: "moisture", icon: "sensor", priority: soil === "arcilloso" ? "medium" : "high",
    title: es ? "Tensiómetro o sensor de humedad a 20 y 40 cm" : "Tensiometer or soil moisture sensor at 20 and 40 cm",
    why: soil === "arenoso"
      ? (es ? "En suelo arenoso el agua se va rápido: el sensor te dice cuándo regar poco y seguido." : "In sandy soil water drains fast: the sensor tells you when to irrigate little and often.")
      : soil === "arcilloso"
        ? (es ? "En suelo arcilloso te avisa antes de encharcar y asfixiar la raíz." : "In clay soil it warns you before you waterlog and suffocate the roots.")
        : (es ? "Te dice cuándo regar según la humedad real, no a ojo." : "It tells you when to irrigate by real moisture, not by eye."),
  });
  if (irrigation !== "goteo") {
    const save = 1 - efficiency(irrigation, soil) / efficiency("goteo", soil);
    devices.push({
      id: "drip", icon: "drip", priority: "high",
      title: es ? "Kit de riego por goteo" : "Drip irrigation kit",
      why: es ? `Con tu riego actual se pierde más agua; con goteo usarías cerca de un ${Math.round(save * 100)}% menos para el mismo cultivo.` : `Your current irrigation loses more water; with drip you would use about ${Math.round(save * 100)}% less for the same crop.`,
    });
  }
  if (irrigation === "goteo" || nitrogen.balanceKg < 0) {
    devices.push({
      id: "fertigation", icon: "inject", priority: "medium",
      title: es ? "Inyector de fertirriego (tipo Venturi)" : "Fertigation injector (Venturi type)",
      why: es ? "Reparte el abono en pequeñas dosis con el agua de riego: se pierde menos y la planta lo aprovecha mejor." : "It delivers fertiliser in small doses with the irrigation water: less is lost and the plant uses it better.",
    });
  }
  if (frostRisk || heatRisk) {
    devices.push({
      id: "station", icon: "frost", priority: "high",
      title: es ? "Mini estación meteorológica con alarma de helada" : "Mini weather station with frost alarm",
      why: frostRisk
        ? (es ? `En tu parcela hubo ${n.format(frostDays)} días de helada en 21 años${elevationM !== null ? ` (estás a ${n.format(elevationM)} m)` : ""}: la alarma te avisa para regar o cubrir antes.` : `Your field had ${n.format(frostDays)} frost days in 21 years${elevationM !== null ? ` (you are at ${n.format(elevationM)} m)` : ""}: the alarm warns you to irrigate or cover in time.`)
        : (es ? "Hubo días de calor extremo durante el ciclo: la estación te avisa para regar a tiempo." : "There were extreme heat days during the cycle: the station warns you to irrigate in time."),
    });
  }
  if (arid) {
    devices.push({
      id: "ec", icon: "salt", priority: "medium",
      title: es ? "Medidor de salinidad (conductividad eléctrica)" : "Salinity meter (electrical conductivity)",
      why: es ? "En zona árida mide si las sales suben en el suelo o en el agua de riego antes de que dañen el cultivo." : "In dry areas it shows whether salts are rising in the soil or irrigation water before they harm the crop.",
    });
  }
  const yellow = [...pests].filter((p) => ["whitefly", "aphid", "leafminer"].includes(p));
  const blue = [...pests].filter((p) => p === "thrips");
  const pheromone = [...pests].filter((p) => ["tomatoMoth", "quinoaMoth", "armyworm"].includes(p));
  const traps = [
    yellow.length && (es ? `amarillas para ${list(yellow.map(pestName))}` : `yellow for ${list(yellow.map(pestName))}`),
    blue.length && (es ? `azules para ${list(blue.map(pestName))}` : `blue for ${list(blue.map(pestName))}`),
    pheromone.length && (es ? `de feromona para ${list(pheromone.map(pestName))}` : `pheromone traps for ${list(pheromone.map(pestName))}`),
  ].filter(Boolean) as string[];
  if (traps.length) {
    devices.push({
      id: "traps", icon: "trap", priority: "medium",
      title: es ? "Trampas para vigilar plagas" : "Traps to monitor pests",
      why: es ? `Trampas adhesivas ${list(traps)}: ves la plaga a tiempo y aplicas solo cuando hace falta.` : `Sticky traps: ${list(traps)}. You spot the pest early and treat only when needed.`,
    });
  }

  const order = (xs: Rec[]) => xs.sort((a, b) => (a.priority === b.priority ? 0 : a.priority === "high" ? -1 : 1));
  return { profile, nitrogen, fertilizers: order(fertilizers), microbes: order(microbes), devices: order(devices) };
}
