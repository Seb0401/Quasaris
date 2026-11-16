// Genera los íconos de la PWA, el favicon y el ícono de Apple a partir del logo de Quasaris
// (public/brand/quasaris-icon.png, la versión a color sobre fondo oscuro).
// Uso: node scripts/make_icons.mjs
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const MARK = "public/brand/quasaris-icon.png";
const NAVY = "#02151F"; // azul noche del logo (fondo del ícono de app oficial)

/**
 * Logo centrado sobre azul noche.
 * share: fracción del lado que ocupa el logo. En el maskable va al 56 % para que el satélite
 * (esquina superior derecha) quede dentro del círculo seguro del 80 % que recorta Android.
 */
async function icon(size, share, radius, out) {
  const inner = Math.round(size * share);
  const mark = await sharp(MARK).resize(inner, inner).png().toBuffer();
  const bg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${radius}" fill="${NAVY}"/></svg>`);
  await sharp(bg).composite([{ input: mark, gravity: "center" }]).png({ compressionLevel: 9 }).toFile(out);
}

mkdirSync("public/icons", { recursive: true });
await icon(192, 0.74, 42, "public/icons/icon-192.png");
await icon(512, 0.74, 112, "public/icons/icon-512.png");
await icon(512, 0.56, 0, "public/icons/maskable-512.png");
await icon(180, 0.76, 0, "app/apple-icon.png");
await icon(64, 0.84, 14, "app/icon.png");
console.log("íconos OK");
