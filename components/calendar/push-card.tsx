"use client";

import { useEffect, useState } from "react";
import { useLocale, useT } from "@/components/i18n-provider";
import type { AlertProfileClient } from "@/components/calendar/types";
import { BellOff, BellRing, CheckCircle2, Flame, Send, Snowflake, TriangleAlert, Wheat } from "lucide-react";
import { Panel } from "@/components/ui/kit";

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

type Status = "checking" | "unsupported" | "no-sw" | "not-configured" | "denied" | "idle" | "working" | "subscribed" | "sent" | "error";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function registration() {
  if (!("serviceWorker" in navigator)) return null;
  return (await navigator.serviceWorker.getRegistration("/")) ?? null;
}

export function PushCard({ profile }: { profile: AlertProfileClient }) {
  const t = useT();
  const locale = useLocale();
  const [status, setStatus] = useState<Status>("checking");
  const [last, setLast] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!("Notification" in window) || !("PushManager" in window)) return setStatus("unsupported");
      if (!VAPID) return setStatus("not-configured");
      if (Notification.permission === "denied") return setStatus("denied");
      const reg = await registration();
      if (!reg) return setStatus("no-sw");
      const sub = await reg.pushManager.getSubscription();
      setStatus(sub ? "subscribed" : "idle");
    })();
  }, []);

  const subscribe = async () => {
    setStatus("working");
    try {
      const reg = await registration();
      if (!reg) return setStatus("no-sw");
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return setStatus(perm === "denied" ? "denied" : "idle");
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID) }));
      await fetch("/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscription: sub.toJSON(), profile: { ...profile, locale } }) });
      setStatus("subscribed");
    } catch (e) {
      console.warn("[FarmTwin] push", e);
      setStatus("error");
    }
  };

  const test = async () => {
    setStatus("working");
    try {
      const reg = await registration();
      const sub = await reg?.pushManager.getSubscription();
      if (!sub) return setStatus("idle");
      const res = await fetch("/api/push/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscription: sub.toJSON(), profile: { ...profile, locale } }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLast(`${data.message.title} — ${data.message.body}`);
      setStatus("sent");
    } catch (e) {
      console.warn("[FarmTwin] push test", e);
      setStatus("error");
    }
  };

  const unsubscribe = async () => {
    const reg = await registration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await fetch("/api/push/subscribe", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
      await sub.unsubscribe();
    }
    setStatus("idle");
  };

  const subscribed = status === "subscribed" || status === "sent";
  const es = locale === "es";

  return (
    <Panel kicker={es ? "NOTIFICACIONES" : "NOTIFICATIONS"} icon={BellRing} title={t("calendario.alertsTitle")} className="push-panel">
      <div className="push-visual" aria-hidden>
        <span className={subscribed ? "is-on" : ""}><BellRing size={26} /></span>
        <i /><i /><i />
      </div>
      <p className="ui-hint">{t("calendario.alertsText")}</p>
      <ul className="push-perks">
        <li><Snowflake size={14} />{es ? "Semanas con riesgo de helada" : "Weeks with frost risk"}</li>
        <li><Flame size={14} />{es ? "Olas de calor extremo" : "Extreme heat waves"}</li>
        <li><Wheat size={14} />{es ? "Cosecha cercana" : "Upcoming harvest"}</li>
      </ul>

      {["unsupported", "no-sw", "not-configured", "denied", "error"].includes(status) && (
        <p className="ui-alert tone-warn"><TriangleAlert size={16} />{t(`calendario.push.${status}`)}</p>
      )}

      {!subscribed && ["idle", "working"].includes(status) && (
        <button type="button" onClick={subscribe} disabled={status === "working"} className="ui-btn ui-btn-block">
          <BellRing size={17} />{t("calendario.push.enable")}
        </button>
      )}

      {subscribed && (
        <div className="push-on">
          <p className="ui-alert tone-ok"><CheckCircle2 size={16} />{t("calendario.push.on")}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={test} className="ui-btn"><Send size={15} />{t("calendario.push.test")}</button>
            <button type="button" onClick={unsubscribe} className="ui-btn ui-btn-ghost"><BellOff size={15} />{t("calendario.push.disable")}</button>
          </div>
        </div>
      )}
      {status === "sent" && last && <p className="ui-hint"><Send size={13} />{last}</p>}
    </Panel>
  );
}
