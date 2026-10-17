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
- **Asignatura/Área**: materia con currículo propio, **anclada a un curso** (en Infantil, las áreas) (D-49).
- **Clase = Asignatura + Grupo** (ej. Matemáticas · 3ºA); los alumnos llegan automáticamente del grupo.
- Volumen: piloto real = 1 clase de 15 alumnos y 2–3 asignaturas; soporte holgado hasta ~12 clases × 20 alumnos.

## 4. Currículo y competencias

Jerarquía LOMLOE: Etapa → Área → **Competencia específica** → **Criterio de evaluación**.

- Criterio: código, descripción, asignatura, **peso % editable fijo durante el curso**; la suma de pesos por asignatura debe ser 100% (aviso si no).
- Vínculo obligatorio criterio → 1..n competencias específicas; opcional criterio → competencias clave del perfil de salida (CCL, CP, STEM, CD, CPSAA, CC, CE, CCEC).
- Saberes básicos: NO como campo del criterio (D-09); solo campo informativo opcional en los instrumentos. Como novedad v0.2, cada plantilla puede traer los bloques de saberes del área y se guardan como campo informativo `saberesBasicos` en la asignatura.
- **Plantillas oficiales (D-31)**: ficheros JSON en `plantillas/` generados a partir del decreto verificado — **Decreto 66/2022, de 7 de julio (BOC nº 135, 13-07-2022), Anexo II-A**, currículo Infantil+Primaria Cantabria. Esquema de plantilla (`tipo: "curriculo-evalcrit"`, `version: 1`): asignatura (nombre/etapa/ciclo), competencias específicas con descriptores del Perfil de salida, criterios vinculados por `ceCodigo`, y `peso: null` para reparto equitativo. **Campo `asignatura.cursos`** (v0.2.1): cada plantilla declara los cursos de su ciclo (ej. `["5º","6º"]`). Desde v0.6.0 (D-49) el importador crea **una asignatura por curso pedido** (`Matemáticas 6º`, con los criterios `MAT.TC.*`), nunca los dos del ciclo a la vez; sin `cursos` se crea una sola asignatura (compatibilidad). Fusión segura: si la asignatura destino ya existe y tiene currículo, la importación se rechaza con mensaje claro; nunca se tocan instrumentos ni registros. Los descriptores (STEM1, CPSAA3…) se traducen automáticamente a competencias clave por prefijo (mayor coincidencia primero).
- **Plantillas integradas (v0.2.1)**: `js/plantillas.js` incrusta las plantillas como script clásico (`PLANTILLAS_CURRICULO`), generado desde `plantillas/*.json`; así la carga del currículo funciona en `file://` sin selector de archivos ni fetch. El modal «Importar currículo» agrupa las plantillas por área y ciclo.
- **Pesos por defecto al importar (D-32)**: si la plantilla no trae pesos, se reparte 100 % a partes iguales con redondeo a 4 decimales ajustando el último criterio para que la suma sea exactamente 100; quedan editables como cualquier criterio. Plantilla piloto validada contra el decreto: Matemáticas 3.er ciclo = 8 CE + **17 criterios** (2+3+2×6) + 6 bloques de saberes; suma de pesos verificada = 100.
- **Competencias clave (D-33, v0.3)**: la calificación por clave (CCL, CP, STEM…) usa exactamente la misma fórmula ponderada que las específicas (`notaPonderada` filtrando los criterios que llevan esa clave en `claveIds`); sin evidencias → «—». Las claves se derivan automáticamente del Perfil de salida al importar plantillas oficiales y son editables en el criterio. Se muestran en Cuadrícula → pestaña «Competencias», sección «Competencias clave».
- **Alta de asignatura por curso y Currículo como consulta (D-49, v0.6.0)**: la asignatura ancla el currículo y ahora recuerda su **curso** (`asignatura.curso`, p. ej. «6º») y su **fuente legal** (`asignatura.fuente`, la cita del decreto). Al crear una asignatura se elige el **origen**: **«Currículo oficial»** (se elige área y curso y se recupera el ciclo correspondiente, con pesos equitativos) o **«En blanco»** (nombre a mano, para áreas sin plantilla o materias propias). Una asignatura ya creada sin currículo muestra un botón **«Recuperar»** que carga el currículo oficial en ella **sin duplicarla** (`Storage.importarCurriculo(datos, {cursos, asignaturaId})`). La sección **Currículo** deja de importar: queda como **consulta de la legislación** (muestra la `fuente` de la asignatura) y **edición de las ponderaciones** de los criterios recuperados. Motivo: el currículo es del **ciclo**, pero las asignaturas se imparten por **curso**; antes, importar creaba 5º y 6º de golpe con los mismos criterios duplicados, y una asignatura creada a mano se quedaba sin currículo.

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

