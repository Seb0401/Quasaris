"use client";

import Link from "next/link";
import { ArrowRight, BadgeDollarSign, CheckCircle2, Droplets, Leaf, Lightbulb, ShieldAlert } from "lucide-react";
import { useLocale } from "@/components/i18n-provider";
import { Panel } from "@/components/ui/kit";
import type { Priorities, Rotation, RotationResult } from "@/lib/contract";
import { CROPS, cropName, efficiency } from "@/lib/crop-calendar";
import { useFarm } from "@/lib/farm-store";
import { about, shareOfWater } from "@/lib/plain";

type Row = { rotation: Rotation; result: RotationResult; color: string };
type Action = { title: string; impact: string; href?: string; cta?: string };
type Indicator = { key: keyof Priorities; icon: typeof Droplets; label: string; today: string; actions: Action[] };

/**
 * "Qué puedes hacer para mejorar": acciones concretas para la rotación que siembra hoy, con su efecto estimado.
 * Las cifras salen del resultado del motor y de sus mismas reglas (engine/rotation.py: eficiencia de riego y
 * puntos de salud del suelo), no se inventan.
 */
export function ImprovePlan({ rows, current }: { rows: Row[]; current: Row }) {
  const farm = useFarm();
  const locale = useLocale();
  const es = locale === "es";
  const n = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const monthName = (i: number) => new Intl.DateTimeFormat(locale, { month: "long" }).format(new Date(2025, i, 1));
  const list = (items: string[]) => (items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} ${es ? "y" : "and"} ${items.at(-1)}`);
  const path = (p: string) => `/${locale}/${p}`;

  const cur = current.result;
  const others = rows.filter((r) => r !== current);
  const available = farm.waterAvailableM3ha;
  const crops = current.rotation.crops.map((c) => ({ ...c, info: CROPS[c.cropId] })).filter((c) => c.info);

  // ---------------------------------------------------------------- agua
  const water: Action[] = [];
  if (farm.irrigation !== "goteo") {
    const dripNeed = (cur.water.median * efficiency(farm.irrigation, farm.soilTexture)) / efficiency("goteo", farm.soilTexture);
    const save = cur.water.median - dripNeed;
    if (save > 50) {
      const fitsWithDrip = cur.water.median > available && dripNeed <= available;
      water.push({
        title: es ? "Cambia a riego por goteo" : "Switch to drip irrigation",
        impact: es
          ? `Usarías cerca de ${Math.round((save / cur.water.median) * 100)}% menos agua: pasarías del ${shareOfWater(cur.water.median, available)}% al ${shareOfWater(dripNeed, available)}% de tu agua.${fitsWithDrip ? " Así te alcanzaría." : ""}`
          : `You would use about ${Math.round((save / cur.water.median) * 100)}% less water: from ${shareOfWater(cur.water.median, available)}% to ${shareOfWater(dripNeed, available)}% of your water.${fitsWithDrip ? " Then it would be enough." : ""}`,
        href: path("parcela"), cta: es ? "Cambiar mi riego" : "Change my irrigation",
      });
    }
  }
  if (cur.water.median > available) {
    const share = Math.max(0, Math.min(1, available / cur.water.median));
    water.push({
      title: es ? `Siembra el ${Math.round(share * 100)}% de tu chacra` : `Plant ${Math.round(share * 100)}% of your field`,
      impact: es ? "Con el agua que tienes puedes regar bien esa parte; el resto déjalo en descanso o con un cultivo de cobertura." : "Your water can properly irrigate that share; leave the rest fallow or under a cover crop.",
      href: path("granja"), cta: es ? "Probarlo en la granja" : "Try it on the farm",
    });
  }
  const lessWater = [...others].sort((a, b) => a.result.water.median - b.result.water.median)[0];
  if (lessWater && lessWater.result.water.median < cur.water.median * 0.98) {
    water.push({
      title: es ? `Prueba ${lessWater.rotation.name}` : `Try ${lessWater.rotation.name}`,
      impact: es ? `Usa el ${shareOfWater(lessWater.result.water.median, available)}% de tu agua, en vez del ${shareOfWater(cur.water.median, available)}%.` : `It uses ${shareOfWater(lessWater.result.water.median, available)}% of your water, instead of ${shareOfWater(cur.water.median, available)}%.`,
      href: "#cmp-detail", cta: es ? "Ver su detalle" : "See its detail",
    });
  }

  // ---------------------------------------------------------------- dinero
  const money: Action[] = [];
  const richer = [...others].sort((a, b) => b.result.income.median - a.result.income.median)[0];
  if (richer && richer.result.income.median > cur.income.median * 1.01 + 50) {
    const extraWater = richer.result.water.median - cur.water.median;
    money.push({
      title: es ? `Prueba ${richer.rotation.name}` : `Try ${richer.rotation.name}`,
      impact: es
        ? `Ganarías cerca de S/ ${about(richer.result.income.median - cur.income.median, locale)} más por hectárea al año${extraWater > 50 ? `, pero usa más agua (el ${shareOfWater(richer.result.water.median, available)}% de la tuya)` : ""}.`
        : `You would earn about S/ ${about(richer.result.income.median - cur.income.median, locale)} more per hectare a year${extraWater > 50 ? `, but it uses more water (${shareOfWater(richer.result.water.median, available)}% of yours)` : ""}.`,
      href: "#cmp-detail", cta: es ? "Ver su detalle" : "See its detail",
    });
  }
  if (cur.income.p10 < cur.income.median * 0.9) {
    money.push({
      title: es ? "Prepárate para los años malos" : "Prepare for bad years",
      impact: es ? `En un año malo la ganancia baja a unos S/ ${n.format(cur.income.p10)} por hectárea (normal: S/ ${n.format(cur.income.median)}). Guarda un margen.` : `In a bad year profit drops to about S/ ${n.format(cur.income.p10)} per hectare (normal: S/ ${n.format(cur.income.median)}). Keep a margin.`,
      href: path("tiempo"), cta: es ? "Ver los años malos" : "See the bad years",
    });
  }

  // ---------------------------------------------------------------- suelo (mismas reglas que engine/rotation.py)
  const soil: Action[] = [];
  if (!crops.some((c) => c.info.fixesNitrogen)) {
    soil.push({
      title: es ? "Agrega una leguminosa: haba, frijol o arveja" : "Add a legume: faba bean, bean or pea",
      impact: es ? "Toma nitrógeno del aire, abona el suelo gratis y suma hasta 20 puntos de salud del suelo." : "It takes nitrogen from the air, fertilises the soil for free and adds up to 20 soil health points.",
      href: path("rotaciones"), cta: es ? "Editar mi rotación" : "Edit my rotation",
    });
  }
  const bare = cur.months.map((m, i) => (m === "bare" ? i : -1)).filter((i) => i >= 0);
  if (bare.length) {
    soil.push({
      title: es ? `Cubre el campo en ${list(bare.map(monthName))}` : `Cover the field in ${list(bare.map(monthName))}`,
      impact: es ? `Esos meses el suelo queda desnudo: cada mes resta 5 puntos (${bare.length * 5} en total). Un cultivo de cobertura lo protege de la erosión.` : `In those months the soil is bare: each month costs 5 points (${bare.length * 5} in total). A cover crop protects it from erosion.`,
      href: path("rotaciones"), cta: es ? "Editar mi rotación" : "Edit my rotation",
    });
  }
  const repeated = crops.length > 1 ? crops.map((c, i) => [c, crops[(i + 1) % crops.length]] as const).find(([a, b]) => a.info.family === b.info.family) : undefined;
  if (repeated) {
    soil.push({
      title: es ? `No sigas ${cropName(repeated[0].cropId, locale)} con ${cropName(repeated[1].cropId, locale)}` : `Don't follow ${cropName(repeated[0].cropId, locale)} with ${cropName(repeated[1].cropId, locale)}`,
      impact: es ? "Son de la misma familia: repetirla resta 10 puntos y deja que las plagas pasen de un cultivo al otro." : "They are the same family: repeating it costs 10 points and lets pests jump from one crop to the next.",
      href: path("rotaciones"), cta: es ? "Editar mi rotación" : "Edit my rotation",
    });
  }
  const families = new Set(crops.map((c) => c.info.family)).size;
  if (crops.length > 1 && families < 3) {
    soil.push({
      title: es ? "Usa cultivos de 3 familias distintas" : "Use crops from 3 different families",
      impact: es ? `Hoy tienes ${families}. Alternar familias corta el ciclo de plagas y enfermedades y suma hasta 15 puntos.` : `Today you have ${families}. Alternating families breaks pest and disease cycles and adds up to 15 points.`,
      href: path("agrupaciones"), cta: es ? "Ver qué combina bien" : "See what combines well",
    });
  }

  const healthier = [...others].sort((a, b) => b.result.soil - a.result.soil)[0];
  if (healthier && Math.round(healthier.result.soil * 100) > Math.round(cur.soil * 100)) {
    soil.push({
      title: es ? `Prueba ${healthier.rotation.name}` : `Try ${healthier.rotation.name}`,
      impact: es ? `Deja el suelo más sano: ${Math.round(healthier.result.soil * 100)} de 100 en vez de ${Math.round(cur.soil * 100)}.` : `It leaves the soil healthier: ${Math.round(healthier.result.soil * 100)} out of 100 instead of ${Math.round(cur.soil * 100)}.`,
      href: "#cmp-detail", cta: es ? "Ver su detalle" : "See its detail",
    });
  }

  // ---------------------------------------------------------------- riesgo
  const risk: Action[] = [];
  const stress = cur.months.map((m, i) => (m === "water_stress" ? i : -1)).filter((i) => i >= 0);
  if (stress.length) {
    risk.push({
      title: es ? `Guarda agua para ${list(stress.map(monthName))}` : `Save water for ${list(stress.map(monthName))}`,
      impact: es ? "Esos meses el cultivo pide más agua de la que te toca en un mes normal. Pide más turnos o guarda agua antes." : "In those months the crop asks for more water than you get in a normal month. Ask for extra turns or store water ahead.",
      href: path("tiempo"), cta: es ? "Ver mes a mes" : "See month by month",
    });
  }
  const climate = cur.months.map((m, i) => (m === "climate_risk" ? i : -1)).filter((i) => i >= 0);
  if (climate.length) {
    risk.push({
      title: es ? `Cuidado con ${list(climate.map(monthName))}` : `Watch out in ${list(climate.map(monthName))}`,
      impact: es ? "Esos meses hubo helada o calor fuera de lo que aguanta el cultivo. Mover la fecha de siembra puede evitarlo." : "In those months there was frost or heat beyond what the crop tolerates. Moving the sowing date can avoid it.",
      href: path("rotaciones"), cta: es ? "Cambiar fechas de siembra" : "Change sowing dates",
    });
  }
  const safer = [...others].sort((a, b) => a.result.risk.median - b.result.risk.median)[0];
  if (safer && safer.result.risk.median < cur.risk.median - 0.01) {
    risk.push({
      title: es ? `Prueba ${safer.rotation.name}` : `Try ${safer.rotation.name}`,
      impact: es ? `Perderías cerca del ${Math.round(safer.result.risk.median * 100)}% de la cosecha en un año normal, en vez del ${Math.round(cur.risk.median * 100)}%.` : `You would lose about ${Math.round(safer.result.risk.median * 100)}% of the harvest in a normal year instead of ${Math.round(cur.risk.median * 100)}%.`,
      href: "#cmp-detail", cta: es ? "Ver su detalle" : "See its detail",
    });
  }

  const short = Math.max(0, cur.water.median - available);
  const indicators: Indicator[] = ([
    { key: "water", icon: Droplets, label: es ? "Agua" : "Water", actions: water,
      today: es ? (short > 0 ? `Hoy necesita el ${shareOfWater(cur.water.median, available)}% de tu agua: te falta` : `Hoy usa el ${shareOfWater(cur.water.median, available)}% de tu agua: te alcanza`) : (short > 0 ? `Today it needs ${shareOfWater(cur.water.median, available)}% of your water: you fall short` : `Today it uses ${shareOfWater(cur.water.median, available)}% of your water: you have enough`) },
    { key: "income", icon: BadgeDollarSign, label: es ? "Dinero" : "Money", actions: money,
      today: es ? `Hoy ganas cerca de S/ ${about(cur.income.median, locale)} por hectárea al año` : `Today you earn about S/ ${about(cur.income.median, locale)} per hectare a year` },
    { key: "soil", icon: Leaf, label: es ? "Suelo" : "Soil", actions: soil,
      today: es ? `Hoy la salud del suelo es ${Math.round(cur.soil * 100)} de 100` : `Today soil health is ${Math.round(cur.soil * 100)} out of 100` },
    { key: "risk", icon: ShieldAlert, label: es ? "Riesgo" : "Risk", actions: risk,
      today: es ? `Hoy pierdes cerca del ${Math.round(cur.risk.median * 100)}% de la cosecha en un año normal` : `Today you lose about ${Math.round(cur.risk.median * 100)}% of the harvest in a normal year` },
  ] as Indicator[]).sort((a, b) => farm.priorities[b.key] - farm.priorities[a.key]);

  return (
    <Panel id="cmp-improve" kicker={es ? "QUÉ PUEDES HACER" : "WHAT YOU CAN DO"} icon={Lightbulb} title={es ? `Cómo mejorar tus resultados con ${current.rotation.name}` : `How to improve your results with ${current.rotation.name}`}>
      <p className="ui-hint">{es ? "Acciones concretas para lo que siembras hoy, ordenadas por lo que más te importa. Cada una dice cuánto cambiaría según el simulador." : "Concrete actions for what you grow today, ordered by what matters most to you. Each one says how much it would change according to the simulator."}</p>
      <div className="improve-grid">
        {indicators.map(({ key, icon: Icon, label, today, actions }) => (
          <section key={key} className={`improve-card tone-${key}`}>
            <header>
              <span className="improve-icon"><Icon size={18} /></span>
              <div>
                <b>{label}</b>
                <small>{today}</small>
              </div>
            </header>
            {actions.length ? (
              <ol>
                {actions.slice(0, 3).map((a) => (
                  <li key={a.title}>
                    <strong>{a.title}</strong>
                    <p>{a.impact}</p>
                    {a.href && <Link href={a.href} className="improve-link">{a.cta}<ArrowRight size={13} /></Link>}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="improve-ok"><CheckCircle2 size={15} />{es ? "Ya está en su mejor nivel entre tus opciones." : "Already at its best among your options."}</p>
            )}
          </section>
        ))}
      </div>
      <p className="ui-source">{es ? "Estimaciones del simulador con 21 años de clima real de la NASA. Confírmalas con tu técnico agrario antes de cambiar la campaña." : "Simulator estimates based on 21 years of real NASA climate. Confirm them with your agricultural technician before changing the season."}</p>
    </Panel>
  );
}
