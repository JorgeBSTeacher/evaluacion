# Guía de uso · Evalora

Manual paso a paso para el docente. Evalora es una aplicación HTML **de un solo fichero** que funciona **sin conexión**: no hay servidor, no hay nube y **tus datos no salen del dispositivo**. Califica con criterios ponderados según la LOMLOE (Cantabria, Infantil y Primaria).

> **Antes de nada: esto no es una app que se instala.** Es un fichero `evalcrit.html` que abres con el navegador. Los datos se guardan **en ese navegador, en ese ordenador**. Si cambias de equipo, de navegador o borras los datos de navegación, **no aparecen solos**: por eso el paso 7 (backup) no es opcional.

---

## Índice

1. [Abrir la aplicación](#1-abrir-la-aplicación)
2. [Grupos y alumnos](#2-grupos-y-alumnos)
3. [Asignaturas y clases](#3-asignaturas-y-clases)
4. [Niveles ACI (adaptaciones)](#4-niveles-aci-adaptaciones)
5. [Currículo: competencias, criterios y ponderaciones](#5-currículo-competencias-criterios-y-ponderaciones)
6. [Instrumentos: exámenes, rúbricas y proyectos](#6-instrumentos-exámenes-rúbricas-y-proyectos)
7. [Corregir](#7-corregir)
8. [Calificaciones: la cuadrícula](#8-calificaciones-la-cuadrícula)
9. [Informe de análisis](#9-informe-de-análisis)
10. [Backup: lo único que no puedes olvidar](#10-backup-lo-único-que-no-puedes-olvidar)
11. [Preguntas frecuentes](#11-preguntas-frecuentes)

---

## 1. Abrir la aplicación

1. Copia el fichero `evalcrit.html` (está en la carpeta `dist/`) a tu ordenador o al USB. Es **un solo fichero**: no necesita la carpeta `js/`, ni internet, ni instalar nada.
   - **En Windows**: haz doble clic. Se abre en Chrome o Edge.
   - **En Android**: copia el fichero al teléfono (por ejemplo a Descargas) y ábrelo con Chrome. Si Chrome no lo abre, abre Chrome y escribe `file:///sdcard/Download/evalcrit.html` en la barra de direcciones.
2. La primera vez, en **Inicio**, elige el **Curso escolar** en el desplegable de arriba a la derecha (por ejemplo `2025/2026`). Es solo una etiqueta; cámbiala al empezar cada curso.
3. Si quieres trastear sin miedo antes de meter datos reales, pulsa **Cargar datos de ejemplo**. Cuando ya no los quieras, los borras en **Configuración → Restablecer y vaciar todos los datos**.

La app tiene **seis vistas**, en la barra superior:

| Vista | Para qué sirve |
|---|---|
| **Inicio** | Estado del curso, aviso de copias de seguridad y el flujo recomendado |
| **Alumnos y grupos** | Los grupos-clase y el alumnado |
| **Asignaturas y clases** | Las asignaturas (con su currículo) y las clases (asignatura · grupo), y los niveles ACI |
| **Currículo** | Competencias específicas, criterios y sus ponderaciones |
| **Instrumentos** | Exámenes, rúbricas y proyectos, y el banco de instrumentos |
| **Calificaciones** | Notas por alumno, por criterio, por competencia y el informe |

> **Consejo de orden.** Si empiezas de cero, sigue **siempre** este orden: grupos → alumnos → asignaturas → clases → niveles ACI → currículo → instrumentos → corregir → informe. Cada paso necesita el anterior. Se puede ir hacia atrás a corregir cualquier cosa, pero no se puede crear un instrumento de una clase que no existe.

---

## 2. Grupos y alumnos

**Vista: Alumnos y grupos**

Un **grupo** es tu clase (6ºA, 5ºB…). El alumnado se inscribe dentro de un grupo.

1. Pulsa **Nuevo grupo**. Escribe el nombre (por ejemplo `6ºA`) y elige la **Etapa** (Primaria o Infantil).
2. Con el grupo creado, haz clic sobre él en la lista de la izquierda para seleccionarlo. La lista de la derecha pasa a ser la de **ese** grupo.
3. Pulsa **Nuevo alumno** para añadir alumno a alumno, o **Añadir varios** para pegar una lista entera de golpe (un nombre por línea, pensado para pegar desde una hoja de cálculo).

- Para corregir un nombre o borrar a alguien, usa **Editar** o la **×** en su fila.
- Un alumno pertenece a **un** grupo. Si cambia de grupo, edítalo y asígnalo al nuevo.

> **Ojo con el alumnado repetido.** Si el mismo alumno está en dos grupos, aparecerá dos veces y contarás doble en los informes. Un alumno, un grupo.

---

## 3. Asignaturas y clases

**Vista: Asignaturas y clases**

Aquí hay dos cosas distintas que conviene no confundir:

- Una **asignatura** es un **currículo de un área en un curso**. «Matemáticas 3º» y «Matemáticas 6º» son **dos asignaturas distintas**, porque su currículo es distinto.
- Una **clase** es la unión de **una asignatura con un grupo** (Matemáticas 3º · 6ºA). Es sobre la clase sobre la que se crean instrumentos y se califica.

### Crear una asignatura (con currículo oficial)

1. Pulsa **Nueva asignatura**.
2. En **Origen del currículo** deja **Currículo oficial (plantillas del decreto)**.
3. Elige el **Área / asignatura** (Matemáticas, Lengua Castellana y Literatura, Educación Física…).
   - En las áreas que se desdoblan en la práctica aparece además un campo **Variante**: Lengua Extranjera ofrece *Inglés* o *Francés*, y Educación Artística ofrece *Plástica* o *Música*. **El currículo es el mismo**; la variante es solo la etiqueta que verás.
4. Elige el **Curso** (1º a 6º). El **resumen** te dice cuántas competencias y criterios se van a cargar.
5. Pulsa **Guardar**. El currículo entra completo, con sus criterios y ponderaciones ya repartidas al 100%.

La asignatura se llamará **como en el Decreto 66/2022**. Si necesitas otro nombre (por ejemplo, das Plástica y Música por separado), cámbialo después con **Editar asignatura**: el currículo y las notas no se tocan.

### Crear una asignatura a mano

Si das algo que no está en el decreto (un taller, una optativa), elige **En blanco** y ponle nombre. Luego le añades los criterios tú mismo en **Currículo**.

### Crear una clase

1. En el panel **Clases**, pulsa **Nueva clase**.
2. Elige la **Asignatura** y el **Grupo**. Pulsa Guardar.

Ya tienes dónde poner notas. Si una asignatura aparece como *«sin currículo»*, es que no le has cargado criterios todavía: dale a **Recuperar** para cargar el oficial del decreto.

---

## 4. Niveles ACI (adaptaciones)

**Vista: Asignaturas y clases · botón ACI de la clase**

Esto es para la **adaptación curricular significativa**. Un **nivel ACI** es un subgrupo de tu clase que trabaja el currículo de **otro curso** (por ejemplo, dos alumnos de 6º que trabajan Matemáticas de 4º). No es una asignatura nueva ni un grupo nuevo: es el mismo grupo, pero esos alumnos se evalúan con **su** currículo.

1. En la fila de la clase, pulsa **ACI**.
2. En **Niveles ACI**, pulsa **Añadir nivel**.
3. Rellena:
   - **Código**: lo que tú quieras, corto (por ejemplo `A`, `B`, `4º`, `PC`). Es lo que verás en los desplegables.
   - **Etiqueta**: el nombre legible («4º», «2º-3º», «Apoyo»).
   - **Currículo (asignatura)**: el currículo del otro curso. El desplegable ofrece **solo currículos de la misma área y de cursos inferiores** al de la clase: desde una clase de 6º solo verás Matemáticas de 1º a 5º. Así no puedes apuntar por error una clase de Matemáticas a un currículo de Lengua.
4. Abajo, en **Asignación de alumnado**, pon a cada alumno de la clase en su nivel (`Base` = sin adaptación, o el código del nivel). Pulsa Guardar.

A partir de ahí:

- Al crear un instrumento, podrás decir para qué **Nivel ACI** es. Un instrumento **Común** lo hace todo el alumnado; uno de **Base** solo quien no tiene adaptación; uno de un **código** solo ese subgrupo.
- En **Calificaciones**, el selector de nivel alterna entre la vista base y cada ACI. La opción **Todos los niveles** muestra al grupo entero junto, cada examen en la columna de quien lo hace.

> **Un nivel ACI apunta siempre «hacia abajo»** (a un curso inferior). La ampliación —«dar más profundo»— no se modela como nivel ACI: quien profundiza sigue evaluándose con los criterios de **su** curso, con evidencias más exigentes.

---

## 5. Currículo: competencias, criterios y ponderaciones

**Vista: Currículo**

Si cargaste el currículo oficial, aquí ya está todo puesto. Esta vista existe para **revisar y ajustar**: cambiar una ponderación, añadir un criterio propio o ver la suma.

1. Arriba eliges el **Curso** (si tienes asignaturas de varios) y luego la **Asignatura**. Con un solo curso, el desplegable de curso no aparece y el curso viaja en el nombre de la opción.
2. El aviso **«Suma de ponderaciones»** debe marcar **100% · correcta**. Ese es el único requisito; el resto lo tolera.
3. A la izquierda están las **Competencias específicas** (los criterios se cuelgan de ellas). A la derecha, **Criterios y ponderaciones**.
4. Para tocar un criterio, pulsa **Editar** en su fila. Cada criterio lleva: **Código**, **Peso %**, **Descripción**, y a qué **Competencia específica** (obligatorio, al menos una) y **Competencias clave** (opcional) pertenece.

**El peso es lo que hace la media ponderada.** Si un criterio vale 30% y la nota de ese criterio es un 7, aporta 2,1 al total. La suma de todos los pesos de la asignatura debe ser 100%.

> **La nota real es la del criterio, no la del examen.** Un examen no «tiene» nota para la evaluación: es un vehículo de evidencias que alimentan a los criterios. Por eso el motor suma por criterio ponderado y no promedia exámenes.

---

## 6. Instrumentos: exámenes, rúbricas y proyectos

**Vista: Instrumentos**

Un **instrumento** es cualquier cosa con la que recoges evidencias: un control, una rúbrica, un proyecto, una observación.

### Crear un instrumento

1. Elige la **clase** en la cabecera y pulsa **Nuevo instrumento**.
2. Campos de cabecera: **Tipo** (Control, Rúbrica, Proyecto u Otro), **Periodo** (T1/T2/T3), **Fecha**, **Título**, **Unidad** (agrupa los exámenes del mismo tema), **Saberes básicos** (informativo) y **Enlace** (opcional, por ejemplo al examen o a los materiales). El recálculo **Final** no se elige aquí: es el periodo anual que verás en la cuadrícula.
3. Si la clase tiene niveles ACI, aparece **Nivel ACI**: elige para quién es el instrumento (Común / Base / código).
4. En **Criterios**, elige el modo (no aparece en las rúbricas, que tienen su propio formato):
   - **Desglosado (por apartado/parte)**: cada pregunta o apartado lleva **sus** criterios. Es lo normal en un control por preguntas.
   - **Global al instrumento**: el examen entero evalúa un único conjunto de criterios. Las preguntas no llevan criterio propio; se analizará el examen como una unidad.

Si el **Tipo** es **Rúbrica**, el formulario cambia: cada ítem se puntúa por niveles con sus descriptores, y aparece el atajo para **Importar rúbrica (IA)**.

### Apartados y criterios

En modo **Desglosado**, cada apartado es una fila con **Descripción**, **Puntos máximos** y los **criterios** que evalúa. Pulsa **Añadir apartado** para más. **Cada apartado necesita al menos un criterio**: sin él, esa pregunta no aporta a ninguna nota.

En modo **Global**, solo eliges el bloque de **Criterios de evaluación que se trabajan** del instrumento; los apartados siguen existiendo (para poner las notas de cada pregunta) pero no se les cuelga un criterio.

### Importar una rúbrica hecha (por ejemplo, con una IA)

Si ya tienes una rúbrica en JSON (generada con una IA o de otro sitio), no la escribas a mano: en el bloque «¿Ya la tienes hecha?» pulsa **Importar rúbrica (IA)** y pega el texto. Debe empezar por `"tipo": "rubrica-evalcrit"`.

### Duplicar, editar y el banco

En el listado de instrumentos, cada fila ofrece:

- **Corregir** — abre la corrección de ese instrumento.
- **Editar** — vuelve a abrir el formulario.
- **Duplicar** — crea una copia (con opción de elegir el **Nivel(es) de la copia**), perfecta para repetir el mismo control en otra clase o para el grupo ACI.
- **Al banco** — lo guarda en el **banco de instrumentos**, reutilizable en cualquier clase. Desde el banco, **Usar** lo copia a la clase actual.

> **El banco viaja en tu backup.** Vive dentro de tus datos, así que un backup antiguo se migra solo; un reinicio de la aplicación sí lo borra.

---

## 7. Corregir

**Vista: Calificaciones · botón Corregir** (o **Corregir** en la fila de un instrumento)

1. Pulsa **Corregir**. Aparece **«¿Qué quieres corregir?»**, la lista de instrumentos de la clase, con lo que falta por corregir primero. Toca uno.
   - También puedes entrar por la fila del alumno en la cuadrícula: la corrección arranca en ese alumno.
2. La tabla muestra al alumnado en filas y los apartados en columnas. En cada celda escribes la **nota del apartado** (sobre sus puntos máximos). En las **rúbricas** no escribes número: **tocas el nivel** y vuelves a tocar para vaciar.
3. La columna **Nota** te muestra la nota del instrumento mientras corriges. **Es informativa**: sirve para verte, no entra en la evaluación.
4. Muévete con **← Anterior** y **Guardar y siguiente →**. Cada cambio se guarda solo.

> **La nota del examen no decide nada por sí sola.** Lo que cuenta es lo que ese examen aporta a cada criterio. Un 4 en un examen global, por ejemplo, baja **todos** los criterios globales de ese examen a la vez, porque el criterio se calcula sobre el instrumento completo.

---

## 8. Calificaciones: la cuadrícula

**Vista: Calificaciones**

La cabecera manda: elige **clase** y **periodo** (T1, T2, T3 o Final). Si la clase tiene niveles ACI aparece además el selector de **nivel** (**Todos los niveles (grupo completo)**, **Base (sin adaptación)** o el código de cada ACI). Todo lo de abajo responde a eso. Cuatro pestañas:

| Pestaña | Qué muestra |
|---|---|
| **Instrumentos** | Las notas de cada instrumento, alumno por alumno, y la nota final del periodo |
| **Criterios** | La nota de cada criterio, ya ponderada |
| **Competencias específicas y clave** | Los criterios agrupados por la competencia a la que pertenecen |
| **Informe** | El análisis de la clase (ver sección 9) |

- **La nota final es competencial**, no una media de trimestres: se calcula sumando las evidencias ponderadas por criterio. La pestaña **Criterios** del periodo **Final** es la que manda a fin de curso.
- Un criterio **sin evidencias** aparece en blanco y **no cuenta** en la media: no se inventa un cero. Hasta que no lo evalúas, no existe.
- El buscador de la cabecera filtra alumnado (no está en la pestaña Informe).
- **Imprimir / PDF** abre un diálogo donde eliges el alcance: **Vista actual** (lo que se ve en pantalla), **Informe de la clase** (base + cada nivel ACI) o **Informe de un alumno** (con Criterios y/o Competencias). Este último es el boletín individual.

---

## 9. Informe de análisis

**Vista: Calificaciones · pestaña Informe**

Es la herramienta para saber **con quién hablar mañana** y **qué hay que reforzar**, sin repasar la cuadrícula entera. Hereda clase, nivel y periodo de la cabecera, y tiene cuatro sub-pestañas: **Hallazgos**, **Criterios**, **Distribución** y **Alumnos**.

- **Hallazgos**: señala criterios que la clase no alcanza y preguntas con alto índice de fallos. Solo aparecen cuando hay una señal real: hacen falta **al menos dos alumnos** con evidencia y que **al menos la mitad** estén por debajo del 50%. Con un solo alumno adaptado, no hay porcentaje y el informe **se calla a propósito** —un hallazgo con un alumno sería ruido—; para el caso individual está la sub-pestaña **Alumnos**.
- **Criterios**: cada criterio de la clase con su logro y su dificultad.
- **Distribución**: dónde se concentra el grupo y la nota media.
- **Alumnos**: la lista nominal ordenada por riesgo, para actuar.

> **Los criterios globales de un instrumento se mueven juntos.** Si un examen evalúa los criterios de forma global, su nota se reparte entre **todos** ellos, así que un alumno que suspende el examen suspende en todos sus criterios a la vez. Por eso **si el examen suspende de verdad, siempre hay criterios que disparan el hallazgo**. Lo que no verás en modo global es un análisis *pregunta a pregunta*: sería contradecir que tú has dicho «este criterio lo evalúo con el examen completo».

Puedes **Imprimir / PDF** el informe, o acotarlo con sus propios filtros (unidad, instrumentos, periodo) sin cambiar la cabecera.

---

## 10. Backup: lo único que no puedes olvidar

**Vista: Inicio · bloque «Copias de seguridad»**

Tus datos viven **en este navegador de este dispositivo**. Eso es la garantía de privacidad (nada sale de aquí) y, a la vez, tu mayor riesgo: si se limpian los datos del navegador, se pierden.

1. El bloque de **Inicio** te dice **«última copia: …»** y, si has elegido carpeta, su destino. Si estás en Windows (Chrome/Edge), pulsa **Elegir carpeta de backups…** para guardarlos siempre en la carpeta `backups/` del proyecto; en Android irán a Descargas.
2. Pulsa el **engranaje ⚙ (Configuración)**, arriba a la derecha, y allí **Exportar backup** para guardar un fichero `.json`.
3. **Exporta al terminar cada sesión de trabajo.** Un backup es un fichero normal: cópialo al USB, al correo o a donde quieras.
4. Para recuperar en otro equipo: abre la app allí y usa **Configuración → Importar backup** con ese `.json`. Si te arrepientes de una importación, en **Inicio** aparece **↩ Recuperar los datos anteriores a la última importación**, que deshace el cambio.

> Nombra los backups con fecha (la app ya lo hace por ti: `DD-MM-AAAA`). Guarda varios: el último puede estar corrupto, y los tres anteriores no.

---

## 11. Preguntas frecuentes

**¿Se puede usar en dos ordenadores a la vez?**
No con datos compartidos. Cada fichero y cada navegador tiene sus datos. El «traslado» se hace exportando el `.json` en uno e importándolo en el otro. Una misma clase no puede estar «viva» en dos sitios sin pisarse.

**He cambiado de curso. ¿Pierdo lo del año pasado?**
Sí, si vacías los datos. Lo correcto es **exportar el backup del curso que termina** y, en un dispositivo con datos vacíos, empezar el nuevo. Conserva siempre el backup antiguo.

**Un alumno con ACI no aparece al corregir un examen.**
Es lo esperado: solo se corrige para quien **puede puntuar** en ese instrumento. Comprueba que el instrumento es del nivel correcto (o **Común**) y que el alumno está asignado a su nivel ACI en la clase.

**He suspendido más de la mitad con un examen global y el informe se calla.**
Mira primero cuántos alumnos hay en ese nivel. **Con un solo alumno adaptado no hay porcentaje posible**: el informe habla de la clase, no del individuo. Para el caso concreto, abre la sub-pestaña **Alumnos** del informe o imprime el *informe de un alumno* desde **Imprimir / PDF**.

**¿Puedo cambiar el nombre de una asignatura sin romper el currículo?**
Sí. Editar el nombre o el nivel **solo cambia cómo se muestra**; el currículo, las notas y los instrumentos siguen colgando del mismo identificador.

**Los datos que se guardan, ¿son anónimos realmente?**
Aquí sí: la app **no se conecta a internet**. No hay envío, ni cuenta, ni telemetría. Lo que hay en el navegador es lo único que existe. Por eso el backup manual es tan importante.

---

*Evalora · Evaluación por criterios · LOMLOE (Cantabria) · Jorge Bourgon Salinero. La app no se conecta a internet: tus datos no salen del dispositivo.*