### Banco de instrumentos (D-48, v0.5.7)

El **banco** guarda **moldes** de instrumentos —título, tipo, apartados y criterios— para **reutilizarlos en otra clase o en el curso siguiente** sin volver a escribirlos.

- **Guardar:** el botón **«Al banco»** de cada fila del listado guarda una **copia** del instrumento (no lo modifica); en la cabecera de Instrumentos, **«Añadir desde el banco»** muestra cuántos moldes hay guardados.
- **Reutilizar:** el modal lista los moldes (título, tipo, unidad, asignatura de origen y número de apartados) y, al pulsar **«Usar»**, crea un **instrumento nuevo** en la clase activa y en el periodo elegido, **con las notas en blanco** y los **mismos apartados y criterios**.
- **Los criterios se guardan por CÓDIGO, no por id** (`apartado.criterioCodes`): así el molde sigue siendo válido aunque su asignatura de origen se elimine, y los ids reales los pone el currículo de la clase de destino. Si **algún código no existe** en esa asignatura, **no se crea nada** y se avisa en castellano listando los que faltan (nunca a medias, como en la rúbrica de IA).
- El molde **no guarda la clase**, pero sí su **asignatura de origen** (informativa). Los criterios se resuelven contra el currículo de la clase destino y, si la copia es de un **nivel ACI**, contra el currículo de ese nivel (`Calc.asignaturaDeNivel`). Empareja por **código exacto**: para reapuntar entre ciclos está «Duplicar» con el nivel (D-47).
- **Quitar del banco** (×) borra solo el molde: no afecta a ningún instrumento del curso.
- El banco vive **dentro del mismo `db`**, así que **viaja en el backup** (el modelo de seguridad del claustro) y los backups antiguos se migran solos a un banco vacío. Un **reinicio** de la aplicación sí lo borra (como todo lo demás).

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
- **Cuadrícula: columnas plegables por unidad y controles en su pestaña** (D-44, v0.5.0; plegado por defecto en v0.5.1; alineación corregida en v0.5.2): en la pestaña «Instrumentos» de la Cuadrícula, cada unidad tiene una **barra propia con el mismo aspecto y el mismo gesto que los bloques de la vista Instrumentos** (flecha, nombre y número de instrumentos): sus columnas salen **plegadas al entrar** y se abren y cierran al tocar la barra. Si el docente **filtra por una unidad** en el desplegable, esa unidad se abre sola (para no obligarle a un clic de más). Detalle importante: la barra se pinta siempre que haya algo que agrupar —varias unidades, **o una sola con nombre**—; solo se omite cuando todos los instrumentos van «sin unidad». Así nunca puede quedar una unidad plegada sin barra que tocar para abrirla. **Una unidad plegada no borra sus columnas**: deja una única celda con `colspan` que las ocupa (marcada `celda-plegada`), de forma que todas las filas cuadran con la cabecera y columnas como «Evaluación» no se desplazan. Esconder celdas con `display:none` las hacía desaparecer del reparto de la tabla y descolocaba lo que venía detrás. Además, «Añadir calificación» y el desplegable de unidades pasan a vivir **dentro** de la pestaña Instrumentos, porque en la práctica solo afectaban a ella; **Nivel ACI y Periodo se quedan en la cabecera general** porque Criterios y Competencias los necesitan para calcular, y el **buscador de alumnado sigue en las tres pestañas**. La pestaña «Competencias» pasa a llamarse **«Competencias específicas y clave»**, que es lo que realmente contiene.
- Sugerencias **editables** de unidad (D-42, v0.4.9): el campo «Unidad» del instrumento es un `<input>` con `<datalist>`: al escribir despliega las unidades **ya usadas en la asignatura** (`Calc.unidadesDeAsignatura`, todas sus clases, de modo que una UD creada en 6ºA se ofrece en 6ºB) pero **admite cualquier texto nuevo** — sugiere, no obliga. Es deliberado: no forzamos una lista cerrada porque cada docente organiza sus unidades a su manera. La generación del `<datalist>` se aísla en la función pura `datalistUnidades(asigId)` (testeable sin navegador).
  - **Por qué `Tipo` y `Periodo` siguen siendo desplegables cerrados**: `tipo` decide el motor (`esRubrica = tipo === 'Rúbrica'`) y `periodo` filtra notas y cuadrículas; si se pudieran escribir a mano, una variante como «Rubrica» o «1T» **desactivaría en silencio** la rúbrica o rompería los filtros. Ahí la rigidez protege, no limita. La flexibilidad se concentra donde el sistema no depende del valor exacto de lo escrito.
