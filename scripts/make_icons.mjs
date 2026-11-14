// Genera los íconos PNG de la PWA a partir de un SVG. Uso: node scripts/make_icons.mjs
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const icon = (pad) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="${pad ? 0 : 112}" fill="#2f6b3a"/>
  <g transform="translate(256 256) scale(${pad ? 0.72 : 0.9}) translate(-256 -256)">
    <path d="M56 360 Q256 300 456 360 L456 456 L56 456 Z" fill="#8a5a33"/>
    <path d="M56 392 Q256 340 456 392" stroke="#a87348" stroke-width="10" fill="none"/>
    <path d="M256 360 C256 300 256 260 256 230" stroke="#cfe8b0" stroke-width="16" stroke-linecap="round"/>
    <path d="M256 270 C206 262 180 226 176 186 C222 190 252 222 256 270 Z" fill="#cfe8b0"/>
    <path d="M256 244 C300 236 330 200 334 156 C290 160 258 194 256 244 Z" fill="#e6f4d4"/>
    <circle cx="356" cy="112" r="20" fill="#f7f4ec"/>
    <path d="M330 140 A60 60 0 0 1 384 86" stroke="#f7f4ec" stroke-width="8" fill="none" stroke-linecap="round"/>
    <path d="M308 160 A96 96 0 0 1 404 64" stroke="#f7f4ec" stroke-width="8" fill="none" stroke-linecap="round" opacity=".6"/>
  </g>
</svg>`;

mkdirSync("public/icons", { recursive: true });
await sharp(Buffer.from(icon(false))).resize(192).png().toFile("public/icons/icon-192.png");
await sharp(Buffer.from(icon(false))).resize(512).png().toFile("public/icons/icon-512.png");
await sharp(Buffer.from(icon(true))).resize(512).png().toFile("public/icons/maskable-512.png");
await sharp(Buffer.from(icon(false))).resize(180).png().toFile("app/apple-icon.png");
console.log("íconos OK");
