# Guía de Prueba Manual — OMEKH Fase 3A

**Fecha**: 2026-10-13
**Objetivo**: Validar OMEKH con hardware real sin consumir créditos de IA

---

## Información del Servidor

### URL Local
- **Local**: http://localhost:3000
- **Network**: http://192.168.50.56:3000
- **Preview**: http://127.0.0.1:58900

### Estado del Servidor
- ✅ Next.js 16.4.0 (Turbopack)
- ✅ Running in 915ms
- ✅ Configuración de Fase 3 activa

---

## Prueba 1: Cámara Física

### Objetivo
Verificar que la cámara física se activa correctamente y muestra el stream en tiempo real.

### Pasos

1. **Abrir OMEKH**
   - Navegar a http://localhost:3000
   - Verificar que la página carga correctamente
   - Verificar que el HUD muestra "EN ESPERA" para cámara y audio

2. **Activar Cámara**
   - Localizar el botón "Activar cámara" en el panel de visión (módulo 01)
   - Pulsar el botón
   - **Esperar**: El navegador debe solicitar permiso de cámara

3. **Conceder Permiso**
   - En el diálogo del navegador, seleccionar "Permitir"
   - Seleccionar la cámara correcta si hay múltiples
   - Confirmar

4. **Verificar Resultado Esperado**
   - ✅ El HUD debe mostrar "CÁMARA ACTIVO"
   - ✅ El video debe mostrar el stream de cámara en tiempo real
   - ✅ Debe aparecer un indicador "◉ LIVE / LOCAL"
   - ✅ El botón debe cambiar a "Detener cámara"
   - ✅ El estado debe decir "Cámara activa localmente; ninguna imagen se transmite todavía."

5. **Verificar Consentimiento**
   - El checkbox "Autorizo enviar una captura puntual" debe estar desmarcado
   - El botón "Analizar escena con IA" debe estar deshabilitado (gris)
   - Marcar el checkbox debe habilitar el botón

6. **Prueba de Error (Opcional)**
   - Detener la cámara
   - Volver a activar
   - Esta vez, denegar el permiso en el diálogo del navegador
   - **Resultado esperado**: HUD muestra "CÁMARA BLOQUEADO", estado dice "Permiso de cámara rechazado o no disponible."

### Casos de Prueba Adicionales

| Caso | Acción | Resultado Esperado |
|------|--------|-------------------|
| Sin cámara conectada | Activar cámara | "CÁMARA BLOQUEADO" |
| Permiso denegado | Denegar en diálogo | "CÁMARA BLOQUEADO" |
| Cámara ya activa | Pulsar "Activar cámara" | Nada (ya está activa) |
| Detener cámara | Pulsar "Detener cámara" | "CÁMARA EN ESPERA", video negro |

---

## Prueba 2: Micrófono Físico

### Objetivo
Verificar que el micrófono físico se activa correctamente y muestra el espectro e intensidad en tiempo real.

### Pasos

1. **Abrir OMEKH**
   - Asegurarse de estar en http://localhost:3000
   - Verificar que el HUD muestra "EN ESPERA" para audio

2. **Activar Micrófono**
   - Localizar el botón "Activar micrófono" en el panel de audio (módulo 02)
   - Pulsar el botón
   - **Esperar**: El navegador debe solicitar permiso de micrófono

3. **Conceder Permiso**
   - En el diálogo del navegador, seleccionar "Permitir"
   - Seleccionar el micrófono correcto si hay múltiples
   - Confirmar

4. **Verificar Resultado Esperado**
   - ✅ El HUD debe mostrar "AUDIO ACTIVO"
   - ✅ El canvas debe mostrar el espectro de audio en tiempo real (barras de colores)
   - ✅ Los readouts deben mostrar valores de intensidad:
     - "INTENSIDAD LOCAL": valor porcentual (ej. 15%)
     - "CAMBIO ACÚSTICO": "ESTABLE" o "DETECTADO"
     - "CLASIFICACIÓN IA": "PREPARADA"
   - ✅ El estado debe decir "Intensidad acústica local activa; aún no se ha enviado audio."
   - ✅ El botón debe cambiar a "Detener micrófono"

