# Plan de remodelación de la navegación (Fase 0: auditoría)

Documento de trabajo para la primera mejora del índice: la **remodelación de la
navegación por tareas**. Alcance acordado: **navegación y agrupación**
(vista + reubicación, con alias), sin tocar `Calc` ni el modelo de datos. El
**móvil** va aparte, como mejora propia.

Objetivo de la remodelación: que el docente sepa qué tiene pendiente al abrir
la app, corrija en el mínimo número de pasos, prepare la evaluación sin
recordar dónde está cada cosa y consulte informes según una pregunta concreta.

---

## 0. Índice de mejoras pendientes

| ID | Mejora | Prioridad | Estado |
|---|---|---|---|
| **M-01** | **Remodelación de navegación por tareas** (`Inicio · Corregir · Evaluación · Informes · Ajustes`) | Alta | **En curso (Fases 4a y 4b hechas; pendiente 5)** |
| M-02 | Indicador de backup y «Guardar» como acción de copia (con estado) | Alta | **Hecha** — indicador permanente en la cabecera (Copia al día · Cambios sin copia · Copia antigua · N días · Sin copia) + «Guardar» que sobrescribe el JSON elegido; «Hacer backup» en Inicio. Etiqueta «Guardar» a petición del docente |
| M-03 | Unificar «pendientes» (misma unidad y fuente en Inicio y Calificaciones) | Alta | **Hecha (Fase 3)** |
| M-04 | Chip del ajuste `sinNotaEsCero` visible en Calificaciones | Media | **Hecha** — insignia en la cabecera de la Cuadrícula (las 3 pestañas): «Sin corregir cuenta como 0» / «Sin corregir no cuenta» |
| M-05 | Diferenciar visualmente los 3 niveles de navegación (barra / pestañas / chips) | Media | **Hecha** — nivel 2 como pestañas subrayadas (subnav en fila blanca y pestañas de la Cuadrícula) y nivel 3 como chips pequeños |
| M-06 | Filtro único y contexto visible en Informes (sin selector de periodo duplicado) | Alta | **Hecha (Fase 4a)**: Informes es una vista propia con su contexto completo (clase, nivel, periodo, unidad, instrumento); ya no hay selector duplicado con la Cuadrícula |
| M-07 | Renombrar y reagrupar las subvistas de Informe | Media | **Hecha (Fase 4b)**: 5 subvistas `Resumen · Atención · Criterios · Alumnos · Instrumentos`; la Distribución vive dentro del Resumen y los ids antiguos quedan como alias |
| M-08 | Menú ⋯ por instrumento (dejar 2 acciones visibles) | Media | **Hecha** — fila con Corregir + ⋯ que abre el modal de acciones (Editar · Duplicar · Al banco · Eliminar) |
| M-09 | Diferenciar estados en la cuadrícula (`Pend.` / `N/A` / `No realiza`) y menú contextual | Media | **Hecha** — celda sin corregir = chip «Pend.» discontinuo (toca para corregir); «N/A» atenuado sin botón en «Todos los niveles»; clic derecho (o clic izquierdo en «No realiza») abre el menú de celda: Corregir · Marcar/quitar «No realiza esta evaluación» · Cancelar |
| M-10 | Tooltips en chips de nivel y códigos de criterio | Media | **Hecha** |
| M-11 | Contraste y tamaño mínimo (≥12 px); no depender solo del color | Alta | **Hecha** |
| M-12 | Modo privacidad (nombres → iniciales) para proyectar/imprimir | Media | **Hecha** — estado solo de sesión (`App.esAnonimo/nombreVisible/toggleAnonimo`); iniciales «G. J.» en la Cuadrícula (3 pestañas), el Informe y los informes imprimibles; conmutador único de icono de ojo (`App.crearBotonPrivacidad`) en Cuadrícula e Informe: un clic oculta, mantener pulsado ≥1 s vuelve a mostrar; la corrección mantiene el nombre |
| M-13 | Inicio adaptativo (plegar montaje/flujo, KPI de pendientes y copia) | Media | **Hecha (Fase 3)** |
| M-14 | Accesos duplicados: unificar o documentar | Baja | Pendiente |
| M-15 | Revisar estado activo/hover del menú | Baja | Pendiente |
| M-16 | Móvil: bottom tab bar y corrección a pantalla completa | Media | **Apartada** (mejora propia) |
| M-17 | Agrupar instrumentos por nombre con variantes por nivel | Baja | **Hecha** — en cada bloque de unidad, los instrumentos con el mismo título (insensible a mayúsculas y espacios) forman un grupo: fila de grupo (título · N variantes · pendientes del grupo) + una fila por variante con el nivel como primera celda; un título único sigue como fila normal y sus acciones (Corregir + ⋯) funcionan por fila |