- Importar rúbrica creada con IA (P-08, v0.4.7; acceso reubicado en v0.5.2): al crear un instrumento de tipo **Rúbrica**, el propio formulario ofrece **«Importar rúbrica (IA)»** (solo en instrumentos nuevos), que abre un modal en dos pasos — (1) instrucciones listas para pegar en un chat, rellenas con los códigos del currículo de la asignatura y con **huecos `___`** para personalizar («Copiar instrucciones» / «Descargar .txt»); (2) pegar la respuesta JSON, elegir periodo (viene ya el del formulario) e **Importar**. Si algo falla, aviso en castellano y no se crea nada.
- Elegir qué se imprime cuando hay niveles ACI (D-46, v0.5.4): en las pestañas **Criterios** y **Competencias específicas y clave**, si la clase tiene algún nivel ACI, el botón «Imprimir / PDF» abre un modal «Imprimir» con dos opciones — **«Imprimir vista actual»** (lo que se ve en pantalla, con las columnas del nivel elegido) e **«Imprimir todo (base + cada nivel ACI)»**. La segunda compone un **informe por niveles**: una sección por nivel —«Base (sin adaptación)» y cada nivel ACI— con **solo su alumnado** y **su propio currículo** (sus criterios o competencias), sin mezclar columnas, porque los currículos de cada nivel pueden no coincidir. El título de cada sección lleva **el nombre de la asignatura de ese nivel** («Base (sin adaptación) · Matemáticas 6º», «4º · Matemáticas 4º»), para que quede claro de qué currículo salen las columnas. Las secciones salen **una tras otra** (sin salto de página forzado) y el título nunca se separa de su tabla (`break-after: avoid` / `page-break-after: avoid` en el título, `break-before: avoid` en la tabla, más `thead` repetido y `tr` sin cortarse). El informe se compone **fuera de la vista** (`#informe-impresion`, solo visible al imprimir) y se retira al cerrar el diálogo (`afterprint`), de modo que **la pantalla no cambia**. En «Instrumentos» se mantiene lo sencillo: se imprime la vista actual, sin modal (a petición del docente). El generador del informe se aísla en la función pura `informeHtml(claseSel, periodo, tab)` (testeable sin navegador).
- Códigos de nivel ACI normalizados (v0.5.5): el **código** de un nivel ACI se guarda siempre **sin espacios y en mayúsculas** (`Calc.nivelNorm`) y la **adaptación** del alumnado se compara con esa misma forma. Antes, un código tecleado en minúscula o con espacios dejaba al alumno apuntando a un nivel inexistente y **desaparecía** de la cuadrícula y del informe. Ahora `Calc.nivelDeAlumno` devuelve el **nivel efectivo** (si el código no corresponde a ningún nivel, el alumno **cae a base**, nunca desaparece), y `Storage.migrar` sanea `nivelesAci`, `adaptaciones` e `instrumentos[].nivel` al cargar cualquier backup. La carpeta de pruebas del docente con datos reales (`json prueba no online/`) queda **ignorada por git**.
- **Los criterios de un instrumento ACI deben ser los de su currículo (D-47, v0.5.6):** al crear un **examen paralelo** («Duplicar») de un control, la copia heredaba los criterios del original aunque cambiara de nivel ACI; si el original era de **otro ciclo** (p. ej. el control base de 6º), las notas del alumnado adaptado **no aparecían** ni en la cuadrícula ni en el informe, porque el motor solo cuenta los criterios del currículo del nivel. Ahora «Duplicar» **reapunta los criterios al currículo del nivel de la copia**, emparejando por **número de criterio** (`MAT.TC.2.2` ↔ `MAT.SC.2.2`, el mismo criterio oficial adaptado al ciclo), y **no crea nada** (con aviso) si algún criterio del original no tiene equivalente en ese currículo. Como las **notas cuelgan del apartado, no del criterio**, reasignar criterios **no borra ninguna calificación**. La misma corrección se aplica **al cargar o importar cualquier backup** (`Calc.repararCriteriosDeInstrumentos` desde `Storage.migrar`), reapuntando los instrumentos de nivel que tengan criterios de otro ciclo y avisando de cuántos se corrigieron. Se detecta con `Calc.criteriosFueraDeNivel` y se empareja con `Calc.claveCriterio`. Además el modal de instrumento **blinda el guardado** (no deja guardar un instrumento de nivel con criterios ajenos), al **editar un control ya hecho** sus criterios asignados salen **marcados**, y al cambiar de nivel **avisa antes** de descartar la selección. De paso se corrige el bloque de criterios globales, que leía su selección de todo el formulario por un selector mal escrito (`data-campo="criterios-global"`): ahora lee su propio contenedor y deja de guardar criterios de apartados como si fueran globales.
- **Banco de instrumentos (D-48, v0.5.7):** para reutilizar un instrumento en otra clase o el curso siguiente, cada fila del listado de Instrumentos lleva un botón **«Al banco»** (con `title` explicativo) y la cabecera un botón **«Añadir desde el banco (N)»**. El modal muestra los moldes guardados (título, tipo, unidad, **asignatura de origen** y número de apartados), un selector de **periodo** para la copia y, por fila, **«Usar»** y **«×»** (quitar del banco). Al usar uno se crea un instrumento **nuevo con las notas en blanco**; si el molde es de otro currículo y algún criterio no existe, **no se crea nada** y se explica en castellano qué códigos faltan y qué hacer. Se mantiene **dentro de Instrumentos** (sin sección nueva en el menú), por simplicidad para el docente. **Congelado (v0.5.8)** a la espera de que exista «Empezar curso nuevo»: no se le añaden más funciones.
- **Enlace del instrumento (v0.5.8):** el modal de instrumento incluye, al final, un campo **«Enlace (opcional)»** para pegar la dirección del examen, del proyecto o de los materiales. Se guarda con el instrumento (`instrumento.url`) y **viaja en el backup** (y en el molde del banco). Si se teclea sin esquema se asume `https://`; al pintarlo se descartan los esquemas peligrosos (`javascript:`, `data:`, `vbscript:`), de modo que un backup manipulado **no pueda inyectar código** por el `href`. El enlace sale como **título pulsable** en el listado de Instrumentos y como botón **«Abrir enlace»** en la cabecera de la corrección, para abrir el examen mientras se corrige.
- **Borrado en cascada sin datos huérfanos (D-50, v0.6.1):** cada vista reimplementaba a mano sus propias cascadas de borrado y dos de ellas filtraban datos. Al **borrar una clase**, el código hacía `delete db.registros[<id de clase>]`, pero `db.registros` está indexado por **id de instrumento**: la clave nunca coincidía, así que los instrumentos desaparecían y **sus notas quedaban huérfanas para siempre**, aunque el aviso prometía borrarlas («Sus instrumentos y notas también se eliminarán»). Al **borrar un grupo**, se eliminaban alumnado y clases pero **no sus instrumentos ni sus notas**, que quedaban apuntando a una clase inexistente. Ahora el borrado vive en **un único punto** (`Storage.borrarClase` / `borrarGrupo` / `borrarAsignatura` / `borrarAlumno`), que las cuatro vistas usan: tras cualquier baja **no queda jamás** un instrumento que apunte a una clase inexistente ni una nota cuyo instrumento ya no exista. Además, al borrar una **asignatura** se limpian los **niveles ACI** que apuntaban a ella (y la adaptación del alumnado de ese nivel): sin esa limpieza, el alumnado adaptado **caería en silencio al currículo base**. Se demuestra con **20 comprobaciones** nuevas (`tools/checks.js`, sección «Borrado en cascada sin datos huérfanos»), que además verifican el invariante «ningún instrumento sin clase y ningún registro sin instrumento» después de cada borrado.
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
- **Recuperación de currículo (v0.6.0, D-49)**: el currículo oficial ya no se importa desde la vista Currículo; se recupera **al crear la asignatura** (o con el botón **«Recuperar»** de una asignatura sin currículo). Se elige **área y curso** y se carga el ciclo correspondiente con pesos equitativos; la asignatura recuerda su `curso` y su `fuente`. En Currículo solo se **consulta la legislación** y se **editan las ponderaciones**. La importación manual desde archivo `.json` se retiró (los formatos los genera la propia app vía `tools/build-plantillas.js`).

