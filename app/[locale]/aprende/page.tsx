import { ComingSoon } from "@/components/coming-soon";

export default function Page({ params }: PageProps<"/[locale]/aprende">) {
  return <ComingSoon params={params} section="aprende" icon="📖" owner="Flujo D" />;
}
