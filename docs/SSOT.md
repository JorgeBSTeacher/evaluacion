# EvalCrit — Documento Único de Verdad (SSOT)

**Versión:** 1.1 · **Fecha:** 23/08/2026 · **Estado:** Activo
**Regla:** toda decisión funcional o técnica se registra aquí ANTES de implementarse.

---

## 1. Identidad y visión

EvalCrit es una aplicación web HTML autocontenida para calificar mediante **criterios de evaluación ponderados** conforme a LOMLOE (Cantabria, Infantil y Primaria). Offline-first, portable en USB, sin instalación ni servidor. En el futuro podrá migrar a nube reemplazando solo el adaptador de datos.

## 2. Despliegue y restricciones técnicas

| # | Decisión |
|---|---|
| D-01 | Ejecución: abrir `index.html` directamente en el navegador (doble clic en Windows; gestor de archivos → Chrome en Android). Sin servidor. |
| D-02 | Navegador objetivo único: Chromium actualizado (Windows y Android). Sin soporte a navegadores antiguos. |
| D-03 | Un dispositivo = un docente. Sin roles de usuario ni sincronización entre profesores (por ahora). |
| D-04 | Persistencia: `localStorage` del navegador + **exportar/importar backup JSON manual (imprescindible)**. Arquitectura con adaptador único para migrar a IndexedDB o SQL/nube sin tocar la lógica. |
| D-05 | JavaScript vanilla con scripts clásicos (NO módulos ES: bloqueados en `file://`). Cero dependencias externas ni CDN. Todo funciona sin internet. |
| D-06 | Idioma: español (UI, código documentado, commits). |
| D-07 | Solo curso escolar activo. El esquema guarda `cursoEscolar`; el "arrastre de grupos" a un curso nuevo se hará con un asistente futuro. |

### Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| R-01: borrar datos de navegación borra las notas | Botón Exportar siempre visible; aviso en Inicio; import validado |
| R-02: origen `file://` restringido por el navegador | Scripts clásicos, rutas relativas, nada de fetch/APIs modernas imprescindibles |
| R-03: Android puede abrir con origen efímero (`content://`) | Instrucciones para copiar al almacenamiento interno; exportar tras cada sesión |

## 3. Organización académica

- Etapas: **Infantil** y **Primaria**.
- **Grupo**: unidad de alumnos (ej. 3ºA), con etapa.
- **Alumno**: nombre + apellidos + grupo (D-08: sin más campos).
- **Asignatura/Área**: materia con currículo propio (en Infantil, las áreas).
- **Clase = Asignatura + Grupo** (ej. Matemáticas · 3ºA); los alumnos llegan automáticamente del grupo.
- Volumen: piloto real = 1 clase de 15 alumnos y 2–3 asignaturas; soporte holgado hasta ~12 clases × 20 alumnos.

## 4. Currículo y competencias

Jerarquía LOMLOE: Etapa → Área → **Competencia específica** → **Criterio de evaluación**.

- Criterio: código, descripción, asignatura, **peso % editable fijo durante el curso**; la suma de pesos por asignatura debe ser 100% (aviso si no).
- Vínculo obligatorio criterio → 1..n competencias específicas; opcional criterio → competencias clave del perfil de salida (CCL, CP, STEM, CD, CPSAA, CC, CE, CCEC).
- Saberes básicos: NO como campo del criterio (D-09); solo campo informativo opcional en los instrumentos. Como novedad v0.2, cada plantilla puede traer los bloques de saberes del área y se guardan como campo informativo `saberesBasicos` en la asignatura.
- **Plantillas oficiales (D-31)**: ficheros JSON en `plantillas/` generados a partir del decreto verificado — **Decreto 66/2022, de 7 de julio (BOC nº 135, 13-07-2022), Anexo II-A**, currículo Infantil+Primaria Cantabria. Esquema de plantilla (`tipo: "curriculo-evalcrit"`, `version: 1`): asignatura (nombre/etapa/ciclo), competencias específicas con descriptores del Perfil de salida, criterios vinculados por `ceCodigo`, y `peso: null` para reparto equitativo. **Campo `asignatura.cursos`** (v0.2.1): si la plantilla lo trae (ej. `["5º","6º"]`), el importador crea una asignatura por curso (`Matemáticas 5º`, `Matemáticas 6º`) con currículo completo y pesos independientes en cada una; sin `cursos` se crea una sola asignatura (compatibilidad). Fusión segura: si la asignatura destino ya existe y tiene currículo, la importación se rechaza con mensaje claro; nunca se tocan instrumentos ni registros. Los descriptores (STEM1, CPSAA3…) se traducen automáticamente a competencias clave por prefijo (mayor coincidencia primero).
- **Plantillas integradas (v0.2.1)**: `js/plantillas.js` incrusta las plantillas como script clásico (`PLANTILLAS_CURRICULO`), generado desde `plantillas/*.json`; así la carga del currículo funciona en `file://` sin selector de archivos ni fetch. El modal «Importar currículo» agrupa las plantillas por área y ciclo.
- **Pesos por defecto al importar (D-32)**: si la plantilla no trae pesos, se reparte 100 % a partes iguales con redondeo a 4 decimales ajustando el último criterio para que la suma sea exactamente 100; quedan editables como cualquier criterio. Plantilla piloto validada contra el decreto: Matemáticas 3.er ciclo = 8 CE + **17 criterios** (2+3+2×6) + 6 bloques de saberes; suma de pesos verificada = 100.
- **Competencias clave (D-33, v0.3)**: la calificación por clave (CCL, CP, STEM…) usa exactamente la misma fórmula ponderada que las específicas (`notaPonderada` filtrando los criterios que llevan esa clave en `claveIds`); sin evidencias → «—». Las claves se derivan automáticamente del Perfil de salida al importar plantillas oficiales y son editables en el criterio. Se muestran en Cuadrícula → pestaña «Competencias», sección «Competencias clave».

