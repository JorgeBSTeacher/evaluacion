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
- [ ] Fase 4: Informes (contexto único, subvistas).
  - [x] Fase 4a: Informes es una **vista propia y autónoma** (`informes`), con
    selector de clase y de nivel propios y botón «Imprimir / PDF»; la Cuadrícula
    pierde la pestaña «Informe» (queda Instrumentos · Criterios · Competencias
    específicas y clave). El reagrupado y renombrado de subvistas va en 4b.
- [ ] Fase 5: pulido (360 px, teclado, estados).

## Mapeo de la Fase 1

| Sección | Vista actual |
|---|---|
| Inicio | `inicio` |
| Corregir | `instrumentos` |
| Evaluación | `cuadricula` |
| Informes | `cuadricula` con pestaña `informe` |
| Ajustes | Configuración (modal) |

Las vistas de preparación (`alumnos`, `clases`, `curriculo`, `montaje`) siguen
accesibles desde Inicio/Montaje y por su hash.

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
  los modos (topbar, fab, dock, drawer, basic); fuera de Evaluación no existe.
- Alias conservados: `ir('cuadricula')`, `ir('instrumentos')`, `ir('alumnos')`,
  `ir('clases')`, `ir('curriculo')` y `ir('montaje')`.

## Mapeo de la Fase 4a

| Sección | Vista | Subvistas |
|---|---|---|
| Inicio | `inicio` | — |
| Corregir | `corregir` (`InstrumentosView.renderCorregir`) | — |
| Evaluación | `cuadricula` (pestaña `notas`) | `cuadricula` · `instrumentos` · `alumnos` · `clases` · `curriculo` |
| Informes | `informes` (`InformeView.render`, autónoma) | `resumen · hallazgos · criterios · distribucion · alumnos · instrumentos` (sin renombrar hasta 4b) |
| Ajustes | Configuración (modal) | — |

- **4a**: el Informe deja de incrustarse en la Cuadrícula y trae su contexto
  completo: `#alc-clase` y `#alc-nivel` (base + niveles ACI, con «Todos los
  niveles» vía el centinela `__todas__`) junto a `#alc-periodo`, `#alc-unidad` e
  `#alc-instrumento`. Sin opciones externas usa su estado interno (la última
  clase, o la primera; nivel base).
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
