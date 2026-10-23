# Evaluación por criterios (Evalora)

Aplicación web **de un solo fichero** para calificar por **criterios de evaluación ponderados** conforme a la LOMLOE (Cantabria, Infantil y Primaria).

Funciona **sin conexión**: no hay servidor, no hay nube y **los datos no salen del dispositivo**. Se abre con doble clic, también desde un USB o desde el móvil.

## Qué hace

- **Calificación por criterios ponderados**, con periodo por trimestre y nota final competencial.
- **Adaptaciones curriculares (ACI)**: cada nivel trabaja su propio currículo sin mezclarse con el grupo base.
- **Instrumentos** de cuatro tipos (control, rúbrica, proyecto y otro), con criterios por apartado y criterios globales.
- **Informes de análisis**: hallazgos, criterios en dificultad, alumnado en riesgo y distribución de notas, con impresión en PDF.
- **Backup manual en JSON** que guarda todo (grupos, alumnado, clases, currículos, instrumentos y notas).

Las vistas son: Inicio, Alumnos y grupos, Asignaturas y clases, Currículo, Instrumentos y Calificaciones. La configuración, las copias de seguridad y el bloque «Acerca de» viven en el engranaje de la cabecera.

## Cómo se usa

1. Abre **`dist/evalora.html`** con Chrome o Edge (Windows) o con Chrome (Android).
   - Es **un solo fichero**: no necesita la carpeta `js/`, ni internet, ni instalar nada.
   - En Android, si Chrome no lo abre desde el gestor de archivos, escribe en la barra de direcciones `file:///sdcard/Download/evalora.html`.
2. Elige el **curso escolar** en Inicio. Solo hay un curso activo a la vez.
3. Trabaja con datos de ejemplo si quieres probar sin riesgo.
4. Exporta un **backup** desde Configuración antes de cambiar de equipo, de navegador o de curso.

Los datos se guardan en el `localStorage` de **ese navegador y ese equipo**. Si borras los datos de navegación, no se recuperan solos: el backup no es opcional.

## Datos y privacidad

- **Cero red**: la aplicación no hace peticiones a ningún servidor.
- **Datos en el dispositivo**: no se suben a ningún sitio.
- **Nunca subas datos reales de alumnado al repositorio.** Las plantillas y los datos de prueba son sintéticos.

## Estructura

| Ruta | Contenido |
|---|---|
| `index.html`, `css/`, `js/` | Código fuente de la aplicación |
| `plantillas/` | Currículo oficial extraído del Decreto 66/2022 (**inmutable**) |
| `tools/` | Comprobaciones, extracción del decreto y build del fichero único |
| `docs/` | Documento único de verdad (SSOT), guía del docente y plan de interfaz |
| `dist/evalora.html` | Entregable: la app completa en un solo fichero |

## Desarrollo

```bash
node tools/checks.js          # comprobaciones de la app
node tools/check-plantillas.js # integridad de las plantillas
node tools/build-licencia.js   # regenera js/licencia.js desde LICENSE
node tools/build-singlefile.js # genera dist/evalora.html
```

## Autoría y licencia

**© 2026 Jorge Bourgon Salinero.** Repositorio oficial: <https://github.com/JorgeBSTeacher/evaluacion>.

Esta obra se distribuye bajo la **Licencia Pública de la Unión Europea v. 1.2 (EUPL-1.2)**. El texto completo, en castellano, está en [`LICENSE`](LICENSE) y también **incrustado en el entregable** (`Configuración → Acerca de → «Texto de la licencia (EUPL-1.2)»`), para que viaje con el fichero único aunque se copie sin el repositorio.

La EUPL es una licencia **copyleft**: permite usar, estudiar, modificar y redistribuir la aplicación, pero obliga a mantener los avisos de copyright y a declarar las modificaciones. Un trabajo derivado no puede distribuirse con condiciones más restrictivas ni cerrarse como software propietario.

Si redistribuyes o modificas la app: conserva el aviso de autoría, la licencia y el enlace al repositorio oficial, y declara los cambios con su fecha (art. 5 de la EUPL).
