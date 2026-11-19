# Anexo — Flujo de uso y arquitectura de Evalora

Documento de apoyo para analizar la experiencia de uso. Describe qué es la app,
cómo está construida y por dónde camina el docente. No incluye capturas (se
añaden aparte); aquí está el mapa para ponérselas.

---

## 1. Naturaleza de la app (resumen para quien no conozca el código)

**Evalora** es una aplicación web **de un solo fichero** para calificar por
**criterios de evaluación ponderados** según la LOMLOE (Cantabria, Infantil y
Primaria). La usa un **docente**, a menudo **de pie y en móvil**, para corregir
y sacar informes.

Restricciones que definen su naturaleza:

- **Sin conexión y sin nube**: no hay servidor, no hay cuentas, no se hace
  ninguna petición de red. Funciona con doble clic, desde un USB o en el móvil.
- **Los datos viven en el navegador** (`localStorage` de ese navegador y equipo).
  No salen del dispositivo. Borrar los datos de navegación borra el trabajo:
  el backup manual es la única red de recuperación.
- **Un solo fichero entregable** (`dist/evalora.html`) con CSS y JS incrustados,
  porque Chrome en Android abre los HTML desde gestores de archivos (`content://`)
  y los recursos externos no cargan.
- **Genera PDF por impresión** del navegador (no hay librerías PDF).
- **Licencia EUPL-1.2** (copyleft), incrustada en el propio fichero.

Tecnologías:

- **HTML + CSS + JavaScript vainilla.** Sin framework (ni React, ni Vue), sin
  empaquetador, sin `package.json`, sin dependencias de ejecución.
- **Módulos por fichero**, cargados con `<script>` en orden y cada uno como una
  IIFE que expone una variable global (`Utils`, `Storage`, `Calc`, `UI`,
  `AlumnosView`, `ClasesView`, `CurriculoView`, `InstrumentosView`,
  `InformeView`, `CuadriculaView`, `App`). No hay módulos ES ni imports.
- **Persistencia**: `localStorage` (la base de datos entera, en JSON) e
  **IndexedDB** (referencias a la carpeta/fichero de backup elegido por el
  docente, solo en Chrome/Edge de escritorio).
- **Build propio** (`node tools/build-singlefile.js`) que inlinea CSS y JS.
- **Pruebas propias** sin dependencias (`node tools/checks.js`, 735
  comprobaciones) sobre un DOM simulado (`tools/dom.js`).

---

## 2. Arquitectura

### 2.1 Mapa de módulos

| Fichero | Líneas | Rol |
|---|---|---|
| `index.html` | 88 | Contenedores fijos, cabecera, carga de scripts en orden |
| `css/styles.css` | 740 | Todo el estilo. Tokens (`--marca`, `--acento`, `--papel`, `--linea`…) |
| `js/app.js` | 710 | **Orquestador**: lista de vistas, navegación, tema, Configuración, F2 |
| `js/storage.js` | 1137 | **Persistencia**: `db`, migración, import/export, perfil, backup |
| `js/calc.js` | 801 | **Motor puro**: notas, ponderaciones, logros, estadísticas. No escribe |
| `js/ui.js` | 175 | Modales (2 capas), toasts, chips |
| `js/utils.js` | 70 | Helpers (escapado, fechas, `fmtReal`, `debounce`, URLs) |
| `js/views-alumnos.js` | 170 | Alumnos y grupos |
| `js/views-clases.js` | 628 | Asignaturas y clases (niveles ACI) |
| `js/views-curriculo.js` | 244 | Currículo: competencias y criterios |
| `js/views-instrumentos.js` | 1180 | Instrumentos y **corrección** |
| `js/views-cuadricula.js` | 645 | Calificaciones (cuadrícula) con 4 pestañas |
| `js/views-informe.js` | 776 | Informe de análisis (solo lectura) con 6 subvistas |
| `js/colores-ud.js` | 35 | Paleta de color por unidad didáctica |
| `js/licencia.js` | 315 | Texto EUPL generado desde `LICENSE` |
| `js/plantillas.js` | 4 | Puente al currículo oficial generado (`plantillas/`) |

