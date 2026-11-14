"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type FileUIPart, type InferUITools, type UIMessage } from "ai";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import type { chatTools } from "@/app/api/chat/tools";
import { useLocale, useT } from "@/components/i18n-provider";
import { setFarm, useFarm } from "@/lib/farm-store";
import { preparePhoto, recognitionConstructor, speak, useSpeechSupport, type Recognition } from "./media";

type Message = UIMessage<unknown, never, InferUITools<ReturnType<typeof chatTools>>>;

const transport = new DefaultChatTransport<Message>({
  prepareSendMessagesRequest({ messages, body }) {
    const history = messages.slice(-12);
    return {
      body: {
        ...body,
        messages: history.flatMap((message, index) => {
          const isNew = index === history.length - 1;
          const text = messageText(message).slice(0, 8000);
          const content = isNew ? message.parts.filter((part) => part.type === "file") : [];
          const parts = text ? [{ type: "text", text }, ...content] : content;
          return parts.length ? [{ role: message.role, parts }] : [];
        }),
      },
    };
  },
});

const secondary = "inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-surface px-3 py-2 text-sm font-medium hover:border-brand disabled:opacity-50";

function messageText(message: Message) {
  return message.parts.flatMap((part) => part.type === "text" ? [part.text] : []).join("\n").trim();
}

