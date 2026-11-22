# Ficha del alumno — registrar y ver (fase 1)

## Objetivo
Ficha del alumno en **Alumnos y grupos** con dos modos: **registrar y ver**.
- **Entrada**: el botón «Editar» del listado pasa a llamarse **«Ficha»** (misma fila, mismo modal, ampliado). Motivo: el docente no encontraba cómo entrar — hoy solo existe un modal de edición.
- **Modal del alumno** = datos (como hoy) + bloque **«Historial»**:
  - **Anotaciones de la ficha**: se añaden con **fecha** (por defecto hoy, editable) y texto libre.
  - **Observaciones de los instrumentos** donde ese alumno tiene registro: **solo lectura**, con enlace al instrumento, marcadas como «instrumento».
  - Lista **ordenada por fecha** (más reciente arriba), con **marca de tipo** (ficha / instrumento).
- **Icono de aviso neutro** junto al nombre en el listado cuando el alumno tiene anotaciones de ficha.
- **Sin filtros** (fase 2, solo si la lista crece en uso real — decisión del docente pendiente).
- Las anotaciones **viajan con el alumno**: sobreviven a la promoción; al eliminar grupo van al archivo definitivo (`EVALUACIÓN_[curso].json`).
- **No interviene en cálculos** y **NUNCA sale en informes impresos** (material interno del docente).

## Modelo
- `db.alumnos[].notas = [{ fecha (ISO), texto }]`; `Storage.migrar` rellena `[]` en backups antiguos; viaja en el backup.
- Observaciones de instrumentos: localizar su almacén real en el modelo (registros de instrumento) — parte de la exploración.

## Fuera de alcance
- Filtros por fecha/tipo (fase 2). Cálculos e informes. Nada de Calc.

## Tareas
- [x] T1 · Explorar dónde viven las observaciones de instrumento por alumno y cómo se enlaza alumno↔instrumento. (Ruta: delegada) **Evidencia:** NO hay observaciones por alumno en el modelo: viven por INSTRUMENTO en `db.observaciones[instrumentoId]` (D-74c, cajetín del informe) y el enlace es `db.registros[instId][alumnoId]` (con alguna nota; la exclusión `noRealiza` no cuenta porque no hay notas que comentar). No se duplica nada: la ficha las LEE del almacén real en vivo (`Storage.historialAlumno`).
- [x] T2 · `js/storage.js`: notas del alumno (alta, migrar) y lectura de observaciones del alumno en sus instrumentos. (Ruta: delegada) **Evidencia:** `Storage.guardarNotaAlumno(alumnoId, fecha, texto)` (exige texto; fecha por defecto hoy) escribe `db.alumnos[].notas = [{ fecha (ISO), texto }]`; `migrar` rellena `[]` en backups antiguos; `Storage.historialAlumno(alumnoId)` junta ficha + instrumento ordenado por fecha descendente con `instrumentoId`/`instrumentoTitulo` para el enlace.
- [x] T3 · UI: botón «Ficha», historial en el modal, icono en el listado. (Ruta: delegada) **Evidencia:** fila con «Ficha» (normal y en privacidad, que conserva `${conNotas(a)}`); modal «Ficha del alumno» con bloque `#historial-alumno` (fecha editable hoy por defecto + texto + «Añadir»; lista `.historial-entrada` con badge «ficha»/«instrumento», observaciones SOLO LECTURA y botón `.nota-inst` que abre la corrección del instrumento con el alumno seleccionado); icono neutro `.icono-nota-alumno` (✎ gris) junto al nombre cuando hay anotaciones. CSS en `css/styles.css`.
- [x] T4 · `tools/checks.js`: alta y orden de fechas, observaciones visibles con enlace, icono condicional, notas que sobreviven a la promoción y viajan en el archivo al eliminar grupo. Test-first (RED→GREEN). (Ruta: delegada) **Evidencia:** RED observado (crash en `guardarNotaAlumno` inexistente + FAILs de fuente/UI). Durante el GREEN la batería cazó un defecto real: al añadir una anotación, el repintado del historial dejaba el enlace del instrumento SIN cablear (nodos nuevos sin el onclick) — arreglado re-cableando tras cada alta. GREEN **TODO OK: 1128**. Un check previo ajustado: la fila de privacidad del listado lleva ahora `${conNotas(a)}` (check de fuente D-74/M-12 actualizado).
- [x] T5 · Docs (SSOT), sellos `?v=`, build dist. (Ruta: delegada) **Evidencia:** SSOT §8 (bullet ficha) y §11 (nota ficha), fila v0.11.4 en §16; sellos `?v=202611221500` en storage.js, app.js, views-alumnos.js y styles.css; `node tools/build-singlefile.js` OK y `--check` OK.

## Restricciones
- Sin dependencias, scripts clásicos `file://` (D-05). No tocar `js/calc.js`.
- Arnés: reconsultar nodos tras render; sin `getBoundingClientRect`/`window.print`; `document.addEventListener` no-op; sin `replaceWith`.
- **NO commit ni push** — el docente prueba antes.

## Trampa del arnés que cazó el RED
- Las filas del listado van por apellidos (`Dos` antes que `Uno`): el primer `.editar-alumno` NO es a1. Los checks abren la ficha de la fila de «Ana» buscándola por texto.
- Tras `lista.innerHTML = …` dentro de un modal abierto, los nodos nuevos no heredan el onclick: los enlaces del historial se re-cablean tras cada alta (defecto real detectado por el check «el enlace del instrumento abre su corrección»).
