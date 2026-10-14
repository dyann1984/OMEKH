/** Helpers for browser audio capture and voice recognition. */

export function isSecureAudioContext(isSecureContext, mediaDevices) {
  return Boolean(isSecureContext && mediaDevices?.getUserMedia);
}

export function classifyMediaAudioError(supported, error = {}) {
  if (!supported) {
    return "El navegador no ofrece captura de audio aquí. Usa localhost o HTTPS.";
  }
  const name = String(error?.name || "").trim();
  switch (name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
    case "SecurityError":
      return "Permiso de micrófono denegado o bloqueado por el navegador.";
    case "NotFoundError":
    case "DevicesNotFoundError":
      return "No se detectó un micrófono en este equipo.";
    case "NotReadableError":
    case "TrackStartError":
      return "El micrófono está ocupado o no se pudo abrir.";
    case "OverconstrainedError":
      return "El dispositivo no admite los ajustes solicitados para el micrófono.";
    case "AbortError":
      return "La captura de micrófono fue interrumpida.";
    default:
      return `No se pudo iniciar el micrófono: ${error?.message || name || "error desconocido"}.`;
  }
}

export function isSpeechRecognitionSupported(windowLike) {
  return Boolean(windowLike?.SpeechRecognition || windowLike?.webkitSpeechRecognition);
}

export function classifySpeechError(errorCode) {
  switch (String(errorCode || "").trim()) {
    case "not-allowed":
    case "service-not-allowed":
      return "Permiso o servicio de reconocimiento de voz denegado.";
    case "audio-capture":
      return "No se detectó un micrófono para reconocimiento de voz.";
    case "no-speech":
      return "No se detectó voz. Intenta otra vez o usa el campo textual.";
    case "network":
      return "No se pudo conectar con el servicio de reconocimiento de voz.";
    case "aborted":
      return "Reconocimiento de voz cancelado.";
    case "language-not-supported":
      return "El idioma es-MX no está disponible en el navegador.";
    default:
      return errorCode
        ? `No se pudo reconocer la voz (${errorCode}). Usa el campo textual.`
        : "No se pudo reconocer la voz. Usa el campo textual.";
  }
}

export async function getRunningAudioContext(createAudioContext) {
  const context = typeof createAudioContext === "function" ? createAudioContext() : createAudioContext;
  if (context?.state === "suspended" && typeof context.resume === "function") {
    await context.resume();
  }
  return context;
}
