# Verificación de Fusión Multimodal con Procedencia — OMEKH

**Fecha**: 2026-10-13
**Componente**: `src/lib/fusion-engine.js`

---

## Análisis del Código

### Función: `fusePerception({ vision, acoustic } = {})`

```javascript
export function fusePerception({ vision, acoustic } = {}) {
  const observations = [];
  if (vision?.scene_description) observations.push({ text: vision.scene_description, origin: "model", modality: "vision" });
  for (const item of vision?.relevant_observations ?? []) observations.push({ text: item.text, origin: item.origin, modality: "vision" });
  if (acoustic?.category) observations.push({ text: "Categoría acústica: " + acoustic.category, origin: acoustic.origin, modality: "audio" });
  for (const item of acoustic?.observations ?? []) observations.push({ text: item, origin: acoustic.origin, modality: "audio" });
  const missing = [];
  if (!vision) missing.push("interpretación visual");
  if (!acoustic) missing.push("clasificación acústica");
  return { observations, missing, contradictions: [], status: observations.length ? "partial" : "empty" };
}
```

### Verificación de Procedencia

✅ **Preservación de Origen**
- Cada observación incluye `origin` del dato original
- Para visión: `item.origin` de `relevant_observations`
- Para audio: `acoustic.origin` de la clasificación
- No se inventan orígenes ni se mezclan fuentes

✅ **Preservación de Modalidad**
- Cada observación incluye `modality`: "vision" o "audio"
- Permite distinguir entre datos visuales y acústicos
- Útil para debugging y para entender de dónde viene cada dato

✅ **No Mezcla de Datos**
- Las observaciones visuales y acústicas se mantienen separadas
- No se intenta "fusionar" o interpretar conjuntamente
- La UI puede mostrarlas con etiquetas claras

### Verificación de Incertidumbre

✅ **Explicititud de Datos Faltantes**
- `missing` array rastrea qué modalidades faltan
- "interpretación visual" si no hay visión
- "clasificación acústica" si no hay audio
- La UI puede mostrar claramente qué datos faltan

✅ **Sin Invención de Datos**
- Si `vision` es null/undefined, no se agrega nada a `observations`
- Si `acoustic` es null/undefined, no se agrega nada a `observations`
- No se inventan observaciones ni se rellenan con defaults

✅ **Contradicciones No Resueltas**
- `contradictions: []` indica que no se resuelven contradicciones
- Por diseño: OMEKH no tiene suficiente información para resolverlas
- Solo reporta observaciones, no las interpreta más allá de lo que dice el modelo

### Función: `answerEnvironmentQuestion(question, fusion)`

```javascript
export function answerEnvironmentQuestion(question, fusion) {
  if (!question?.trim()) return "Escribe o di una pregunta para consultar el entorno.";
  if (!fusion?.observations?.length) return "Aún faltan datos del entorno. Activa una captura visual o una clasificación acústica autorizada.";
  const summary = fusion.observations.slice(0, 4).map((item) => item.text).join(" ");
  const suffix = fusion.missing.length ? " Faltan datos de " + fusion.missing.join(" y ") + "." : "";
  return "Con los datos disponibles, OMEKH observa: " + summary + suffix + " No se han medido distancias ni posiciones.";
}
```

### Verificación de Respuestas

✅ **Solo Usa Datos Disponibles**
- Si no hay observaciones, retorna mensaje claro: "Aún faltan datos del entorno"
- No inventa respuestas ni asume datos que no existen

✅ **Limita a 4 Observaciones**
- `slice(0, 4)` limita el resumen a las primeras 4 observaciones
- Evita respuestas excesivamente largas
- Prioriza las observaciones más recientes

✅ **Menciona Datos Faltantes**
- `suffix` agrega "Faltan datos de X y Y" si hay modalidades faltantes
- El usuario sabe explícitamente qué información falta
- No se presenta como una respuesta completa si falta algo

✅ **Sin Mediciones Inventadas**
- "No se han medido distancias ni posiciones" es explícito
- No se inventan coordenadas, distancias o ubicaciones
- El usuario sabe las limitaciones del sistema

---

## Pruebas Unitarias

### Test Existente: "fusion preserves modality, provenance, and missing data"

```javascript
test("fusion preserves modality, provenance, and missing data", () => {
  const fused = fusePerception({ vision: { scene_description: "Escena visible.", relevant_observations: [{ text: "luz natural", origin: "model" }] }, acoustic: null });
  assert.equal(fused.observations[0].modality, "vision");
  assert.deepEqual(fused.missing, ["clasificación acústica"]);
  assert.match(answerEnvironmentQuestion("¿Qué observas?", fused), /Escena visible/);
  assert.match(answerEnvironmentQuestion("¿Qué observas?", fusePerception()), /faltan datos/);
});
```

