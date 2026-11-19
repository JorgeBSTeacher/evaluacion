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
- [ ] Fase 3: Inicio (pendientes, backup, accesos rápidos).
- [ ] Fase 4: Informes (contexto único, subvistas).
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