### 2.2 Flujo de datos

```
docente → vista (views-*.js) → escribe en Storage.db → Storage.save()
                                  ↑
                          Calc (solo lectura sobre db)
```

- **La vista nunca calcula**: pinta desde `Calc`, y escribe en `Storage.db`.
- **`Calc` es la única verdad** para notas, medias, ponderaciones y estadísticas.
- **`Storage` es la única puerta de escritura** y es la que persiste.
- **`UI.openModal`** es el contenedor de todos los modales (con trampa de foco y
  dos capas para modales anidados).

### 2.3 Modelo de datos (`db`, `schemaVersion: 1`)

| Clave | Contenido |
|---|---|
| `cursoEscolar` | Curso activo (`«2026/2027»`). Uno a la vez |
| `grupos`, `alumnos` | Grupos y alumnado (apellidos, nombre, grupo) |
| `asignaturas`, `clases` | Asignaturas y clases (`asignatura · grupo`), con niveles ACI |
| `competenciasClave`, `competenciasEspecificas`, `criterios` | Currículo con ponderaciones (suman 100 %) |
| `instrumentos` | Instrumentos (tipo, periodo, apartados, criterios, nivel) |
| `bancoInstrumentos` | Moldes reutilizables |
| `registros` | **Las notas**: `registros[instrumentoId][alumnoId][apartadoId] = valor` |
| `coloresUd` | Color por unidad didáctica |
| `configuracion` | Ajustes (`sinNotaEsCero`) |
| `tema` | Identidad: `{ color, nav }` |
| `perfil` | Nombre del docente, centro y logo (para los informes) |
| `observaciones` | Observaciones por instrumento (locales) |
| `meta` | Última exportación, cambios sin copia |

Una nota de instrumento se **calcula** a partir de los apartados (por puntos o
por niveles de rúbrica). La nota final competencial pondera criterios.

### 2.4 Persistencia y backup

- Autoguardado continuo en `localStorage`.
- **Backup manual en JSON** (todo `db`) desde Configuración. En Chrome/Edge de
  escritorio puede elegir carpeta; si no, descarga.
- **Importar reemplaza todo** y guarda una copia previa para deshacer.
- Al cerrar/ocultar la pestaña se vuelca el estado (red de seguridad).

### 2.5 Build y herramientas

| Comando | Qué hace |
|---|---|
| `node tools/checks.js` | 735 comprobaciones de la app |
| `node tools/check-plantillas.js` | Integridad de las plantillas curriculares |
| `node tools/build-singlefile.js` | Genera `dist/evalora.html` |
| `node tools/build-licencia.js` | Regenera `js/licencia.js` desde `LICENSE` |
| `node tools/datos-prueba.js` | Genera un curso de prueba sintético |

---

## 3. Mapa de flujo (pantallas y caminos)

### 3.1 Vistas principales

| Vista | Qué hace |
|---|---|
| **Inicio** | Curso escolar, copias de seguridad, paneles de estado por clase, accesos de «Montaje» y flujo recomendado |
| **Alumnos y grupos** | Grupos, alumnado, alta masiva pegando una lista |
| **Asignaturas y clases** | Asignaturas y clases (`asignatura · grupo`), con niveles ACI |
| **Currículo** | Competencias específicas, criterios y ponderaciones (marca de riesgo) |
| **Instrumentos** | Instrumentos de 4 tipos, banco de moldes, importar rúbrica |
| **Calificaciones** | Cuadrícula con 4 pestañas: Instrumentos, Criterios, Competencias, Informe |

Más el engranaje de cabecera (**Configuración**, con **F2**): pestañas Perfil,
Calificación, Copias y seguridad, Tema y menús, Acerca de.

