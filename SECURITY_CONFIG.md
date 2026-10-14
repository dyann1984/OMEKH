# Configuración Segura para IA Real — OMEKH

## Variables de Entorno Requeridas

Para habilitar las capacidades de IA real de OMEKH, configure las siguientes variables en `.env.local`:

```bash
# Requerido para visión y audio
OPENAI_API_KEY=sk-your-api-key-here

# Opcional: Modelos específicos (si no se usa, se usan los defaults)
OMEKH_VISION_MODEL=gpt-4o-mini
OMEKH_AUDIO_MODEL=gpt-audio-1.5
```

## Seguridad de la API Key

### ✅ Protección Server-Only

La `OPENAI_API_KEY` **nunca** se expone al cliente:

1. **No usa `NEXT_PUBLIC_`**: La variable no tiene el prefijo `NEXT_PUBLIC_`, por lo que Next.js no la inyecta en el bundle del cliente.

2. **Solo en endpoints de servidor**: La clave solo se lee en:
   - `src/app/api/vision/route.ts` (línea 7)
   - `src/app/api/audio/route.ts` (línea 7)

3. **Validación de presencia**: Los adaptadores verifican la presencia de la clave antes de contactar al proveedor. Si está ausente, devuelven 503 sin hacer llamadas externas.

### Verificación de Seguridad

```typescript
// src/app/api/vision/route.ts
const result = await analyzeVisionImage({
  apiKey: process.env.OPENAI_API_KEY,  // ✅ Solo disponible en servidor
  model: process.env.OMEKH_VISION_MODEL,
  imageDataUrl
});
```

```typescript
// src/app/api/audio/route.ts
const result = await classifyAudio({
  apiKey: process.env.OPENAI_API_KEY,  // ✅ Solo disponible en servidor
  model: process.env.OMEKH_AUDIO_MODEL,
  audioBase64: typeof body.audioBase64 === "string" ? body.audioBase64 : undefined,
  format: typeof body.format === "string" ? body.format : undefined,
  consent: body.consent === true
});
```

## Requisitos de la Cuenta OpenAI

Para que OMEKH funcione con IA real, la cuenta de OpenAI debe tener:

1. **Acceso a `gpt-4o-mini`**: Para la API de Vision con Structured Outputs
2. **Acceso a `gpt-audio-1.5`**: Para la clasificación de audio con input_audio
3. **Créditos suficientes**: Las llamadas a API consumen créditos

### Verificación de Acceso

Puede verificar el acceso a los modelos en:
- https://platform.openai.com/playground
- https://platform.openai.com/settings/limits

## Límites y Validaciones

### Visión

- **Límite de tamaño**: 2.1M caracteres en base64 (`MAX_IMAGE_CHARS`)
- **Timeout**: 15 segundos (`VISION_TIMEOUT_MS`)
- **Formato**: Solo `data:image/*` válido
- **Detalle**: `low` (para reducir costo y latencia)

### Audio

- **Límite de tamaño**: 1.4M caracteres en base64 (`MAX_AUDIO_CHARS`)
- **Timeout**: 20 segundos (`AUDIO_TIMEOUT_MS`)
- **Formato**: Solo `wav` o `mp3`
- **Duración**: Cliente limita captura a 3 segundos
- **Consentimiento**: Requerido explícitamente por cada captura

## No Persistencia de Datos

OMEKH **no persiste** datos sensibles:

1. **Video**: Solo captura puntual, no streaming
2. **Audio**: Captura temporal en memoria, descartada después de procesar
3. **Imágenes**: No se guardan en disco ni se transmiten sin consentimiento
4. **Transcripciones**: No se almacenan

## Procedimiento de Configuración Segura

1. **Crear `.env.local`**:
   ```bash
   cp .env.example .env.local
   ```

2. **Agregar API key**:
   ```bash
   OPENAI_API_KEY=sk-proj-...
   ```

3. **Verificar que `.env.local` está en `.gitignore`**:
   - ✅ Ya está configurado en `.gitignore` (línea 34)

4. **Reiniciar servidor**:
   ```bash
   npm run dev
   ```

5. **Validar configuración**:
   - La UI debe mostrar "IA LISTA" en lugar de "BLOQUEADO POR CONFIGURACIÓN"
   - Las llamadas a `/api/vision` y `/api/audio` deben devolver 200 en lugar de 503

## Monitoreo y Telemetría

Actualmente OMEKH **no implementa**:
- ❌ Logging de llamadas a API
- ❌ Métricas de uso
- ❌ Rastreo de errores detallado
- ❌ Rate limiting

Estas características se pueden agregar en Fase 3 si se requiere despliegue multi-usuario.

## Auditoría de Seguridad

### Verificaciones Automatizadas

Las pruebas unitarias en `tests/omekh-core.test.mjs` verifican:

- ✅ La clave faltante se detecta sin contactar al proveedor (test 5)
- ✅ Los payloads sobredimensionados se rechazan antes de la llamada (test 6)
- ✅ Los errores del proveedor se exponen, no se simulan (test 7)
- ✅ El consentimiento es requerido para audio (test 9)

### Verificaciones Manuales

Antes de usar en producción:

1. [ ] Verificar que `.env.local` no está en el repositorio
2. [ ] Verificar que no hay `NEXT_PUBLIC_OPENAI_API_KEY` en el código
3. [ ] Verificar que los endpoints solo aceptan métodos POST
4. [ ] Verificar que los límites de tamaño están activos
5. [ ] Verificar que los timeouts están configurados
6. [ ] Verificar que el consentimiento funciona correctamente

## Riesgos Conocidos

1. **Sin autenticación**: Cualquiera con acceso a la URL puede usar los endpoints
   - **Mitigación**: Desplegar detrás de VPN o agregar autenticación en Fase 3

2. **Sin rate limiting**: Un usuario podría agotar la cuota de API
   - **Mitigación**: Implementar rate limiting en Fase 3

3. **Dependencia de OpenAI**: Si el servicio cae, OMEKH no puede analizar
   - **Mitigación**: Los clientes manejan errores 502/504 gracefulmente

## Referencias

- OpenAI API Security: https://platform.openai.com/docs/guides/security-best-practices
- Next.js Environment Variables: https://nextjs.org/docs/basic-features/environment-variables
- OMEKH Architecture: `ARCHITECTURE.md`
- OMEKH Limitations: `LIMITATIONS.md`
