# Remodelación de la navegación

## Objetivo

Reorganizar la navegación por tareas: `Inicio · Corregir · Evaluación ·
Informes · Ajustes`. Alcance: navegación y agrupación, **sin tocar `Calc` ni el
modelo de datos**. El móvil va aparte (M-16).

## Decisiones (Fase 0)

- La cuadrícula (Calificaciones) es la vista principal de **Evaluación**;
  **Informes** queda como análisis solo lectura.
- Se mantienen **alias** de rutas y vistas antiguas.
- Se renombra en la UI y se actualizan SSOT, README y anexo.

## Fases

- [x] Fase 0: auditoría (`docs/PLAN-REMODELACION-NAVEGACION.md`).
- [x] Fase 1: menú principal con alias (mapeo temporal con acceso preservado).
- [ ] Fase 2: reubicación (corrección a Corregir, montaje a Evaluación,
  Configuración a Ajustes).
  - [x] Fase 2a: Evaluación agrupa las subpestañas `Cuadrícula · Instrumentos ·
    Alumnos · Clases · Currículo`.
  - [x] Fase 2b: Corregir es su vista (cola de pendientes por clase).
- [x] Fase 3: Inicio (pendientes, backup, accesos rápidos).
- [x] Fase 4: Informes (contexto único, subvistas).
  - [x] Fase 4a: Informes es una **vista propia y autónoma** (`informes`), con
    selector de clase y de nivel propios y botón «Imprimir / PDF»; la Cuadrícula
    pierde la pestaña «Informe» (queda Instrumentos · Criterios · Competencias
    específicas y clave). El reagrupado y renombrado de subvistas va en 4b.
  - [x] Fase 4b: las subvistas se reagrupan a **5** (`Resumen · Atención ·
    Criterios · Alumnos · Instrumentos`): la Distribución vive como bloque
    secundario del Resumen y Atención sustituye a Hallazgos (con alias de los
    ids antiguos `hallazgos`/`distribucion`); el alcance avisa de cuánto
    alumnado ve el filtro de nivel («Estás viendo N de M alumnos»).
- [ ] Fase 5: pulido (360 px, teclado, estados).

## Mapeo de la Fase 1

| Sección | Vista actual |
|---|---|
| Inicio | `inicio` |
| Corregir | `instrumentos` |
| Evaluación | `cuadricula` |
| Informes | `cuadricula` con pestaña `informe` |
| Ajustes | Configuración (modal) |

Las vistas de preparación (`alumnos`, `clases`, `curriculo`) siguen accesibles
por su hash. La vista auxiliar `montaje` se retiró más tarde (petición del
docente de 2026-11-19): Evaluación ya agrupa esas vistas como subpestañas y su
ruta antigua redirige a la Cuadrícula.

## Mapeo de la Fase 2 (2a + 2b)

| Sección | Vista | Subpestañas |
|---|---|---|
| Inicio | `inicio` | — |
| Corregir | `corregir` (`InstrumentosView.renderCorregir`) | — |
| Evaluación | `cuadricula` (pestaña `notas`) | `cuadricula` · `instrumentos` · `alumnos` · `clases` · `curriculo` |
| Informes | `cuadricula` con pestaña `informe` | — |
| Ajustes | Configuración (modal) | — |

- **2a**: las vistas de preparación dejan de estar solo en Inicio/Montaje; son
  subpestañas de Evaluación y quedan accesibles también por su hash.
- **2b**: la corrección deja de ser la vista de Instrumentos. `Corregir` es la
  cola de pendientes de la clase, con selector de clase y botón
  «Corregir · N pendientes» por instrumento; al corregir, «Volver» regresa a la
  cola. `Instrumentos` sigue siendo la gestión (editar, duplicar, banco).
- El **subnav** (`#subnav`) es la segunda fila de la cabecera y se ve en todos
  los modos (topbar, fab, dock, drawer; el modo básico se retiró en
  2026-11-19); fuera de Evaluación no existe.
- Alias conservados: `ir('cuadricula')`, `ir('instrumentos')`, `ir('alumnos')`,
  `ir('clases')`, `ir('curriculo')` y `ir('montaje')` (este último redirige a
  la Cuadrícula desde que la vista se retiró).

## Mapeo de la Fase 4a

| Sección | Vista | Subvistas |
|---|---|---|
| Inicio | `inicio` | — |
| Corregir | `corregir` (`InstrumentosView.renderCorregir`) | — |
| Evaluación | `cuadricula` (pestaña `notas`) | `cuadricula` · `instrumentos` · `alumnos` · `clases` · `curriculo` |
| Informes | `informes` (`InformeView.render`, autónoma) | `resumen · atencion · criterios · alumnos · instrumentos` (Fase 4b) |
| Ajustes | Configuración (modal) | — |

