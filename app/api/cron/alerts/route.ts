import { connection } from "next/server";
import { allSubscriptions, buildAlert, deleteSubscription, fetchClimate, pushConfigured, sendPush, storageConfigured } from "@/lib/push-server";
import type { ClimateResponse } from "@/lib/contract";

/** Cron diario (vercel.json): revisa cada parcela suscrita y avisa solo si hay riesgo o cosecha cerca. */
export async function GET(req: Request) {
  await connection(); // siempre en tiempo de ejecución, nunca prerenderizado
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!pushConfigured() || !storageConfigured()) return Response.json({ ok: false, reason: "not-configured" });

  const origin = new URL(req.url).origin;
  const climateCache = new Map<string, ClimateResponse>();
  let checked = 0;
  let sent = 0;
  let removed = 0;

  for await (const sub of allSubscriptions()) {
    checked++;
    const key = `${sub.lat.toFixed(2)},${sub.lon.toFixed(2)}`;
    let climate = climateCache.get(key);
    if (!climate) {
      climate = await fetchClimate(origin, sub.lat, sub.lon);
      climateCache.set(key, climate);
    }
    const msg = buildAlert(sub, climate);
    if (!msg) continue;
    try {
      await sendPush(sub.subscription, msg);
      sent++;
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await deleteSubscription(sub.subscription.endpoint); // suscripción vencida
        removed++;
      }
    }
  }
  return Response.json({ ok: true, checked, sent, removed });
}
