# Limitaciones conocidas — Fase 1

- Una descripción de IA depende de una credencial `OPENAI_API_KEY` válida en el servidor; sin ella la interfaz informa que el servicio no está configurado.
- Las descripciones pueden ser inexactas. No deben utilizarse para seguridad, navegación crítica, decisiones médicas, identificación o vigilancia.
- El espectro es una visualización de intensidad/frecuencia, no reconocimiento de sonidos ni transcripción.
- El cambio acústico indica únicamente variación de amplitud local; no identifica un evento ni un sonido.
- El reconocimiento de voz depende de SpeechRecognition o webkitSpeechRecognition y puede no estar disponible.
- No se implementan distancia, profundidad, identidad, emociones, objetos persistentes, mediciones físicas ni alertas de peligro.

## Fase 3

- Visión estructurada y clasificación acústica requieren `OPENAI_API_KEY`; sin ella los endpoints devuelven 503 y no fabrican resultados.
- `gpt-4o-mini` y `gpt-audio-1.5` son configurables y dependen de disponibilidad/cuota de la cuenta.
- El audio se captura como PCM temporal, hasta 3 segundos, se codifica como WAV y se descarta después de procesarse.
- La clasificación sólo informa categorías amplias e incertidumbre; no identifica personas, distancias, ubicaciones ni fuentes con certeza.
- SpeechRecognition depende del navegador; la alternativa textual está siempre disponible y no existe escucha en segundo plano.
- La fusión conserva procedencia y señala datos faltantes; no resuelve contradicciones con mediciones espaciales.
- El build en `L:` puede producir `EPERM` en `.next`; se valida en una copia temporal local cuando ocurre.
- La cámara y el micrófono requieren un contexto seguro del navegador (`localhost` o HTTPS) y permiso de la persona usuaria.
- La narración depende de las voces instaladas y de la compatibilidad de SpeechSynthesis en cada navegador.
