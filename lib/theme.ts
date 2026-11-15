export const THEME_KEY = "farmtwin.theme";

/**
 * Corre antes de pintar (app/[locale]/layout.tsx): aplica el tema guardado
 * para que la página no parpadee del oscuro al claro al cargar.
 */
export const THEME_SCRIPT = `(function(){try{if(localStorage.getItem("${THEME_KEY}")==="light")document.documentElement.setAttribute("data-theme","light")}catch(e){}})()`;
