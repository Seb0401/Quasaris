/**
 * Script en línea que el navegador ejecuta al leer el HTML, antes de pintar.
 * En el servidor es text/javascript; en el cliente text/plain, así React no lo trata como script
 * (si no, avisa "Encountered a script tag while rendering React component"). La diferencia de type
 * la cubre suppressHydrationWarning. Patrón de node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md
 */
export function InlineScript({ html }: { html: string }) {
  return <script type={typeof window === "undefined" ? "text/javascript" : "text/plain"} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: html }} />;
}
