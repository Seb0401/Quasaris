import type { PushSubscription } from "web-push";
import { buildAlert, fetchClimate, pushConfigured, sendPush, type AlertProfile } from "@/lib/push-server";

/** Envía de inmediato la alerta de esta semana a la suscripción dada (botón "Probar alerta"). */
export async function POST(req: Request) {
  if (!pushConfigured()) return Response.json({ error: "push-not-configured" }, { status: 503 });
  const { subscription, profile } = (await req.json()) as { subscription: PushSubscription; profile: AlertProfile };
  if (!subscription?.endpoint || !profile?.crops) return Response.json({ error: "bad-request" }, { status: 400 });

  const climate = await fetchClimate(new URL(req.url).origin, profile.lat, profile.lon);
  const msg = buildAlert(profile, climate, true)!;
  try {
    await sendPush(subscription, msg);
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode ?? 502;
    return Response.json({ error: "push-failed", status }, { status: 502 });
  }
  return Response.json({ ok: true, message: msg });
}
