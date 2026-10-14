# OMEKH — Preparación para hackathon

## Listo para demo

- HUD responsive con identidad obsidiana, dorado y cian.
- Cámara y micrófono bajo acción y permiso explícitos.
- Intensidad acústica local sin servicios externos.
- Visión y audio con adaptadores server-only, límites y estados sin credenciales.
- Fusión con procedencia, datos faltantes y sin distancias inventadas.
- Voz por turnos, cancelación, narración y entrada textual.
- Pruebas automatizadas: 11 casos exitosos.

## Bloqueos antes del jurado

1. Configurar `OPENAI_API_KEY` sólo en `.env.local` del entorno de demo.
2. Confirmar que la cuenta habilita `gpt-4o-mini` para Structured Outputs y `gpt-audio-1.5` para Chat Completions con `input_audio`.
3. Abrir la aplicación desde un host accesible por el Chrome de demostración.
4. El operador debe conceder cámara/micrófono manualmente y validar la narración.
5. Mitigar el `EPERM` de `L:` moviendo el checkout/build a un volumen local con permisos normales.

No se debe presentar un resultado de modelo, sensor o permiso como PASS si no se observa durante la demo.