---

## 1. Inventario de la navegación actual

### 1.1 Vistas de primer nivel (`js/app.js:2-18`)

| id | label | notas |
|---|---|---|
| `inicio` | Inicio | paneles + accesos |
| `alumnos` | Alumnos y grupos | — |
| `clases` | Asignaturas y clases | — |
| `curriculo` | Currículo | `riesgo` |
| `instrumentos` | Instrumentos | — |
| `cuadricula` | Calificaciones | — |
| `montaje` | Montaje | `soloBasica` |

Navegación por `ir(id)` + hash `#id` (`js/app.js:628-636`, `695-696`).

### 1.2 Modos de navegación (`js/app.js:549-611`)

`topbar` (por defecto), `fab`, `dock`, `drawer`, `basic`. Se elige en
Configuración → Tema y menús (`#nav-modo`, `js/app.js:286-291`).

> **Nota (2026-11-19)**: el modo `basic` **se retira** a petición del docente:
> con Evaluación agrupando las vistas de preparación como subpestañas, el
> circuito diario ya ES el menú completo, así que la versión «reducida» no
> aporta nada. Una preferencia antigua con `tema.nav === 'basic'` cae en
> `topbar` al leerla en `pintaNav()` (retrocompatibilidad, sin migrar
> `Storage`), y el selector ya no ofrece la opción. La vista `montaje`
> desaparece con él: `ir('montaje')` redirige a la Cuadrícula.

### 1.3 Pestañas y subvistas

- **Cuadrícula** (`views-cuadricula.js:534-537`): `notas · criterios ·
  competencias · informe`.
- **Informe** (`views-informe.js:70-77`): `resumen · hallazgos · criterios ·
  distribucion · alumnos · instrumentos`, con selectores de periodo/unidad/
  instrumento (`:48-64`) y sincronía de periodo con la cuadrícula (`:694-701`).
- **Instrumentos** (`views-instrumentos.js`): bloques trimestre → unidad
  (`:77-89`, `:1115-1129`) y corrección (`renderCorreccion`, `:653`).

### 1.4 Modales (19)

Configuración y Restablecer (`app.js`); Imprimir (`views-cuadricula.js:349`);
criterio y competencia (`views-curriculo.js:15,63`); grupo, alumno y alta masiva
(`views-alumnos.js:14,41,60`); asignatura, clase y ACI
(`views-clases.js:188,298,329,479`); instrumento, criterios de apartado, banco,
corregir, no-realiza, examen paralelo e importar rúbrica
(`views-instrumentos.js:158,353,495,532,596,629,914,1038`).

### 1.5 Acciones por fila

- **Instrumentos** (`views-instrumentos.js:1168-1175`): Corregir, Editar,
  Duplicar, Al banco, Eliminar.
- **Cuadrícula**: corregir, crear instrumento, imprimir, plegar UD, tocar nota
  para corregir, tocar cabecera para editar.

### 1.6 Accesos duplicados (bronces)

- **Crear instrumento**: Instrumentos, Cuadrícula, importar rúbrica.
- **Corregir**: Cuadrícula (botón), Cuadrícula (nota), Instrumentos (fila),
  `modalCalificar`. **Cuatro entradas.**
- **Abrir currículo**: nav, Inicio, Montaje.
- **Ver informe**: pestaña Informe e impresión «Informe de análisis».
- **Configuración**: cabecera y F2.

