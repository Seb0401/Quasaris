"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Camera, ChevronRight, Leaf, Mic, Send, ShieldCheck, Sparkles, X } from "lucide-react";
import { useLocale } from "@/components/i18n-provider";
import { useFarm } from "@/lib/farm-store";
import { useSimulation } from "@/lib/use-simulation";
import { recognitionConstructor, useSpeechSupport, type Recognition } from "./media";

export function AssistantDrawer() {
  const locale = useLocale();
  const farm = useFarm();
  const data = useSimulation();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [conversation, setConversation] = useState<{ question: string; answer: string }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const es = locale === "es";
  const { recognition } = useSpeechSupport();
  const recognizer = useRef<Recognition | null>(null);
  const [voiceState, setVoiceState] = useState<"idle" | "listening" | "processing">("idle");
  const [voiceError, setVoiceError] = useState("");

  useEffect(() => {
    if (!open) return;
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 220);
    return () => {
      window.clearTimeout(focusTimer);
      const session = recognizer.current;
      recognizer.current = null;
      session?.abort();
    };
  }, [open]);

  // en el celular el asistente se abre desde la barra superior (app-nav), no desde el botón flotante
  useEffect(() => {
    const openFromHeader = () => setOpen(true);
    window.addEventListener("farmtwin:open-assistant", openFromHeader);
    return () => window.removeEventListener("farmtwin:open-assistant", openFromHeader);
  }, []);

  function closeDrawer() {
    setOpen(false);
    setVoiceState("idle");
    setVoiceError("");
  }

  function toggleVoice() {
    const active = recognizer.current;
    if (active) {
      setVoiceState("processing");
      active.stop();
      return;
    }
    const SpeechRecognition = recognitionConstructor();
    if (!SpeechRecognition) return;

    setVoiceError("");
    const session = new SpeechRecognition();
    session.lang = es ? "es-PE" : "en-US";
    session.onresult = ({ results }) => {
      if (recognizer.current !== session) return;
      const transcript = Array.from(results, (result) => result[0]?.transcript ?? "").join(" ").trim();
      if (transcript) setMessage((draft) => [draft.trim(), transcript].filter(Boolean).join(" ").slice(0, 2000));
    };
    session.onerror = ({ error }) => {
      if (recognizer.current !== session) return;
      if (error === "not-allowed" || error === "service-not-allowed") {
        setVoiceError(es ? "Revisa los permisos del micrófono en el navegador." : "Check microphone permissions in your browser.");
      } else {
        setVoiceError(es ? "No se pudo transcribir tu voz. Inténtalo otra vez o escribe tu pregunta." : "Could not transcribe your voice. Try again or type your question.");
      }
    };
    session.onend = () => {
      if (recognizer.current !== session) return;
      recognizer.current = null;
      setVoiceState("idle");
      inputRef.current?.focus();
    };
    recognizer.current = session;
    try {
      session.start();
      setVoiceState("listening");
    } catch {
      recognizer.current = null;
      setVoiceError(es ? "No se pudo iniciar el dictado." : "Could not start dictation.");
    }
  }

  const voiceLabel = voiceState === "listening"
    ? (es ? "Terminar dictado" : "Stop dictation")
    : (es ? "Dictar pregunta" : "Dictate question");

  const suggestions = es
    ? ["¿Qué rotación ahorra más agua?", "¿Por qué hay riesgo en julio?", "¿Qué debo validar con un técnico?"]
    : ["Which rotation saves most water?", "Why is July risky?", "What should an expert validate?"];

  const answer = (question: string) => {
    if (!data) return es ? "Estoy cargando los resultados de tu parcela. Inténtalo en unos segundos." : "Your field results are loading. Try again in a moment.";
    const rotations = data.rotations;
    const named = (id: string) => farm.rotations.find((rotation) => rotation.id === id)?.name ?? id;
    const normalized = question.toLowerCase();
    const number = (value: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value);
    if (/agua|water|riego|irrigation/.test(normalized)) {
      const best = [...rotations].sort((a, b) => a.water.median - b.water.median)[0];
      return es ? `${named(best.id)} requiere una mediana de ${number(best.water.median)} m³/ha (rango ${number(best.water.p10)}–${number(best.water.p90)}). Tu disponibilidad es ${number(farm.waterAvailableM3ha)} m³/ha; ${best.viable ? "es viable según el modelo" : "aún supera el límite"}.` : `${named(best.id)} has the lowest median demand: ${number(best.water.median)} m³/ha (range ${number(best.water.p10)}–${number(best.water.p90)}). Your available water is ${number(farm.waterAvailableM3ha)} m³/ha.`;
    }
    if (/julio|july|riesgo|risk|helada|frost/.test(normalized)) {
      const current = rotations.find((rotation) => rotation.id === "actual") ?? rotations[0];
      const july = current.byYear.filter((year) => year.months[6] !== "ok").length;
      return es ? `En ${named(current.id)}, julio presentó señales de estrés en ${july} de ${current.byYear.length} años analizados. Revisa heladas, calor y disponibilidad de agua en la Máquina del tiempo antes de decidir.` : `For ${named(current.id)}, July shows stress in ${july} of ${current.byYear.length} analyzed years. Review frost, heat and water in the Time Machine.`;
    }
    if (/técnico|experto|expert|validar|validate/.test(normalized)) return es ? "Valida en campo el tipo de suelo, caudal real de riego, costos y precios locales. La simulación estima escenarios históricos; no reemplaza el diagnóstico agronómico." : "Validate soil texture, actual irrigation flow, costs and local prices in the field. Historical simulation does not replace agronomic assessment.";
    const viable = rotations.filter((rotation) => rotation.viable).sort((a, b) => b.score - a.score)[0];
    return viable ? (es ? `Según tus prioridades, ${named(viable.id)} lidera entre las opciones viables con ${Math.round(viable.score * 100)} puntos. Pregúntame por agua, riesgo de julio o qué validar en campo.` : `${named(viable.id)} leads the viable options with ${Math.round(viable.score * 100)} points. Ask about water, July risk or field validation.`) : (es ? "Ninguna rotación supera todos los filtros actuales. Ajusta recursos o consulta la comparación." : "No rotation passes all current filters. Adjust resources or review the comparison.");
  };
  const submit = (question: string) => { if (!question.trim()) return; setConversation((items) => [...items, { question, answer: answer(question) }]); setMessage(""); };

  return (
    <>
      <button
        type="button"
        className={`assistant-orb ${open ? "is-open" : ""}`}
        onClick={() => open ? closeDrawer() : setOpen(true)}
        aria-expanded={open}
        aria-controls="farmtwin-assistant"
      >
        <span className="assistant-orbit" aria-hidden />
        {open ? <X size={22} /> : <Sparkles size={22} />}
        <span className="hidden sm:inline">{es ? "Asistente IA" : "AI assistant"}</span>
      </button>

      <div className={`assistant-backdrop ${open ? "is-open" : ""}`} onClick={closeDrawer} aria-hidden />
      <aside id="farmtwin-assistant" className={`assistant-drawer ${open ? "is-open" : ""}`} aria-hidden={!open}>
        <header className="assistant-header">
          <div className="assistant-avatar"><Bot size={22} /></div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold leading-tight">FarmTwin IA</p>
            <p className="text-xs text-white/65">{es ? "Explicaciones ancladas a tus datos" : "Answers grounded in your data"}</p>
          </div>
          <button type="button" className="icon-button-dark" onClick={closeDrawer} aria-label={es ? "Cerrar asistente" : "Close assistant"}>
            <X size={19} />
          </button>
        </header>

        <div className="assistant-body">
          <div className="assistant-source">
            <ShieldCheck size={17} />
            <span>{es ? "Usa NASA POWER, MODIS, SRTM y el motor FarmTwin" : "Uses NASA POWER, MODIS, SRTM and the FarmTwin engine"}</span>
          </div>

          <div className="assistant-message">
            <span className="assistant-message-icon"><Leaf size={16} /></span>
            <div>
              <p className="font-medium">{es ? "Encontré una oportunidad" : "I found an opportunity"}</p>
              <p>{es ? "Explora los resultados de tu parcela. Puedo explicar agua, riesgo y qué conviene validar en campo con los datos disponibles." : "Explore your field results. I can explain water, risk and what to validate in the field using available data."}</p>
            </div>
          </div>

          <div className="grid gap-2">
            {suggestions.map((suggestion) => (
              <button key={suggestion} type="button" className="assistant-suggestion" onClick={() => submit(suggestion)}>
                <span>{suggestion}</span><ChevronRight size={16} />
              </button>
            ))}
          </div>
          <div className="assistant-conversation" aria-live="polite">{conversation.map((item, index) => <div key={index}><p className="assistant-question">{item.question}</p><p className="assistant-answer">{item.answer}</p></div>)}</div>
        </div>

        {voiceError && <p role="alert" className="px-4 pb-2 text-xs text-danger">{voiceError}</p>}
        {voiceState !== "idle" && <p role="status" className="px-4 pb-2 text-xs text-brand">
          {voiceState === "listening" ? (es ? "Escuchando…" : "Listening…") : (es ? "Transcribiendo…" : "Transcribing…")}
        </p>}
        <form className="assistant-composer" onSubmit={(event) => {
          event.preventDefault();
          if (voiceState === "idle") submit(message);
        }}>
          <input
            ref={inputRef}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder={es ? "Pregunta sobre tu parcela..." : "Ask about your field..."}
          />
          <button type="button" disabled title={es ? "Próximamente" : "Coming soon"} aria-label={es ? "Foto próximamente" : "Photo coming soon"}><Camera size={19} /></button>
          <button type="button" disabled={!recognition || voiceState === "processing"} onClick={toggleVoice}
            aria-pressed={voiceState === "listening"} aria-label={voiceLabel}
            title={recognition ? voiceLabel : (es ? "Este navegador no admite el dictado" : "This browser does not support dictation")}>
            <Mic size={19} className={voiceState === "listening" ? "text-brand" : undefined} />
          </button>
          <button type="submit" disabled={voiceState !== "idle"} className="assistant-send" aria-label={es ? "Enviar" : "Send"}><Send size={18} /></button>
        </form>
      </aside>
    </>
  );
}
