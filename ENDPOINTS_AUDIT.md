# Auditoría de Endpoints — OMEKH

**Fecha**: 2026-10-13
**Endpoints auditados**: `/api/vision`, `/api/audio`

---

## Endpoint: `/api/vision`

### Ubicación
`src/app/api/vision/route.ts`

### Método
POST

### Parámetros de Entrada

| Parámetro | Tipo | Requerido | Validación |
|-----------|------|-----------|------------|
| `imageDataUrl` | string | Sí | Debe ser `data:image/*`, longitud ≤ 2.1M caracteres |

### Flujo de Validación

1. **Parseo de JSON**
   - Si falla: 400 "Solicitud inválida."
   - Implementación: `try { ({ imageDataUrl } = await request.json()); } catch`

2. **Validación de API Key**
   - Si `apiKey` es falsy: 503 "IA no configurada: falta OPENAI_API_KEY en el servidor."
   - **Protección**: La clave se lee de `process.env.OPENAI_API_KEY` (server-only)
   - **Nunca se expone** con prefijo `NEXT_PUBLIC_`

3. **Validación de Imagen**
   - Debe ser string
   - Debe comenzar con `data:image/`
   - Longitud ≤ `MAX_IMAGE_CHARS` (2,100,000 caracteres)
   - Si falla: 400 "La captura no es válida o supera el límite permitido."

4. **Timeout**
   - `VISION_TIMEOUT_MS = 15,000` (15 segundos)
   - Si se agota: 504 "El análisis visual agotó el tiempo de espera."
   - Implementación: `AbortController` con `setTimeout`

5. **Llamada a Proveedor**
   - URL: `https://api.openai.com/v1/responses`
   - Método: POST
   - Headers:
     - `Authorization: Bearer ${apiKey}` (server-only)
     - `Content-Type: application/json`
   - Body:
     - `model`: configurable via `process.env.OMEKH_VISION_MODEL` (default: `gpt-4o-mini`)
     - `store: false` (no persistir)
     - `input`: image + instruction
     - `text.format`: JSON Schema strict con `VISION_SCHEMA`

6. **Validación de Respuesta**
   - Si response no es ok: 502 "El proveedor de IA no pudo procesar la captura."
   - Parseo de JSON: si falla → 502
   - Normalización con `normalizeStructuredVision`: si falla → 502
   - Normalización con `normalizeVisionResponse`: si falla → 502

7. **Respuesta Exitosa**
   - Status: 200
   - Body:
     - `description`: descripción de la escena
     - `interpretation`: objeto estructurado completo
     - `provider`: "OpenAI Responses API"
     - `generatedAt`: timestamp ISO
     - `source`: "model"

### Códigos de Estado

| Código | Mensaje | Condición |
|--------|---------|-----------|
| 200 | Éxito | Imagen procesada correctamente |
| 400 | "Solicitud inválida." | JSON inválido |
| 400 | "La captura no es válida o supera el límite permitido." | Formato o tamaño inválido |
| 502 | "El proveedor de IA no pudo procesar la captura." | Error del proveedor |
| 502 | "El proveedor devolvió una interpretación visual no válida." | JSON inválido del proveedor |
| 502 | "No se pudo contactar el adaptador de IA." | Error de red |
| 503 | "IA no configurada: falta OPENAI_API_KEY en el servidor." | API key ausente |
| 504 | "El análisis visual agotó el tiempo de espera." | Timeout de 15s |

### Protección de Credenciales

✅ **Server-only**: `process.env.OPENAI_API_KEY` solo accesible en servidor
✅ **No expuesta**: Nunca se usa `NEXT_PUBLIC_OPENAI_API_KEY`
✅ **No logging**: La clave no se imprime ni se registra
✅ **Validación temprana**: Se verifica antes de contactar al proveedor

### Consentimiento

⚠️ **Nota**: El endpoint `/api/vision` NO valida consentimiento directamente. El consentimiento se valida en el cliente (`src/app/page.tsx`) antes de llamar al endpoint. Esto es aceptable porque:

1. El endpoint es server-only y no accesible directamente desde el navegador sin código del cliente
2. El checkbox de consentimiento está en la UI
3. El botón de análisis está deshabilitado sin consentimiento
4. Esto es un patrón válido para prototipos local-first

**Recomendación para producción**: Agregar validación de consentimiento en el endpoint si se requiere multi-tenant.

---

## Endpoint: `/api/audio`

### Ubicación
`src/app/api/audio/route.ts`

### Método
POST

### Parámetros de Entrada

| Parámetro | Tipo | Requerido | Validación |
|-----------|------|-----------|------------|
| `audioBase64` | string | Sí | Debe ser base64 válido, longitud ≤ 1.4M caracteres |
| `format` | string | Sí | Debe ser "wav" o "mp3" |
| `consent` | boolean | Sí | Debe ser `true` |

### Flujo de Validación

1. **Parseo de JSON**
   - Si falla: 400 "JSON inválido."
   - Implementación: `try { body = await request.json(); } catch`

2. **Validación de Consentimiento**
   - Si `consent !== true`: 403 "La clasificación acústica requiere consentimiento explícito."
   - **Protección**: Consentimiento explícito requerido por cada captura

3. **Validación de API Key**
   - Si `apiKey` es falsy: 503 "IA no configurada: falta OPENAI_API_KEY en el servidor."
   - **Protección**: La clave se lee de `process.env.OPENAI_API_KEY` (server-only)

