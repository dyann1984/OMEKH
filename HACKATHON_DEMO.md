# OMEKH — Demo de hackathon (90 segundos)

## Fase 3 — recorrido

1. Mostrar el HUD apagado y explicar que sensores y voz requieren acciones explícitas.
2. Activar cámara, consentir una captura puntual y leer la escena estructurada, objetos, obstáculos potenciales y advertencias con origen `model`.
3. Activar micrófono para mostrar intensidad local; consentir hasta 3 segundos y, con clave configurada, mostrar una categoría acústica con incertidumbre.
4. Pulsar “Hablar con OMEKH”, preguntar “¿Qué observas?” y mostrar transcripción, respuesta fusionada y narración. Cancelar para demostrar control por turnos.
5. Cerrar señalando línea temporal, datos faltantes y límites: no hay coordenadas, distancias, confianza inventada ni audio almacenado.

Funciones automatizadas: consentimiento, límites, estados sin credenciales, esquemas, errores, clasificación mock y fusión conservadora. Llamadas reales requieren configuración y permisos del navegador.

Para la certificación final consultar `DEMO_SCRIPT_90S.md` y `HACKATHON_READINESS.md`.

## Problema

La información visual y acústica cotidiana puede ser difícil de interpretar con rapidez o puede no ser accesible en todos los contextos. OMEKH propone una interfaz de percepción aumentada que funciona desde un teléfono o computadora, sin gafas especiales.

## Propuesta tecnológica

OMEKH integra permisos explícitos del navegador, Web Audio API, SpeechSynthesis, reconocimiento de voz opcional y un adaptador de visión multimodal en servidor. La cámara y el micrófono se controlan de manera independiente. Una imagen sólo sale del dispositivo si la persona marca el consentimiento y pulsa el análisis.

## Diferenciadores

- Local-first: espectro, intensidad y cambio acústico se calculan en memoria local.
- Transparencia: cada lectura se marca como medición local, modelo preparado o resultado de IA.
- Privacidad: no hay grabación de video ni audio; el endpoint de visión usa una captura puntual y no expone credenciales.
- Accesibilidad: controles de teclado, estados anunciados, voz bajo demanda y alternativa textual.

## Guion de 90 segundos

1. **0–15 s — Contexto.** “OMEKH no reemplaza los sentidos: aporta señales accesibles sin hardware especial.”
2. **15–35 s — Cámara y consentimiento.** Activa cámara. Muestra que el botón de IA continúa deshabilitado hasta marcar el consentimiento.
3. **35–55 s — Visión IA.** Marca consentimiento y pulsa Analizar escena con IA. Lee la etiqueta Descripción generada por modelo; aclara que no calcula distancia.
4. **55–70 s — Audio local.** Activa micrófono, produce un sonido y muestra intensidad local y cambio acústico. Señala que no es reconocimiento de sonido.
5. **70–85 s — Voz.** Di “narrar resultado” o escribe el comando equivalente. OMEKH narra el último resultado.
6. **85–90 s — Cierre.** “Control del usuario, datos diferenciados y una base modular para la siguiente fase.”

## Funciones verificadas

- Compilación TypeScript y 7 pruebas unitarias pasan.
- La ruta de visión devuelve el estado real de configuración si falta la credencial y rechaza capturas sobredimensionadas antes de llamar a un proveedor.
- El build de producción pasa desde una copia temporal en disco local.

## Limitaciones actuales

- Para visión real se requiere una cuenta con acceso al modelo y OPENAI_API_KEY en .env.local.
- La clasificación/reconocimiento de sonidos está preparada pero no implementada; sólo intensidad y variación son reales.
- Reconocimiento de voz depende del navegador y sus permisos.
- La interpretación visual es probabilística y no apta para navegación crítica, salud, identificación o decisiones de seguridad.