## 11. Modelo de datos (schemaVersion 1)

```json
{
  "schemaVersion": 1,
  "cursoEscolar": "2025/2026",
  "grupos": [{ "id": "", "nombre": "", "etapa": "Primaria" }],
  "alumnos": [{ "id": "", "nombre": "", "apellidos": "", "grupoId": "" }],
  "asignaturas": [{ "id": "", "nombre": "", "etapa": "", "curso?": "6º", "fuente?": "Decreto 66/2022…", "saberesBasicos?": [{ "bloque": "A. …", "apartados": ["…"] }] }],
  "clases": [{ "id": "", "asignaturaId": "", "grupoId": "", "nivelesAci?": [{ "codigo": "4", "etiqueta": "4º", "asignaturaId": "" }], "adaptaciones?": { "alumnoId": "4" } }],
  "competenciasClave": [{ "id": "", "codigo": "CCL", "nombre": "" }],
  "competenciasEspecificas": [{ "id": "", "asignaturaId": "", "codigo": "", "descripcion": "", "perfilSalida?": ["STEM1", "…"] }],
  "criterios": [{ "id": "", "asignaturaId": "", "codigo": "", "descripcion": "", "peso": 0, "espIds": [], "claveIds": [] }],
  "instrumentos": [{
    "id": "", "claseId": "", "tipo": "Control", "titulo": "", "fecha": "",
    "periodo": "T1", "saberes": "", "nivel?": "", "unidad?": "", "url?": "",
    "niveles": [{ "pct": 100, "descriptor": "" }],
    "apartados": [{ "id": "", "orden": 1, "descripcion": "", "maxPts": 5, "criterioIds": [], "peso?": 1, "niveles?": [{ "pct": 25, "descriptor": "" }] }]
  }],
  "registros": { "instrumentoId": { "alumnoId": { "apartadoId": 3.4 } } },
  "bancoInstrumentos?": [{
    "id": "", "titulo": "", "tipo": "Control", "unidad": "", "saberes": "", "url?": "",
    "niveles?": [{ "pct": 100, "descriptor": "" }],
    "criteriosModo?": "desglosado", "criterioCodesGlobal?": ["MAT.TC.1.1"],
    "apartados": [{ "descripcion": "", "maxPts": 5, "peso?": 1, "niveles?": [], "criterioCodes": ["MAT.TC.1.1"] }],
    "origen?": { "asignaturaId": "", "asignatura": "", "etapa": "", "guardadoEn": "" }
  }]
}
```

