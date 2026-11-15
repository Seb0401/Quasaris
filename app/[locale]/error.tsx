"use client"; // los límites de error deben ser componentes de cliente

import { useEffect, useRef } from "react";
import { RotateCcw, Satellite } from "lucide-react";

/**
 * Red de seguridad: si una pantalla falla al dibujarse, se reintenta sola una vez
 * y, si vuelve a fallar, se muestra un aviso propio con un botón para reintentar.
 */
export default function LocaleError({ error, retry }: { error: unknown; retry: () => void }) {
  const tried = useRef(false);

  useEffect(() => {
    console.error("[FarmTwin]", error);
    if (tried.current) return;
    tried.current = true;
    const timer = setTimeout(retry, 150);
    return () => clearTimeout(timer);
  }, [error, retry]);

  return (
    <div className="ui-page">
      <section className="ui-panel soon-panel" role="alert">
        <div className="soon-orbit" aria-hidden>
          <span><Satellite size={30} /></span>
        </div>
        <h2>Recuperando la señal… · Reconnecting…</h2>
        <p>Esta pantalla tuvo un problema al cargar. · This screen had a problem loading.</p>
        <button type="button" className="ui-btn" onClick={() => retry()}>
          <RotateCcw size={16} /> Reintentar · Retry
        </button>
      </section>
    </div>
  );
}
