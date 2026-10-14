# Verificación de SpeechRecognition y SpeechSynthesis — OMEKH

**Fecha**: 2026-10-13
**Componente**: `src/app/page.tsx`

---

## SpeechRecognition (Reconocimiento de Voz)

### Implementación en Código

```javascript
const startVoice = useCallback(() => {
  const voiceWindow = window as Window & { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  const Recognition = voiceWindow.SpeechRecognition ?? voiceWindow.webkitSpeechRecognition;
  if (!Recognition) {
    setVoice("blocked");
    return setStatus("Reconocimiento no disponible. Usa la alternativa textual.");
  }
  const instance = new Recognition();
  instance.lang = "es-MX";
  instance.continuous = false;
  instance.interimResults = false;
  instance.onresult = (event) => {
    const text = event.results[event.resultIndex]?.[0]?.transcript ?? "";
    recognition.current = null;
    setVoice("idle");
    command(text);
  };
  instance.onerror = () => {
    recognition.current = null;
    setVoice("blocked");
    setStatus("No fue posible reconocer la voz; usa el campo textual.");
  };
  instance.onend = () => setVoice((current) => current === "active" ? "idle" : current);
  recognition.current = instance;
  try {
    instance.start();
    setVoice("active");
    setStatus("Escuchando un único turno. No hay escucha permanente.");
  } catch {
    setVoice("blocked");
    setStatus("No fue posible iniciar el reconocimiento.");
  }
}, [command]);
```

### Verificación de Compatibilidad

✅ **Detección de API**
- Verifica `SpeechRecognition` o `webkitSpeechRecognition`
- Si no existe: marca como "blocked" y muestra mensaje de alternativa textual
- Soporta tanto el estándar como el prefijo de WebKit

✅ **Configuración Apropiada**
- `lang: "es-MX"` - Español de México
- `continuous: false` - Solo un turno, no escucha permanente
- `interimResults: false` - Solo resultados finales, no parciales

✅ **Manejo de Errores**
- `onerror`: Marca como "blocked" y sugiere alternativa textual
- `onend`: Limpia estado a "idle" si estaba "active"
- `try/catch` en `start()`: Marca como "blocked" si falla al iniciar

### Verificación de Privacidad

✅ **Sin Escucha Permanente**
- `continuous: false` asegura que solo escucha un turno
- La escucha se detiene automáticamente después de un resultado
- No hay escucha en segundo plano

✅ **Control Explícito**
- El usuario debe pulsar "Hablar con OMEKH" para iniciar
- Puede cancelar con "Cancelar escucha"
- Comandos de voz "detén" o "cancelar" también detienen la escucha

✅ **Alternativa Textual**
- Si SpeechRecognition no está disponible, se usa el campo de texto
- Si falla el reconocimiento, se usa el campo de texto
- El campo de texto siempre está disponible

### Verificación de Comandos

```javascript
const command = useCallback((text: string) => {
  const value = text.trim();
  if (!value) return setStatus("Escribe o di una pregunta o comando.");
  setTranscript(value);
  if (isVoiceCommand(value, "analiza") || isVoiceCommand(value, "describ")) return void analyze();
  if (isVoiceCommand(value, "clasifica") || isVoiceCommand(value, "sonido")) return void classify();
  if (isVoiceCommand(value, "narra") || isVoiceCommand(value, "leer")) return narrate(vision?.description ?? answer ?? "No hay resultado para narrar.");
  if (isVoiceCommand(value, "detén") || isVoiceCommand(value, "cancelar")) {
    recognition.current?.stop();
    setVoice("idle");
    return setStatus("Escucha cancelada.");
  }
  respond(value);
}, [analyze, answer, classify, narrate, respond, vision?.description]);
```

✅ **Comandos Soportados**
- "analiza" / "describ" → activa análisis de visión
- "clasifica" / "sonido" → activa clasificación de audio
- "narra" / "leer" → narra último resultado
- "detén" / "cancelar" → cancela escucha
- Cualquier otro texto → se procesa como pregunta del entorno