export function Assistant() {
  const chatId = useId();
  const t = useT();
  const locale = useLocale();
  const farm = useFarm();
  const lang = locale === "es" ? "es-PE" : "en-US";
  const { recognition, synthesis } = useSpeechSupport();
  const [draft, setDraft] = useState("");
  const [photo, setPhoto] = useState<FileUIPart>();
  const [preparing, setPreparing] = useState(false);
  const [listening, setListening] = useState(false);
  const [readAloud, setReadAloud] = useState(false);
  const [mediaError, setMediaError] = useState("");
  const [updated, setUpdated] = useState(false);
  const recognizer = useRef<Recognition | null>(null);
  const dictated = useRef(false);
  const lastReply = useRef<HTMLLIElement>(null);
  const { messages, sendMessage, regenerate, error, status } = useChat<Message>({
    id: chatId,
    transport,
    onFinish({ message, isAbort, isDisconnect, isError, finishReason }) {
      if (isAbort || isDisconnect || isError || finishReason !== "stop") return;
      const reply = messageText(message);
      for (const part of message.parts) {
        if (part.type !== "tool-cambiarPrioridades" || part.state !== "output-available") continue;
        const output = part.output;
        if ("error" in output) continue;
        setFarm({ waterAvailableM3ha: output.waterAvailableM3ha, priorities: output.priorities });
        setUpdated(true);
      }
      if (reply && (readAloud || dictated.current)) speak(reply, lang);
      dictated.current = false;
    },
  });

  const busy = status === "submitted" || status === "streaming";
  const blocked = busy || preparing || listening;

  useEffect(() => {
    if (busy) lastReply.current?.scrollIntoView({ block: "nearest" });
  }, [busy, messages.length]);

  useEffect(() => () => {
    recognizer.current?.abort();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  function send(question: string) {
    const text = question.trim() || (photo ? t("assistant.photoPrompt") : "");
    if (!text || blocked) return;
    setDraft("");
    setPhoto(undefined);
    setMediaError("");
    setUpdated(false);
    void sendMessage({ text, files: photo ? [photo] : undefined }, { body: { farm, locale } });
  }

  function startVoice() {
    const SpeechRecognition = recognitionConstructor();
    if (!SpeechRecognition || recognizer.current || busy || preparing) return;
    const session = new SpeechRecognition();
    session.lang = lang;
    session.onresult = ({ results }) => {
      const transcript = results[0]?.[0]?.transcript.trim();
      if (!transcript) return;
      dictated.current = true;
      setDraft((previous) => [previous.trim(), transcript].filter(Boolean).join(" ").slice(0, 2000));
    };
    session.onerror = () => setMediaError("assistant.voiceError");
    session.onend = () => {
      recognizer.current = null;
      setListening(false);
    };
    setMediaError("");
    try {
      session.start();
      recognizer.current = session;
      setListening(true);
    } catch {
      setMediaError("assistant.voiceError");
    }
  }

  const errorKey = error?.message.includes("gatewayUnavailable")
    ? "gatewayUnavailable"
    : error?.message.includes("insufficientCredits")
      ? "insufficientCredits"
      : "gatewayError";

  return (
    <section className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-bold">{t("assistant.title")}</h1>
        <p className="mt-1 text-sm text-muted">{t("assistant.intro")}</p>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface px-4 py-3">
        <div>
          <p className="text-sm text-muted">{t("assistant.water")}</p>
          <p className="font-semibold">{new Intl.NumberFormat(lang).format(farm.waterAvailableM3ha)} m³/ha</p>
        </div>
        <Link href={`/${locale}/comparar`} className="inline-flex min-h-11 items-center text-sm font-semibold text-brand underline underline-offset-4">
          {t("assistant.compare")}
        </Link>
      </div>

      {messages.length === 0 && (
        <div className="flex flex-wrap gap-2">
          {["exampleRotation", "exampleWater", "exampleYear"].map((key) => (
            <button key={key} type="button" disabled={blocked} className={secondary} onClick={() => send(t(`assistant.${key}`))}>
              {t(`assistant.${key}`)}
            </button>
          ))}
        </div>
      )}

      {messages.length > 0 && (
        <ol className="flex flex-col gap-3">
          {messages.map((message, index) => {
            const reply = messageText(message);
            const mine = message.role === "user";
            const hasPhoto = message.parts.some((part) => part.type === "file");
            return (
              <li key={message.id} ref={index === messages.length - 1 ? lastReply : undefined}
                className={`w-fit max-w-full rounded-xl border border-border px-4 py-3 ${mine ? "self-end bg-brand/10" : "bg-surface"}`}>
                <p className="text-xs font-semibold text-muted">{mine ? t("assistant.you") : "FarmTwin"}</p>
                {hasPhoto && <p className="mt-1 text-xs text-muted">📷 {t("assistant.attached")}</p>}
                <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed">{reply || t("assistant.waiting")}</p>
                {!mine && reply && synthesis && !busy && (
                  <button type="button" className="mt-1 min-h-11 text-sm font-medium text-brand underline"
                    onClick={() => speak(reply, lang)}>{t("assistant.read")}</button>
                )}
              </li>
            );
          })}
        </ol>
      )}
      <p role="status" className={busy || updated ? "text-sm text-muted" : "sr-only"}>
        {busy ? t("assistant.waiting") : updated ? t("assistant.updated") : ""}
      </p>
      {error && (
        <div className="flex flex-wrap items-center gap-3">
          <p role="alert" className="text-sm text-danger">{t(`assistant.${errorKey}`)}</p>
          <button type="button" className={secondary} disabled={blocked}
            onClick={() => void regenerate({ body: { farm, locale } })}>{t("assistant.retry")}</button>
        </div>
      )}

      <form className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-3" onSubmit={(event) => {
        event.preventDefault();
        send(draft);
      }}>
        <label className="sr-only" htmlFor="assistant-question">{t("assistant.question")}</label>
        <textarea id="assistant-question" rows={3} maxLength={2000} value={draft}
          placeholder={t("assistant.placeholder")} onChange={(event) => setDraft(event.target.value)}
          className="w-full resize-y rounded-xl border border-border bg-background px-3 py-2" />
        {mediaError && <p role="alert" className="text-sm text-danger">{t(mediaError)}</p>}
        {photo && (
          <div className="flex items-center gap-2 text-sm">
            <span>📷 {t("assistant.attached")}</span>
            <button type="button" className={secondary} onClick={() => setPhoto(undefined)}>{t("assistant.remove")}</button>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {recognition && (
            <button type="button" disabled={busy || preparing} aria-pressed={listening}
              aria-label={t(listening ? "assistant.finishVoice" : "assistant.hold")}
              className={`${secondary} touch-none select-none`}
              onPointerDown={(event) => {
                if (event.button !== 0) return;
                event.currentTarget.setPointerCapture(event.pointerId);
                startVoice();
              }}
              onPointerUp={() => recognizer.current?.stop()}
              onPointerCancel={() => recognizer.current?.abort()}
              onClick={(event) => {
                if (event.detail !== 0) return;
                if (recognizer.current) recognizer.current.stop();
                else startVoice();
              }}>
              🎙️ {t(listening ? "assistant.listening" : "assistant.hold")}
            </button>
          )}
          <label className={`${secondary} cursor-pointer focus-within:outline focus-within:outline-brand has-disabled:opacity-50`}>
            📷 {t(preparing ? "assistant.preparingPhoto" : "assistant.attach")}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={blocked}
              onChange={async (event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                setPreparing(true);
                setMediaError("");
                try {
                  setPhoto(await preparePhoto(file));
                } catch {
                  setPhoto(undefined);
                  setMediaError("assistant.photoError");
                } finally {
                  setPreparing(false);
                }
              }} />
          </label>
          <button type="submit" disabled={blocked || (!draft.trim() && !photo)}
            className="ml-auto min-h-11 rounded-xl bg-brand px-4 py-2 font-semibold text-brand-ink disabled:opacity-50">
            {t("assistant.send")}
          </button>
        </div>
        {synthesis && (
          <label className="flex min-h-11 items-center gap-2 text-sm text-muted">
            <input type="checkbox" className="size-5 accent-brand" checked={readAloud} onChange={(event) => setReadAloud(event.target.checked)} />
            {t("assistant.voiceReply")}
          </label>
        )}
      </form>
    </section>
  );
}
