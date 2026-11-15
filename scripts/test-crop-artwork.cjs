/* eslint-disable @typescript-eslint/no-require-imports -- Verify shipped image files. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");
const root = path.resolve(__dirname, "..");
const ids = Object.keys(require("../data/crops.json").crops);
Promise.all(ids.map(async (id) => {
  const file = path.join(root, "public/images/crops", `${id}.webp`);
  const meta = await sharp(file).metadata();
  assert.equal(meta.format, "webp", id);
  assert.equal(meta.width, 256, id);
  assert.equal(meta.height, 256, id);
  assert.ok(meta.hasAlpha, `${id}: preserve transparency`);
  return fs.statSync(file).size;
})).then((sizes) => {
  const total = sizes.reduce((a, b) => a + b, 0);
  assert.ok(total < 2 * 1024 * 1024, "Keep mobile catalog under 2 MiB");
  console.log(`${ids.length} transparent crop illustrations verified; ${Math.round(total / 1024)} KiB total.`);
}).catch((error) => { console.error(error); process.exitCode = 1; });
