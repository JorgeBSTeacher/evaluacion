# Plan de interfaz · Evalora

La app ya funciona; el objetivo es que se pueda usar **de pie, con el móvil en la mano**, sin perder la referencia del alumno ni la nota. Este plan sale de tres revisiones independientes sobre el CSS y las vistas reales —identidad visual, accesibilidad/legibilidad y ergonomía táctil— y **no toca motor, modelo de datos ni currículo**.

## Decisión propuesta

Tres fases independientes, cada una en un commit revisable. El orden recomendado es **móvil → accesibilidad → identidad**: las dos primeras quitan fricción diaria y la tercera (Evalora, F8) entra después sin rehacer nada.

| Fase | Objetivo | Cambios | Coste |
|---|---|---|---|
| **1 · Móvil** | Usar la app a 360 px sin pelearse con la pantalla | cabecera, objetivos táctiles, columna fija, corrección en el alumno tocado, modal de instrumento | M |
| **2 · Accesibilidad** | Leer y manejar con teclado y con poca visión | foco, chips, contrastes, impresión | S/M |
| **3 · Identidad** | Evalora y un sistema que no haya que reescribir al rebrandear | tokens, marca, escala tipográfica | M |

## Quick path (fase 1)

1. **Cabecera ≤640 px**: ocultar el subtítulo de marca, nav en una línea con scroll, Exportar/Importar dentro de «⋯»; **Guardar** se queda.
2. **Objetivos táctiles**: 44 px mínimos en `.btn-mini`, `.chip`, `.segmentos` e `.icon-btn` (crece el área, no la tinta).
3. **Corrección**: la primera columna se queda fija, como ya hace la Cuadrícula.
4. **Corrección en el alumno tocado**: `renderCorreccion` acepta el alumno y arranca en su índice.
5. **Modal de instrumento ≤600 px**: dos filas por ítem, `100dvh` y pie sticky.

Verificación de cada paso: 360×740 y 412×915 en Chrome sin zoom, `node tools/checks.js`, `node tools/check-plantillas.js` y `node tools/build-singlefile.js`. **El número de comprobaciones no se escribe aquí**: crece con cada decisión (van **574** + **344** a v0.10.1) y una cifra copiada solo sirve para quedar desfasada. Manda el `TODO OK` de la salida.

## Hallazgos

### Fase 1 · móvil

| Hallazgo | Evidencia | Propuesta | Coste |
|---|---|---|---|
| La cabecera sticky envuelve en 4–5 filas a 360 px y se come un tercio del alto | `css/styles.css:30-59`, `index.html:10-23` | ocultar `.brand-txt`, nav con `overflow-x:auto`, acciones en «⋯» | M |
| La tabla de corrección pierde al alumno al desplazar: solo la Cuadrícula fija la primera columna | `css/styles.css:124`, `js/views-instrumentos.js:554-558` | aplicar la misma columna fija a la tabla de corrección | S |
| Tocar la nota de un alumno abre la corrección en el **primero** | `js/views-cuadricula.js:477-479` llama sin alumno; `js/views-instrumentos.js:688` hace `irA(0)` | pasar `data-alumno` y arrancar en ese índice | S |
| Controles de 28–30 px (`.btn-mini`, `.icon-btn`, `.chip`, `.segmentos`) | `css/styles.css:90, 92-95, 154-158, 217-220` | `min-height:44px` / `min-width:44px` conservando el padding | M |
| «Editar» y «×» pegados, con la × de ~26 px y borrado en cascada | `js/views-alumnos.js:95-96, 116-117` | separar la ×, área de 44 px y confirmación explícita | S |
| El modal de instrumento fija seis columnas y `max-height:90vh` (el teclado Android tapa el pie) | `css/styles.css:173-183, 192-195` | dos filas ≤600 px, `max-height:100dvh`, pie sticky | M |

### Fase 2 · accesibilidad y papel

