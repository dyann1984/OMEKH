import { NextRequest, NextResponse } from "next/server";
import { analyzeVisionImage } from "@/lib/vision-adapter";

export async function POST(request: NextRequest) {
  let imageDataUrl: unknown;
  try { ({ imageDataUrl } = await request.json()); } catch { return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 }); }
  const result = await analyzeVisionImage({ apiKey: process.env.OPENAI_API_KEY, model: process.env.OMEKH_VISION_MODEL, imageDataUrl });
  return NextResponse.json(result.body, { status: result.status });
}