✅ **Coincidencia Flexible**
- `isVoiceCommand` usa `toLocaleLowerCase("es-MX")` para coincidencia insensible a mayúsculas
- Permite variaciones en los comandos
- Robusto a diferentes acentos

### Dependencias del Navegador

| Navegador | SpeechRecognition | Compatibilidad |
|-----------|------------------|----------------|
| Chrome | ✅ `webkitSpeechRecognition` | Sí |
| Edge | ✅ `webkitSpeechRecognition` | Sí |
| Safari | ✅ `SpeechRecognition` | Sí (macOS 15+) |
| Firefox | ❌ No soportado | No |
| Opera | ✅ `webkitSpeechRecognition` | Sí |

**Nota**: La compatibilidad varía según la versión del navegador y el sistema operativo.

---

## SpeechSynthesis (Síntesis de Voz / Narración)

### Implementación en Código

```javascript
const narrate = useCallback((text: string) => {
  if (!("speechSynthesis" in window) || !text) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "es-MX";
  utterance.rate = 0.95;
  window.speechSynthesis.speak(utterance);
}, []);
```

### Verificación de Compatibilidad

✅ **Detección de API**
- Verifica `"speechSynthesis" in window"`
- Si no existe, no hace nada (graceful degradation)
- No bloquea la funcionalidad si no está disponible

✅ **Configuración Apropiada**
- `lang: "es-MX"` - Español de México
- `rate: 0.95` - Velocidad ligeramente reducida para mejor claridad
- `cancel()` antes de hablar - Cancela cualquier narración previa

### Verificación de Privacidad

✅ **Sin Escucha Permanente**
- Solo sintetiza voz cuando se solicita explícitamente
- No hay escucha en segundo plano
- No se almacenan ni se transmiten datos de voz

✅ **Control Explícito**
- El usuario debe pulsar "Narrar respuesta" o usar comando "narra"
- La narración se puede cancelar con `speechSynthesis.cancel()`
- Al desmontar el componente, se cancela cualquier narración en curso

### Verificación de Uso

```javascript
useEffect(() => () => {
  stopCamera();
  stopMicrophone();
  recognition.current?.stop();
  window.speechSynthesis?.cancel();
}, [stopCamera, stopMicrophone]);
```

✅ **Limpieza al Desmontar**
- `window.speechSynthesis?.cancel()` en el cleanup de useEffect
- Asegura que no haya narración en curso al salir de la página
- Previene fugas de recursos

### Dependencias del Navegador

| Navegador | SpeechSynthesis | Compatibilidad |
|-----------|-----------------|----------------|
| Chrome | ✅ | Sí |
| Edge | ✅ | Sí |
| Safari | ✅ | Sí |
| Firefox | ✅ | Sí |
| Opera | ✅ | Sí |

**Nota**: La compatibilidad es más amplia que SpeechSynthesis, pero las voces disponibles varían según el sistema.

---

## Pruebas de Escenarios

### Escenario 1: SpeechRecognition No Disponible

**Pasos**:
1. Usuario en navegador sin SpeechRecognition (ej. Firefox)
2. Pulsa "Hablar con OMEKH"
3. Sistema detecta que API no está disponible

**Resultado Esperado**:
- Estado: "blocked"
- Mensaje: "Reconocimiento no disponible. Usa la alternativa textual."
- Campo de texto sigue disponible

**Estado**: ✅ Implementado correctamente

### Escenario 2: Permiso de Micrófono Denegado

**Pasos**:
1. Usuario pulsa "Hablar con OMEKH"
2. Navegador solicita permiso de micrófono
3. Usuario deniega permiso

**Resultado Esperado**:
- `onerror` se dispara
- Estado: "blocked"
- Mensaje: "No fue posible reconocer la voz; usa el campo textual."

**Estado**: ✅ Implementado correctamente

### Escenario 3: Comando Exitoso

**Pasos**:
1. Usuario pulsa "Hablar con OMEKH"
2. Concede permiso de micrófono
3. Dice "analiza"
4. Sistema reconoce texto

**Resultado Esperado**:
- Transcripción: "analiza"
- Comando ejecutado: análisis de visión
- Estado: "idle" después del resultado

