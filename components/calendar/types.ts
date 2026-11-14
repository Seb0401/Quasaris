import type { Irrigation, RotationCrop, SoilTexture } from "@/lib/contract";

/** Perfil que se envía al servidor de alertas (sin datos personales: solo la parcela y sus cultivos). */
export type AlertProfileClient = {
  lat: number;
  lon: number;
  crops: RotationCrop[];
  irrigation: Irrigation;
  soilTexture: SoilTexture;
};
