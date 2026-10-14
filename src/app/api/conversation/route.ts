import { NextRequest, NextResponse } from "next/server";
import { answerConversation } from "@/lib/conversation-adapter";
import { checkRateLimit } from "@/lib/abuse-protection";

export async function POST(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for") || "";
  const ip = forwarded.split(",")[0].trim() || request.headers.get("x-real-ip") || "local";
  const limit = checkRateLimit("conversation", ip, { limit: 30, windowMs: 60_000 });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Demasiadas consultas en poco tiempo. Intenta de nuevo más tarde." },
      { status: 429, headers: { "Retry-After": Math.ceil(limit.retryAfterMs / 1000).toString() } }
    );
  }

  let body: { question?: unknown; context?: unknown; history?: unknown; consent?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  const question = body?.question;
  const context = body?.context;
  const history = body?.history;
  const consent = body?.consent;

  const result = await answerConversation({
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OMEKH_CONVERSATION_MODEL || process.env.OMEKH_VISION_MODEL || "gpt-4o-mini",
    question: typeof question === "string" ? question : undefined,
    context: typeof context === "object" && context !== null ? context : {},
    history: Array.isArray(history) ? history : [],
    consent: consent === true,
  } as never);

  return NextResponse.json(result.body, { status: result.status });
}