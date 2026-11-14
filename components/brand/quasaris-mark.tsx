import { useId, type SVGProps } from "react";

/**
 * Logo de Quasaris: una "Q" formada por un campo con surcos (la chacra vista desde arriba)
 * y una órbita que termina en un satélite, que es la cola de la Q. Del espacio al suelo.
 */
export function QuasarisMark({ className = "", ...props }: SVGProps<SVGSVGElement>) {
  // IDs únicos: si el logo aparece varias veces (o una copia está oculta), los degradados siguen funcionando
  const uid = useId().replace(/:/g, "");
  const field = `qm-field-${uid}`;
  const orbit = `qm-orbit-${uid}`;
  const clip = `qm-clip-${uid}`;
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" role="img" aria-label="Quasaris" {...props}>
      <defs>
        <linearGradient id={field} x1="16" y1="50" x2="46" y2="14" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2f9a5c" />
          <stop offset="1" stopColor="#9fd86b" />
        </linearGradient>
        <linearGradient id={orbit} x1="6" y1="40" x2="58" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5bd5ff" />
          <stop offset="1" stopColor="#2b6cb0" />
        </linearGradient>
        <clipPath id={clip}>
          <circle cx="30" cy="30" r="19" />
        </clipPath>
      </defs>
      {/* órbita detrás del campo */}
      <path d="M8.5 38.5C4.6 32.2 15 21.8 31.5 16.4S58 12.6 58.6 19.6" stroke={`url(#${orbit})`} strokeWidth="2.6" strokeLinecap="round" opacity=".55" />
      {/* campo con surcos */}
      <circle cx="30" cy="30" r="19" fill={`url(#${field})`} />
      <g clipPath={`url(#${clip})`} stroke="#f3fbe9" strokeWidth="2.2" strokeLinecap="round" opacity=".9">
        <path d="M8 27c8-5 18-6 28-3s16 2 20-1" />
        <path d="M8 35c8-5 18-6 28-3s16 2 20-1" />
        <path d="M8 43c8-5 18-6 28-3s16 2 20-1" />
      </g>
      <circle cx="30" cy="30" r="19" stroke="#0a2b42" strokeOpacity=".12" strokeWidth="1.5" />
      {/* órbita al frente: forma la cola de la Q */}
      <path d="M58.6 19.6c.6 7-10.4 17.6-24.6 22.6" stroke={`url(#${orbit})`} strokeWidth="3" strokeLinecap="round" />
      {/* satélite */}
      <g transform="translate(46.5 46.5) rotate(45)">
        <rect x="-3.2" y="-3.2" width="6.4" height="6.4" rx="1.4" fill="#e8f6ff" stroke="#0a2b42" strokeWidth="1.2" />
        <rect x="-9.5" y="-1.6" width="5" height="3.2" rx=".8" fill="#5bd5ff" />
        <rect x="4.5" y="-1.6" width="5" height="3.2" rx=".8" fill="#5bd5ff" />
      </g>
    </svg>
  );
}
