import { NextRequest, NextResponse } from "next/server";
import { analyzeVisionImage } from "@/lib/vision-adapter";
import { checkRateLimit } from "@/lib/abuse-protection";

export async function POST(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for") || "";
  const ip = forwarded.split(",")[0].trim() || request.headers.get("x-real-ip") || "local";
  const limit = checkRateLimit("vision", ip, { limit: 30, windowMs: 60_000 });
  if (!limit.allowed) return NextResponse.json({ error: "Demasiadas solicitudes. Intenta más tarde." }, { status: 429, headers: { "Retry-After": Math.ceil(limit.retryAfterMs / 1000).toString() } });
  let imageDataUrl: unknown;
  try { ({ imageDataUrl } = await request.json()); } catch { return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 }); }
  const result = await analyzeVisionImage({ apiKey: process.env.OPENAI_API_KEY, model: process.env.OMEKH_VISION_MODEL, imageDataUrl });
  return NextResponse.json(result.body, { status: result.status });
}