## 5. Instrumentos de evaluación

Tipos: **Control/Examen**, **Rúbrica**, **Proyecto**, **Otro**.

Común: título, fecha, periodo (T1/T2/T3), clase, saberes básicos informativos, apartados y, desde v0.4, **nivel ACI** (opcional) y **unidad** (etiqueta informativa).

- **Nivel ACI** (v0.4): un instrumento sin nivel es **común** a todo el alumnado; con `nivel: "BASE"` solo para el alumnado sin adaptación; con el código de un nivel (`"4"`) solo para ese alumnado adaptado. La pantalla de corrección muestra únicamente el alumnado del instrumento.
- **Unidad** (v0.4): texto libre (ej. `UD5`) que agrupa los distintos exámenes del mismo tema (control base, control ACI…); se muestra como etiqueta y se usa para ordenar las columnas de la cuadrícula y el listado de instrumentos.
- **Examen paralelo** (v0.4.3): desde el listado de Instrumentos, el botón **Duplicar** de cualquier examen abre un modal para marcar uno o varios niveles ACI; se crea una copia por nivel (mismos apartados y criterios, misma `unidad`, `nivel` = el código elegido) con las notas en blanco. Es la vía rápida para el «examen B/C» del alumnado adaptado.

### Adaptaciones curriculares (ACI) — v0.4

Escenario real: en un aula de 6º hay alumnado que trabaja el currículo de 4º. Solución:

- Cada **clase** define 0..n **niveles ACI** (`clase.nivelesAci`): `{ codigo, etiqueta, asignaturaId }`, donde `asignaturaId` apunta al currículo del curso de referencia (p. ej. «Matemáticas 4º»). Se gestiona con el botón **ACI** de la lista de clases.
- Cada alumno se asigna a un nivel (`clase.adaptaciones` = alumno→código); sin asignación = **base**.
- El motor (`Calc`) resuelve, por alumno, su **asignatura/criterios** según el nivel y descarta los instrumentos que no le corresponden. La columna «Evaluación», las pestañas Criterios/Competencias y la corrección respetan el nivel.
- La cuadrícula incorpora un **selector de nivel** (Base por defecto) que alterna entre el currículo base y cada ACI. Desde v0.4.3 incluye la opción **«Todos los niveles»**: muestra al grupo completo junto, cada examen solo en las columnas de quien lo hace (resto «—» en gris) y la columna «Evaluación» armonizada por el currículo de cada alumno (los base con 6º, los ACI con el suyo).
- Retrocompatible: una clase sin niveles ACI se comporta exactamente como antes (todo es base).


- **Control/Proyecto/Otro**: N apartados; cada uno con puntuación máxima decimal libre (ej. 4, 2, 3.5) y mapeo a 1..n criterios. La suma de máximos define el total (informativo; se normaliza).
- **Rúbrica** (D-40, v0.4.7): cada fila es un **ítem de texto libre** (columna «criterio» en la cabecera) con su **peso** y **cuatro niveles ascendentes**: nivel 1 (más bajo) → nivel 4 (más alto), con 25/50/75/100 % por defecto. Cada ítem puede llevar **sus propios descriptores** por nivel, editables en el propio ítem; si no los define, **hereda** la escala común del instrumento (que sigue existiendo como valores por defecto). Cada ítem se vincula a 1..n criterios oficiales, como cualquier apartado.

### Corrección

- Pantalla tipo tabla: filas = alumnos, columnas = apartados; valores decimales parciales admitidos (ej. 3,4 / 1,04).
- Ausencia/no presentado = **sin dato**: no cuenta en el cálculo. El profesor puede poner 0 manualmente si lo desea (D-10).
- Recuperación posterior **sobrescribe** los valores anteriores del mismo alumno e instrumento (D-11).

## 6. Motor de cálculo (reglas exactas)

1. Logro de apartado = puntos obtenidos / puntos máximos (%).
2. Ese % se aplica íntegro a cada criterio mapeado por el apartado.
3. Si varios apartados del MISMO instrumento evalúan un criterio: logro ponderado por puntos = Σ obtenidos / Σ máximos (D-12).
4. Si VARIOS instrumentos evalúan un criterio: **media simple** de los logros por instrumento (D-13, revisable a "última evidencia").
5. Criterio sin evidencias: **sin evaluar**; no cuenta ni como 0, y su peso se excluye del cálculo.
6. Nota de evaluación (0–10) = Σ(logroᵢ × pesoᵢ) / Σ(pesoᵢ con evidencia) × 10.
7. **Final anual**: mismo recálculo usando TODAS las evidencias del año (no media de trimestres) (D-14).
8. Nota por competencia específica = misma agregación restringida a sus criterios.
9. Redondeo: 1 decimal, clásico al más cercano; solo para mostrar, nunca acumulado (D-15).
10. La nota del instrumento (Σobtenidos/Σmáx ×10) es **informativa**; no interviene en la nota de evaluación (D-16).
11. **ACI (v0.4)**: los pasos 1–10 se calculan por alumno usando su propio currículo (criterios del nivel) y solo los instrumentos que le aplican (comunes + los de su nivel). Para un alumno base el resultado es idéntico al anterior.