**Estado**: ✅ Implementado correctamente

### Escenario 4: SpeechSynthesis No Disponible

**Pasos**:
1. Usuario pulsa "Narrar respuesta"
2. Navegador no soporta SpeechSynthesis

**Resultado Esperado**:
- Función `narrate` retorna temprano
- No hay error ni bloqueo
- Texto sigue visible en pantalla

**Estado**: ✅ Implementado correctamente

### Escenario 5: Narración Exitosa

**Pasos**:
1. Usuario tiene resultado de visión o audio
2. Pulsa "Narrar respuesta"
3. Sistema narra el texto

**Resultado Esperado**:
- Voz se reproduce en español
- Velocidad: 0.95 (ligeramente lento)
- Narración cancelable

**Estado**: ✅ Implementado correctamente

---

## Limitaciones Conocidas

### SpeechRecognition

1. **Compatibilidad Limitada**
   - No disponible en Firefox
   - Requiere contexto seguro (HTTPS o localhost)
   - Puede no funcionar en algunos dispositivos móviles

2. **Calidad Variable**
   - Depende del micrófono del dispositivo
   - Puede tener dificultades con ruido de fondo
   - Acentos no estándar pueden afectar reconocimiento

3. **Sin Persistencia**
   - Solo funciona mientras la página está activa
   - No se puede usar en segundo plano
   - No se puede entrenar con voz del usuario

### SpeechSynthesis

1. **Voces Variables**
   - Las voces disponibles dependen del sistema operativo
   - La calidad de voz varía según el dispositivo
   - No hay garantía de voz en español específico

2. **Sin Control Fino**
   - No se puede seleccionar una voz específica
   - No se puede ajustar el tono o el pitch
   - La pronunciación puede no ser perfecta

3. **Sin Personalización**
   - No se puede entrenar con preferencias del usuario
   - No se puede ajustar la velocidad por usuario
   - No se puede seleccionar dialecto específico

---

## Recomendaciones

### Para SpeechRecognition

1. **Agregar indicador visual** de que el sistema está escuchando
2. **Mostrar transcripción en tiempo real** (si se habilita `interimResults`)
3. **Agregar opción de reintentar** si falla el reconocimiento
4. **Considerar alternativas** para navegadores sin soporte (ej. Web Speech API polyfill)

### Para SpeechSynthesis

1. **Agregar selector de voz** si hay múltiples disponibles
2. **Agregar control de velocidad** ajustable por usuario
3. **Agregar opción de detener** narración en curso
4. **Considerar alternativas** para mejor calidad (ej. ElevenLabs, pero requiere API key)

### General

1. **Agregar pruebas E2E** con navegadores reales para validar comportamiento
2. **Agregar métricas** de uso de voz para monitoreo
3. **Documentar claramente** las limitaciones en la UI
4. **Proporcionar feedback** claro cuando falla el reconocimiento

---

## Conclusión

### Estado de SpeechRecognition

✅ **Implementación Robusta**
- Detección de compatibilidad
- Manejo de errores apropiado
- Alternativa textual siempre disponible
- Sin escucha permanente

✅ **Privacidad Respetada**
- Solo escucha por turno
- Control explícito del usuario
- Alternativa textual si falla

⚠️ **Limitaciones del Navegador**
- No disponible en Firefox
- Requiere contexto seguro
- Calidad variable

### Estado de SpeechSynthesis

✅ **Implementación Simple y Efectiva**
- Detección de compatibilidad
- Configuración apropiada
- Cancelación de narración previa
- Limpieza al desmontar

✅ **Privacidad Respetada**
- Solo sintetiza cuando se solicita
- No hay escucha ni transmisión
- Control explícito del usuario

⚠️ **Limitaciones del Navegador**
- Voces variables según sistema
- Sin control fino de parámetros
- Sin personalización

**Estado General**: ✅ **APROBADO** - Ambas APIs están implementadas de manera segura y apropiada para un prototipo local-first

**Estado para Demo**: ⚠️ **DEPENDIENTE DEL NAVEGADOR** - Se requiere probar en Chrome/Edge/Safari con contexto seguro para validación completa