La **navegación** es configurable (Configuración → Tema y menús): barra
superior, menú flotante, dock inferior, barra lateral o modo básico
(`Inicio · Calificaciones · Instrumentos · Montaje`).

### 3.2 Flujo recomendado (7 pasos)

1. **Crear grupos** e inscribir **alumnos**.
2. Crear **asignaturas** y sus **clases** (`asignatura · grupo`). Si hay
   adaptaciones, crear en la clase sus **niveles ACI**.
3. En **Currículo**, definir competencias específicas, criterios y
   **ponderaciones** (suman 100 %).
4. Crear **instrumentos**: control, rúbrica, proyecto u otro, mapeando cada
   apartado a criterios. Si ya hay una rúbrica hecha (p. ej. con una IA),
   **importarla**.
5. **Corregir** desde Calificaciones (botón **«Corregir · N pendientes»**) o
   desde el instrumento. Click en el **nombre del alumno** para marcar
   **«No realiza esta evaluación»**.
6. Revisar el **Informe**: hallazgos, criterios con dificultades, distribución
   de notas y alumnos en riesgo. Imprimir o exportar a PDF.
7. **Exportar el backup** al terminar cada sesión.

### 3.3 Qué decide el docente en cada pantalla (y qué ve si no hay datos)

| Pantalla | Decisión principal | Estado vacío / sin datos |
|---|---|---|
| Inicio | Curso escolar | «Tu aplicación está vacía» + botón de datos de ejemplo |
| Alumnos y grupos | Altas, cambios, borrados | Lista vacía |
| Asignaturas y clases | Asignar asignatura a un grupo; niveles ACI | Aviso de clase sin instrumentos |
| Currículo | Ponderaciones (suman 100 %) | Aviso si falta currículo |
| Instrumentos | Tipo, apartados, criterios, nivel | «Sin alumnado asignado» en corrección |
| Calificaciones | Corregir, filtrar nivel/periodo | «—» en gris = sin corregir |
| Informe | Alcance (trimestre/unidad/instrumento) | Se suelta solo si el filtro deja vacío |
| Configuración | Perfil, ajustes, tema, copias | — |

### 3.4 Semántica de las marcas (no confundir)

| Marca | Significado |
|---|---|
| `—` gris | Sin corregir (todavía no se ha puesto nota) |
| `0` | Nota puesta que resulta en cero |
| `No realiza` | Exclusión explícita: ese alumno no se evalúa en ese instrumento |
| `—` en «Todos los niveles» | No aplica a ese alumno (p. ej. nivel ACI) |
| `sinNotaEsCero` | Ajuste: si está marcado, lo sin corregir cuenta como 0 en la media de la UD (por defecto **desmarcado**) |

---

## 4. Puntos de fricción conocidos (para juzgar propuestas)

1. **Carga de decisión**: 6 vistas + 4 pestañas + 6 subvistas; el docente básico
   no necesita verlo todo. Respuesta en marcha: modo básico y jerarquía
   progresiva (`docs/PLAN-SIMPLIFICACION.md`).
2. **El montaje** (alumnos, asignaturas, currículo) se usa una vez al principio,
   pero no es evidente; en modo básico queda detrás de «Montaje».
3. **Cabecera móvil**: en 360 px la cabecera envolvía en 3 filas (~180 px).
4. **19 modales** con el mismo patrón de pie de dos botones
   (`docs/AUDITORIA-MODALES.md`).
5. **Tres conceptos de «ausente»**: sin corregir, no realiza y no aplica (ACI).
   Hay que mantenerlos separados y visibles.
6. **Datos de ejemplo vs. reales**: no deben mezclarse; el backup es manual.

---

## 5. Cómo se comprueba que una propuesta no rompe nada

- `node tools/checks.js` debe quedar en verde (735 comprobaciones).
- `node tools/build-singlefile.js && node tools/build-singlefile.js --check`.
- Las propuestas de UX que toquen `Calc` deben explicar cómo afectan a la nota;
  las que toquen `Storage` deben explicar cómo viajan en el backup.
