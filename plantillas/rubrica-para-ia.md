# Plantilla para que una IA genere rúbricas de Evalora

> **Atajo**: no hace falta copiar nada de aquí. En Evalora, entra en
> **Instrumentos → «Importar rúbrica (IA)»** y el botón **«Copiar instrucciones»**
> ya te da este texto relleno con los códigos reales de la asignatura.

Pega en **cualquier chat** (ChatGPT, Claude, Gemini, Copilot…) las instrucciones y
rellena los huecos marcados con `___`. La IA devolverá un **JSON** que Evalora
podrá importar como rúbrica.

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
  "titulo": "___",
  "unidad": "___",
  "nivel": "",
  "items": [
    {
      "criterio": "___",
      "peso": 1,
      "criterios": ["CODIGO"],
      "niveles": [
        { "pct": 25, "descriptor": "___" },
        { "pct": 50, "descriptor": "___" },
        { "pct": 75, "descriptor": "___" },
        { "pct": 100, "descriptor": "___" }
      ]
    }
  ]
}
```

Reglas obligatorias:

- `tipo` siempre `"rubrica-evalcrit"` y `version` siempre `1`.
- **Cada ítem tiene exactamente 4 niveles**, de más bajo a más alto
  (`pct` 25 → 50 → 75 → 100). No cambies los porcentajes.
- `criterio` es el nombre del ítem evaluado (texto libre, breve).
- `peso` es un número mayor que 0 y expresa la importancia relativa del ítem
  dentro de la rúbrica (por ejemplo 3, 2, 1). No tienen que sumar 100.
- `criterios` es una lista de **códigos oficiales** del currículo que ese ítem
  evalúa, elegidos SOLO entre los que aparecen en «Mis datos».
- Los 4 `descriptor` describen qué hace el alumno en ese nivel, con lenguaje
  observable y progresivo (de menos a más).
- `unidad` y `nivel` son opcionales: déjalos como cadena vacía si no aplican.
- Escribe todo en español.

## Mis datos

- Asignatura: ___   Curso: ___
- Ítems que quiero evaluar: ___
- Nivel ACI (déjalo vacío si es para todo el alumnado): ___
- Criterios disponibles (usa SOLO estos códigos):
  - CODIGO1 —
  - CODIGO2 —

---

## Notas para el docente

- **De dónde salen los códigos**: el botón «Copiar instrucciones» de Evalora ya
  los rellena. A mano: vista **Currículo** → elige la asignatura y verás cada
  criterio con su código (p. ej. `MAT 1.1`) y su ponderación.
- **Cómo importarlo**: Instrumentos → «Importar rúbrica (IA)» → pega el JSON →
  elige el periodo → Importar. Evalora valida los códigos contra la asignatura;
  si alguno no existe, avisa y **no importa nada**.
- **Qué pasa si el chat se equivoca**: no toques el JSON a mano. Pídele al chat
  que lo corrija («el nivel 2 del ítem de ortografía debe ser…») y vuelve a pegar
  el resultado. Para retoques finos, edita la rúbrica ya importada en la propia
  cuadrícula de Evalora (criterio · peso · nivel 1 … nivel 4).
- **Peso vs. criterio**: en la rúbrica, el `peso` ordena los ítems entre sí (la
  nota de la rúbrica es una media ponderada). Las ponderaciones oficiales por
  criterio siguen rigiendo la nota de la evaluación en la Cuadrícula.