### Ejemplo verificado

Examen total 8 pts: P1=4 pts→criterio 1.1, P2=2 pts→2.1, P3=2 pts→2.2. Pesos: 50/25/25.
Alumno: 2/4, 0/2, 2/2 → logros 50%, 0%, 100%.
Nota examen informativa: 4/8 → 5,0. Nota real: (0,5·50 + 0·25 + 1·25)/100 ×10 = **5,0**.
Si los pesos no casan con el reparto de puntos, ambas notas difieren **a propósito**: manda la ponderación curricular y los informes muestran ambas.

## 7. Escalas

- **Primaria**: numérica 0–10 con Insuficiente (1–4,9), Suficiente (5–5,9), Bien (6–6,9), Notable (7–8,9), Sobresaliente (9–10). Colores: rojo <5, verde ≥5, gris sin dato.
- **Infantil**: escala cualitativa editable por el usuario, con mapa editable cualitativo→% de logro (D-17).

## 8. Interfaz y experiencia

- Estética cuidada tipo cuaderno escolar, amable e intuitiva; táctil-first (botones grandes) y rápida con teclado en PC.
- Secciones: Inicio · Alumnos y grupos · Asignaturas y clases · Currículo · Instrumentos · Cuadrícula.
- Cuadrícula tipo cuaderno de notas: filas alumnos, columnas instrumentos; pestañas Notas / Criterios / Competencias; selector de periodo T1/T2/T3/Final.
- Selector de **unidad didáctica** (D-38, v0.4.5): cuando la clase tiene instrumentos con `unidad`, aparece un desplegable «Todas las unidades / UD1 / UD2…» que filtra las columnas; con varias unidades y «Todas» seleccionado, la cabecera se agrupa con una fila superior por UD. La primera columna (alumno) y esa fila de grupo quedan fijas al desplazar horizontalmente, para no perder la referencia en tablas de muchas columnas. Desde v0.5.0 (D-44), esa fila de grupo se puede **tocar para plegar o desplegar** las columnas de su unidad.
- Corrección ágil (D-39, v0.4.6): barra «← Anterior · Guardar y siguiente →» con contador «Alumno X de N» y resaltado de la fila en curso; el botón guarda y salta al siguiente alumno. Las notas se escriben en memoria al teclear (el guardado en `localStorage` va con retardo) para que ese salto nunca pierda lo escrito.
- Buscador de alumnado (v0.4.6): con grupos de más de 6 alumnos, la cuadrícula muestra un campo «Buscar alumn@» que filtra las filas ignorando acentos y mayúsculas.
- Editor de rúbricas (D-40, v0.4.7): cuadrícula con cabecera **criterio · peso · nivel 1 · nivel 2 · nivel 3 · nivel 4**; la celda de cada nivel es un descriptor editable (con el de la escala común como *placeholder*; vacío = lo hereda). La corrección muestra los niveles de menor a mayor y usa el descriptor del ítem; incluye un desplegable **«Ver los descriptores de cada nivel»** (útil en tableta, donde no hay tooltips). El modal se ensancha solo cuando aparece la cuadrícula (`:has(.rub-head)`).
- **Instrumentos por trimestre y unidades plegables** (D-43, v0.5.0 — sustituye al desplegable por unidad de D-41): la vista muestra un desplegable de trimestre (**Todos los trimestres / T1 / T2 / T3**, por defecto «Todos») y, dentro de cada trimestre, un **bloque plegable por unidad didáctica**, **cerrado al entrar**, con su tabla de instrumentos. Los instrumentos **sin unidad** van a un bloque «Sin unidad»; la cabecera de cada bloque indica cuántos instrumentos tiene. Con «Todos», cada trimestre lleva su encabezado y, si no hay instrumentos, un aviso («Sin instrumentos en T3»). Al imprimir, los bloques salen abiertos. El estado de plegado se guarda por `periodo::unidad`, de modo que la UD1 de T1 y la de T2 se pliegan por separado; al cambiar de clase se cierran todos. El helper `Calc.instrumentosDeUnidad` (creado en D-41) sigue siendo el que separa los grupos.
- **Cuadrícula: columnas plegables por unidad y controles en su pestaña** (D-44, v0.5.0; plegado por defecto en v0.5.1): en la pestaña «Instrumentos» de la Cuadrícula, cada unidad tiene una **barra propia con el mismo aspecto y el mismo gesto que los bloques de la vista Instrumentos** (flecha, nombre y número de instrumentos): sus columnas salen **plegadas al entrar** y se abren y cierran al tocar la barra. Si el docente **filtra por una unidad** en el desplegable, esa unidad se abre sola (para no obligarle a un clic de más). Detalle importante: la barra se pinta siempre que haya algo que agrupar —varias unidades, **o una sola con nombre**—; solo se omite cuando todos los instrumentos van «sin unidad». Así nunca puede quedar una unidad plegada sin barra que tocar para abrirla. Además, «Añadir calificación» y el desplegable de unidades pasan a vivir **dentro** de la pestaña Instrumentos, porque en la práctica solo afectaban a ella; **Nivel ACI y Periodo se quedan en la cabecera general** porque Criterios y Competencias los necesitan para calcular, y el **buscador de alumnado sigue en las tres pestañas**. La pestaña «Competencias» pasa a llamarse **«Competencias específicas y clave»**, que es lo que realmente contiene.
- Sugerencias **editables** de unidad (D-42, v0.4.9): el campo «Unidad» del instrumento es un `<input>` con `<datalist>`: al escribir despliega las unidades **ya usadas en la asignatura** (`Calc.unidadesDeAsignatura`, todas sus clases, de modo que una UD creada en 6ºA se ofrece en 6ºB) pero **admite cualquier texto nuevo** — sugiere, no obliga. Es deliberado: no forzamos una lista cerrada porque cada docente organiza sus unidades a su manera. La generación del `<datalist>` se aísla en la función pura `datalistUnidades(asigId)` (testeable sin navegador).
  - **Por qué `Tipo` y `Periodo` siguen siendo desplegables cerrados**: `tipo` decide el motor (`esRubrica = tipo === 'Rúbrica'`) y `periodo` filtra notas y cuadrículas; si se pudieran escribir a mano, una variante como «Rubrica» o «1T» **desactivaría en silencio** la rúbrica o rompería los filtros. Ahí la rigidez protege, no limita. La flexibilidad se concentra donde el sistema no depende del valor exacto de lo escrito.
