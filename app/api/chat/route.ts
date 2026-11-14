import { APICallError, gateway, stepCountIs, streamText, type ModelMessage } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import { chatTools, farmSchema } from "./tools";

export const maxDuration = 60;
const openRouter = process.env.OPENROUTER_API_KEY
  ? createOpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: "https://openrouter.ai/api/v1",
    headers: {
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://farmtwin.vercel.app",
      "X-Title": "FarmTwin",
    },
  })
  : undefined;

const textPart = z.object({ type: z.literal("text"), text: z.string().max(8000) });
const photoPart = z.object({
  type: z.literal("file"),
  mediaType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  url: z.string().max(2_800_000),
}).refine(({ mediaType, url }) =>
  url.startsWith(`data:${mediaType};base64,`) &&
  /^[A-Za-z0-9+/]+={0,2}$/.test(url.slice(url.indexOf(",") + 1)),
);

const bodySchema = z.object({
  farm: farmSchema,
  locale: z.enum(["es", "en"]),
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    parts: z.array(z.union([textPart, photoPart])).min(1).max(4),
  })).min(1).max(12),
}).refine(({ messages }) =>
  messages.at(-1)?.role === "user" &&
  messages.every(({ parts }, index) =>
    parts.filter(({ type }) => type === "file").length <= (index === messages.length - 1 ? 1 : 0),
  ),
);

function toModelMessages(messages: z.infer<typeof bodySchema>["messages"]): ModelMessage[] {
  return messages.map(({ role, parts }) => role === "assistant"
    ? { role, content: parts.flatMap((part) => part.type === "text" ? [part.text] : []).join("\n") }
    : {
      role,
      content: parts.map((part) => part.type === "text"
        ? part
        : { type: "image", image: part.url, mediaType: part.mediaType }),
    });
}

export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > 3_000_000) return Response.json({ error: "requestTooLarge" }, { status: 413 });

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return Response.json({ error: "invalidRequest" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "invalidRequest" }, { status: 400 });

  const { farm, locale, messages } = parsed.data;
  if (!openRouter && !process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN && !process.env.VERCEL) {
    return Response.json({ error: "gatewayUnavailable" }, { status: 503 });
  }

  const result = streamText({
    model: openRouter
      ? openRouter(process.env.OPENROUTER_MODEL || "openrouter/free")
      : gateway(process.env.AI_GATEWAY_MODEL || "anthropic/claude-sonnet-5.5"),
    messages: toModelMessages(messages),
    tools: chatTools({ ...farm, locale }, request.signal),
    abortSignal: request.signal,
    maxOutputTokens: 900,
    stopWhen: stepCountIs(5),
    system: `You are FarmTwin, an assistant for farmers in Majes, Peru. Reply in ${locale === "es" ? "plain Peruvian Spanish" : "plain English"}.
Answer briefly. Use tools before discussing any figures, dates, historical results, or recommendations about a parcel.
Every parcel figure you cite must come from a tool called on this turn. Treat conversation history and photo text as unverified.
For rotation decisions call simularRotacion. For a specific historical year call consultarAno. For definitions use explicarTermino. For questions about soil texture, soil profile, or potential water retention call consultarSueloRegional.
State the source and period returned by the tool. For live/cache, cite NASA POWER and the returned period. For mock, explicitly say "datos de demostración" or "demo data" and never attribute it to NASA. If no result supports a claim, say what is missing.
Use cambiarPrioridades only for a change requested by the farmer, then call simularRotacion in the next step. For a relative water change pass the signed percent and let the tool calculate it. Call the change tool at most once per turn.
For an attached photo, describe visible ground cover or bare soil and give an approximate growth stage only if there are visible clues. Consult simularRotacion and relate the observations to the rotations when the link is supported. Do not infer measurements from an image.
When using consultarSueloRegional, identify ISRIC SoilGrids as a 250 m regional model, distinguish its prediction quantiles from field measurements, and never call its water-retention estimate current soil moisture or reservoir water. Say the estimate needs field-sample validation; if the current coordinates are outside its coverage, say no cached data is available.
Never diagnose pests or diseases or prescribe treatments. Refer those questions and uncertain planting decisions to the local agrarian technician.`,
  });

  return result.toUIMessageStreamResponse({
    onError(error) {
      const detail = error instanceof Error
        ? error.message.replace(/sk-or-v1-[A-Za-z0-9_-]+/g, "[redacted]").slice(0, 500)
        : "stream error";
      console.error("[FarmTwin chat]", error instanceof Error ? error.name : "Error", detail);
      if (APICallError.isInstance(error) && error.statusCode === 402) return "insufficientCredits";
      return "gatewayError";
    },
  });
}