Nota banco (D-48): cada molde guarda los criterios por **código** (`criterioCodes`, `criterioCodesGlobal`), no por id, para poder reutilizarlo en otro currículo y sobrevivir a la desaparición de su asignatura de origen. `origen` es solo informativo. Al **añadir desde el banco** (`Calc.instrumentoDesdeMolde`) se crea un instrumento nuevo en la clase destino con apartados e ids nuevos, resolviendo cada código contra el currículo de esa clase (o de su nivel ACI) y **abortando** si alguno no existe.

Nota asignatura (D-49): `asignatura.curso` guarda el curso del que se recuperó el currículo («6º») y `asignatura.fuente` la cita legal de origen (p. ej. el Decreto 66/2022). Son informativos: el motor no depende de ellos. Un backup antiguo los recibe vacíos en `Storage.migrar`.

Nota borrado (D-50, v0.6.1): `db.registros` está **indexado por id de instrumento** (`db.registros[instrumentoId][alumnoId][apartadoId]`), nunca por clase. Todas las bajas pasan por `Storage.borrarClase` / `borrarGrupo` / `borrarAsignatura` / `borrarAlumno`, que borran **en cascada** instrumentos, notas y —al borrar una asignatura— los **niveles ACI** que la referenciaban (más la adaptación del alumnado de ese nivel). Ninguna vista borra colecciones a mano.

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
- P-09 (cobertura de pruebas): el editor de rúbricas (cuadrícula del modal) y el modal de alta/recuperación de currículo (D-49) **no están cubiertos** por pruebas automáticas. `tools/checks.js` sí cubre el motor (`Calc.nivelesDeApartado`, `notaInstrumento`) y `Storage.importarRubrica`, y expone `filaApartado`/`cabeceraRubrica`/`plantillaColumnas`/`promptIa` para comprobar que cabecera y filas alinean columnas; pero el ciclo real abrir→editar→guardar de un ítem y el salto «Nuevo instrumento (Rúbrica) → Importar rúbrica (IA)» deben verificarse a mano en navegador (ver F7). Riesgo conocido: no regresar los descriptores propios al reabrir un ítem ya guardado.

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
| v0.5.2 | `d4a8fb7` | **La cuadrícula cuadra al plegar unidades e importar rúbrica al crear el instrumento:** una unidad plegada ya no borra sus columnas —deja una única celda con `colspan` (`celda-plegada`) que las ocupa—, de modo que todas las filas cuadran con la cabecera y columnas como «Evaluación» no se desplazan (esconder celdas con `display:none` las sacaba del reparto de la tabla). El botón **«Importar rúbrica (IA)»** se traslada al modal del instrumento (solo en instrumentos nuevos de tipo Rúbrica). `tools/checks.js` (cuadrícula + CSS de impresión). |
| v0.5.3 | `42daafa` | **De la cuadrícula se corrige por listado (D-45):** desaparecen el desplegable de unidades y «Añadir calificación» de la pestaña Instrumentos; aparece **«Corregir · N pendientes»** que abre un modal «¿Qué quieres corregir?» con los instrumentos ordenados por lo que falta, cada uno con su progreso (0/N corregidos, Completo o Sin alumnado). **PDF con formato propio:** cabecera `solo-impresion`, ocultación de controles y botones en impresión, `thead { display: table-header-group }` y `tr { break-inside/inside: avoid }` para que las filas no se corten. Al imprimir una cuadrícula con unidades plegadas, se abren todas las columnas en JS (la celda `colspan` de la zona plegada necesita verse desplegada). Al corregir desde la cuadrícula, el botón «Volver» vuelve a la cuadrícula (se añade `volverA` a `renderCorreccion`). Nuevos helpers: `Calc.progresoInstrumento` y `Calc.instrumentosPorCorregir`; `InstrumentosView.filasCorregirHtml`. `css/styles.css` ajustado; `tools/checks.js` 143 comprobaciones; `tools/check-plantillas.js` 306. `dist/evalcrit.html` (~298 KB). |
| v0.5.4 | `691cc98` | **Elegir qué imprimir con niveles ACI (D-46):** en Criterios y Competencias específicas y clave, si la clase tiene niveles ACI el botón «Imprimir / PDF» abre un modal con **«Imprimir vista actual»** e **«Imprimir todo (base + cada nivel ACI)»**. «Imprimir todo» compone un **informe por niveles**: una sección por nivel —Base y cada ACI— con solo su alumnado y su propio currículo, sin mezclar columnas, y con el **nombre de la asignatura** en el título de cada sección; las secciones van una tras otra y el título no se separa de su tabla (control de saltos de página). El informe se genera fuera de la vista (`#informe-impresion`, solo al imprimir) y se retira al cerrar el diálogo, así que la pantalla no cambia; en Instrumentos se imprime la vista actual sin modal. Nuevo helper puro `CuadriculaView.informeHtml(claseSel, periodo, tab)`. `tools/checks.js` 151 comprobaciones + plantillas 306. `dist/evalcrit.html` (~299 KB). |
| v0.5.5 | `34c0fc0` | **El alumnado ACI con el código en minúsculas o con espacios ya no desaparece:** el código del nivel se guardaba en mayúsculas pero la adaptación del alumnado tomaba el valor del desplegable tal cual; un código tecleado como «b » dejaba al alumno apuntando a un nivel inexistente y **no salía ni en la cuadrícula ni en el informe**. Se añade `Calc.nivelNorm` (recorta espacios y sube a mayúsculas; `base`/`BASE` = base) y `Calc.nivelDeAlumno` devuelve el **nivel efectivo**: si el código no corresponde a ningún nivel definido (p. ej. un nivel borrado), el alumno **cae a base** en vez de desaparecer. `Storage.migrar` sanea ya `nivelesAci`, `adaptaciones` e `instrumentos[].nivel` al cargar cualquier backup; el desplegable de adaptación del modal ACI y el guardado usan el **código normalizado**. La carpeta `json prueba no online/` (datos reales del docente) queda **ignorada por git**. `tools/checks.js` 161 comprobaciones + plantillas 306. `dist/evalcrit.html` (~301 KB). |
| v0.5.6 | `c6a8d04` | **Los criterios de un instrumento ACI ya son los de su currículo (D-47):** al crear un **examen paralelo** («Duplicar»), la copia heredaba los criterios del original aunque cambiara de nivel; si el original era de otro ciclo (p. ej. el control base de 6º), las notas del alumnado adaptado **no salían** en la cuadrícula ni en el informe. Ahora «Duplicar» **reapunta los criterios al currículo del nivel de la copia** por **número de criterio** (`MAT.TC.2.2` ↔ `MAT.SC.2.2`), avisa sin crear nada si no hay equivalente, y como las notas cuelgan del apartado **no se pierde ninguna calificación**. La corrección se aplica también **al cargar/importar cualquier backup** (`Calc.repararCriteriosDeInstrumentos` desde `Storage.migrar`, con aviso de cuántos instrumentos se corrigieron). El modal **blinda el guardado** (un instrumento de nivel no puede tener criterios ajenos), al **editar** un control ya hecho sus criterios salen **marcados** y al cambiar de nivel **avisa antes** de descartar la selección. Se corrige además el selector del bloque de criterios globales (`data-campo="criterios-global"`, mal escrito), que guardaba criterios de apartados como globales. `tools/checks.js` 177 comprobaciones + plantillas 306. `dist/evalcrit.html` (~309 KB). |
| v0.5.7 | `f561fe1` | **Banco de instrumentos (D-48):** guarda un instrumento como **molde reutilizable** (título, tipo, apartados y criterios) para volver a usarlo en **otra clase o el curso siguiente**. Botón **«Al banco»** en cada fila del listado y **«Añadir desde el banco (N)»** en la cabecera; el modal lista los moldes (con su **asignatura de origen** y número de apartados), deja elegir el **periodo** y ofrece **«Usar»** y **«×»** (quitar del banco). Al usar un molde se crea un **instrumento nuevo con las notas en blanco** y los criterios **reapuntados al currículo de la clase destino** (o al de su nivel ACI). Clave de diseño: el molde guarda los criterios **por código, no por id** (`Calc.moldeDeInstrumento`), así sobrevive a la desaparición de su asignatura de origen; si algún código **no existe** en el destino, **no se crea nada** y se avisa en castellano (`Calc.instrumentoDesdeMolde` + `Storage.anadirDesdeBanco`). `db.bancoInstrumentos` se añade a `defaults()` y se sanea en `Storage.migrar` (los backups antiguos migran a un banco vacío) y **viaja en el backup**. Sin sección nueva en el menú (todo dentro de Instrumentos). `tools/checks.js` **193** comprobaciones + plantillas 306. `dist/evalcrit.html` (~322 KB). |
| v0.5.8 | `2d98ac8` | **Enlace opcional del instrumento:** el modal incluye, al final, un campo **«Enlace (opcional)»** para pegar la dirección del **examen, del proyecto o de los materiales**. Se guarda en `instrumento.url` y **viaja en el backup** (y en el molde del banco). Si se teclea sin esquema se asume `https://`; al pintarlo se descartan los esquemas peligrosos (`javascript:`, `data:`, `vbscript:`), de modo que un backup manipulado no pueda inyectar código por el `href`. El enlace sale como **título pulsable** en el listado de Instrumentos y como botón **«Abrir enlace»** en la cabecera de la corrección. Nuevas utilidades puras `Utils.urlLimpia` y `Utils.urlPintable`. Se **congela el banco de instrumentos** (D-48) a la espera de que exista «Empezar curso nuevo»: no se le añaden más funciones. `tools/checks.js` **203** comprobaciones + plantillas 306. `dist/evalcrit.html` (~324 KB). |
| v0.5.9 | `ce86dc0` | **El botón «Quitar» de la fila de apartado ya cabe en su botón:** en un Control/Proyecto la fila de apartado es un grid, y declaraba una columna menos que los controles que pinta (nº, descripción, máximo, «peso», «Criterios» y «Quitar»). Por eso **«Quitar» caía a una segunda fila, en la columnita de 28px del número**, y su palabra no entraba. Se añade la sexta columna (`28px 1fr 110px auto auto **auto**`). La **rúbrica no se ve afectada** (usa su propia plantilla inline). `tools/checks.js` **204** comprobaciones. |
| v0.6.0 | `a02c4a0` | **Alta de asignatura por curso y Currículo como consulta (D-49):** la asignatura es el anclaje del currículo y ahora recuerda su **curso** (`asignatura.curso`, p. ej. «6º») y su **fuente legal** (`asignatura.fuente`, la cita del decreto). Al crear una asignatura se elige el **origen**: **«Currículo oficial»** (se elige área y curso y se recupera el ciclo correspondiente con pesos equitativos) o **«En blanco»**; las asignaturas sin currículo muestran un botón **«Recuperar»** que lo carga **sin duplicarlas**. `Storage.importarCurriculo(datos, {cursos, asignaturaId})` importa **un solo curso** y rellena una asignatura existente (sin opciones mantiene el comportamiento anterior). La sección **Currículo** deja de importar: **consulta la legislación** (muestra la `fuente`) y **edita las ponderaciones** de los criterios recuperados. Motivo: el currículo es del **ciclo**, pero las asignaturas se imparten por **curso**; antes, importar creaba 5º y 6º de golpe con los mismos criterios duplicados. `Storage.migrar` añade `curso`/`fuente` vacíos a los backups antiguos. `tools/checks.js` **214** comprobaciones + plantillas 306. `dist/evalcrit.html` (~329 KB). |
| v0.6.1 | `3787f4b` | **Borrado en cascada sin datos huérfanos (D-50):** cada vista reimplementaba sus cascadas de borrado a mano y dos filtraban datos. Al **borrar una clase**, `delete db.registros[<id de clase>]` nunca coincidía con la clave real de `db.registros` (que es el **id del instrumento**): los instrumentos desaparecían pero **sus notas quedaban huérfanas para siempre**, aunque el aviso prometía borrarlas. Al **borrar un grupo** se eliminaban alumnado y clases pero **no sus instrumentos ni sus notas**, que quedaban apuntando a una clase inexistente. Ahora el borrado vive en **un único punto** (`Storage.borrarClase` / `borrarGrupo` / `borrarAsignatura` / `borrarAlumno`), que las cuatro vistas usan; al borrar una **asignatura** se limpian también los **niveles ACI** que apuntaban a ella (y la adaptación de su alumnado), que antes caían en silencio al currículo base. **20 comprobaciones** nuevas (`tools/checks.js`, sección «Borrado en cascada sin datos huérfanos») verifican el invariante «sin instrumentos sin clase y sin registros sin instrumento» tras cada baja. `tools/checks.js` **234** comprobaciones + plantillas 306. `dist/evalcrit.html` (~330 KB). |
