# Exclusión de instrumento por alumno y media sin notas

## Objetivo

1. Por defecto (`sinNotaEsCero = false`), las notas no puestas no cuentan en
   ninguna media, ni como 0 ni como nada, salvo que el docente lo marque
   expresamente en Configuración → Calificación.
2. Poder excluir a un alumno de un instrumento concreto desde la vista de
   corrección (click en el nombre → «No realiza esta evaluación»). La exclusión
   excluye siempre, con independencia del ajuste anterior, y no queda pendiente.

## Problema

- El default real de `sinNotaEsCero` era `true` (las notas no puestas valían 0),
  mientras que el comentario del modelo y el fallback del modal decían `false`.
  Tres fuentes distinas para una sola regla.
- No existía forma de marcar que un alumno no se evalúa en un instrumento: en
  la cuadrícula quedaba como «sin corregir» para siempre y en «Corregir · N
  pendientes».

## Alcance autorizado

- `js/storage.js` — default y normalización de `configuracion.sinNotaEsCero`.
- `js/views-instrumentos.js` — click en el nombre, marca `noRealiza`, badge,
  limpieza al escribir, `tieneNota` y `notaFila`.
- `js/calc.js` — `notaInstrumento`, `logroCriterioEnInstrumento`,
  `progresoInstrumento`.
- `js/views-cuadricula.js` — `instrumentoEvaluado`, badge en la celda,
  `mediaUdAlumno`.
- `js/views-informe.js` — propagación a través del motor (sin código nuevo si el
  motor ya respeta `noRealiza`).
- `css/styles.css` — `.nombre-alumno` e insignia.
- `tools/checks.js` — comprobaciones nuevas.

## Tareas

- [x] T1 `sinNotaEsCero` por defecto a `false` y normalización en `migrar()`.
- [x] T2 Modelo `registros[instId][alumnoId].noRealiza` y reglas de limpieza.
- [x] T3 Click en el nombre en corrección y panel «No realiza esta evaluación».
- [x] T4 Efectos en el motor y en la cuadrícula.
- [x] T5 Comprobaciones y build.

## Evidencia de verificación (2026-11-19)

- `node tools/checks.js` → `TODO OK: 735 comprobaciones` (antes 716; +18 nuevas y
  `D74-32f`; corregidos `D74-32d`, `D74-47`, `D74-49`, `D74-50`).
- `node tools/build-singlefile.js --check` → sincronizado (531 KB).
- Spot check en arnés: default `false`; un alumno con nota pasa a `null` al
  marcarlo; `progresoInstrumento` lo saca del total y de pendientes; el logro
  del criterio sale `null`.

Ruta: delegado directo (un writer) + spot check del orquestador.

## Revisión nativa (RDD)

- RDD on (global). `gentle-ai review assess` → risk `medium`, 442 líneas
  (`slice_budget_reached`). Linaje `review-02fb90447d3a51e3`.
- El transporte del revisor no está disponible en este runtime:
  `gentle-ai review opencode-transport` → `immutable_review_transport_unsupported`
  y el revisor de Claude Code no está instalado (`claude` no está en PATH).
- El usuario declinó el candidato: `action: declined`,
  `consent: declined_this_candidate`, target identity coincidente. La entrega se
  apoya en la verificación de checks + spot check.

## Criterios de aceptación

- Una instalación nueva tiene `sinNotaEsCero = false`.
- Un instrumento con un alumno `noRealiza` no cuenta en `notaInstrumento`, en
  `logroCriterioEnInstrumento`, en `progresoInstrumento` (no pendiente) ni en la
  media de la UD.
- La cuadrícula y la corrección lo muestran con una insignia distinta de
  «sin corregir».
- `node tools/checks.js` en verde y `dist/evalora.html` sincronizado.

## Verificación

- `node --check` de los js tocados.
- `node tools/checks.js`.
- `node tools/build-singlefile.js` y `node tools/build-singlefile.js --check`.

## Rutas

- Delegado directo ( writer ): toca 7 ficheros no triviales → writer único.