- Importar rúbrica creada con IA (P-08, v0.4.7): botón **«Importar rúbrica (IA)»** en Instrumentos que abre un modal en dos pasos — (1) instrucciones listas para pegar en un chat, rellenas con los códigos del currículo de la asignatura y con **huecos `___`** para personalizar («Copiar instrucciones» / «Descargar .txt»); (2) pegar la respuesta JSON, elegir periodo e **Importar**. Si algo falla, aviso en castellano y no se crea nada.
- Corrección: tabla alumnos × apartados; en rúbricas, botones de nivel.
- Autoguardado continuo con indicador visual; confirmación en acciones destructivas.
- Exportar/Importar siempre visibles en la cabecera.
- Tras cualquier alta/edición modal, la vista se refresca automáticamente (D-21).
- Los criterios de cada apartado se eligen con un desplegable compacto por fila, no inline (D-22).
- Desde la Cuadrícula se puede «Añadir calificación» (alta de instrumento) y editar tocando su cabecera de columna (D-23).
- La cuadrícula muestra SIEMPRE las filas de alumnos del grupo, aunque no existan instrumentos aún: cuaderno en blanco esperando columnas (D-24).
- La sección activa se conserva al recargar el navegador (F5) mediante hash de URL (#seccion) (D-25).
- La cabecera de la cuadrícula muestra siempre «Grupo vinculado · N alumno(s)» como diagnóstico inmediato de desajustes entre grupos y clases (D-26).
- Modal ACI (v0.4.3): si aún no hay niveles con código, la sección «Asignación de alumnado» explica qué hacer en vez de mostrar desplegables con solo «Base»; al pulsar «Añadir nivel» el foco va al campo Código y el desplegable por alumno se actualiza al teclear el código.

## 9. Informes

- PDF nativo vía estilos de impresión (`window.print`), sin librerías.
- Informe por clase con notas, criterios y competencias según pestaña activa (D-18).
- Boletín individual completo con observaciones textuales: NO (lo hace la herramienta institucional) (D-19).

## 10. Backup e importación

- Export: fichero `evalcrit-backup-YYYYMMDD-HHMM.json` con TODO el estado versionado (`schemaVersion`).
- Import: **modo reemplazo único** (D-20) tras validar esquema; confirmación explícita.
- Los backups con datos reales NUNCA se suben al repositorio git (`.gitignore` + política).
- **Estrategia de guardado de backups (D-34, v0.3.2)**: jerarquía automática al exportar — 1) carpeta elegida por el usuario (File System Access API, recordada en IndexedDB con permiso revalidado por clic) → escritura directa; 2) si no hay carpeta, selector «Guardar como» (Chrome/Edge Windows); 3) si el navegador no soporta la API (Chrome Android), descarga clásica a Descargas con aviso de copiar a `backups/`. El nombre siempre es `backup-DD-MM-AAAA-HHMM.json`. `meta.ultimaExportacion` registra cada exportación y se muestra en Inicio («última copia…»), reforzando R-01.
- Importación de currículo (v0.2): botón «Importar currículo» en la vista Currículo; eliges plantillas oficiales embebidas (v0.4.2); el modal agrupa por área y ciclo, y cada plantilla crea una asignatura por curso. La importación manual desde archivo `.json` se retiró (los formatos los genera la propia app vía `tools/build-plantillas.js`).

## 11. Modelo de datos (schemaVersion 1)

