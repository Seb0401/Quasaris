import "server-only";
import { sendNotification, setVapidDetails, type PushSubscription } from "web-push";
import { del, get, list, put } from "@vercel/blob";
import type { ClimateResponse, Irrigation, Locale, RotationCrop, SoilTexture } from "@/lib/contract";
import { cropName, weekOutlook } from "@/lib/crop-calendar";
import { getMessages, translate } from "@/lib/i18n";

export type AlertProfile = {
  lat: number;
  lon: number;
  crops: RotationCrop[];
  irrigation: Irrigation;
  soilTexture: SoilTexture;
  locale: Locale;
};

export type StoredSubscription = AlertProfile & { subscription: PushSubscription; createdAt: string };

export type AlertMessage = { title: string; body: string; url: string; urgent: boolean };

const RISK_THRESHOLD = 0.3;
const PREFIX = "push-subscriptions/";

// ---------- configuración ----------

export function pushConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

export function storageConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
}

let vapidReady = false;
function ensureVapid() {
  if (vapidReady) return;
  setVapidDetails(
    process.env.VAPID_SUBJECT ?? "https://quasaris-farmtwin.vercel.app",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  vapidReady = true;
}

// ---------- mensaje ----------

export async function fetchClimate(origin: string, lat: number, lon: number): Promise<ClimateResponse> {
  const res = await fetch(`${origin}/api/py/climate?lat=${lat}&lon=${lon}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`climate ${res.status}`);
  return res.json();
}

/** Arma la alerta de la semana. `force` devuelve un mensaje aunque no haya riesgo (para la prueba). */
export function buildAlert(profile: AlertProfile, climate: ClimateResponse, force = false): AlertMessage | null {
  const m = getMessages(profile.locale);
  const t = (k: string, p?: Record<string, string | number>) => translate(m, k, p);
  const n = new Intl.NumberFormat(profile.locale, { maximumFractionDigits: 0 });
  const pct = new Intl.NumberFormat(profile.locale, { style: "percent", maximumFractionDigits: 0 });
  const o = weekOutlook(profile.crops, climate.weeks, profile.irrigation, profile.soilTexture);
  const url = `/${profile.locale}/calendario`;

  const frost = o.active.find((c) => c.frostSensitive && c.pFrost >= RISK_THRESHOLD);
  if (frost) {
    return {
      title: t("alerts.frostTitle", { crop: cropName(frost.cropId, profile.locale) }),
      body: t("alerts.frostBody", { p: pct.format(frost.pFrost), stage: t(`calendario.stage.${frost.stage}`) }),
      url,
      urgent: true,
    };
  }
  const heat = o.active.find((c) => c.heatSensitive && c.pHeat >= RISK_THRESHOLD);
  if (heat) {
    return {
      title: t("alerts.heatTitle", { crop: cropName(heat.cropId, profile.locale) }),
      body: t("alerts.heatBody", { p: pct.format(heat.pHeat), stage: t(`calendario.stage.${heat.stage}`) }),
      url,
      urgent: true,
    };
  }
  const harvest = o.active.find((c) => c.daysToHarvest !== null && c.daysToHarvest <= 7);
  if (harvest) {
    return { title: t("alerts.harvestTitle", { crop: cropName(harvest.cropId, profile.locale) }), body: t("alerts.harvestBody", { days: harvest.daysToHarvest! }), url, urgent: false };
  }
  if (!force) return null;
  if (o.active.length === 0) return { title: t("alerts.bareTitle"), body: t("alerts.bareBody"), url, urgent: false };
  const names = o.active.map((c) => cropName(c.cropId, profile.locale)).join(", ");
  return {
    title: t("alerts.waterTitle", { crops: names }),
    body: t("alerts.waterBody", { m3: n.format(o.waterM3ha), et0: o.et0Mm.toFixed(1) }),
    url,
    urgent: false,
  };
}

export async function sendPush(subscription: PushSubscription, msg: AlertMessage) {
  ensureVapid();
  return sendNotification(subscription, JSON.stringify(msg), { TTL: 60 * 60 * 24, urgency: msg.urgent ? "high" : "normal" });
}

// ---------- almacenamiento (Vercel Blob, privado) ----------

async function keyFor(endpoint: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(endpoint));
  return PREFIX + Buffer.from(digest).toString("hex").slice(0, 32) + ".json";
}

export async function saveSubscription(s: StoredSubscription) {
  await put(await keyFor(s.subscription.endpoint), JSON.stringify(s), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

export async function deleteSubscription(endpoint: string) {
  await del(await keyFor(endpoint));
}

export async function* allSubscriptions(): AsyncGenerator<StoredSubscription> {
  let cursor: string | undefined;
  do {
    const page = await list({ prefix: PREFIX, cursor });
    for (const b of page.blobs) {
      const res = await get(b.pathname, { access: "private", useCache: false });
      if (res?.statusCode === 200) yield JSON.parse(await new Response(res.stream).text()) as StoredSubscription;
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
}