| Hallazgo | Evidencia | Propuesta | Coste |
|---|---|---|---|
| El anillo de foco es casi invisible: `--acento-suave` sobre blanco = **1.18:1** | `css/styles.css:137` | `:focus-visible` con 3 px de `--acento` (**6.29:1**) | S |
| Los chips no se alcanzan con Tab: `input { display:none }` | `css/styles.css:160`, `js/ui.js:56` | recorte visual (1 px, opacidad 0) + foco en `.chip:has(input:focus-visible)` | S |
| Badges y neutros por debajo de 4.5:1: `.badge.na` **2.29:1**, `.badge.warn` **2.91:1**, `.badge.ok` **2.98:1**, `.badge.ko` **4.23:1**; `--na` como icono **2.54:1** | `css/styles.css:8-15, 94, 108, 146-150` | tokens de **texto** por estado: `#4b5563` (6.75:1), `#b45309` (4.58:1), `#15803d` (4.53:1), `#b91c1c` (5.66:1) | S |
| El informe se imprime a **8 px = 6 pt** con `line-height:1.15` | `css/styles.css:318-326` | 10 px de cuerpo y 11 px en `th`; revalidar paginación | M |
| El SSOT dice que las secciones ACI van «sin salto de página forzado», pero el CSS fuerza hoja nueva por nivel | `docs/SSOT.md:137` frente a `css/styles.css:353`; el changelog v0.7.1 ya dice «con salto entre niveles» | corregir el texto del SSOT (el comportamiento actual es el documentado en v0.7.1) | S |

### Fase 3 · sistema e identidad

| Hallazgo | Evidencia | Propuesta | Coste |
|---|---|---|---|
| La marca vive en tres sitios y el logo es «EC» | `index.html:6, 12-13`, `css/styles.css:41-45`, `js/app.js:143` | monograma «E» + wordmark, tamaño por token y una sola fuente de marca | S |
| Hay hex fuera de `:root`, así que cambiar `--acento` o `--papel` deja media UI con la identidad vieja | `css/styles.css:105, 115, 121, 128, 163, 236`; 117 `style=` inline en `js/` | tokens de superficie, borde y estado; ningún hex fuera de `:root` | M |
| `h1` y `h2` pesan igual (18 px) y conviven nueve tamaños sin escala | `css/styles.css:71` | escala de cinco pasos (12/14/16/18/24); `h1` 24, `h2` 18 | S |
| Radios y sombras sueltos: `--radio:14px` convive con 8/10/12/16/999 y una sombra propia del modal | `css/styles.css:16, 43, 80, 90, 134, 174, 216` | `--radio-sm/md/lg/pill`, `--control-h`, `--sombra-modal` | M |

## Sistema objetivo

- **Sin dependencias nuevas**: nada de frameworks, iconos descargados ni fuentes web (rompería `file://` y el fichero único).
- **Tokens primero**: superficie, texto, estado (fondo y texto por separado), radios, alturas de control, sombra y escala tipográfica. Regla: ningún color literal fuera de `:root`.
- **Tipografía**: se mantiene la pila de sistema y la jerarquía se construye con tamaño, peso y espacio. Se descarta la serif para titulares: Georgia no existe en Android y una fuente descargada rompe el offline; la identidad cambiaría según el dispositivo.
- **Evalora**: cambiar solo cadenas visibles y marca; los identificadores de backup (`rubrica-evalcrit`, `curriculo-evalcrit`) **no se tocan** (D-58).
- **Modo oscuro**: fuera de alcance en v0.8; la tokenización lo deja barato para después.

## Criterios de aceptación

- [ ] A 360 px, la cabecera ocupa como máximo dos filas y la columna del alumno sigue visible en corrección.
- [ ] Todo control interactivo tiene área de 44×44 px (o 44 px de alto en botones de texto).
- [ ] Texto ≥4.5:1; componentes de interfaz y foco ≥3:1 (medido, no estimado).
- [ ] Los chips se recorren con Tab y muestran el foco.
- [ ] El informe impreso usa ≥10 px de cuerpo y no deja páginas en blanco.
- [ ] `node tools/checks.js` y `check-plantillas` en `TODO OK` (no un número fijo: crece con cada decisión) y `dist/evalcrit.html` determinista.
- [ ] Sin peticiones de red ni ficheros nuevos en `dist/`.

## Fuera de alcance

Motor de cálculo, modelo de datos, currículo, backup, atajos de teclado nuevos, modo oscuro, biblioteca de iconos, rediseño de la navegación (solo su adaptación a móvil).

## Decisiones abiertas

1. **Orden de las fases**: la propuesta es móvil → accesibilidad → identidad. Si el rebranding Evalora (F8) es prioritario por fecha, la fase 3 puede ir primero: no comparte ficheros con las otras dos.
2. **Salto de página del informe**: se mantiene «cada nivel empieza en hoja nueva» (lo que hace el CSS y documenta v0.7.1) y se corrige el texto viejo del SSOT. Si se prefiere lo contrario, es un cambio de una línea en `@media print`.