---

## 2. Estructura propuesta

```text
Inicio · Corregir · Evaluación · Informes · Ajustes
```

- **Inicio**: qué tengo pendiente hoy (correcciones, backup, currículo).
- **Corregir**: instrumentos pendientes + corrección por alumno + «No realiza».
- **Evaluación**: preparar y revisar (grupos/alumnos, clases, currículo,
  instrumentos, banco, **cuadrícula**).
- **Informes**: solo lectura (resumen, atención, criterios, alumnos,
  instrumentos).
- **Ajustes**: Configuración.

---

## 3. Correspondencia

| Actual | Propuesta | Acción | Frecuencia | Riesgo | Fase 2 |
|---|---|---|---|---|---|
| `inicio` | Inicio | mantener (rediseñar paneles, M-13) | diaria | medio | — |
| `cuadricula` (pestañas Notas/Criterios/Competencias) | **Evaluación** (subpestaña Cuadrícula) | mover | diaria | medio | Hecha (2a) |
| `instrumentos` (gestión) | Evaluación (subpestaña Instrumentos) | mover | semanal | bajo | Hecha (2a) |
| `alumnos`, `clases`, `curriculo` | Evaluación (subpestañas) | mover | occasional | bajo | Hecha (2a) |
| `montaje` | Evaluación (vista auxiliar) | **disolver**: su guía pasa a Evaluación | — | bajo | Hecha (2a) |
| subvistas de `informe` | Informes | mover + renombrar (M-07) | diaria | medio | Hecha (Fase 4a y 4b) |
| Configuración | Ajustes | renombrar | rara | bajo | Hecha (Fase 1) |
| modos `fab`/`dock`/`drawer` | variaciones de presentación | mantener (con subnav) | — | bajo | Hecha (2a) |
| Corrección (`renderCorreccion`) | **Corregir** (vista propia: cola de pendientes) | mover | diaria | medio | Hecha (2b) |
| Botón Guardar | acción de copia con estado (M-02) | rediseñar | — | medio | Pendiente |

---

## 4. Decisiones de la Fase 0 (cerradas)

1. **Cuadrícula → Evaluación**: el cuaderno de notas es la vista principal de
   Evaluación; **Informes** queda como análisis solo lectura.
2. **Alias**: se mantienen las rutas y funciones antiguas como equivalentes, para
   no romper ningún acceso.
3. **Nombres**: se renombran en la UI (Calificaciones, Informe) y se actualizan
   el SSOT, el README y el anexo en la misma fase.

---

## 5. Plan por fases

- **Fase 0 — Auditoría** (este documento).
- **Fase 1 — Menú principal**: `Inicio · Corregir · Evaluación · Informes ·
  Ajustes`, con alias y sin pérdida de funciones.
- **Fase 2 — Reubicación**: corrección a Corregir (2b); vistas de preparación
  como subpestañas de Evaluación (2a); Configuración a Ajustes (Fase 1). El
  subnav de Evaluación (`#subnav`) se muestra en todos los modos.
- **Fase 3 — Inicio**: panel de pendientes, estado de backup y accesos rápidos. **Hecha**.
- **Fase 4 — Informes**: contexto único, renombrado de subvistas y avisos de
  exclusión. **Hecha (4a y 4b)**: 4a — Informes es una vista propia y autónoma
  (selectores propios de clase y nivel, botón «Imprimir / PDF»); la Cuadrícula
  pierde la pestaña «Informe» y queda con Instrumentos · Criterios ·
  Competencias. 4b — las subvistas se reagrupan a 5 (`Resumen · Atención ·
  Criterios · Alumnos · Instrumentos`): la Distribución vive como bloque
  secundario del Resumen, Atención sustituye a Hallazgos (con alias de los ids
  antiguos) y el alcance avisa «Estás viendo N de M alumnos», con desglose
  cuando el filtro de nivel excluye alumnado.
- **Fase 5 — Pulido**: 360 px, teclado, estados vacío/carga/error.
- **Aparte**: mejora de móvil (M-16).

## 6. Criterios de aceptación (globales)

