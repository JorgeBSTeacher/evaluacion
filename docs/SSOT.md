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
- **Rúbrica**: niveles definidos al crearla (4 por defecto, editables) con descriptor y % de logro (25/50/75/100 por defecto). Cada apartado evalúa 1..n criterios eligiendo un nivel.

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
- Selector de **unidad didáctica** (D-38, v0.4.5): cuando la clase tiene instrumentos con `unidad`, aparece un desplegable «Todas las unidades / UD1 / UD2…» que filtra las columnas; con varias unidades y «Todas» seleccionado, la cabecera se agrupa con una fila superior por UD. La primera columna (alumno) y esa fila de grupo quedan fijas al desplazar horizontalmente, para no perder la referencia en tablas de muchas columnas.
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
    "apartados": [{ "id": "", "orden": 1, "descripcion": "", "maxPts": 5, "criterioIds": [] }]
  }],
  "registros": { "instrumentoId": { "alumnoId": { "apartadoId": 3.4 } } }
}
```

Nota: en rúbricas cada apartado usa `maxPts: 100` implícito y el valor registrado es el % del nivel elegido; así el motor de cálculo es único para todos los tipos.

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
- P-04: decidir rediseño de rúbricas — cada ítem con sus propias graduaciones (descriptor + %); por decidir si los ítems heredan una escala común personalizable o son totalmente independientes.
- P-05: ~~plantilla CDU 3.er ciclo~~ **HECHA (v0.2.1)**. Quedan fases siguientes: Lengua, Plástica (Ed. Artística) y Educación en Valores (5º), y los cursos 1º–4º si se amplía el piloto.
- P-06: ~~generar las plantillas de todas las áreas y ciclos de Primaria~~ **RESUELTA (v0.4.1)**: `tools/extract-decreto.py` extrae el Anexo II-A del Decreto 66/2022 (modo `layout` de `pypdf`) y escribe 19 plantillas (7 áreas × ciclos; 130 CE · 294 criterios) en `plantillas/*.json`, validado contra la plantilla Matemáticas 3.er ciclo hecha a mano (coincidencia exacta). `tools/check-plantillas.js` valida estructura, códigos únicos, vínculos criterio→CE y duplicados; `tools/build-plantillas.js` embebe las 19 en `js/plantillas.js` (~156 KB). Los niveles ACI ya pueden apuntar a cualquier área y curso de 1º a 6º.
- P-07 (licencia y distribución, D-35): se contempla proponer el uso de la app a otros profesores y a la consejería (no el hosting, sino el código/app). **Decisión provisional: mantener todo privado por ahora.** Si se abre, decidir licencia — recomendación **EUPL-1.2** para administración pública (versión oficial en castellano, copyleft) o **MIT/Apache-2.0** si se prioriza máxima adopción. Mantener el modo local/offline como postura por defecto (minimización RGPD de datos de menores); la nube (OneDrive/backend) queda siempre opcional y apagada por defecto. Kit de distribución pendiente: `LICENSE`, `README`, nota de seguridad «cero red, datos en el dispositivo», entregable `dist/evalcrit.html`.
- P-02: revisar D-13 (agregación multi-instrumento) tras uso real.
- P-03: asistente "nuevo curso escolar" arrastrando grupos y currículo.
- P-08: importar rúbricas desde **CSV** para poder crearlas con herramientas de IA (ChatGPT, Claude…). **Formato tipo definido** (ver más abajo); pendiente de implementar en `Storage.importarRúbricaCsv` y en un modal «Importar rúbrica».

### Formato tipo CSV de rúbrica (P-08)

Fichero UTF-8, separador `;` (comillas opcionales), pensado para que una IA genere la rúbrica con una sola instrucción. Fila por apartado; primer columna `apartado`, segunda `peso` (≥ 0,01), tercera `criterios` (códigos separados por `|`), y una columna por nivel de la escala en formato `pct:etiqueta`.

```
# Comentario: la rúbrica debe ser para la asignatura activa
titulo;Corrección de libreta · 5ºB
unidad;UD1
nivel;                 ← vacío = examen común; 'BASE' solo base; '4' = nivel ACI
apartado;peso;criterios;100:Excelente;75:Notable;50:Adecuado;25:Insuficiente
Ortografía y acentos;3;LCL3;Casi sin errores;Errores puntuales;Errores frecuentes;Impide la lectura
Letra y limpieza;1;LCL3;Muy clara;Legible;Aceptable;Ilegible
Entrega a tiempo;1;LCL1;Cumple la fecha;Casi siempre;Bastante tarde;No entrega
```

Reglas para el importador (pendiente de implementar):
- Líneas que empiezan por `#` se ignoran. `titulo` es obligatorio; `unidad` y `nivel` opcionales.
- La columna `apartado` no puede repetirse. El `peso` debe ser número > 0.
- Los códigos se resuelven contra los criterios de la asignatura activa; si alguno no existe, se aborta la importación y se listan los desconocidos.
- Los niveles se crean de las columnas (pct ordenado desc); los descriptores de cada celda no se guardan aún (el modelo actual usa escala común por instrumento; el texto por ítem queda para el rediseño P-04).
- Con la cabecera dada se crea un instrumento tipo `Rúbrica` con esos apartados, pesos y niveles.

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
