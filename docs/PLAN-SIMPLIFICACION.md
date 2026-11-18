# Plan de simplificación de interfaz · Evalora

Salida de la valoración de un agente de diseño gráfico/UI sobre el CSS y las vistas
reales (noviembre 2026). No toca motor, modelo de datos ni currículo: es jerarquía,
estructura y lenguaje.

## Contexto

El docente dice que la interfaz es **farragosa**: «un montón de datos, muy buenos,
pero que pueden abrumar si eres un usuario básico». La app se usa **de pie, con el
móvil en la mano**, y no puede añadir dependencias (funciona en `file://`).

## Diagnóstico (los 8 problemas, de más a menos doloroso)

1. **Cabecera no adaptada al móvil**: `.topbar` es sticky, wrap y sin media query;
   a 360 px envuelve en 3 filas (~180 px). `css/styles.css:31-39`, `index.html:20-42`.
2. **Seis vistas de primer nivel** que exigen conocer el modelo (grupo, asignatura,
   clase, nivel ACI, instrumento, criterio, competencia). `js/app.js:2-9`.
3. **Datos sin jerarquía**: todo a la vez (17 columnas de criterios, 6 subvistas del
   Informe al mismo nivel, tarjetas de 10 px). `js/views-cuadricula.js:158-174`,
   `js/views-informe.js:70-77`.
4. **Objetivos táctiles de 32 px** y la corrección **no fija la primera columna**
   (la Cuadrícula sí). `css/styles.css:162,164-170,333-338,214`.
5. **Pestañas sin semántica** y varias acciones primarias compitiendo en la misma
   pantalla. `js/views-cuadricula.js:502-524`.
6. **Modal de instrumento a pantalla entera**. `js/views-instrumentos.js:155-207`.
7. **Lenguaje de especialista** sin ayuda en línea (depende de `title`, invisible
   en móvil). P. ej. «Competencias específicas y clave», «logro», «ponderación».
8. **Estado de guardado**: un punto de 10 px sin texto. `css/styles.css:62-63`.

Nota: el plan de interfaz previo (`PLAN-INTERFAZ.md`) da por pendiente «corregir en
el alumno tocado», pero **ya está hecho** (`js/views-cuadricula.js:611-613` y
`js/views-instrumentos.js:753-757`). Ese punto del plan está desfasado.

## Propuesta priorizada

### P0 · imprescindible y barato (casi todo CSS/tokens)

| # | Qué | Coste |
|---|---|---|
| P0.1 | Cabecera móvil ≤2 filas: sin wrap, ocultar `.brand-txt small` en ≤640 px, nav con scroll o segmentada | S |
| P0.2 | Objetivos táctiles 44 px en `.btn-mini`, `.chip`, `.icon-btn`, `.segmentos` | S |
| P0.3 | Primera columna fija en la tabla de corrección (replicar `.tabla-cuadricula`) | S |
| P0.4 | Una acción primaria por pantalla («Corregir · N pendientes» manda) | S/M |

### P1 · importante

| # | Qué | Coste |
|---|---|---|
| P1.1 | Modo básico / avanzado (la dirección, abajo) | M/L |
| P1.2 | Informe: Resumen primero y el detalle (Hallazgos, Criterios, Distribución, Alumnos) agrupado y plegado | M |
| P1.3 | Modal de instrumento en móvil: dos filas ≤600 px, `100dvh`, pie sticky | M |
| P1.4 | Identidad serena + tokens: acento de la paleta sobria y cero hex fuera de `:root` | M |
| P1.5 | Ayuda en línea con `ⓘ` (texto visible), no solo `title` | M |

### P2 · deseable

| # | Qué | Coste |
|---|---|---|
| P2.1 | Estado de guardado con texto («Guardado ✓» / «Guardando…») | S |
| P2.2 | Selectores con etiqueta visible («Clase», «Nivel», «Periodo») | S |
| P2.3 | Escala tipográfica y radios/sombras como tokens | M |

## Dirección recomendada (una sola)

**Jerarquía progresiva: modo básico por defecto, avanzado a un toque.**

- Un conmutador en Configuración (y visible en la cabecera) decide el modo.
- **Básico**: nav reducida a *Inicio + Calificaciones + «Montaje»*; Inicio es un
  tablero de hoy (qué corregir, a quién atender, backup); Calificaciones abre en
  **Resumen** con una sola acción primaria y los selectores plegados; *Montaje*
  abre las 4 vistas de configuración (se usan una vez al principio).
- **Avanzado**: exactamente lo actual (6 vistas, 4 pestañas, 6 subvistas). Cero
  pérdida de potencia.
- Se apoya en los P0, que son baratos e independientes.

Por qué: la queja no es solo estética, es **sobrecarga de decisión**. Ni la
identidad ni las variantes cosméticas reducen las decisiones; solo la progresividad
lo hace sin esconder el modelo.

## Sobre las 9 variantes de estructura

- **Aprovechar**: 1 (Acción clara), 2 (Sección con cabecera), 4 solo en escala y
  tacto (no el padding de 24 px ni botones de 46 px en móvil), 8 (progresividad).
- **Descartar**: 3 (cosmética y empeora la tactilidad), 5 (esconde la orientación),
  6 (emojis dependientes del SO y tapa el final), 7 (en móvil exige un botón extra y
  tapa media pantalla).

## Maqueta de la dirección

`/home/jorge/maquetas/modo-basico-movil.html` — conmutador Básico/Avanzado en el
mismo teléfono, Inicio·Básico, Calificaciones·Básico (Resumen + «Corregir · 3
pendientes»), Calificaciones·Avanzado (la vista actual) y comparativa de cabecera a
360 px. Es una prueba visual, no un rediseño del repo.

## Fases de trabajo propuestas

- **Fase A (P0)**: cabecera móvil, tacto 44 px, primera columna fija en corrección,
  una acción primaria. CSS y poco más. Verificación: `node tools/checks.js` +
  build + prueba en 360×740.
- **Fase B (modo básico)**: conmutador + tablero de Inicio + Calificaciones
  simplificada + «Montaje». Estructura y estado.
- **Fase C (detalle)**: Informe plegado, modal de instrumento, ayuda en línea,
  identidad/tokens.

Cada fase, un commit revisable. La validación de cada una, en navegador por el
docente.
