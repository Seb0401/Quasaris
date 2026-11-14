import { ComingSoon } from "@/components/coming-soon";

export default function Page({ params }: { params: Promise<{ locale: string }> }) {
  return <ComingSoon params={params} section="aprende" owner="Flujo D" />;
}
