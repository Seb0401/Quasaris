import Image from "next/image";

/**
 * Logo de Quasaris: una Q con una parcela de lotes en verde y una órbita que termina en un satélite.
 * Del espacio al suelo.
 *
 * Dos versiones según el tema (los colores de la app no cambian):
 * - tema oscuro: el logo original (Q marfil), public/brand/quasaris-icon.webp
 * - tema claro: la misma Q en azul noche con los verdes oscurecidos para que contraste,
 *   public/brand/quasaris-icon-light.webp
 * Fuente: QUASARIS_logos_PNG/06_icon_color_transparent.png (no se versiona, ver docs/BRAND.md).
 */
export function QuasarisMark({ width = 34, height = 34, className = "" }: { width?: number; height?: number; className?: string }) {
  return (
    <span className={`quasaris-mark ${className}`} style={{ width, height }} role="img" aria-label="Quasaris">
      <Image className="quasaris-mark-dark" src="/brand/quasaris-icon.webp" alt="" width={width} height={height} priority />
      <Image className="quasaris-mark-light" src="/brand/quasaris-icon-light.webp" alt="" width={width} height={height} priority />
    </span>
  );
}
