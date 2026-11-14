import type { PushSubscription } from "web-push";
import { deleteSubscription, saveSubscription, storageConfigured, type AlertProfile } from "@/lib/push-server";

/** Guarda la suscripción y el perfil de la parcela para las alertas diarias del cron. */
export async function POST(req: Request) {
  const { subscription, profile } = (await req.json()) as { subscription: PushSubscription; profile: AlertProfile };
  if (!subscription?.endpoint?.startsWith("https://") || !profile?.crops) return Response.json({ error: "bad-request" }, { status: 400 });
  if (!storageConfigured()) return Response.json({ ok: true, stored: false });
  await saveSubscription({
    subscription,
    lat: Number(profile.lat),
    lon: Number(profile.lon),
    crops: profile.crops.slice(0, 6),
    irrigation: profile.irrigation,
    soilTexture: profile.soilTexture,
    locale: profile.locale,
    createdAt: new Date().toISOString(),
  });
  return Response.json({ ok: true, stored: true });
}

export async function DELETE(req: Request) {
  const { endpoint } = (await req.json()) as { endpoint: string };
  if (!endpoint) return Response.json({ error: "bad-request" }, { status: 400 });
  if (storageConfigured()) await deleteSubscription(endpoint);
  return Response.json({ ok: true });
}