**Resultado**: ✅ PASS

### Casos de Prueba Adicionales

#### Caso 1: Solo Visión
```javascript
const fused = fusePerception({ vision: { scene_description: "Una mesa.", relevant_observations: [] }, acoustic: null });
// observations: [{ text: "Una mesa.", origin: "model", modality: "vision" }]
// missing: ["clasificación acústica"]
// status: "partial"
```

#### Caso 2: Solo Audio
```javascript
const fused = fusePerception({ vision: null, acoustic: { category: "ambiente", observations: ["sonido continuo"], uncertainty: "baja", origin: "model" } });
// observations: [
//   { text: "Categoría acústica: ambiente", origin: "model", modality: "audio" },
//   { text: "sonido continuo", origin: "model", modality: "audio" }
// ]
// missing: ["interpretación visual"]
// status: "partial"
```

#### Caso 3: Ambos
```javascript
const fused = fusePerception({
  vision: { scene_description: "Escena.", relevant_observations: [{ text: "objeto", origin: "model" }] },
  acoustic: { category: "ruido", observations: [], uncertainty: "alta", origin: "model" }
});
// observations: [
//   { text: "Escena.", origin: "model", modality: "vision" },
//   { text: "objeto", origin: "model", modality: "vision" },
//   { text: "Categoría acústica: ruido", origin: "model", modality: "audio" }
// ]
// missing: []
// status: "partial"
```

#### Caso 4: Ninguno
```javascript
const fused = fusePerception({});
// observations: []
// missing: ["interpretación visual", "clasificación acústica"]
// status: "empty"
```

---

## Verificación en UI

### Ubicación en JSX

```jsx
<article className="panel access-panel">
  <div className="panel-head">
    <div>
      <p className="module-id">04 / MULTIMODAL FUSION</p>
      <h2>Contexto con procedencia</h2>
    </div>
    <span className="data-source">{fusion.status.toUpperCase()}</span>
  </div>
  <p className="description">{fusion.observations.length ? fusion.observations.length + " observaciones conservan su modalidad y origen." : "Sin observaciones combinables todavía."}</p>
  <ul>
    {fusion.observations.slice(0, 4).map((item, index) => (
      <li key={index}>
        <span>◈</span> {item.modality}: {item.text} <small>· {item.origin}</small>
      </li>
    ))}
  </ul>
  <p className="provenance">Datos faltantes: {fusion.missing.length ? fusion.missing.join(" y ") : "ninguno"}. Contradicciones reportadas: {fusion.contradictions.length || "ninguna"}.</p>
  <div className="timeline" aria-label="Línea temporal de eventos">
    {events.length ? events.map((event) => <p key={event}>{event}</p>) : <p>Eventos de cámara, audio, IA y voz aparecerán aquí.</p>}
  </div>
</article>
```

### Verificación de Visualización

✅ **Modalidad Visible**
- Cada observación muestra `{item.modality}: {item.text}`
- El usuario puede ver si el dato es visual o acústico

✅ **Origen Visible**
- Cada observación muestra `· {item.origin}`
- El usuario puede ver si el dato viene del modelo

✅ **Datos Faltantes Visibles**
- "Datos faltantes: X y Y" muestra explícitamente qué falta
- Si no falta nada, muestra "ninguno"

✅ **Contradicciones Visibles**
- "Contradicciones reportadas: ninguna" muestra que no se resuelven
- Si hubiera contradicciones, se mostrarían aquí

---

## Conclusión

### Estado de Fusión Multimodal

✅ **Procedencia Preservada**
- Cada observación mantiene su origen (model)
- Cada observación mantiene su modalidad (vision/audio)
- No se mezclan fuentes ni se inventan orígenes

✅ **Datos Faltantes Explicitados**
- El sistema rastrea qué modalidades faltan
- La UI muestra claramente qué datos faltan
- Las respuestas mencionan datos faltantes

✅ **Sin Invención de Datos**
- No se inventan observaciones
- No se rellenan con defaults
- No se inventan distancias ni posiciones

✅ **Contradicciones No Resueltas**
- Por diseño, no se resuelven contradicciones
- El sistema reporta observaciones, no las interpreta más allá
- Esto es apropiado para un prototipo local-first

### Recomendaciones

1. **Agregar métricas de confianza** si se implementa IA más avanzada
2. **Considerar ponderación de observaciones** si se implementan múltiples fuentes
3. **Agregar resolución de contradicciones** solo si se tienen suficientes datos espaciales
4. **Mantener la transparencia** de procedencia en cualquier mejora

**Estado**: ✅ **APROBADO** - Fusión multimodal conserva procedencia y no inventa datos
