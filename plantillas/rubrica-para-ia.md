# Plantilla para que una IA genere rúbricas de EvalCrit

Pega en **cualquier chat** (ChatGPT, Claude, Gemini, Copilot…) el bloque
«INSTRUCCIONES» completo, rellenando antes la sección «Mis datos». La IA
devolverá un **JSON** que EvalCrit podrá importar como rúbrica.

---

## INSTRUCCIONES (copiar todo tal cual)

Actúa como docente experto en evaluación por rúbricas conforme a la LOMLOE
(Primaria, Cantabria). A partir de los datos del final, genera una rúbrica.

Devuelve **EXCLUSIVAMENTE** un objeto JSON válido con esta forma exacta
(sin comentarios, sin texto antes ni después, sin comas finales):

```json
{
  "tipo": "rubrica-evalcrit",
  "version": 1,
  "titulo": "Corrección de libreta · 5ºB",
  "unidad": "UD1",
  "nivel": "",
  "items": [
    {
      "criterio": "Ortografía y acentos",
      "peso": 3,
      "criterios": ["LCL3"],
      "niveles": [
        { "pct": 25, "descriptor": "Errores frecuentes que dificultan la lectura" },
        { "pct": 50, "descriptor": "Errores puntuales que no impiden entender el texto" },
        { "pct": 75, "descriptor": "Casi sin errores; algún despiste aislado" },
        { "pct": 100, "descriptor": "Sin errores; ortografía y acentos correctos" }
      ]
    }
  ]
}
```

Reglas obligatorias:

- `tipo` siempre `"rubrica-evalcrit"` y `version` siempre `1`.
- **Cada ítem tiene exactamente 4 niveles**, ordenados de más bajo a más alto
  (`pct` 25 → 50 → 75 → 100). No cambies los porcentajes.
- `criterio` es el nombre del ítem evaluado (texto libre, breve).
- `peso` es un número mayor que 0 y expresa la importancia relativa del ítem
  dentro de la rúbrica (por ejemplo 3, 2, 1). No tienen que sumar 100.
- `criterios` es una lista de **códigos oficiales** del currículo que ese ítem
  evalúa, elegidos SOLO entre los que aparecen en «Mis datos».
- Los 4 `descriptor` deben describir qué hace el alumno en ese nivel, con
  lenguaje observable y progresivo (de menos a más).
- `unidad` y `nivel` son opcionales: déjalos como cadena vacía si no aplican.
- Escribe todo en español.

## Mis datos

- Asignatura:
- Curso:
- Criterios disponibles (código — descripción):
  - CÓDIGO1 —
  - CÓDIGO2 —
- Ítems que quiero evaluar (orientativo, si lo sabes):
- Nivel ACI (déjalo vacío si es para todo el alumnado):

---

## Notas para el docente

- **De dónde salen los códigos**: en EvalCrit, vista **Currículo** → elige la
  asignatura y verás cada criterio con su código (p. ej. `LCL3`) y su peso.
- **Cómo importarlo** (cuando el importador esté listo): Instrumentos →
  «Importar rúbrica» → pega el JSON. EvalCrit valida los códigos contra la
  asignatura; si alguno no existe, avisa y no importa nada.
- **Peso vs. criterio**: en la rúbrica, el `peso` ordena los ítems entre sí
  (la nota de la rúbrica es una media ponderada). Las ponderaciones oficiales
  por criterio siguen rigiendo la nota de la evaluación en la Cuadrícula.
