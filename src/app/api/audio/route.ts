import { NextRequest, NextResponse } from "next/server";
import { classifyAudio } from "@/lib/audio-adapter";

export async function POST(request: NextRequest) {
  let body: { audioBase64?: unknown; format?: unknown; consent?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "JSON inválido." }, { status: 400 }); }
  const result = await classifyAudio({ apiKey: process.env.OPENAI_API_KEY, model: process.env.OMEKH_AUDIO_MODEL, audioBase64: typeof body.audioBase64 === "string" ? body.audioBase64 : undefined, format: typeof body.format === "string" ? body.format : undefined, consent: body.consent === true });
  return NextResponse.json(result.body, { status: result.status });
}
