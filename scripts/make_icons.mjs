// Genera los íconos de la PWA a partir del logo de Quasaris (public/brand/quasaris-mark.svg).
// Uso: node scripts/make_icons.mjs
import sharp from "sharp";
import { mkdirSync, readFileSync } from "node:fs";

const mark = readFileSync("public/brand/quasaris-mark.svg", "utf8")
  .replace(/^<svg[^>]*>/, "")
  .replace(/<\/svg>\s*$/, "");

// fondo azul noche con el logo centrado; "maskable" deja margen seguro para recortes circulares
const icon = (scale, radius) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="bg" cx="30%" cy="20%" r="90%">
      <stop offset="0" stop-color="#123c5a"/>
      <stop offset="1" stop-color="#071b2f"/>
    </radialGradient>
  </defs>
  <rect width="512" height="512" rx="${radius}" fill="url(#bg)"/>
  <g transform="translate(256 256) scale(${scale}) translate(-32 -32)">${mark}</g>
</svg>`;

mkdirSync("public/icons", { recursive: true });
await sharp(Buffer.from(icon(6.2, 112))).resize(192).png().toFile("public/icons/icon-192.png");
await sharp(Buffer.from(icon(6.2, 112))).resize(512).png().toFile("public/icons/icon-512.png");
await sharp(Buffer.from(icon(4.6, 0))).resize(512).png().toFile("public/icons/maskable-512.png");
await sharp(Buffer.from(icon(6.2, 0))).resize(180).png().toFile("app/apple-icon.png");
await sharp(Buffer.from(icon(6.6, 96))).resize(64).png().toFile("app/icon.png");
console.log("íconos OK");