```json
{
  "schemaVersion": 1,
  "cursoEscolar": "2025/2026",
  "grupos": [{ "id": "", "nombre": "", "etapa": "Primaria" }],
  "alumnos": [{ "id": "", "nombre": "", "apellidos": "", "grupoId": "" }],
  "asignaturas": [{ "id": "", "nombre": "", "etapa": "", "saberesBasicos?": [{ "bloque": "A. …", "apartados": ["…"] }] }],
  "clases": [{ "id": "", "asignaturaId": "", "grupoId": "", "nivelesAci?": [{ "codigo": "4", "etiqueta": "4º", "asignaturaId": "" }], "adaptaciones?": { "alumnoId": "4" } }],
  "competenciasClave": [{ "id": "", "codigo": "CCL", "nombre": "" }],
  "competenciasEspecificas": [{ "id": "", "asignaturaId": "", "codigo": "", "descripcion": "", "perfilSalida?": ["STEM1", "…"] }],
  "criterios": [{ "id": "", "asignaturaId": "", "codigo": "", "descripcion": "", "peso": 0, "espIds": [], "claveIds": [] }],
  "instrumentos": [{
    "id": "", "claseId": "", "tipo": "Control", "titulo": "", "fecha": "",
    "periodo": "T1", "saberes": "", "nivel?": "", "unidad?": "",
    "niveles": [{ "pct": 100, "descriptor": "" }],
    "apartados": [{ "id": "", "orden": 1, "descripcion": "", "maxPts": 5, "criterioIds": [], "peso?": 1, "niveles?": [{ "pct": 25, "descriptor": "" }] }]
  }],
  "registros": { "instrumentoId": { "alumnoId": { "apartadoId": 3.4 } } }
}
```

Nota: en rúbricas cada apartado usa `maxPts: 100` implícito y el valor registrado es el % del nivel elegido; así el motor de cálculo es único para todos los tipos. En rúbricas, `apartado.peso` pondera la media y `apartado.niveles` (D-40, v0.4.7) permite descriptores propios por ítem; si está vacío (`[]`) el ítem **hereda** `instrumento.niveles`. `Calc.nivelesDeApartado(inst, ap)` resuelve la escala efectiva de un ítem (siempre de menor a mayor).

Nota ACI (adaptación curricular): `clase.nivelesAci` define niveles (p. ej. un aula de 6º con alumnado que trabaja el currículo de 4º); cada nivel apunta a la `asignaturaId` (currículo de otro curso) con la que se corrige. `clase.adaptaciones` asigna alumno→código de nivel (ausente = base). Semántica de instrumentos: `nivel: ""` = común a todo el alumnado; `nivel: "BASE"` = solo base; `nivel: "<codigo>"` = solo ese nivel. El motor usa el currículo del nivel del alumno para criterios y nota (D-37). `unidad` es solo una etiqueta informativa para agrupar exámenes del mismo tema.

## 12. Arquitectura

```
index.html          única página, navegación por pestañas
css/styles.css      sistema de diseño propio (sin frameworks)
js/utils.js         utilidades puras
js/storage.js       adaptador persistencia + backup + demo
js/calc.js          motor de cálculo (sección 6)
js/ui.js            modales, avisos, componentes comunes
js/views-*.js       una vista por módulo (alumnos, clases, currículo, instrumentos, cuadrícula)
js/app.js           arranque, navegación, cabecera
```

Reglas: la lógica jamás accede a localStorage directamente (siempre vía Storage); el cálculo vive solo en Calc; las vistas son funciones puras render(el) + eventos.

Reglas de robustez (lecciones de la v0.1):

- **Nada de fallos silenciosos**: los manejadores de clic capturan excepciones, muestran `alert` con el mensaje y lo registran en consola (D-27).
- **Formularios siempre accesibles**: el formulario de instrumento abre aunque falten criterios; el aviso aparece dentro (selector de criterios) y solo se bloquea al guardar con mensaje claro (D-28).
- Los módulos-vista exportan explícitamente sus funciones públicas; una función interna no exportada no es accesible desde otras vistas (causa del bug de «Añadir calificación») (D-29).
- **Cache-busting**: css y js se cargan con `?v=estampaTiempo`; se regenera en cada entrega para que el navegador nunca ejecute código obsoleto (D-30).

## 13. Roadmap

| Fase | Contenido | Estado |
|---|---|---|
| F0 | Este documento | Hecho |
| F1 | Esqueleto app + persistencia + export/import | En curso (v0.1) |
| F2 | Alumnos/grupos/asignaturas/clases | v0.1 |
| F3 | Editor currículo + plantilla Decreto Cantabria | v0.1 editor + v0.2 importador y plantilla Matemáticas 3.er ciclo |
| F4 | Instrumentos + corrección + cuadrícula | v0.1 |
| F5 | Motor cálculo + paneles competencia | v0.1 |
| F6 | Informes impresión | Básico v0.1; pulido después |
| F7 | Pruebas en dispositivos reales (USB Windows + Android) | Pendiente |

Futuras: arrastre de cursos (D-07), escala cualitativa Infantil completa, plantilla currículo oficial, nube.

## 14. Pendientes abiertas