- **4a**: el Informe deja de incrustarse en la Cuadrícula y trae su contexto
  completo: `#alc-clase` y `#alc-nivel` (base + niveles ACI, con «Todos los
  niveles» vía el centinela `__todas__`) junto a `#alc-periodo`, `#alc-unidad` e
  `#alc-instrumento`. Sin opciones externas usa su estado interno (la última
  clase, o la primera; nivel base).
- **4b**: las subvistas se reagrupan a 5 con nombres de Perplexity: `Resumen`
  (integra la Distribución como bloque secundario «Distribución de notas»),
  `Atención` (sustituye a Hallazgos; la función `htmlHallazgos` sigue siendo la
  misma), `Criterios`, `Alumnos` e `Instrumentos`. Los ids antiguos
  `hallazgos` y `distribucion` se aceptan como alias y se reasignan al
  renderizar. El PDF renombra su cabecera «Hallazgos» a «Atención» (mismas
  secciones). Bajo los selectores del alcance, el aviso «Estás viendo N de M
  alumnos» refleja el filtro de nivel (con el nivel efectivo de cada alumno,
  `Calc.nivelDeAlumno`), y si excluye alumnado añade el desglose por nivel
  (p. ej. «2 alumnos no incluidos: 2 en 4º»).
- La Cuadrícula queda con tres pestañas (Instrumentos · Criterios ·
  Competencias específicas y clave) y conserva su botón «Imprimir / PDF» con la
  opción «Informe de análisis», que pide el informe con SU clase, nivel y
  trimestre (`InformeView.informeHtml({ claseSel, nivelSel, periodo })`).
- La vista de Informes lleva su botón «Imprimir / PDF», que usa el mismo camino
  (`CuadriculaView.imprimirInforme` → `#informe-impresion`).
- Alias conservado: `ir('cuadricula', { tab: 'informe' })` redirige a
  `ir('informes')`.

## Verificación

- `node --check` de los js tocados.
- `node tools/checks.js`.
- `node tools/build-singlefile.js` y `--check`.

## Evidencia Fase 1 (2026-11-19)

- `node tools/checks.js` → `TODO OK: 746 comprobaciones` (5 secciones, alias y
  botón activo).
- `node tools/build-singlefile.js --check` → sincronizado (534 KB).
- La nav se pinta **después** de renderizar, para que la sección activa
  (Informes) conozca la pestaña que ha fijado la vista.

## Evidencia Fase 2a + 2b (2026-11-19)

- `node --check js/app.js && node --check js/views-instrumentos.js` → sin
  errores de sintaxis.
- `node tools/checks.js` → `TODO OK: 767 comprobaciones` (21 más que en Fase 1:
  cola de Corregir, subnav y sus cinco subpestañas, Evaluación activa en las
  cinco vistas, alias y subnav en los cinco modos de navegación).
- `node tools/build-singlefile.js` → `dist/evalora.html` (539 KB);
  `node tools/build-singlefile.js --check` → sincronizado.
- `SECCIONES.evaluacion` conserva `tab: 'notas'`: sin él, pulsar Evaluación
  estando en Informes no activa la sección (la pestaña seguiría en `informe`).
- El subnav se inserta junto a `#nav`, dentro de la cabecera, para que se vea
  también en los modos fab/dock/drawer, donde `#nav` se oculta.

## Evidencia Fase 3 (2026-11-19)

- `node --check js/app.js` → sin errores de sintaxis.
- `node tools/checks.js` → `TODO OK: 784 comprobaciones` (17 más que en Fase 2:
  conteo unificado de pendientes, orden del panel, botón «Corregir pendientes»,
  aviso de copia destacado, accesos rápidos, guía plegada/abierta y estado
  «Todo corregido»).
- `node tools/build-singlefile.js` → `dist/evalora.html` (543 KB);
  `node tools/build-singlefile.js --check` → sincronizado.
- El panel de pendientes usa `Calc.progresoInstrumento` sobre `db.instrumentos`:
  `N correcciones pendientes en M instrumentos` (con singular correcto) o
  «Todo corregido», con el botón de corrección deshabilitado cuando N=0.
- El aviso de copia solo destaca si hay datos y (`meta.cambiosSinCopia` o no
  `meta.ultimaExportacion`); si está al día sigue el aviso discreto actual.
- Con el montaje completo (grupos, alumnos, clases, criterios e instrumentos),
  «Montaje» y «Flujo recomendado» viajan en `<details>` cerrados; con la app
  vacía quedan abiertos. Los paneles de pendientes/cobertura/ACI suben por
  encima.

