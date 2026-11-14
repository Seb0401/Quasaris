"use client";

import { useSyncExternalStore } from "react";

let now: Date | null = null;
const noop = () => () => {};

/**
 * Fecha actual solo en el cliente (null durante el prerenderizado).
 * Evita errores de hidratación y el aviso de Next sobre `new Date()` en componentes prerenderizados.
 */
export function useToday(): Date | null {
  return useSyncExternalStore(
    noop,
    () => (now ??= new Date()),
    () => null,
  );
}
