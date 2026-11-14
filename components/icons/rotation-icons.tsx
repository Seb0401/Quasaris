import type { Rotation } from "@/lib/contract";
import { CropIcon, FallowIcon } from "@/components/icons/farm-icons";

/** Los íconos de los cultivos de una rotación, en orden de siembra. */
export function RotationIcons({ rotation, size = 18, className = "" }: { rotation?: Rotation; size?: number; className?: string }) {
  if (!rotation || rotation.crops.length === 0) return <FallowIcon size={size} className={className} />;
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`}>
      {rotation.crops.map((c, i) => (
        <CropIcon key={i} crop={c.cropId} size={size} />
      ))}
    </span>
  );
}