- Todas las funciones anteriores siguen accesibles.
- Las rutas antiguas tienen equivalencia (alias).
- Ninguna función duplicada en más de dos lugares.
- Máximo 5 secciones principales.
- `node tools/checks.js` en verde y `node tools/build-singlefile.js --check`.

---

## 7. Evidencia Fase 3 (2026-11-19)

- `node tools/checks.js` → `TODO OK: 784 comprobaciones`.
- `node tools/build-singlefile.js` → `dist/evalora.html` (543 KB);
  `node tools/build-singlefile.js --check` → sincronizado.
- Inicio: aviso de copia destacado solo con cambios sin copia o sin exportación;
  panel «Pendientes» con el conteo unificado de `Calc.progresoInstrumento` y
  botón deshabilitado cuando N=0; accesos rápidos (Corregir, Informes, Crear
  instrumento, backup); «Montaje» y «Flujo recomendado» en `<details>` cerrados
  con el montaje completo y abiertos con la app vacía.

## 8. Evidencia Fase 4a (2026-11-19)

- `node tools/checks.js` → `TODO OK: 795 comprobaciones`.
- `node tools/build-singlefile.js` → `dist/evalora.html` (548 KB);
  `node tools/build-singlefile.js --check` → sincronizado.
- `Informes` abre la vista propia (`informes`): `InformeView.render(el, {})` es
  autónomo — `#alc-clase` y `#alc-nivel` (base + ACI, «Todos los niveles») junto
  a los selectores de periodo/unidad/instrumento, y botón «Imprimir / PDF» que
  imprime por el mismo camino que la Cuadrícula
  (`CuadriculaView.imprimirInforme` → `#informe-impresion`).
- `CuadriculaView` pierde la pestaña «Informe» (queda Instrumentos · Criterios ·
  Competencias específicas y clave) y exporta `imprimirInforme`; su opción
  «Informe de análisis» pide `InformeView.informeHtml({ claseSel, nivelSel,
  periodo })` — alcance puntual que `informeHtml()` acepta y restaura.
- Alias: `ir('cuadricula', { tab: 'informe' })` redirige a `ir('informes')`.

## 9. Evidencia Fase 4b (2026-11-19)

- `node tools/checks.js` → `TODO OK: 805 comprobaciones` (10 más que en Fase
  4a).
- `node tools/build-singlefile.js` → `dist/evalora.html` (551 KB);
  `node tools/build-singlefile.js --check` → sincronizado.
- Subvistas reagrupadas a 5: `Resumen · Atención · Criterios · Alumnos ·
  Instrumentos`. La Distribución ya no es subvista: vive como bloque
  secundario del Resumen («Distribución de notas», reutilizando
  `htmlDistribucion` con el nivel activo). Atención llama a la misma función
  de hallazgos y el PDF renombra su sección a «Atención».
- Alias de subvista al renderizar: `hallazgos`→`atencion` y
  `distribucion`→`resumen` (un estado interno viejo o un residuo con el
  `data-subvista` antiguo no rompen la vista).
- Aviso de exclusión bajo los selectores del alcance: «Estás viendo N de M
  alumnos» (M = alumnado de la clase; N = el incluido por el filtro de nivel,
  con el nivel efectivo de cada alumno vía `Calc.nivelDeAlumno`); si excluye
  alumnado, desglose por nivel (p. ej. «2 alumnos no incluidos: 2 en 4º»);
  con «Todos los niveles» no excluye a nadie.

## 10. Evidencia M-10 y M-11 (2026-11-19)

- `node tools/checks.js` → `TODO OK: 848 comprobaciones` (11 más: M10-1…M10-5,
  M11-1…M11-6).
- `node tools/build-singlefile.js` → `dist/evalora.html` (562 KB);
  `node tools/build-singlefile.js --check` → sincronizado.