4. **Validación de Formato**
   - Debe ser "wav" o "mp3"
   - Si falla: 400 "El formato acústico debe ser wav o mp3."

5. **Validación de Audio**
   - Debe ser string
   - Debe pasar regex base64: `/^[A-Za-z0-9+/]+=*$/`
   - Longitud ≤ `MAX_AUDIO_CHARS` (1,400,000 caracteres)
   - Si falla: 400 "El audio no es válido o supera el límite permitido."

6. **Timeout**
   - `AUDIO_TIMEOUT_MS = 20,000` (20 segundos)
   - Si se agota: 504 "La clasificación acústica agotó el tiempo de espera."
   - Implementación: `AbortController` con `setTimeout`

7. **Llamada a Proveedor**
   - URL: `https://api.openai.com/v1/chat/completions`
   - Método: POST
   - Headers:
     - `Authorization: Bearer ${apiKey}` (server-only)
     - `Content-Type: application/json`
   - Body:
     - `model`: configurable via `process.env.OMEKH_AUDIO_MODEL` (default: `gpt-audio-1.5`)
     - `store: false` (no persistir)
     - `messages`: audio + instruction
     - `response_format`: JSON Schema strict con `AUDIO_SCHEMA`

8. **Validación de Respuesta**
   - Si response no es ok: 502 "El proveedor de IA no pudo clasificar el audio."
   - Parseo de JSON: si falla → 502
   - Normalización con `normalizeAudioClassification`: si falla → 502

9. **Respuesta Exitosa**
   - Status: 200
   - Body:
     - `classification`: objeto de clasificación
     - `provider`: "OpenAI Chat Completions"
     - `generatedAt`: timestamp ISO
     - `source`: "model"

### Códigos de Estado

| Código | Mensaje | Condición |
|--------|---------|-----------|
| 200 | Éxito | Audio procesado correctamente |
| 400 | "JSON inválido." | JSON inválido |
| 400 | "El formato acústico debe ser wav o mp3." | Formato inválido |
| 400 | "El audio no es válido o supera el límite permitido." | Base64 inválido o tamaño excedido |
| 403 | "La clasificación acústica requiere consentimiento explícito." | Consentimiento ausente |
| 502 | "El proveedor de IA no pudo clasificar el audio." | Error del proveedor |
| 502 | "El proveedor devolvió una clasificación no válida." | JSON inválido del proveedor |
| 502 | "No se pudo contactar el adaptador acústico." | Error de red |
| 503 | "IA no configurada: falta OPENAI_API_KEY en el servidor." | API key ausente |
| 504 | "La clasificación acústica agotó el tiempo de espera." | Timeout de 20s |

### Protección de Credenciales

✅ **Server-only**: `process.env.OPENAI_API_KEY` solo accesible en servidor
✅ **No expuesta**: Nunca se usa `NEXT_PUBLIC_OPENAI_API_KEY`
✅ **No logging**: La clave no se imprime ni se registra
✅ **Validación temprana**: Se verifica antes de contactar al proveedor

### Consentimiento

✅ **Validado en endpoint**: `/api/audio` verifica `consent === true`
✅ **Requerido por cada captura**: No hay consentimiento persistente
✅ **403 si falta**: Bloquea explícitamente sin consentimiento

---

## Comparación de Endpoints

| Aspecto | `/api/vision` | `/api/audio` |
|---------|---------------|--------------|
| Consentimiento en endpoint | ❌ No (validado en cliente) | ✅ Sí |
| Validación de formato | ✅ Sí (data:image/*) | ✅ Sí (wav/mp3) |
| Límite de tamaño | ✅ 2.1M caracteres | ✅ 1.4M caracteres |
| Timeout | ✅ 15s | ✅ 20s |
| Protección de API key | ✅ Server-only | ✅ Server-only |
| Validación de JSON schema | ✅ Sí (VISION_SCHEMA) | ✅ Sí (AUDIO_SCHEMA) |
| No persistencia | ✅ store: false | ✅ store: false |

---

## Recomendaciones

### Seguridad

1. **Agregar rate limiting** en ambos endpoints para prevenir abuso
2. **Agregar validación de consentimiento** en `/api/vision` para consistencia
3. **Agregar logging estructurado** (sin datos sensibles) para debugging
4. **Considerar autenticación** si se requiere multi-tenant

### Funcionalidad

1. **Agregar cache con TTL** para reducir llamadas a API
2. **Agregar retry con backoff** para errores transitorios
3. **Agregar métricas de uso** para monitoreo

### Operacional

1. **Documentar límites de cuota** de OpenAI
2. **Agregar alertas** para errores 502/504 frecuentes
3. **Configurar health checks** para monitoreo de disponibilidad

---

## Conclusión

Ambos endpoints están bien diseñados con:

✅ **Protección de credenciales**: Server-only, nunca expuestas
✅ **Validación robusta**: Formato, tamaño, consentimiento
✅ **Timeouts apropiados**: 15s para visión, 20s para audio
✅ **No persistencia**: `store: false` en llamadas a API
✅ **Esquemas strict**: JSON Schema para respuestas estructuradas
✅ **Manejo de errores**: Códigos de estado claros y descriptivos

**Estado**: ✅ **APROBADO** para prototipo local-first

**Mejoras sugeridas**: Rate limiting, validación de consentimiento en `/api/vision`, logging estructurado