5. **Prueba de Intensidad**
   - Hablar o hacer un sonido cerca del micrófono
   - **Resultado esperado**: Las barras del espectro deben moverse
   - **Resultado esperado**: "INTENSIDAD LOCAL" debe aumentar (ej. de 5% a 45%)
   - **Resultado esperado**: "CAMBIO ACÚSTICO" debe mostrar "DETECTADO" si el cambio es abrupto

6. **Verificar Consentimiento**
   - El checkbox "Autorizo capturar hasta 3 s para clasificar" debe estar desmarcado
   - El botón "Clasificar sonido" debe estar deshabilitado (gris)
   - Marcar el checkbox debe habilitar el botón

7. **Prueba de Error (Opcional)**
   - Detener el micrófono
   - Volver a activar
   - Esta vez, denegar el permiso en el diálogo del navegador
   - **Resultado esperado**: HUD muestra "AUDIO BLOQUEADO", estado dice "Permiso de micrófono rechazado o no disponible."

### Casos de Prueba Adicionales

| Caso | Acción | Resultado Esperado |
|------|--------|-------------------|
| Sin micrófono conectado | Activar micrófono | "AUDIO BLOQUEADO" |
| Permiso denegado | Denegar en diálogo | "AUDIO BLOQUEADO" |
| Silencio | No hacer sonido | Intensidad baja (0-5%), banda "silencio" |
| Sonido continuo | Hablar constantemente | Intensidad media (30-60%), banda "medio" |
| Sonido fuerte | Aplaudir cerca | Intensidad alta (60-100%), banda "alto" |

---

## Prueba 3: Comandos de Voz y Narración

### Objetivo
Verificar que SpeechRecognition y SpeechSynthesis funcionan correctamente.

### Pasos

1. **Abrir OMEKH**
   - Asegurarse de estar en http://localhost:3000
   - Verificar que el HUD muestra "EN ESPERA" para voz

2. **Prueba de Reconocimiento de Voz**
   - Localizar el botón "Hablar con OMEKH" en el panel de voz (módulo 03)
   - Pulsar el botón
   - **Esperar**: El navegador puede solicitar permiso de micrófono
   - Conceder el permiso si se solicita

3. **Verificar Estado**
   - ✅ El HUD debe mostrar "VOZ ACTIVO"
   - ✅ El estado debe decir "Escuchando un único turno. No hay escucha permanente."

4. **Probar Comando**
   - Decir claramente: "analiza"
   - **Resultado esperado**: El reconocimiento termina, estado cambia a "idle"
   - **Resultado esperado**: Transcripción aparece en la UI
   - **Resultado esperado**: Si la cámara está activa y hay consentimiento, se activa el análisis

5. **Prueba de Narración**
   - Localizar el botón "Narrar respuesta" en el panel de voz
   - Pulsar el botón
   - **Resultado esperado**: El sistema narra el último resultado en español
   - **Resultado esperado**: La voz debe ser clara y comprensible
   - **Resultado esperado**: Velocidad ligeramente reducida (rate 0.95)

6. **Prueba de Alternativa Textual**
   - Localizar el campo de texto "Alternativa textual / pregunta del entorno"
   - Escribir: "¿Qué observas?"
   - Pulsar "Enviar"
   - **Resultado esperado**: La pregunta aparece en la UI
   - **Resultado esperado**: El sistema responde con datos disponibles o indica que faltan datos

7. **Prueba de Cancelación**
   - Pulsar "Hablar con OMEKH"
   - Mientras escucha, decir: "detén" o "cancelar"
   - **Resultado esperado**: La escucha se cancela inmediatamente
   - **Resultado esperado**: Estado cambia a "idle"

### Casos de Prueba Adicionales

| Caso | Acción | Resultado Esperado |
|------|--------|-------------------|
| SpeechRecognition no disponible | Usar Firefox | "VOZ BLOQUEADO", mensaje de alternativa textual |
| Permiso denegado | Denegar en diálogo | "VOZ BLOQUEADO" |
| Comando no reconocido | Decir comando inválido | Se procesa como pregunta del entorno |
| Narración sin datos | Pulsar "Narrar" sin resultado | "No hay resultado para narrar" |
| SpeechSynthesis no disponible | Navegador sin soporte | Función retorna sin error (graceful degradation) |

---

## Prueba 4: Estados de Error con Permisos Denegados

### Objetivo
Verificar que el sistema maneja correctamente la denegación de permisos.

### Pasos

