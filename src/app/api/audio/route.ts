import { NextRequest, NextResponse } from "next/server";
import { classifyAudio } from "@/lib/audio-adapter";
import { checkRateLimit } from "@/lib/abuse-protection";

export async function POST(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for") || "";
  const ip = forwarded.split(",")[0].trim() || request.headers.get("x-real-ip") || "local";
  const limit = checkRateLimit("audio", ip, { limit: 30, windowMs: 60_000 });
  if (!limit.allowed) return NextResponse.json({ error: "Demasiadas solicitudes. Intenta más tarde." }, { status: 429, headers: { "Retry-After": Math.ceil(limit.retryAfterMs / 1000).toString() } });
  let body: { audioBase64?: unknown; format?: unknown; consent?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "JSON inválido." }, { status: 400 }); }
  const result = await classifyAudio({ apiKey: process.env.OPENAI_API_KEY, model: process.env.OMEKH_AUDIO_MODEL, audioBase64: typeof body.audioBase64 === "string" ? body.audioBase64 : undefined, format: typeof body.format === "string" ? body.format : undefined, consent: body.consent === true });
  return NextResponse.json(result.body, { status: result.status });
}
