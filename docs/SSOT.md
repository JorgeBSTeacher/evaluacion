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
- Saberes básicos: NO como campo del criterio (D-09); solo campo informativo opcional en los instrumentos.
- Plantillas oficiales: generar JSON importable desde el decreto cántabro de Infantil y Primaria (usuario indica **Decreto 66/2022**; P-01: verificar numeración exacta antes de crear la plantilla).

## 5. Instrumentos de evaluación

Tipos: **Control/Examen**, **Rúbrica**, **Proyecto**, **Otro**.

Común: título, fecha, periodo (T1/T2/T3), clase, saberes básicos informativos, apartados.

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
- Corrección: tabla alumnos × apartados; en rúbricas, botones de nivel.
- Autoguardado continuo con indicador visual; confirmación en acciones destructivas.
- Exportar/Importar siempre visibles en la cabecera.
- Tras cualquier alta/edición modal, la vista se refresca automáticamente (D-21).
- Los criterios de cada apartado se eligen con un desplegable compacto por fila, no inline (D-22).
- Desde la Cuadrícula se puede «Añadir calificación» (alta de instrumento) y editar tocando su cabecera de columna (D-23).
- La cuadrícula muestra SIEMPRE las filas de alumnos del grupo, aunque no existan instrumentos aún: cuaderno en blanco esperando columnas (D-24).
- La sección activa se conserva al recargar el navegador (F5) mediante hash de URL (#seccion) (D-25).
- La cabecera de la cuadrícula muestra siempre «Grupo vinculado · N alumno(s)» como diagnóstico inmediato de desajustes entre grupos y clases (D-26).

## 9. Informes

- PDF nativo vía estilos de impresión (`window.print`), sin librerías.
- Informe por clase con notas, criterios y competencias según pestaña activa (D-18).
- Boletín individual completo con observaciones textuales: NO (lo hace la herramienta institucional) (D-19).

## 10. Backup e importación

- Export: fichero `evalcrit-backup-YYYYMMDD-HHMM.json` con TODO el estado versionado (`schemaVersion`).
- Import: **modo reemplazo único** (D-20) tras validar esquema; confirmación explícita.
- Los backups con datos reales NUNCA se suben al repositorio git (`.gitignore` + política).

## 11. Modelo de datos (schemaVersion 1)

```json
{
  "schemaVersion": 1,
  "cursoEscolar": "2025/2026",
  "grupos": [{ "id": "", "nombre": "", "etapa": "Primaria" }],
  "alumnos": [{ "id": "", "nombre": "", "apellidos": "", "grupoId": "" }],
  "asignaturas": [{ "id": "", "nombre": "", "etapa": "" }],
  "clases": [{ "id": "", "asignaturaId": "", "grupoId": "" }],
  "competenciasClave": [{ "id": "", "codigo": "CCL", "nombre": "" }],
  "competenciasEspecificas": [{ "id": "", "asignaturaId": "", "codigo": "", "descripcion": "" }],
  "criterios": [{ "id": "", "asignaturaId": "", "codigo": "", "descripcion": "", "peso": 0, "espIds": [], "claveIds": [] }],
  "instrumentos": [{
    "id": "", "claseId": "", "tipo": "Control", "titulo": "", "fecha": "",
    "periodo": "T1", "saberes": "",
    "niveles": [{ "pct": 100, "descriptor": "" }],
    "apartados": [{ "id": "", "orden": 1, "descripcion": "", "maxPts": 5, "criterioIds": [] }]
  }],
  "registros": { "instrumentoId": { "alumnoId": { "apartadoId": 3.4 } } }
}
```

Nota: en rúbricas cada apartado usa `maxPts: 100` implícito y el valor registrado es el % del nivel elegido; así el motor de cálculo es único para todos los tipos.

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
| F3 | Editor currículo + plantilla Decreto Cantabria | Editor en v0.1; plantilla P-01 pendiente |
| F4 | Instrumentos + corrección + cuadrícula | v0.1 |
| F5 | Motor cálculo + paneles competencia | v0.1 |
| F6 | Informes impresión | Básico v0.1; pulido después |
| F7 | Pruebas en dispositivos reales (USB Windows + Android) | Pendiente |

Futuras: arrastre de cursos (D-07), escala cualitativa Infantil completa, plantilla currículo oficial, nube.

## 14. Pendientes abiertas

- P-01: verificar numeración/denominación del decreto cántabro (66/2022) y extraer currículo a JSON importable.
- P-02: revisar D-13 (agregación multi-instrumento) tras uso real.
- P-03: asistente "nuevo curso escolar" arrastrando grupos y currículo.

## 15. Glosario

- **Criterio**: unidad mínima de evaluación con peso %.
- **Logro**: % conseguido en un criterio/apartado (obtenido/máximo).
- **Instrumento**: control, rúbrica, proyecto u otro elemento de calificación.
- **Clase**: asignatura impartida a un grupo.
- **Periodo**: T1, T2, T3 o Final (recálculo anual).

## 16. Registro de cambios

| Versión | Commit | Contenido |
|---|---|---|
| v0.1 | `2c43968` | Primera versión funcional completa con motor verificado |
| v0.1.1 | `e54df4f` | Refresco automático de vistas, criterios en desplegable compacto, «Añadir calificación» desde cuadrícula |
| v0.1.2 | `4570e0a` / `e265ca1` | Cuadrícula siempre con alumnos, hash de navegación, diagnóstico de grupo, errores visibles, cache-busting, export de modalInstrumento |
