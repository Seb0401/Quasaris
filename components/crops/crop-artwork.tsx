import Image from "next/image";
import { CropIcon } from "@/components/icons/farm-icons";
import { cropArtworkPath } from "@/lib/crop-artwork";
import type { Rotation } from "@/lib/contract";

/** Decorative artwork: the surrounding control or label supplies its accessible name. */
export function CropArtwork({ crop, size = 64, className = "" }: { crop: string | null; size?: number; className?: string }) {
  const src = crop && cropArtworkPath(crop);
  return (
    <span className={className} aria-hidden="true" style={{ position: "relative", display: "inline-flex", width: size, height: size, flexShrink: 0, alignItems: "center", justifyContent: "center", verticalAlign: "middle" }}>
      {src ? <Image src={src} alt="" width={256} height={256} unoptimized loading="lazy" draggable={false} style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <CropIcon crop={crop} size={size} />}
      {src && <span className="ai-mark" title="AI-generated crop illustration" style={{ right: 0, bottom: 0, padding: "1px 3px", fontSize: 7, borderRadius: 3 }}>AI</span>}
    </span>
  );
}

export function RotationArtwork({ rotation, size = 42 }: { rotation?: Rotation; size?: number }) {
  const crops = [...new Set(rotation?.crops.map((c) => c.cropId) ?? [])];
  if (!crops.length) return <CropArtwork crop={null} size={size} />;
  return <span className="inline-flex items-center" aria-hidden="true">{crops.map((id) => <CropArtwork key={id} crop={id} size={size} />)}</span>;
}
