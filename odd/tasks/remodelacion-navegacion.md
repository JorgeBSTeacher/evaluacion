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
