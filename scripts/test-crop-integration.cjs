/* eslint-disable @typescript-eslint/no-require-imports -- Execute TS helpers without a browser. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const root = path.resolve(__dirname, "..");
for (const ext of [".ts", ".tsx"]) Module._extensions[ext] = (mod, filename) => {
  const source = fs.readFileSync(filename, "utf8").replace(/(["'])@\/([^"']+)\1/g, (_, quote, target) => JSON.stringify(path.join(root, target)));
  mod._compile(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, filename);
};
const calendar = require("../lib/crop-calendar.ts");
const { PALETTE, buildPalette, cropAt, simulateYear } = require("../lib/granja-sim.ts");
const { buildPlan } = require("../lib/plan.ts");
const { simulateMock } = require("../lib/engine-client.ts");
const { evaluateGroup } = require("../lib/grouping.ts");
const { CROP_ICON } = require("../components/icons/farm-icons.tsx");
const snapshot = require("../data/mock_granja.json");
const { cropOnDay, cropHarvestMonths, cropTiming, cropsIn, CROPS, MONTH_START } = calendar;
const newIds = ["alcachofa", "palta", "uva", "mandarina", "granada"];
assert.equal(Object.keys(CROPS).length, 21);
assert.deepEqual(cropsIn("fruit"), newIds.slice(1));
for (const id of newIds) {
  const preset = PALETTE.find((r) => r.id === `majes_${id}`);
  assert.ok(preset, `${id}: farm preset`);
  assert.equal(typeof CROP_ICON[id], "function", `${id}: icon`);
  const year = simulateYear(snapshot, [preset.id], 1, 2020, 20000, PALETTE);
  assert.ok(year.summary.waterM3 > 0, `${id}: water`);
  assert.ok(Number.isFinite(year.summary.incomePEN), `${id}: income`);
  const harvests = cropHarvestMonths(preset.crops[0]);
  assert.ok(harvests.length > 1, `${id}: harvest window/picking`);
  for (let month = 0; month < 12; month++) {
    assert.equal(year.months[month].harvests.some((h) => h.cropId === id), harvests.includes(month), `${id}: harvest month ${month}`);
  }
  const expectedIncome = snapshot.rotations.find((r) => r.id === preset.id).byYear.find((y) => y.year === 2020).incomePEN;
  assert.ok(Math.abs(year.summary.incomePEN - expectedIncome) < 1, `${id}: repeated picking must not multiply annual income`);
  const custom = { ...preset, id: `custom-${id}`, crops: preset.crops.map((c) => ({ ...c, sowMonth: id === "alcachofa" ? 4 : 9 })) };
  const fallback = simulateMock({ rotations: [custom] }, snapshot);
  assert.equal(fallback.source.power, "mock");
  assert.equal(fallback.rotations[0].id, custom.id, `${id}: custom rotation demo mapping`);
  assert.ok(buildPalette([custom]).some((r) => r.id === custom.id));
  const plan = buildPlan(snapshot, PALETTE, [preset.id], 1, 20000);
  assert.equal(plan.groups[0].rotation.id, preset.id);
  assert.ok(Number.isFinite(evaluateGroup(preset.crops, "rotation", (x) => x).score));
  assert.ok(cropTiming(preset.crops[0], "es"));
  for (const locale of ["es", "en"]) {
    const messages = require(`../messages/${locale}.json`);
    assert.ok(messages.group.category[CROPS[id].category]);
    const agronomy = require("../data/crops.json").crops[id].agronomy;
    agronomy.cares.forEach((key) => assert.ok(messages.group.care[key], `${locale}/${id}: ${key}`));
    [...agronomy.pests, ...agronomy.diseases].forEach((key) => assert.ok(messages.group.pest[key], `${locale}/${id}: ${key}`));
  }
  if (id !== "alcachofa") {
    for (let month = 0; month < 12; month++) {
      const day = cropOnDay(custom.crops[0], MONTH_START[month]);
      assert.equal(day.kc, CROPS[id].monthlyKc[month]);
      assert.equal(day.daysToHarvest === 0, harvests.includes(month));
      assert.equal(cropAt(preset, month).cropId, id);
    }
  }
}
const unsupported = { rotations: [{ id: "changed-existing-id", mode: "rotation", crops: [{ cropId: "papa", sowMonth: 7 }] }] };
assert.equal(simulateMock(unsupported, snapshot).rotations.length, 0, "Never substitute a different calendar's demo results");
async function checkAssistant() {
  const { chatTools, farmSchema } = require("../app/api/chat/tools.ts");
  const farm = farmSchema.parse({ lat: -16.36, lon: -72.19, soilTexture: "arenoso", irrigation: "goteo", waterAvailableM3ha: 20000, priorities: { water: .5, income: .5, soil: .5, risk: .5 }, rotations: PALETTE.filter((r) => newIds.some((id) => r.id === `majes_${id}`)) });
  const originalFetch = global.fetch;
  global.fetch = async () => new Response(JSON.stringify({ ...snapshot, rotations: snapshot.rotations.filter((r) => farm.rotations.some((planned) => planned.id === r.id)) }));
  try {
    const tools = chatTools({ ...farm, locale: "en" }, new AbortController().signal);
    const allCrops = await tools.consultarCultivos.execute({});
    assert.equal(allCrops.crops.length, 21);
    for (const id of newIds) assert.ok(allCrops.crops.some((c) => c.id === id && c.assumptions));
    assert.equal((await tools.consultarCultivos.execute({ cropId: "unknown" })).available, false);
    const tool = tools.simularRotacion;
    const response = await tool.execute({});
    assert.equal(response.rotations.length, 5);
    for (const r of response.rotations) {
      assert.ok(r.crops[0].assumptions.includes("planning assumptions"));
      assert.ok(r.crops[0].timing.includes("harvest"));
      if (r.crops[0].id !== "alcachofa") assert.ok(r.crops[0].assumptions.includes("juvenile"));
    }
  } finally { global.fetch = originalFetch; }
}
checkAssistant().then(() => console.log("21 crops: selectors, bilingual care, harvests, farm, plans, assistant tools and offline preset mapping passed.")).catch((error) => { console.error(error); process.exitCode = 1; });
