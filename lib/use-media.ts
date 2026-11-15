"use client";

import { useSyncExternalStore } from "react";

// una suscripción estable por consulta: React no vuelve a suscribirse en cada render
const subs = new Map<string, (cb: () => void) => () => void>();
function subscriber(query: string) {
  let s = subs.get(query);
  if (!s) {
    s = (cb) => {
      const m = window.matchMedia(query);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    };
    subs.set(query, s);
  }
  return s;
}

/** true en pantallas angostas (celular). En el servidor asume escritorio. */
export function useIsMobile(query = "(max-width: 759px)") {
  return useSyncExternalStore(
    subscriber(query),
    () => window.matchMedia(query).matches,
    () => false,
  );
}
