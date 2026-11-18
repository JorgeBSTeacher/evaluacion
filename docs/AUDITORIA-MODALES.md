# Auditoría de modales · Evalora

Revisión de todos los modales de la app (noviembre 2026), hecha por un agente de
diseño/UI sobre el código real. No toca motor: es orden, claridad y patrones.

## Punto de partida

`UI.openModal` (`js/ui.js:36-83`) es un contenedor correcto y reutilizable (trampa
de foco, Escape, foco devuelto, `peligro`→`btn-peligro`). Los problemas de claridad
no están en el contenedor, sino en **qué se mete dentro y en qué orden**. Todos los
modales comparten el mismo pie de dos botones y 720 px de ancho.

## Inventario (19)

| # | Modal | Archivo | Coste |
|---|---|---|---|
| M1 | Configuración | `js/app.js:155` | L |
| M2 | Restablecer aplicación | `js/app.js:315` | S |
| M3 | Nuevo/Editar grupo | `js/views-alumnos.js:14` | S |
| M4 | Nuevo/Editar alumno | `js/views-alumnos.js:41` | S |
| M5 | Añadir varios alumnos | `js/views-alumnos.js:60` | S |
| M6 | Nueva asignatura / Recuperar currículo | `js/views-clases.js:188` | M |
| M7 | Editar asignatura | `js/views-clases.js:298` | S |
| M8 | Nueva clase | `js/views-clases.js:329` | S |
| M9 | Niveles ACI | `js/views-clases.js:479` | L |
| M10 | Imprimir / PDF | `js/views-cuadricula.js:331` | M |
| M11 | Nuevo/Editar criterio | `js/views-curriculo.js:15` | M |
| M12 | Nueva competencia específica | `js/views-curriculo.js:63` | S |
| M13 | Nuevo/Editar instrumento | `js/views-instrumentos.js:155` | L |
| M14/M15 | Banco de instrumentos | `js/views-instrumentos.js:455,492` | S/M |
| M16 | ¿Qué quieres corregir? | `js/views-instrumentos.js:556` | S |
| M17 | Examen paralelo | `js/views-instrumentos.js:797` | S |
| M18 | Importar rúbrica IA | `js/views-instrumentos.js:921` | M |
| M19 | Confirmaciones nativas (`confirm()`) | `views-alumnos.js:152,161`, `views-curriculo.js:232` | S |

## Patrones comunes (lo que se repite)

1. **El foco cae en el botón de cerrar**: `enfocarModal` elige `lista[0]` y el `×`
   va antes del cuerpo en el DOM. Ningún cuerpo usa `[autofocus]`, que la función
   ya soporta.
2. **Validaciones con `alert()` nativo**: en casi todos los modales. Tapa el modal,
   no usa la paleta y no enfoca el campo con error.
3. **Objetivos táctiles de 32 px** en `.btn-mini`, `.icon-btn` y `.chip`.
4. **Pie sin patrón único**: M10 deja la acción principal en el cuerpo; M14/M15/M16
   dejan solo «Cerrar».
5. **El botón de «añadir» queda fuera del `label`** que cabece la lista (M9, M13).
6. **Campos opcionales y obligatorios mezclados** sin marcar.
7. **Etiquetas en mayúsculas de 12 px** ilegibles cuando son largas.
8. **Avisos largos arriba del todo** (M9, M6, M13).
9. **Modales anchos sin adaptar a móvil** (rúbrica, importar rúbrica).
10. **Títulos que no describen la acción** en los dos modos (M6, M17).

## Propuesta priorizada

### P0 · imprescindible (móvil, claridad mínima)
- **Transversal**: enfocar el primer campo del cuerpo (no el `×`).
- **M10**: mover el botón `#imp-go` al pie (`textoGuardar` + `alGuardar`).
- **M13**: quitar el scroll horizontal de la rúbrica en móvil (`@media`).
- **M4**: unificar el orden **Apellidos → Nombre** con la tabla y el alta múltiple.
- **M19**: sustituir los `confirm()` nativos por un modal de confirmación.
- **Transversal**: sustituir los `alert()` por mensaje inline o `toast` de error.

### P1 · importante (orden y jerarquía)
- **M13**: reordenar al flujo (Título → Tipo → Unidad → Nivel → Periodo → Fecha →
  Apartados → Saberes → Enlace) y mover el selector de modo junto a los apartados.
- **M13**: renombrar los tres controles llamados «Criterios» (modo, globales, botón).
- **M13**: aclarar los dos campos «Saberes».
- **M9**: plegar la explicación de ACI y la asignación de alumnado.
- **M6**: añadir Curso en el alta en blanco; botón según el modo («Crear» / «Cargar»).
- **M11**: reordenar a Descripción → Código → Peso y mostrar la suma de ponderaciones.
- **M10**: numerar los radios y sacar el `select` de alumno a su fila.
- **M1**: que el toggle de calificación no cierre el modal.
- **M15**: aclarar que el periodo se aplica a la copia, no al molde.
- **M17**: sin niveles, abrir sin `alGuardar` (no duplicar «Cancelar» y «Cerrar»).
- **Transversal**: `.btn-mini`/`.icon-btn`/`.chip` a 40 px; pie con Cancelar a la
  izquierda y la acción a la derecha.

### P2 · deseable
- M1: índice/saltos entre bloques. M2: cuantificar el borrado. M5: `textarea` de 4-5
  filas. M12: permitir editar competencias. M11: descripción en el chip. M16: fecha.
  M18: plegar el paso 1 y mover el periodo. M6: plegar el aviso. M9: lenguaje del
  docente. M13: rellenar el hint de currículo al abrir.

## Orden de trabajo recomendado

1. **Cimientos** (sin tocar modales): foco, pies, tallas táctiles, confirmación
   reutilizable. En `js/ui.js` y `css/styles.css`.
2. **M10** (Imprimir/PDF).
3. **M4 + M5** (alumnos).
4. **M19 + M2** (confirmaciones).
5. **M6 + M7 + M8** (asignaturas y clases).
6. **M11 + M12** (currículo).
7. **M9** (niveles ACI).
8. **M14/M15/M16/M17** (banco, corregir, paralelo).
9. **M13** (instrumento, el último: más dependencias).
10. **M18** (importar rúbrica).

## Reglas para no romper la app

- No cambiar los `id` de los campos (los leen los manejadores y el arnés).
- No alterar la firma de `UI.openModal` salvo para añadir un `textoCancelar` opcional.
- Mantener `App.refrescar()` tras guardar.
- Regenerar `dist/evalora.html` solo cuando el cambio esté verificado en `index.html`.