1. **Prueba de Cámara Denegada**
   - Activar cámara
   - Denegar permiso en el diálogo del navegador
   - **Resultado esperado**:
     - HUD: "CÁMARA BLOQUEADO"
     - Estado: "Permiso de cámara rechazado o no disponible."
     - Video: negro con mensaje "La cámara permanece apagada"

2. **Prueba de Micrófono Denegado**
   - Activar micrófono
   - Denegar permiso en el diálogo del navegador
   - **Resultado esperado**:
     - HUD: "AUDIO BLOQUEADO"
     - Estado: "Permiso de micrófono rechazado o no disponible."
     - Espectro: negro/sin datos

3. **Prueba de Voz Denegada**
   - Pulsar "Hablar con OMEKH"
   - Denegar permiso de micrófono en el diálogo
   - **Resultado esperado**:
     - HUD: "VOZ BLOQUEADO"
     - Estado: "No fue posible reconocer la voz; usa el campo textual."
     - Campo de texto: sigue disponible

4. **Verificación de Fallback**
   - Después de denegar permisos, verificar que:
     - ✅ La alternativa textual siempre está disponible
     - ✅ No hay bloqueo de la UI
     - ✅ Mensajes de error son claros y útiles

---

## Prueba 5: Integración de IA Real (Sin Consumo)

### Objetivo
Preparar la integración de IA real sin ejecutar llamadas pagadas.

### Estado Actual
- ❌ `OPENAI_API_KEY` no configurada en `.env.local`
- ❌ Endpoints devuelven 503 "IA no configurada"
- ✅ Validación de límites funciona sin API key
- ✅ Consentimiento funciona sin API key

### Pasos para Activar IA Real

#### 1. Configurar API Key

```bash
# En el directorio L:\OMEKH
cp .env.example .env.local
```

Luego editar `.env.local` y agregar:
```bash
OPENAI_API_KEY=sk-proj-TU_API_KEY_AQUI
```

#### 2. (Opcional) Configurar Modelos Específicos

En `.env.local`:
```bash
OMEKH_VISION_MODEL=gpt-4o-mini
OMEKH_AUDIO_MODEL=gpt-audio-1.5
```

#### 3. Reiniciar Servidor

```bash
# Detener el servidor actual (Ctrl+C)
npm.cmd run dev
```

#### 4. Verificar Configuración

- Abrir http://localhost:3000
- Verificar que el HUD muestra "IA LISTA" en lugar de "IA EN ESPERA"
- Verificar que el readout muestra "DATOS DISPONIBLES" cuando hay datos

---

## Costos de Modelos (Requieren Confirmación)

### gpt-4o-mini (Visión)

**Uso**: Análisis de imágenes con Structured Outputs

**Precios (estimados, OpenAI 2026)**:
- Input: $0.15 / 1M tokens
- Output: $0.60 / 1M tokens
- Imágenes: $0.005 / imagen (1024x1024 tiles)

**Estimación por llamada**:
- Una imagen típica (~1MB, 1024x768): ~1-2 tiles
- Costo aproximado: $0.01 - $0.02 por análisis

**Nota**: Los precios pueden variar. Verificar en https://openai.com/pricing

### gpt-audio-1.5 (Audio)

**Uso**: Clasificación de audio con input_audio

**Precios (estimados, OpenAI 2026)**:
- Input: $0.15 / 1M tokens
- Output: $0.60 / 1M tokens
- Audio: Precio específico por audio (TBD)

**Estimación por llamada**:
- 3 segundos de audio (~48kHz, mono): ~100KB
- Costo aproximado: $0.01 - $0.03 por clasificación

**Nota**: Los precios pueden variar. Verificar en https://openai.com/pricing

### Estimación de Demo de 90 Segundos

**Escenario típico**:
- 1 análisis de visión: $0.01 - $0.02
- 1 clasificación de audio: $0.01 - $0.03
- **Total**: $0.02 - $0.05 por demo

**Escenario intensivo**:
- 3 análisis de visión: $0.03 - $0.06
- 3 clasificaciones de audio: $0.03 - $0.09
- **Total**: $0.06 - $0.15 por demo

---

## Instrucciones de Prueba Manual

### Para Validar Hardware Real (Sin IA)

1. **Abrir OMEKH**
   - Navegar a http://localhost:3000
   - Verificar que la página carga correctamente

2. **Probar Cámara**
   - Activar cámara
   - Conceder permiso
   - Verificar stream en tiempo real
   - Detener cámara

