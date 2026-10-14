import { normalizeAudioClassification } from "./perception-schema.js";

export const MAX_AUDIO_CHARS = 1_400_000;
export const AUDIO_TIMEOUT_MS = 20_000;
function error(status, message) { return { status, body: { error: message } }; }

function parseJsonContent(value) {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = fenced?.[1] || trimmed;
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

export async function classifyAudio({ apiKey, model = "gpt-audio-1.5", audioBase64, format = "wav", consent = false, fetchImpl = fetch, timeoutMs = AUDIO_TIMEOUT_MS }) {
  if (!consent) return error(403, "La clasificación acústica requiere consentimiento explícito.");
  if (!apiKey) return error(503, "IA no configurada: falta OPENAI_API_KEY en el servidor.");
  if (format !== "wav" && format !== "mp3") return error(400, "El formato acústico debe ser wav o mp3.");
  if (typeof audioBase64 !== "string" || !/^[A-Za-z0-9+/]+=*$/.test(audioBase64) || audioBase64.length > MAX_AUDIO_CHARS) return error(400, "El audio no es válido o supera el límite permitido.");
  const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl("https://api.openai.com/v1/chat/completions", { method: "POST", signal: controller.signal, headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" }, body: JSON.stringify({
      model, store: false, messages: [{ role: "user", content: [{ type: "text", text: "Clasifica este fragmento acústico en una categoría amplia compatible con el audio. Describe sólo lo que sea audible; expresa incertidumbre; no identifiques personas ni afirmes una fuente no verificable. Responde ÚNICAMENTE con un objeto JSON válido con estos campos: category (string), observations (array de strings), uncertainty (string), origin ('model'). No agregues explicaciones ni código." }, { type: "input_audio", input_audio: { data: audioBase64, format } }] }],
    }) });
    if (!response.ok) {
      let detail = "";
      try { const failure = await response.json(); detail = failure?.error?.message || failure?.error || failure?.message || ""; } catch { try { detail = (await response.text()).slice(0, 240); } catch { } }
      return error(502, detail ? "El proveedor de IA no pudo clasificar el audio (" + response.status + "): " + detail : "El proveedor de IA no pudo clasificar el audio (" + response.status + ").");
    }
    const payload = await response.json(); const content = payload.choices?.[0]?.message?.content;
    const parsed = parseJsonContent(content);
    if (!parsed) return error(502, "El proveedor devolvió una clasificación no válida.");
    const result = normalizeAudioClassification(parsed); if (!result.ok) return error(502, result.error);
    return { status: 200, body: { classification: result.value, provider: "OpenAI Chat Completions", generatedAt: new Date().toISOString(), source: "model" } };
  } catch (cause) {
    if (cause instanceof SyntaxError) return error(502, "El proveedor devolvió una clasificación no válida.");
    if (cause instanceof Error && cause.name === "AbortError") return error(504, "La clasificación acústica agotó el tiempo de espera.");
    return error(502, "No se pudo contactar el adaptador acústico.");
  } finally { clearTimeout(timeout); }
}
