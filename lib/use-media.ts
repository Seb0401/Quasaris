"use client";

import { useSyncExternalStore } from "react";

/** true en pantallas angostas (celular). En el servidor asume escritorio. */
export function useIsMobile(query = "(max-width: 759px)") {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
