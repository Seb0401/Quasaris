import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "FarmTwin · From Space to Soil",
    short_name: "FarmTwin",
    description: "Simulate crop rotations with NASA data before you plant. / Simula rotaciones de cultivo con datos de la NASA antes de sembrar.",
    start_url: "/en",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f7f4ec",
    theme_color: "#2f6b3a",
    lang: "en",
    categories: ["agriculture", "education", "weather"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
