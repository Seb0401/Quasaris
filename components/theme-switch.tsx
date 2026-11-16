"use client";

import { useLayoutEffect } from "react";
import { Moon, Sun } from "lucide-react";
import { useLocale } from "@/components/i18n-provider";
import { THEME_KEY } from "@/lib/theme";

/** Botón sol / luna. El tema vive en el atributo data-theme de <html>; el oscuro es el predeterminado. */
export function ThemeSwitch() {
  const es = useLocale() === "es";

  // En desarrollo, Strict Mode remonta <html> y le quita el data-theme que puso el script en línea:
  // se vuelve a aplicar antes de pintar. En producción no cambia nada.
  useLayoutEffect(() => {
    try {
      if (localStorage.getItem(THEME_KEY) === "light") document.documentElement.dataset.theme = "light";
    } catch {
      /* sin almacenamiento */
    }
  }, []);

  const toggle = () => {
    const root = document.documentElement;
    const next = root.dataset.theme === "light" ? "dark" : "light";
    if (next === "light") root.dataset.theme = "light";
    else delete root.dataset.theme;
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* sin almacenamiento: el tema dura hasta recargar */
    }
  };

  return (
    <button type="button" className="theme-switch" onClick={toggle} aria-label={es ? "Cambiar entre tema claro y oscuro" : "Switch between light and dark theme"} title={es ? "Tema claro / oscuro" : "Light / dark theme"}>
      <Sun size={17} className="icon-sun" aria-hidden />
      <Moon size={17} className="icon-moon" aria-hidden />
    </button>
  );
}
