import { ComingSoon } from "@/components/coming-soon";

export default function Page({ params }: PageProps<"/[locale]/tiempo">) {
  return <ComingSoon params={params} section="tiempo" icon="🕰️" owner="Flujo B · agente B4" />;
}
