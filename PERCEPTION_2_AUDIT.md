# OMEKH PERCEPTION 2.0 — Auditoría de capacidades

## Matriz de capacidades

| Capacidad | Estado real | Fuente/sensor | Implementación actual | Dependencia | Limitación física |
|---|---:|---|---|---|---|
| Captura de cámara | Operativa con permiso | `getUserMedia` Video | React + `src/app/page.tsx` | Navegador y dispositivo | Pide contexto seguro (HTTPS o localhost) |
| Captura de imagen puntual | Operativa con consentimiento | `<canvas>` | `analyze()` + `/api/vision` | Navegador | Cada análisis es una captura única |
| Interpretación visual | Operativa con `OPENAI_API_KEY` | OpenAI Responses API | `vision-adapter.js` | OpenAI `gpt-4o-mini`, cuota | No garantiza posiciones, distancias ni identidad |
| Espectro acústico local | Operativa | Web Audio `AnalyserNode` | `omekh-core.js` | Navegador | Solo intensidad/frecuencia visual local |
| Captura temporal de audio | Operativa con consentimiento | `getUserMedia` Audio | `classify()` | Navegador | Hasta 3 segundos, formato WAV |
| Clasificación acústica | Operativa con `OPENAI_API_KEY` | OpenAI Chat Completions | `audio-adapter.js` | OpenAI `gpt-audio-1.5`, cuota, CORS/proxy no aplica | Categoría amplia e incertidumbre; no localización espacial |
| Reconocimiento de voz | Experimental por navegador | `SpeechRecognition` / `webkitSpeechRecognition` | `page.tsx` | Chrome/Edge y servicio remoto | No hay escucha continua permanente |
| Narración por voz | Operativa según navegador | `SpeechSynthesis` | `narrate()` | Voz disponible | Depende de idioma y calidad de la voz |
| Conversación multimodal | Operativa con `OPENAI_API_KEY` | OpenAI Chat Completions | `conversation-adapter.js` | OpenAI, cuota | Sesión local, sin persistencia server-side |
| Fusión multimodal | Básica | Visión + audio | `fusion-engine.js` | Resultados normalizados | Solo correlación semántica y temporal |
| Fusión temporal | Vernullable no implementada | Marcas de tiempo | Pendiente | Sin dependencias inventadas | La estrategia inicial será evidencia por proximidad temporal |
| Profundidad/lots etc? | No operativa | No hay LiDAR ni estéreo en Web | `vision-adapter.js` no estima métricas | Hardware no disponible en el flujo estándar | No se debe afirmar distancia métrica |
| Localización acústica | No operativa | Micrófono único | Adaptador actual | micrófono y calibración | No hay dirección o posición con micrófono simple |
| PWA | Parcial | Manifest y service worker | `public/manifest.json` | HTTPS, navegador | El service worker es básico y no implementa offline completo |

## Limitaciones científicas declaradas
- La cámara convencional no entrega distancia métrica precisa.
- La detección de obstáculos es una inferencia del modelo, no una medición de seguridad.
- El audio de un único micrófono no permite localización espacial precisa.
- La fusión multimodal solo puede declarar correlación temporal cuando el intervalo entre observaciones sea pequeño y semánticamente compatible.
- La voz y la clasificación acústica dependen del navegador y del servicio externo.

## Arquitectura implementada
1. Navegador captura señales.
2. Permisos y consentimiento explícito en cliente.
3. Endpoints server-only validan y llaman a OpenAI.
4. Los adaptadores normalizan la respuesta.
5. `fusion-engine.js` integra observaciones, procedencia y datos faltantes.
6. `page.tsx` renderiza modalidades, estados e historial.

## Riesgos para claim "Percepción aumentada"
- Riesgo de sobreprometer resultados: se deben etiquetar como observado, estimado e inferido.
- Riesgo de falsa precisión: no afirmar coordenadas o distancias sin inferencia.
- Riesgo de correlación falsa: establecer ventanas temporales y reportar incertidumbre.
- Riesgo de privacidad: no enviar audio/video sin consentimiento.

## Fase inicial recomendada
1. Implementar fusion temporal con marcas de tiempo.
2. Añadir matriz de procedencia y confianza.
3. Representar la relación por intervalo temporal y no por causalidad.
4. Mejorar la evidencia reportable en UI.
5. Ampliar pruebas con escenarios etiquetados.