- P-01: ~~verificar decreto y extraer currículo a JSON~~ **RESUELTA (v0.2)**: Decreto 66/2022 (BOC nº 135, 13-07-2022) verificado; importador + plantilla Matemáticas 3.er ciclo. Queda replicar el método para Conocimiento del Medio Natural, Social y Cultural.
- P-04: ~~decidir rediseño de rúbricas~~ **RESUELTA (D-40, v0.4.7)**: el usuario fija la cabecera **criterio · peso · nivel 1 (más bajo) … nivel 4 (más alto)**; la fila es un **ítem de texto libre** (el «apartado» actual) y **la gradación de cada nivel se edita por ítem**. Los ítems heredan la escala común del instrumento si no definen la suya.
- P-05: ~~plantilla CDU 3.er ciclo~~ **HECHA (v0.2.1)**. Quedan fases siguientes: Lengua, Plástica (Ed. Artística) y Educación en Valores (5º), y los cursos 1º–4º si se amplía el piloto.
- P-06: ~~generar las plantillas de todas las áreas y ciclos de Primaria~~ **RESUELTA (v0.4.1)**: `tools/extract-decreto.py` extrae el Anexo II-A del Decreto 66/2022 (modo `layout` de `pypdf`) y escribe 19 plantillas (7 áreas × ciclos; 130 CE · 294 criterios) en `plantillas/*.json`, validado contra la plantilla Matemáticas 3.er ciclo hecha a mano (coincidencia exacta). `tools/check-plantillas.js` valida estructura, códigos únicos, vínculos criterio→CE y duplicados; `tools/build-plantillas.js` embebe las 19 en `js/plantillas.js` (~156 KB). Los niveles ACI ya pueden apuntar a cualquier área y curso de 1º a 6º.
- P-07 (licencia y distribución, D-35): se contempla proponer el uso de la app a otros profesores y a la consejería (no el hosting, sino el código/app). **Decisión provisional: mantener todo privado por ahora.** Si se abre, decidir licencia — recomendación **EUPL-1.2** para administración pública (versión oficial en castellano, copyleft) o **MIT/Apache-2.0** si se prioriza máxima adopción. Mantener el modo local/offline como postura por defecto (minimización RGPD de datos de menores); la nube (OneDrive/backend) queda siempre opcional y apagada por defecto. Kit de distribución pendiente: `LICENSE`, `README`, nota de seguridad «cero red, datos en el dispositivo», entregable `dist/evalcrit.html`.
- P-02: revisar D-13 (agregación multi-instrumento) tras uso real.
- P-03: asistente "nuevo curso escolar" arrastrando grupos y currículo.
- P-08: importar rúbricas generadas por una **IA** («cualquier chat») desde un bloque **JSON**. Formato, plantilla de prompt y UI definidos. **RESUELTA (v0.4.7)**: `Storage.importarRubrica(datos, claseId, periodo)` valida y crea el instrumento, y el botón **«Importar rúbrica (IA)»** de Instrumentos abre un modal que (1) genera las instrucciones con los códigos reales de la asignatura y **huecos `___`** para personalizar, con botones «Copiar instrucciones» y «Descargar .txt», y (2) importa el JSON pegado. Nunca importa a medias (ver reglas abajo).
- P-09 (cobertura de pruebas): el editor de rúbricas (cuadrícula del modal) y el modal de importación **no están cubiertos** por pruebas automáticas. `tools/checks.js` sí cubre el motor (`Calc.nivelesDeApartado`, `notaInstrumento`) y `Storage.importarRubrica`, y expone `filaApartado`/`cabeceraRubrica`/`plantillaColumnas`/`promptIa` para comprobar que cabecera y filas alinean columnas; pero el ciclo real abrir→editar→guardar de un ítem debe verificarse a mano en navegador (ver F7). Riesgo conocido: no regresar los descriptores propios al reabrir un ítem ya guardado.

### Formato de rúbrica para IA (P-08, v0.4.7)

**Cambio de formato**: se sustituye el CSV propuesto en v0.4.x por **JSON** (`tipo: "rubrica-evalcrit"`, `version: 1`). Motivos: (1) coherencia con las plantillas de currículo (D-31), que usan `tipo`/`version` y el mismo proceso de validación; (2) los descriptores por celda son frases largas y el separador `;` del CSV los rompería. La plantilla de prompt para la IA vive en `plantillas/rubrica-para-ia.md`.

```json
{
  "tipo": "rubrica-evalcrit",
  "version": 1,
  "titulo": "Corrección de libreta · 5ºB",
  "unidad": "UD1",
  "nivel": "",
  "items": [
    {
      "criterio": "Ortografía y acentos",
      "peso": 3,
      "criterios": ["LCL3"],
      "niveles": [
        { "pct": 25, "descriptor": "Errores frecuentes que dificultan la lectura" },
        { "pct": 50, "descriptor": "Errores puntuales que no impiden entender el texto" },
        { "pct": 75, "descriptor": "Casi sin errores; algún despiste aislado" },
        { "pct": 100, "descriptor": "Sin errores; ortografía y acentos correctos" }
      ]
    }
  ]
}
```

Reglas del importador (implementado en v0.4.7):
- Se valida `tipo`/`version`; `titulo` obligatorio; `unidad` y `nivel` opcionales (`nivel`: `""` = común, `"BASE"` = sin adaptación, o el código de un nivel ACI de la clase).
- `items` no vacío; `criterio` no puede repetirse; `peso` numérico > 0; cada ítem necesita **al menos 2 niveles** (se aceptan y ordenan por `pct` ascendente; la plantilla pide 4). Se admite que distintos ítems traigan distinto número de niveles.
- Cada ítem debe indicar al menos un criterio. Los códigos de `criterios` se resuelven contra los criterios de la **asignatura del nivel** correspondiente; si alguno no existe, se aborta la importación y se listan los desconocidos (nunca se importa a medias).
- El resultado es un instrumento tipo `Rúbrica` con esos ítems, pesos, criterios y descriptores por nivel; `instrumento.niveles` toma la escala del primer ítem y cada `apartado.niveles` guarda la suya. El `periodo` se elige en el modal (por defecto `T1`).
- Tolerancia deliberada con el claustro (baja competencia digital): si el JSON está mal, el error se explica en castellano llano y no se crea nada.

## 15. Glosario

