"use client";

import { useEffect, useState } from "react";
import { Bell, CheckCircle2, Send } from "lucide-react";
import { useLocale, useT } from "@/components/i18n-provider";
import type { AlertProfileClient } from "@/components/calendar/types";

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

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Bell size={18} /> {t("calendario.alertsTitle")}
        </h2>
        <p className="text-sm text-muted">{t("calendario.alertsText")}</p>
      </div>

      {["unsupported", "no-sw", "not-configured", "denied", "error"].includes(status) && (
        <p className="rounded-lg bg-warn/15 px-3 py-2 text-sm">{t(`calendario.push.${status}`)}</p>
      )}

      {!subscribed && ["idle", "working"].includes(status) && (
        <button type="button" onClick={subscribe} disabled={status === "working"} className="rounded-full bg-brand px-5 py-3 font-semibold text-brand-ink disabled:opacity-60">
          {t("calendario.push.enable")}
        </button>
      )}

      {subscribed && (
        <div className="flex flex-col gap-2">
          <p className="flex items-center gap-1.5 text-sm text-ok">
            <CheckCircle2 size={16} /> {t("calendario.push.on")}
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={test} className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-brand-ink">
              {t("calendario.push.test")}
            </button>
            <button type="button" onClick={unsubscribe} className="rounded-full border border-border px-4 py-2 text-sm">
              {t("calendario.push.disable")}
            </button>
          </div>
        </div>
      )}
      {status === "sent" && last && <p className="flex items-center gap-1.5 text-xs text-muted">
          <Send size={13} /> {last}
        </p>}
    </section>
  );
}