3. **Probar Micrófono**
   - Activar micrófono
   - Conceder permiso
   - Verificar espectro e intensidad
   - Hacer sonidos para verificar respuesta
   - Detener micrófono

4. **Probar Voz**
   - Pulsar "Hablar con OMEKH"
   - Conceder permiso
   - Decir "analiza" o "clasifica"
   - Verificar transcripción
   - Probar narración

5. **Probar Alternativa Textual**
   - Escribir pregunta en campo de texto
   - Pulsar "Enviar"
   - Verificar respuesta

6. **Probar Estados de Error**
   - Denegar permisos
   - Verificar mensajes de error
   - Verificar que alternativa textual funciona

### Para Activar IA Real (Requiere Autorización)

1. **Agregar API Key**
   - Crear `.env.local`
   - Agregar `OPENAI_API_KEY=sk-proj-...`
   - No compartir ni exponer la clave

2. **Reiniciar Servidor**
   - Detener servidor actual
   - Ejecutar `npm.cmd run dev`

3. **Verificar Configuración**
   - Abrir http://localhost:3000
   - Verificar "IA LISTA" en HUD

4. **Probar Visión IA**
   - Activar cámara
   - Marcar consentimiento
   - Pulsar "Analizar escena con IA"
   - Verificar respuesta estructurada

5. **Probar Audio IA**
   - Activar micrófono
   - Marcar consentimiento
   - Pulsar "Clasificar sonido"
   - Verificar categoría acústica

6. **Probar Fusión**
   - Combinar visión y audio
   - Verificar observaciones con procedencia

---

## Checklist de Validación

### Hardware Real (Sin IA)

- [ ] Cámara se activa con permiso
- [ ] Stream de cámara visible en tiempo real
- [ ] Micrófono se activa con permiso
- [ ] Espectro de audio visible en tiempo real
- [ ] Intensidad acústica responde a sonidos
- [ ] SpeechRecognition funciona (si navegador compatible)
- [ ] SpeechSynthesis narra en español
- [ ] Alternativa textual funciona
- [ ] Estados de error claros con permisos denegados
- [ ] No hay bloqueos de UI cuando fallan permisos

### IA Real (Requiere API Key)

- [ ] `OPENAI_API_KEY` configurada en `.env.local`
- [ ] Servidor reiniciado después de configurar clave
- [ ] HUD muestra "IA LISTA"
- [ ] Visión IA devuelve respuesta estructurada
- [ ] Audio IA devuelve categoría acústica
- [ ] Fusión combina observaciones con procedencia
- [ ] Respuestas de IA tienen origen "model"
- [ ] No se inventan datos cuando falla IA

---

## Autorización Requerida

### Para Activar IA Real

**Necesito autorización para**:
1. Configurar `OPENAI_API_KEY` en `.env.local`
2. Ejecutar llamadas a OpenAI API
3. Consumir créditos de la cuenta asociada

**Costo estimado**:
- Demo de 90 segundos: $0.02 - $0.15
- Pruebas adicionales: según uso

**Modelos a usar**:
- `gpt-4o-mini` para visión
- `gpt-audio-1.5` para audio

**Confirmación**:
- [ ] Autorizo configurar API key
- [ ] Autorizo consumir créditos de OpenAI
- [ ] Entiendo los costos estimados

---

## Notas Importantes

### Seguridad
- ❌ Nunca exponer `OPENAI_API_KEY` con `NEXT_PUBLIC_`
- ❌ Nunca commitear `.env.local` al repositorio
- ✅ La clave solo se lee en endpoints de servidor
- ✅ La clave nunca se imprime ni se registra

### Privacidad
- ✅ Cámara: solo captura puntual, no streaming
- ✅ Audio: solo 3 segundos temporales, no persisten
- ✅ Consentimiento: requerido explícitamente por cada captura
- ✅ No se almacenan datos sensibles

### Limitaciones
- ⚠️ SpeechRecognition no funciona en Firefox
- ⚠️ Requiere contexto seguro (HTTPS o localhost)
- ⚠️ Calidad de reconocimiento depende del micrófono
- ⚠️ Voces de narración varían según el sistema operativo

---

**Estado Actual**: Servidor corriendo en http://localhost:3000
**Browser Preview**: http://127.0.0.1:58900
**Próximo Paso**: Esperar validación manual del usuario o autorización para IA real
