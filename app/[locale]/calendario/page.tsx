import { ComingSoon } from "@/components/coming-soon";

export default function Page({ params }: PageProps<"/[locale]/calendario">) {
  return <ComingSoon params={params} section="calendario" icon="📅" owner="Flujo C · agente C2" />;
}
