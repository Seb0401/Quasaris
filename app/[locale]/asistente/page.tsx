import { ComingSoon } from "@/components/coming-soon";

export default function Page({ params }: PageProps<"/[locale]/asistente">) {
  return <ComingSoon params={params} section="asistente" icon="🎙️" owner="Flujo C · agente C1" />;
}