- **M-10 Tooltips**: helper `titleNivel` (duplicada en `views-instrumentos.js`
  y `views-informe.js` porque las superficies de edición no permiten un módulo
  común): base → «Currículo del curso de la asignatura»; ACI → «Nivel ACI
  <etiqueta>: se evalúa con el currículo de <asignatura>». Llevan `title` los
  badges de nivel de la fila de instrumentos, de la corrección y del Informe
  (Atención —con `nivelCodigo` añadido a los hallazgos— y Alumnos). Los códigos
  de las matrices ya llevaban `title` con la descripción (pestaña Criterios de
  la Cuadrícula y cabeceras verticales del Informe); se comprueban ahora en
  M10-3/M10-4, igual que el badge de código de «Criterios con dificultad» del
  Resumen, que estrena `title` y `aria-label`.
- **M-11 Contraste**: todas las `font-size` informativas suben a ≥ 12 px
  (`stat-label`, `stat-value small`, `chips-nivel-cuenta`, `col-saberes/
  col-peso small`, `rub-head`, `aci-ast`, `brand-txt small`, `nav-dock`,
  licencia y las inline del Informe). Excepciones documentadas en el propio
  CSS y en el check M11-2: `.ud-flecha` (11 px, flecha decorativa del plegado),
  el bloque `@media print` de `#informe-impresion` (10–11 px, plan previo de
  PDF) y `.estado-copia` en móvil (`font-size: 0`, oculta el rótulo entero).
- **M-11 No solo color (WCAG 1.4.1)**: los badges de estado llevan símbolo
  además del tono vía `::before` en CSS — `✓` en `ok`, `●` en `warn`,
  `▼` en `ko` — que cubre también los badges de nota de `Calc.badgeHtml` (el
  valor numérico ya distingue, el símbolo refuerza). Las barras de severidad
  de Atención estrenan `▼`/`●` con `title`, y la tabla de saberes pasa de
  `✓`/`✗` a «Domina»/«Mejorar» en texto.
  **Revisto (a petición del docente)**: el símbolo del semáforo se retira —
  en la cuadrícula añadía ruido y basta la nota (o la etiqueta) con el color.
  Ningún badge queda dependiendo solo del color: todos llevan su valor o su
  etiqueta como texto.

## 11. Ajustes de la petición del docente (2026-11-19)

- `node --check js/app.js && node --check js/views-cuadricula.js &&
  node --check js/views-informe.js` → sin errores de sintaxis.
- `node tools/checks.js` → `TODO OK: 881 comprobaciones`.
- `node tools/build-singlefile.js` → `dist/evalora.html` (570 KB);
  `node tools/build-singlefile.js --check` → sincronizado.
- **«Montaje» retirado y modo básico eliminado**: la vista `montaje` sale de
  `VISTAS` (con alias `ir('montaje')` → Cuadrícula, y el hash `#montaje`
  también), la tarjeta y la guía de Inicio ya no la mencionan (la guía única
  «Flujo recomendado» se pliega cuando la app tiene datos) y el modo `basic`
  desaparece de `NAV_MODOS`: `pintaNav()` reinterpreta una preferencia antigua
  `nav === 'basic'` como `topbar` (Evaluación ya agrupa las vistas de
  preparación, así que el circuito diario es el menú completo). En CSS se
  retiran las reglas `body.modo-basic …`, `.lista-montaje` y `.btn-montaje`.
- **Todos los imprimibles llevan el perfil docente**: el Informe de análisis y
  el imprimible de Criterios/Competencias ya lo tenían (D-74); la impresión de
  la **vista actual** (pestañas de la Cuadrícula, incluida Instrumentos) lo
  estrena: `CuadriculaView.imprimirVistaActual` inyecta al principio un bloque
  `.perfil-impresion` con `Storage.perfilHtml()` (nombre, centro y logo como
  blob:), oculto en pantalla y visible solo al imprimir; sin perfil no se
  pinta nada.
- **El isotipo de la cabecera es clicable**: `<span role="link"
  id="logo-inicio">` con `title="Ir al inicio"`, `aria-label="Evalora · Ir al
  inicio"` y `tabindex="0"`; clic y Enter/Espacio llevan a `ir('inicio')`, con
  `cursor: pointer` y hover sutil (brillo) sin cambiar el tamaño ni el isotipo.