- **Criterio**: unidad mínima de evaluación con peso %.
- **Logro**: % conseguido en un criterio/apartado (obtenido/máximo).
- **Instrumento**: control, rúbrica, proyecto u otro elemento de calificación.
- **Clase**: asignatura impartida a un grupo.
- **Nivel ACI**: adaptación curricular de un subgrupo de la clase que trabaja el currículo de otro curso (p. ej. 4º dentro de un aula de 6º).
- **Periodo**: T1, T2, T3 o Final (recálculo anual).

## 16. Registro de cambios

| Versión | Commit | Contenido |
|---|---|---|
| v0.1 | `2c43968` | Primera versión funcional completa con motor verificado |
| v0.1.1 | `e54df4f` | Refresco automático de vistas, criterios en desplegable compacto, «Añadir calificación» desde cuadrícula |
| v0.1.2 | `4570e0a` / `e265ca1` | Cuadrícula siempre con alumnos, hash de navegación, diagnóstico de grupo, errores visibles, cache-busting, export de modalInstrumento |
| v0.2 | `a71ea27` | Importador de currículo oficial (D-31/D-32) + plantilla Matemáticas 3.er ciclo verificada contra el Decreto 66/2022 (8 CE · 17 criterios · 6 bloques de saberes); P-01 resuelta; nuevos pendientes P-04 (rediseño rúbricas) y P-05 (plantilla CDU) |
| v0.2.1 | `dc1312e` | Plantilla Conocimiento del Medio 3.er ciclo (9 CE · 23 criterios · 3 bloques); importación por cursos (`cursos:["5º","6º"]` → una asignatura por curso con pesos independientes); plantillas incrustadas en la app (`js/plantillas.js`); botón «Restablecer y vaciar todos los datos» en Inicio; 25 checks de importador en verde |
| v0.3 | `68d3292` | Evaluación de competencias clave: `Calc.notaClave` y `Calc.clavesDeClase` (misma fórmula ponderada, D-33); pestaña «Competencias» con sección de claves del perfil de salida |
| v0.3.1 | `a06e5a2` | Backups con nombre legible `backup-DD-MM-AAAA-HHMM.json` + aviso de carpeta Descargas; carpeta `backups/` local (ignorada por git) para copiar los JSON junto al proyecto; curso escolar seleccionable en Inicio y año por defecto calculado según la fecha (curso arranca en julio) |
| v0.3.2 | `0ac2709` | Exportación directa a carpeta elegida (D-34): File System Access API con carpeta recordada, fallback a «Guardar como» y a Descargas (Android); indicador de última copia en Inicio (`meta.ultimaExportacion`) |
| v0.3.3 | rama `fichero-unico` | `dist/evalcrit.html`: app completa en un solo fichero (CSS+JS incrustados, ~105 KB) vía `tools/build-singlefile.js`; solución a R-03 (Chrome Android abre por `content://` y no carga recursos externos) |
| v0.4.0 | rama `fichero-unico` | **ACI (adaptación curricular)**: niveles por clase que apuntan al currículo de otro curso, asignación de alumnado, instrumentos con `nivel`/`unidad`, motor de cálculo por alumno (D-35/D-37) y selector de nivel en la cuadrícula. **Fix**: el currículo recién importado ya aparece sin borrar áreas (`CurriculoView.seleccionar`, D-35). **Retrocompatibilidad**: `Storage.migrar` añade los campos nuevos a backups antiguos sin cambiar `schemaVersion`. **Infra**: `tools/checks.js` (31 comprobaciones Node en verde, incluye el caso 6º con Control base/ACI/común). *Pendiente Hito 4: currículo de todas las áreas/ciclos de Primaria para alimentar los niveles ACI.* |
| v0.4.1 | rama `fichero-unico` | **Hito 4**: currículo completo de Primaria (Hito 4, P-06). `tools/extract-decreto.py` genera 19 plantillas desde el Anexo II-A del Decreto 66/2022 (7 áreas × ciclos; 130 CE · 294 criterios); validado contra la plantilla Matemáticas 3.er ciclo (coincidencia exacta). `tools/check-plantillas.js` (306 comprobaciones) y `tools/build-plantillas.js` → `js/plantillas.js` regenerado. El importador suma 100 al importar cada plantilla (48 checks Node en verde; se suprime la plantilla reducida Conocimiento del Medio). `dist/evalcrit.html` (~248 KB). |
| v0.4.2 | rama `fichero-unico` | **Importador estético**: el modal «Importar currículo» agrupa las 19 plantillas por área (tarjetas) y ciclo (chips «Primer ciclo (1º y 2º)»…); se retira la importación manual desde archivo `.json` (formatos que solo genera la propia app). Nuevos estilos `.importa-area`/`.hint`. |
| v0.4.3 | rama `fichero-unico` | **Exámenes paralelos y vista armonizada**: botón **Duplicar** en Instrumentos que crea copias de un examen para uno o varios niveles ACI (mismos apartados/criterios, misma `unidad`, notas en blanco); listado de instrumentos ordenado por unidad. Cuadrícula con opción **«Todos los niveles»** que muestra al grupo completo con cada examen solo donde aplica («—» en gris) y la nota armonizada por currículo de cada alumno. Modal ACI: aviso cuando no hay niveles y foco en el campo Código al añadir uno. `dist/evalcrit.html` (~250 KB); 48 + 306 comprobaciones en verde. |
| v0.4.4 | `f9dfe3e` | **Criterios globales/desglosados y pesos en rúbrica**: Control/Proyecto con criterios por apartado (desglosado) o globales a todo el instrumento (campo `criteriosModo` + `criterioIdsGlobal`); en Proyecto las filas se llaman «partes/fases». Rúbrica con campo `peso` por fila y nota = media ponderada. Fixes: los chips de criterios del modal respetan el nivel ACI (`Calc.asignaturaDeNivel`), y en modo global los apartados ya no piden criterios individuales. Botón **Guardar** que sobrescribe `evalcrit.json` en la carpeta de backups elegida. Pendiente **P-08**: importar rúbricas desde CSV (formato tipo definido en §14). `dist/evalcrit.html` (~258 KB); 48 + 306 comprobaciones en verde. |
| v0.4.5 | `9a8ee60` | **Agrupación por unidades didácticas (D-38)**: desplegable de UD en la cuadrícula que filtra las columnas, fila de cabecera agrupada por unidad cuando se ven varias, y columna del alumno fija (sticky) en las tablas anchas. Helper `Calc.unidadesDe`. `tools/checks.js` (52 comprobaciones, incluye render de la vista). |
| v0.4.6 | `d54dabe` | **Corrección ágil y buscador (D-39)**: barra «Anterior · Guardar y siguiente» con contador y resaltado del alumno en curso en la pantalla de corrección; las notas se vuelcan a memoria al teclear (el `localStorage` se guarda con retardo) para no perder nada al saltar de alumno. Buscador de alumnado en la cuadrícula para grupos de más de 6. `tools/checks.js` (55 comprobaciones). |
| v0.4.7 | `11aad3f` | **Rúbricas por ítem (D-40) e importación desde IA (P-08)**: cada ítem de la rúbrica puede definir **sus propios descriptores por nivel** y hereda la escala común del instrumento si los deja vacíos (`apartado.niveles`; `Calc.nivelesDeApartado` resuelve la escala efectiva, ascendente). El editor muestra la cuadrícula **criterio · peso · nivel 1…N** con el descriptor heredado como *placeholder* y la corrección usa el descriptor del ítem (más un desplegable de descriptores para tableta). Botón **«Importar rúbrica (IA)»**: genera las instrucciones con los códigos del currículo y **huecos `___`** (copiar/descargar), importa el JSON pegado (`Storage.importarRubrica`), valida con errores en castellano y **nunca importa a medias**. Se sustituye el formato CSV por **JSON** (`tipo: "rubrica-evalcrit"`). `dist/evalcrit.html` (~280 KB); `tools/checks.js` (89 comprobaciones) + plantillas (306). |
| v0.4.8 | `5b187d5` | **Desplegable por unidad en Instrumentos (D-41)**: el listado de instrumentos de la clase permite filtrar por **unidad didáctica** (Todas / UD1 / UD2…), con el mismo criterio que la Cuadrícula (`Calc.unidadesDe`) y filtro puro en `Calc.instrumentosDeUnidad`. Se reinicia a «Todas» al cambiar de clase o si la unidad ya no existe. `tools/checks.js` (95 comprobaciones). *(Sustituido por D-43 en v0.5.0; el helper `Calc.instrumentosDeUnidad` se conserva.)* |
| v0.4.9 | `28455a6` | **Sugerencias editables de unidad (D-42)**: el campo «Unidad» del instrumento es ahora un `<input>` con `<datalist>` que sugiere las unidades ya usadas en la **asignatura** (`Calc.unidadesDeAsignatura`) pero deja escribir cualquier texto; `Tipo` y `Periodo` se mantienen como desplegables cerrados a propósito (de ellos depende el motor). Generación del `<datalist>` aislada en `datalistUnidades()` (testeable). `dist/evalcrit.html` (~282 KB); `tools/checks.js` (99 comprobaciones). |
| v0.5.0 | `dc59f8c` | **Instrumentos por trimestre y unidades plegables (D-43) + cuadrícula con columnas plegables por unidad (D-44)**: en Instrumentos se retira el desplegable de unidades (D-41) y se sustituye por un desplegable de **trimestre** (Todos / T1 / T2 / T3) con **bloques plegables por unidad**, cerrados al entrar, más el bloque «Sin unidad»; la tabla deja de repetir la columna Periodo y al imprimir los bloques salen abiertos. En la pestaña **Instrumentos** de la Cuadrícula, la cabecera de cada unidad **pliega y despliega sus columnas**, y tanto esa cabecera de grupo como el buscador siguen disponibles; «Añadir calificación» y el desplegable de unidades se trasladan a esa pestaña (Nivel ACI y Periodo se quedan arriba porque Criterios y Competencias los usan para calcular), el buscador se mantiene en las tres pestañas y «Competencias» pasa a llamarse **«Competencias específicas y clave»**. `dist/evalcrit.html` (~286 KB); `tools/checks.js` (113 comprobaciones) + plantillas (306). |
| v0.5.1 | `62d11c6` | **Mismo gesto de plegado en la Cuadrícula (D-44, refinado)**: las columnas de cada unidad salen **plegadas al entrar**, como los bloques de Instrumentos, y cada unidad lleva su barra con flecha, nombre y **número de instrumentos**. Al filtrar por una unidad en el desplegable, esa unidad se abre sola. La barra se pinta también cuando la clase tiene **una sola unidad con nombre** (si no, quedaría plegada sin nada que tocar); solo se omite si todos los instrumentos van sin unidad. `dist/evalcrit.html` (~287 KB); `tools/checks.js` (115 comprobaciones). |
