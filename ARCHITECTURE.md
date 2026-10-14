# Arquitectura — OMEKH Fase 2

La Fase 2 añade Audio Intelligence (intensidad y cambio de amplitud locales), Voice Assistant bajo demanda y un adaptador de visión con timeout, límite de captura y respuestas de estado verificables.

## Fase 3 — Perception Engine

- `src/lib/perception-schema.js` define y valida esquemas estrictos para visión y acústica.
- `src/lib/vision-adapter.js` usa una captura puntual en Responses API y devuelve escena, objetos, obstáculos potenciales, observaciones, incertidumbre y origen `model`.
- `src/lib/audio-adapter.js` y `/api/audio` aceptan WAV/MP3 consentido, limitan tamaño/tiempo y clasifican con `gpt-audio-1.5` sin persistir audio.
- `src/lib/fusion-engine.js` combina observaciones conservando modalidad/origen y datos faltantes.
- `src/app/page.tsx` añade HUD 3.0, captura acústica temporal, voz por turnos, narración, fallback textual y línea temporal.

Flujo: permiso explícito → captura temporal → endpoint server-only → validación → panel accesible → descarte de buffers. No hay escucha permanente ni geometría inventada.

```
Navegador
├── OMEKH Core: estados, consentimiento y reglas de presentación
├── Vision: getUserMedia → <video> → captura puntual bajo demanda
├── Audio: getUserMedia → Web Audio AnalyserNode → canvas local
├── Accessibility: foco visible, etiquetas, aria-live y SpeechSynthesis
└── Live HUD: indicadores de permisos/actividad
                   │ (solo con consentimiento expreso)
                   ▼
            /api/vision (servidor Next.js)
                   ▼
             Adaptador multimodal / OpenAI Responses API
```

## Límites de confianza

- Cámara y micrófono piden permiso por separado. Sus flujos no se guardan ni se transmiten por defecto.
- El audio se analiza sólo en memoria con Web Audio API.
- La imagen se manda al adaptador únicamente al pulsar **Describir con IA** y marcar la casilla de consentimiento.
- `OPENAI_API_KEY` se lee sólo en `src/app/api/vision/route.ts`. Nunca se expone con un prefijo `NEXT_PUBLIC_`.
- La descripción del modelo queda etiquetada como tal. No hay resultados de respaldo inventados.

## Ejecución local

1. `npm install`
2. Copia `.env.example` a `.env.local` y agrega una clave si quieres usar IA real.
3. `npm run dev`
4. Abre `http://localhost:3000` usando HTTPS o `localhost` para que el navegador permita cámara y micrófono.

Ejecuta `npm test` y `npm run build` antes de una demostración.
