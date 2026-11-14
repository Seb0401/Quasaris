import { ComingSoon } from "@/components/coming-soon";

export default function Page({ params }: { params: Promise<{ locale: string }> }) {
  return <ComingSoon params={params} section="asistente" owner="Flujo C · agente C1" />;
}
