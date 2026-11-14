/* eslint-disable @typescript-eslint/no-require-imports -- This test loads the CommonJS output of TypeScript. */
// Exercise the calendar's pure TypeScript helpers without a browser or server.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const file = path.join(root, "lib/crop-calendar.ts");
const source = fs.readFileSync(file, "utf8").replace('"@/data/crops.json"', JSON.stringify(path.join(root, "data/crops.json")));
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
const calendarModule = new Module(file, module);
calendarModule.filename = file;
calendarModule.paths = module.paths;
calendarModule._compile(compiled, file);
const { CROPS, cropOnDay, cropSegments, cycleDays, dayOfYear, weekOutlook } = calendarModule.exports;

for (const cropId of Object.keys(CROPS)) {
  assert.ok(cycleDays(cropId) > 0, cropId);
  assert.ok(cropSegments({ cropId, sowMonth: 12 }).length > 0, cropId);
}
assert.equal(cropSegments({ cropId: "unknown", sowMonth: 1 }).length, 0);
assert.equal(cropSegments({ cropId: "papa", sowMonth: 12 }).length, 2);
assert.ok(cropOnDay({ cropId: "papa", sowMonth: 12 }, 5));
assert.equal(cropOnDay({ cropId: "alfalfa", sowMonth: 4 }, 200).daysToHarvest, null);
assert.equal(dayOfYear(new Date("2024-02-29T17:00:00Z")), 58);
const weeks = Array.from({ length: 52 }, (_, i) => ({ week: i + 1, pFrost: 0, pHeat: 0, et0MeanMm: 4 }));
const duplicate = weekOutlook([{ cropId: "papa", sowMonth: 1 }, { cropId: "papa", sowMonth: 12 }], weeks, "aspersion", "franco", 5);
assert.equal(duplicate.active.length, 2);
assert.notEqual(duplicate.active[0].waterM3ha, duplicate.active[1].waterM3ha);
console.log("Crop calendar checks passed.");