## Evidencia Fase 4a (2026-11-19)

- `node --check js/views-informe.js && node --check js/views-cuadricula.js &&
  node --check js/app.js` → sin errores de sintaxis.
- `node tools/checks.js` → `TODO OK: 795 comprobaciones` (11 más que en Fase 3:
  la sección Informes abre la vista propia con `#alc-clase` y `#alc-nivel` y sin
  pestañas de la cuadrícula; cambia de clase y de nivel con sus selectores;
  recuerda el contexto al re-renderizar sin opciones; el alias
  `ir('cuadricula', {tab:'informe'})` redirige a Informes; botón «Imprimir /
  PDF» cableado al camino de `CuadriculaView.imprimirInforme`).
- `node tools/build-singlefile.js` → `dist/evalora.html` (548 KB);
  `node tools/build-singlefile.js --check` → sincronizado.
- `SECCIONES.informes` pasa a `vista: 'informes'` (sin `tab`) y
  `SECCION_DE_VISTA.informes → informes`; `seccionActual()` ya no mira la
  pestaña de la cuadrícula (no existe la pestaña Informe).
- El «Informe de análisis» del modal de imprimir de la Cuadrícula pide el
  informe con su clase/nivel/periodo (`InformeView.informeHtml({...})`), que
  acepta ese alcance puntual y restaura después su estado: además arregla el
  caso de imprimir el análisis sin haber visitado nunca la vista de Informes
  (antes salía vacío si `informeHtml()` no tenía clase interna).

## Evidencia Fase 4b (2026-11-19)

- `node --check js/views-informe.js` → sin errores de sintaxis.
- `node tools/checks.js` → `TODO OK: 805 comprobaciones` (10 más que en
  Fase 4a: 5 subvistas con las etiquetas nuevas; la subvista `atencion`
  muestra los hallazgos; Resumen integra el bloque «Distribución de notas» y
  su enlace lleva a Atención; el PDF imprime la sección «Atención»; el alias
  de subvista `hallazgos`→`atencion` sigue enseñando el análisis y
  `distribucion` aterriza en Resumen; el aviso «Estás viendo N de M alumnos»
  refleja el filtro de nivel y desglosa la exclusión por nivel, sin
  exclusión con «Todos los niveles»).
- `node tools/build-singlefile.js` → `dist/evalora.html` (551 KB);
  `node tools/build-singlefile.js --check` → sincronizado.
- El alias se aplica al renderizar (`render()` reasigna `hallazgos`→
  `atencion` y `distribucion`→`resumen`), así que ni un estado interno viejo
  ni un residuo con `data-subvista` antiguo rompen la vista.
- El aviso de exclusión vive en `htmlAlcance` (bajo los selectores): N cuenta
  el alumnado con el nivel efectivo de cada alumno (`Calc.nivelDeAlumno`,
  adaptaciones de la clase), como la Cuadrícula para «Todos los niveles».

## Ajustes de la petición del docente (2026-11-19)

- `node --check js/app.js && node --check js/views-cuadricula.js &&
  node --check js/views-informe.js` → sin errores de sintaxis.
- `node tools/checks.js` → `TODO OK: 881 comprobaciones`.
- `node tools/build-singlefile.js` → `dist/evalora.html` (570 KB);
  `node tools/build-singlefile.js --check` → sincronizado.
- La vista `montaje` sale de `VISTAS` y `SECCION_DE_VISTA`; `ir('montaje')` y
  el hash `#montaje` redirigen a la Cuadrícula (la vista principal de
  Evaluación). Inicio pierde la tarjeta y la guía «Montaje»: queda la única
  guía «Flujo recomendado», plegada en cuanto la app tiene datos.
- El modo básico se elimina de `NAV_MODOS` y de `pintaNav()`
  (`SECCIONES_BASICAS`, la rama `basic` y `body.modo-basic` incluidos): una
  preferencia antigua `nav === 'basic'` cae en `topbar` al leerla, sin tocar
  `Storage`. Motivo: Evaluación ya agrupa las vistas de preparación como
  subpestañas, así que el menú completo ES el circuito diario.
- La impresión de la vista actual de la Cuadrícula (`imprimirVistaActual`)
  estrena la cabecera de perfil (`Storage.perfilHtml()`) en un bloque
  `.perfil-impresion` print-only, como el resto de imprimibles (D-74); sin
  perfil no se pinta nada.
- El isotipo de la cabecera es clicable a Inicio (`role="link"`,
  `title="Ir al inicio"`, `aria-label="Evalora · Ir al inicio"`,
  `tabindex="0"`, Enter/Espacio) con hover sutil, sin cambiar su tamaño.
