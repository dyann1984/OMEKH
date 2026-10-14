# OMEKH — Plan de pruebas multimodal

1. Esquema visual válido, incompleto, origen no permitido, JSON truncado y proveedor 5xx.
2. Consentimiento de visión/audio, formato no permitido, payload sobredimensionado y cancelación.
3. Audio local: silencio, cambio abrupto, detención y ausencia de `AudioContext`.
4. Audio remoto: clave ausente, timeout, respuesta inválida y clasificación válida mock.
5. Voz: API ausente, permiso rechazado, turno único, cancelación y texto alternativo.
6. Fusión: sólo visión, sólo audio, ambos, faltantes y contradicciones sin inferencia.
7. Accesibilidad: foco, etiquetas, `aria-live`, narración y lectura textual.
8. Seguridad: clave server-only, buffers temporales y límites de tamaño/tiempo.

Los casos automatizados viven en `tests/omekh-core.test.mjs`; permisos reales requieren consentimiento del usuario.
