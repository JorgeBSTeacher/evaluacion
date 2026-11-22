// URLs de objeto creadas para los logos en impresión; se revocan al terminar.
const _logoObjUrls = [];

const Storage = {
  KEY: 'evalcrit:data',
  LOGO_MAX: 30 * 1024, // 30 KB en el fichero original (~40 KB en base64).

  // Copia del estado anterior a una importación, para poder deshacerla:
  // importar reemplaza TODOS los datos (ver «Copia de seguridad» más abajo).
  KEY_PREVIA: 'evalcrit:preimport',
  // Días sin copia de seguridad a partir de los cuales se avisa en Inicio.
  DIAS_COPIA: 7,
  db: null,
  // Fichero de trabajo: nombre y manejador. Permiten sobrescribir el mismo
  // fichero al guardar en lugar de amontonar backups con fecha.
  nombreFichero: 'evalcrit.json',
  ficheroHandle: null,
  // Copia de seguridad hecha en ESTA sesión (no se guarda en db ni viaja en
  // el backup: al recargar la página vuelve a empezar). La pide el asistente
  // de fin de curso (D-60) antes de dejar actuar; la enciende marcarCopia,
  // que es el sellado común de exportar/guardar/descargar.
  copiaEnSesion: false,

  defaults() {
    const hoy = new Date();
    const inicio = hoy.getMonth() >= 6 ? hoy.getFullYear() : hoy.getFullYear() - 1;
    return {
      schemaVersion: 1,
      cursoEscolar: `${inicio}/${inicio + 1}`,
      meta: { ultimaExportacion: null, cambiosSinCopia: false },
      grupos: [],
      alumnos: [],
      asignaturas: [],
      clases: [],
      competenciasClave: [
        { id: 'cc-ccl', codigo: 'CCL', nombre: 'Comunicación lingüística' },
        { id: 'cc-cp', codigo: 'CP', nombre: 'Competencia plurilingüe' },
        { id: 'cc-stem', codigo: 'STEM', nombre: 'Competencia científica y tecnológica' },
        { id: 'cc-cd', codigo: 'CD', nombre: 'Competencia digital' },
        { id: 'cc-cpsaa', codigo: 'CPSAA', nombre: 'Personal, social y de aprender a aprender' },
        { id: 'cc-cc', codigo: 'CC', nombre: 'Competencia ciudadana' },
        { id: 'cc-ce', codigo: 'CE', nombre: 'Competencia emprendedora' },
        { id: 'cc-ccec', codigo: 'CCEC', nombre: 'En conciencia y expresión culturales' }
      ],
      competenciasEspecificas: [],
      criterios: [],
      instrumentos: [],
      // Moldes de instrumentos guardados para reutilizarlos en otra clase o en
      // el curso siguiente (D-48).
      bancoInstrumentos: [],
      // Perfil docente (D-74): nombre del profesor, nombre del centro y logo
      // (data URL) para las cabeceras de los informes impresos. Declararlo
      // aquí basta: Storage.migrar rellena la clave en backups antiguos.
      perfil: { nombre: '', centro: '', logo: '' },
      // Ajustes del comportamiento de la app (D-74b): como se calcula la media
      // de una UD plegada en Calificaciones cuando un instrumento no tiene nota.
      // false (por defecto) = no cuenta (solo promedia lo evaluado, «Media»);
      // true = el vacio vale 0 (punitivo). migrar() lo normaliza a booleano.
      configuracion: { sinNotaEsCero: false },
      // Identidad visual elegida por el docente: color del tema (cabecera,
      // acento, isotipo y favicon) y organización de los menús.
      tema: { color: '#1f5c6b', nav: 'topbar' },
      // Color por unidad didáctica en la cuadrícula: mapa { ud: '#hex' | null }.
      // undefined = automático (primer color libre de la paleta), null = sin color.
      coloresUd: {},
      registros: {},
      // Observaciones del docente por instrumento (D-74c): propuestas de mejora
      // a criterio del maestro. Se guardan localmente, offline.
      observaciones: {}
    };
  },

  // --- Perfil docente (D-74) ---------------------------------------------
  // Límite del logo en origen: el data URL ocupa ~4/3 de la imagen, así que
  // 30 KB de fichero son ~40 KB en el backup. Un logo grande no debe colgar
  // el localStorage (cuota de ~5 MB) ni cargar cada guardado.
  LOGO_MAX: 30 * 1024,

  // Motivo por el que un fichero de logo NO se acepta, o '' si va bien. Pura:
  // se comprueba sin navegador, con un objeto { type, size } a medias. Mismo
  // criterio defensivo que Utils.urlPintable: la guarda vive al subir, no
  // solo al pintar.
  logoRechazo(archivo) {
    if (!archivo) return 'No se ha podido leer el fichero del logo.';
    if (archivo.type && archivo.type.indexOf('image/') !== 0) {
      return 'El logo debe ser una imagen: «' + (archivo.name || 'ese fichero') + '» no lo es.';
    }
    if (typeof archivo.size !== 'number' || archivo.size > this.LOGO_MAX) {
      const kb = typeof archivo.size === 'number' ? Math.round(archivo.size / 1024) : '?';
      return 'Logo demasiado grande (' + kb + ' KB): el máximo son '
        + Math.round(this.LOGO_MAX / 1024) + ' KB.';
    }
    return '';
  },

  // Al pintar se vuelve a comprobar: un backup manipulado no puede meter en
  // el src del logo otra cosa que no sea una imagen (data:image/...).
  logoPintable(valor) {
    return typeof valor === 'string' && valor.indexOf('data:image/') === 0;
  },

  // Convierte un data:URL del logo en una URL de objeto (blob:), que Chrome SÍ
  // renderiza al exportar a PDF; un <img src="data:..."> a veces no imprime.
  // La URL creada se registra en _logoObjUrls y se revoca al terminar de imprimir.
  logoObjUrl(valor) {
    if (!this.logoPintable(valor)) return '';
    try {
      const arr = String(valor).split(',');
      const mime = (arr[0].match(/:(.*?);/) || [])[1] || 'image/png';
      const bstr = atob(arr[1]);
      const u8 = new Uint8Array(bstr.length);
      for (let i = 0; i < bstr.length; i++) u8[i] = bstr.charCodeAt(i);
      const url = URL.createObjectURL(new Blob([u8], { type: mime }));
      _logoObjUrls.push(url);
      return url;
    } catch (e) {
      return '';
    }
  },

  // Revoca todas las URLs de objeto creadas para los logos (tras imprimir).
  revocarLogos() {
    for (const url of _logoObjUrls) {
      try { URL.revokeObjectURL(url); } catch (e) { /* ya revocada */ }
    }
    _logoObjUrls.length = 0;
  },

  // Cabecera de perfil para los informes impresos (D-74): nombre, centro y
  // logo. La usan LAS DOS vistas imprimibles, así que vive en el modelo y no
  // en ninguna de las dos (views-informe.js es un módulo autocontenido y no
  // puede ser su dependencia). Devuelve '' si no hay datos: una cabecera
  // vacía no deja separadores sueltos. Lee db.perfil con defensa, para que un
  // estado antiguo sin la clave no rompa informeHtml. Comprobable sin
  // navegador: las comprobaciones la comparan como string.
  perfilHtml() {
    const p = (this.db && this.db.perfil) || {};
    const nombre = String(p.nombre == null ? '' : p.nombre).trim();
    const centro = String(p.centro == null ? '' : p.centro).trim();
    const logo = this.logoPintable(p.logo) ? this.logoObjUrl(p.logo) : '';
    if (!nombre && !centro && !logo) return '';
    const partes = [];
    if (logo) partes.push(`<img class="informe-logo" src="${Utils.esc(logo)}" alt="Logo del centro">`);
    const textos = [];
    if (nombre) textos.push(`<span class="informe-nombre">${Utils.esc(nombre)}</span>`);
    if (centro) textos.push(`<span class="informe-centro">${Utils.esc(centro)}</span>`);
    if (textos.length) partes.push(`<span class="informe-perfil-txt">${textos.join('')}</span>`);
    return `<div class="informe-perfil">${partes.join('')}</div>`;
  },

  load() {
    try {
      const raw = localStorage.getItem(this.KEY);
      this.db = raw ? this.migrar(JSON.parse(raw)) : this.defaults();
    } catch (e) {
      this.db = this.defaults();
    }
    return this.db;
  },

  // Guarda en el navegador y marca que hay cambios sin copiar (salvo cuando el
  // propio guardado forma parte de una exportación: ahí no hay nada nuevo que
  // respaldar). `esCopia` lo usan exportar/guardar vía `marcarCopia`.
  save(esCopia) {
    if (!esCopia) {
      this.db.meta = this.db.meta || {};
      this.db.meta.cambiosSinCopia = true;
    }
    this.volcar();
  },

  // Vuelca el estado actual al navegador sin efectos colaterales (no marca
  // «cambios sin copiar» ni anima el indicador). Es la red de seguridad al
  // cerrar u ocultar la pestaña (R-01): el último estado siempre queda escrito.
  volcar() {
    try {
      localStorage.setItem(this.KEY, JSON.stringify(this.db));
    } catch (e) {
      if (typeof UI !== 'undefined' && UI.toast) UI.toast('Error al guardar: exporta tu backup ahora', 'error');
    }
  },

  vacio() {
    const d = this.db;
    return !d.grupos.length && !d.alumnos.length && !d.asignaturas.length && !d.criterios.length && !d.instrumentos.length;
  },

  puedeCarpeta() {
    return typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function';
  },

  abrirIdb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('evalcrit-fs', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('kv');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },

  idbLeer(clave) {
    return this.abrirIdb().then(db => new Promise((resolve, reject) => {
      const tx = db.transaction('kv', 'readonly');
      const req = tx.objectStore('kv').get(clave);
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = () => reject(tx.error);
    }));
  },

  idbEscribir(clave, valor) {
    return this.abrirIdb().then(db => new Promise((resolve, reject) => {
      const tx = db.transaction('kv', 'readwrite');
      tx.objectStore('kv').put(valor, clave);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    }));
  },

  async elegirCarpetaBackup() {
    if (!this.puedeCarpeta()) {
      alert('Tu navegador no permite elegir carpeta de guardado (necesitas Chrome o Edge en Windows). Los backups irán a Descargas.');
      return null;
    }
    try {
      const handle = await window.showDirectoryPicker({ id: 'evalcrit-backups', mode: 'readwrite' });
      await this.idbEscribir('dir', handle);
      UI.toast('Los backups se guardarán en la carpeta «' + handle.name + '»');
      return handle;
    } catch (e) {
      if (e && e.name === 'AbortError') return null;
      console.error(e);
      alert('No se pudo elegir la carpeta: ' + e.message + '. Puede que tu navegador rechace ubicaciones de red (p. ej. rutas WSL).');
      return null;
    }
  },

  // Escribe en un manejador de fichero (File System Access). Devuelve false si
  // no hay permiso o falla, para que el llamador pruebe otra via.
  async escribeHandle(fh, contenido) {
    try {
      let perm = 'granted';
      if (fh.queryPermission) perm = await fh.queryPermission({ mode: 'readwrite' });
      if (perm !== 'granted' && fh.requestPermission) perm = await fh.requestPermission({ mode: 'readwrite' });
      if (perm !== 'granted') return false;
      const w = await fh.createWritable();
      await w.write(contenido);
      await w.close();
      return true;
    } catch (e) {
      if (e && e.name === 'AbortError') return false;
      console.error(e);
      return false;
    }
  },

  // Guarda en el fichero de trabajo y lo SOBRESCRIBE. No crea backups nuevos:
  // eso es lo que hace «Exportar backup» (explícito, en Configuración).
  async guardar() {
    const contenido = JSON.stringify(this.db, null, 2);
    const nombre = this.nombreFichero || 'evalcrit.json';
    // En file:// el SELECTOR de fichero no se abre y la espera se cuelga: el
    // botón parecería no hacer nada (R-03). El manejador recordado y la carpeta
    // elegida siguen siendo la vía de sobrescribir; sin ellos, descarga.
    const esFile = typeof location !== 'undefined' && location.protocol === 'file:';
    // 1. Manejador recordado (misma sesión o IndexedDB tras recargar).
    const fh = this.ficheroHandle || await this.idbLeer('fileHandle');
    if (fh && await this.escribeHandle(fh, contenido)) {
      this.marcarCopia();
      UI.toast('Guardado en «' + fh.name + '»');
      return true;
    }
    // 2. Carpeta de backups: siempre el mismo «evalcrit.json».
    if (this.puedeCarpeta()) {
      let dir = await this.idbLeer('dir');
      if (!dir) dir = await this.elegirCarpetaBackup();
      if (dir) {
        let perm = 'granted';
        if (dir.queryPermission) perm = await dir.queryPermission({ mode: 'readwrite' });
        if (perm !== 'granted' && dir.requestPermission) perm = await dir.requestPermission({ mode: 'readwrite' });
        if (perm === 'granted') {
          try {
            const fh2 = await dir.getFileHandle('evalcrit.json', { create: true });
            const w = await fh2.createWritable();
            await w.write(contenido);
            await w.close();
            this.marcarCopia();
            UI.toast('Guardado en «' + dir.name + '/evalcrit.json»');
            return true;
          } catch (e) {
            if (e && e.name === 'AbortError') return false;
            console.error(e);
          }
        }
      }
    }
    // 3. Selector de fichero con nombre estable (Chrome/Edge). Solo fuera de
    // file://: en fichero local no abre el selector y la espera se cuelga.
    if (!esFile && typeof window !== 'undefined' && typeof window.showSaveFilePicker === 'function') {
      try {
        const fh3 = await window.showSaveFilePicker({
          suggestedName: nombre,
          types: [{ description: 'Copia Evalora (JSON)', accept: { 'application/json': ['.json'] } }]
        });
        this.ficheroHandle = fh3;
        await this.idbEscribir('fileHandle', fh3);
        if (await this.escribeHandle(fh3, contenido)) {
          this.marcarCopia();
          UI.toast('Guardado en «' + fh3.name + '»');
          return true;
        }
      } catch (e) {
        if (e && e.name === 'AbortError') return false;
        console.error(e);
      }
    }
    // 4. Descarga con nombre estable (funciona en file://).
    return this.descargar(contenido, nombre);
  },

  // Descarga por Blob (universal, file:// incluido) con un nombre estable.
  descargar(contenido, nombre) {
    const blob = new Blob([contenido], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { try { a.remove(); } catch (e) {} URL.revokeObjectURL(url); }, 1000);
    this.marcarCopia();
    UI.toast('Copia en Descargas (' + nombre + '): pásala a la carpeta backups/ del proyecto');
    return true;
  },

  async exportar(nombreOpcional) {
    const contenido = JSON.stringify(this.db, null, 2);
    const nombre = String(nombreOpcional || '').trim()
      || `backup-${Utils.fechaLegible()}-${Utils.horaCorta()}.json`;
    return this.exportarContenido(contenido, nombre);
  },

  // Escribe un CONTENIDO JSON concreto con el nombre dado, por los mismos
  // caminos que exportar (carpeta de backups recordada, selector «Guardar
  // como» y descarga universal que funciona en file://). Es el motor de la
  // copia: `exportar()` lo usa con su nombre de backup y el fichero de
  // archivo del fin de curso (D-60) con el suyo. Devuelve true/false según
  // se haya escrito (un «Guardar como» cancelado devuelve false y no sella).
  async exportarContenido(contenido, nombre) {
    // En file:// el API de acceso al sistema de ficheros (showSaveFilePicker) NO
    // funciona: no abre el selector nativo y el fallback Blob puede no disparar la
    // descarga. Detectamos el protocolo para saltarnos ese camino por completo y
    // usar solo la descarga por Blob, que funciona en cualquier origen.
    const esFile = typeof location !== 'undefined' && location.protocol === 'file:';
    let destino = '';
    try {
      if (!esFile) {
        const dir = await this.idbLeer('dir');
        if (dir) {
          let perm = 'granted';
          if (dir.queryPermission) perm = await dir.queryPermission({ mode: 'readwrite' });
          if (perm !== 'granted' && dir.requestPermission) {
            perm = await dir.requestPermission({ mode: 'readwrite' });
          }
          if (perm === 'granted') {
            const fh = await dir.getFileHandle(nombre, { create: true });
            const w = await fh.createWritable();
            await w.write(contenido);
            await w.close();
            destino = `la carpeta «${dir.name}»`;
          }
        }
        if (!destino && typeof window !== 'undefined' && typeof window.showSaveFilePicker === 'function') {
          const fh = await window.showSaveFilePicker({
            suggestedName: nombre,
            types: [{ description: 'Backup Evalora (JSON)', accept: { 'application/json': ['.json'] } }]
          });
          const w = await fh.createWritable();
          await w.write(contenido);
          await w.close();
          destino = `«${fh.name}»`;
        }
      }
    } catch (e) {
      if (e && e.name === 'AbortError') return false;
      console.error('exportar (FSA):', e);
    }
    if (!destino) {
      // Fallback universal: descarga por Blob. En file:// (Opera, Chrome...) este
      // es el unico camino que funciona sin servidor.
      return this.descargar(contenido, nombre);
    }
    this.marcarCopia();
    UI.toast(`Backup guardado en ${destino}`);
    return true;
  },

  importar(archivo) {
    return new Promise((resolve, reject) => {
      const lector = new FileReader();
      lector.onload = () => {
        try {
          const datos = JSON.parse(lector.result);
          if (!datos || datos.schemaVersion !== 1 || !Array.isArray(datos.grupos) || !Array.isArray(datos.alumnos)) {
            throw new Error('Formato no válido');
          }
          // Antes de reemplazar nada, guarda el estado actual para poder
          // deshacerlo (solo si había algo que perder).
          const copiada = this.vacio() ? false : this.copiarAntesDeImportar();
          this.db = this.migrar(datos);
          // Recuerda el nombre del fichero cargado: el botón «Guardar» lo
          // sobrescribe en lugar de crear un backup nuevo.
          if (archivo && archivo.name) this.nombreFichero = archivo.name;
          this.save();
          resolve(copiada);
        } catch (e) {
          reject(e);
        }
      };
      lector.onerror = () => reject(new Error('No se pudo leer el archivo'));
      lector.readAsText(archivo);
    });
  },

  migrar(datos) {
    const d = this.defaults();
    const db = datos && typeof datos === 'object' ? datos : {};
    db.schemaVersion = 1;
    for (const k of Object.keys(d)) {
      if (db[k] == null) db[k] = d[k];
    }
    // Ajustes (D-74b): `configuracion` debe ser un objeto y `sinNotaEsCero` un
    // booleano. Un backup antiguo puede traer la clave ausente o con otro tipo
    // (p. ej. "true" de un volcado a mano): en ese caso manda el defecto false.
    if (!db.configuracion || typeof db.configuracion !== 'object') db.configuracion = {};
    if (typeof db.configuracion.sinNotaEsCero !== 'boolean') db.configuracion.sinNotaEsCero = false;
    if (!db.meta || typeof db.meta !== 'object') db.meta = { ultimaExportacion: null };
    if (db.meta.cambiosSinCopia == null) db.meta.cambiosSinCopia = false;
    if (db.observaciones == null) db.observaciones = {};
    if (db.coloresUd == null || typeof db.coloresUd !== 'object') db.coloresUd = {};
    if (db.tema == null || typeof db.tema !== 'object') db.tema = { color: '#1f5c6b', nav: 'topbar' };
    if (typeof db.tema.color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(db.tema.color)) db.tema.color = '#1f5c6b';
    if (typeof db.tema.nav !== 'string') db.tema.nav = 'topbar';
    db.grupos.forEach(g => { if (g.etapa == null) g.etapa = ''; });
    // Anotaciones de la ficha del alumno (fase 1): cada alumno lleva su
    // historial en `notas` = [{ fecha (ISO), texto }]. Los backups antiguos
    // no traen la clave: se rellena a [] y viaja con el alumno (sobrevive a
    // la promoción y va al archivo en el snapshot de las bajas).
    db.alumnos.forEach(al => { if (!Array.isArray(al.notas)) al.notas = []; });
    // La asignatura recuerda de qué curso es su currículo (p. ej. «6º») y su
    // fuente legal (la cita del decreto). Backups antiguos no los traen.
    db.asignaturas.forEach(a => {
      if (a.curso == null) a.curso = '';
      if (a.fuente == null) a.fuente = '';
      // El area es de que asignatura del decreto sale, y va APARTE del nombre
      // visible: asi el desplegable agrupa por area aunque el docente renombre
      // la asignatura (o le ponga «Ingles 3º»). Backups antiguos no la traen, y
      // no se puede derivar del nombre sin ambiguedad («Conocimiento del Medio
      // Natural, Social y Cultural 5º»), asi que se migra a vacio y el
      // desplegable cae en «Otras asignaturas». Las creadas a partir de ahora
      // si la llevan.
      if (a.area == null) a.area = '';
    });
    // Códigos de nivel ACI y asignaciones de alumnado: se guardan siempre
    // normalizados (sin espacios, en mayúsculas) para que un «b» tecleado por
    // el docente no deje al alumnado fuera de su nivel (y de todas las vistas).
    const normNivel = v => String(v == null ? '' : v).trim().toUpperCase();
    db.clases.forEach(c => {
      if (!Array.isArray(c.nivelesAci)) c.nivelesAci = [];
      c.nivelesAci = c.nivelesAci
        .map(n => Object.assign({}, n, { codigo: normNivel(n.codigo) }))
        .filter(n => n.codigo);
      if (!c.adaptaciones || typeof c.adaptaciones !== 'object') c.adaptaciones = {};
      const adap = {};
      Object.keys(c.adaptaciones).forEach(k => {
        const v = normNivel(c.adaptaciones[k]);
        if (v && v !== 'BASE') adap[k] = v;
      });
      c.adaptaciones = adap;
    });
    db.criterios.forEach(c => { if (!Array.isArray(c.claveIds)) c.claveIds = []; });
    db.instrumentos.forEach(i => {
      if (i.nivel == null) i.nivel = '';
      i.nivel = normNivel(i.nivel); // '' = común, 'BASE' = solo base, resto = nivel
      if (i.unidad == null) i.unidad = '';
      if (!Array.isArray(i.apartados)) i.apartados = [];
      if (!Array.isArray(i.niveles)) i.niveles = [];
      if (i.criteriosModo == null) i.criteriosModo = 'desglosado';
      if (!Array.isArray(i.criterioIdsGlobal)) i.criterioIdsGlobal = [];
      i.apartados.forEach(ap => {
        if (ap.peso == null || isNaN(ap.peso)) {
          ap.peso = (i.tipo === 'Rúbrica') ? 1 : (ap.maxPts || 1);
        }
        if (!Array.isArray(ap.criterioIds)) ap.criterioIds = [];
        if (!Array.isArray(ap.niveles)) ap.niveles = [];
        if (ap.saberes == null) ap.saberes = '';
      });
    });
    // Las rúbricas antiguas guardaban los descriptores en la escala común del
    // instrumento y dejaban los ítems vacíos (heredaban). Ahora cada ítem lleva
    // los suyos: se materializan antes de que queden sin escala.
    db.instrumentos.forEach(i => {
      if (i.tipo !== 'Rúbrica') return;
      const comunes = (Array.isArray(i.niveles) ? i.niveles : []).map(n => ({ pct: n.pct, descriptor: n.descriptor }));
      if (!comunes.length) return;
      i.apartados.forEach(ap => {
        if (!(Array.isArray(ap.niveles) && ap.niveles.length)) {
          ap.niveles = comunes.map(n => ({ pct: n.pct, descriptor: n.descriptor }));
        }
      });
    });
    // Moldes guardados en el banco: se sanean al cargar para que un backup
    // antiguo (o editado a mano) no rompa la vista del banco.
    if (!Array.isArray(db.bancoInstrumentos)) db.bancoInstrumentos = [];
    db.bancoInstrumentos.forEach(m => {
      if (m.criteriosModo == null) m.criteriosModo = 'desglosado';
      if (!Array.isArray(m.niveles)) m.niveles = [];
      if (!Array.isArray(m.criterioCodesGlobal)) m.criterioCodesGlobal = [];
      if (!m.origen || typeof m.origen !== 'object') m.origen = {};
      if (!Array.isArray(m.apartados)) m.apartados = [];
      m.apartados.forEach(ap => {
        if (!Array.isArray(ap.criterioCodes)) ap.criterioCodes = [];
        if (!Array.isArray(ap.niveles)) ap.niveles = [];
      });
      // v0.11.5: el molde NO guarda T ni UD (el destino se pregunta al
      // usarlo) — los moldes de backups antiguos se despellan al cargar.
      delete m.unidad;
      delete m.periodo;
      // CURRO y ÁREA PROPIOS del molde: lo que manda al usarlo y en la
      // visualización; `origen` queda como historial. Para moldes antiguos,
      // la cadena de relleno del curso: origen.curso → PREFIJO de los códigos
      // de criterio («5.1» → 5º — la fuente más fiable que existe, porque los
      // códigos del docente llevan el nivel) → curso de la ASIGNATURA de
      // origen → desconocido (''), que la UI preguntará al usar el molde.
      if (typeof m.curso !== 'string') {
        const porOrigen = m.origen && m.origen.curso != null ? String(m.origen.curso).trim() : '';
        const porCodigos = (m.apartados || []).reduce((acc, ap) => acc.concat(ap.criterioCodes || []), [])
          .concat(m.criterioCodesGlobal || [])
          .map(cod => /^([1-6])[.\-]/.exec(String(cod || '').trim()))
          .filter(Boolean)[0];
        const porAsignatura = m.origen && m.origen.asignaturaId
          ? (db.asignaturas || []).find(a => a.id === m.origen.asignaturaId)
          : null;
        m.curso = porOrigen || (porCodigos ? porCodigos[1] + 'º' : '')
          || (porAsignatura ? String(porAsignatura.curso || '').trim() : '');
      }
      if (typeof m.area !== 'string') {
        const asigOrigen = m.origen && m.origen.asignaturaId
          ? (db.asignaturas || []).find(a => a.id === m.origen.asignaturaId)
          : null;
        m.area = asigOrigen ? String(asigOrigen.area || '') : '';
      }
    });
    // Un instrumento con nivel ACI debe evaluar los criterios de SU currículo.
    // Los creados con «Duplicar» antes de esta versión copiaban los del original
    // (otro ciclo) y sus notas no salían en el informe; aquí se reapuntan por
    // número de criterio, sin tocar ninguna nota.
    this.reparadosCriterios = 0;
    if (typeof Calc !== 'undefined' && Calc.repararCriteriosDeInstrumentos) {
      this.reparadosCriterios = Calc.repararCriteriosDeInstrumentos(db);
    }
    return db;
  },

  // --- Color por unidad didáctica (cuadrícula de Instrumentos) ---

  // Mapa { ud: { h, intenso, suave } | null } para las UDs indicadas. Si una UD
  // no tiene color, se le asigna el primer color libre de la paleta y se marca
  // `cambios` para que el llamador guarde. `null` = «Sin color» (barra neutral).
  coloresUdPara(uds) {
    const mapa = {};
    let cambios = false;
    const usados = new Set();
    for (const v of Object.values(this.db.coloresUd || {})) {
      if (v && ColoresUd.esValido(v)) usados.add(v);
    }
    for (const ud of uds || []) {
      if (!ud) continue;
      const actual = this.db.coloresUd ? this.db.coloresUd[ud] : undefined;
      if (actual === null) { mapa[ud] = null; continue; }
      if (actual && ColoresUd.esValido(actual)) {
        mapa[ud] = ColoresUd.entradaPorIntenso(actual);
        continue;
      }
      const entrada = ColoresUd.primerLibre(usados);
      this.db.coloresUd[ud] = entrada.intenso;
      usados.add(entrada.intenso);
      mapa[ud] = entrada;
      cambios = true;
    }
    return { mapa, cambios };
  },

  // Renombrar una UD conserva su color: al guardar un instrumento, si la UD
  // anterior ya no la usa ningún instrumento, su color pasa al nombre nuevo.
  migrarColorUd(antes, despues) {
    if (!antes || !despues || antes === despues) return;
    const queda = (this.db.instrumentos || []).some(i => (i.unidad || '') === antes);
    if (queda) return;
    const color = this.db.coloresUd ? this.db.coloresUd[antes] : undefined;
    if (color == null) return;
    if (this.db.coloresUd[despues] == null) this.db.coloresUd[despues] = color;
    delete this.db.coloresUd[antes];
  },

  // Color manual de una UD: un `intenso` de la paleta, o null para «Sin color».
  fijarColorUd(ud, color) {
    if (!ud) return;
    if (color == null || color === '') this.db.coloresUd[ud] = null;
    else if (ColoresUd.esValido(color)) this.db.coloresUd[ud] = color;
  },

  claveDesdeDescriptores(descriptores) {
    const mapa = [
      ['CPSAA', 'cc-cpsaa'], ['CCEC', 'cc-ccec'], ['CCL', 'cc-ccl'],
      ['CP', 'cc-cp'], ['STEM', 'cc-stem'], ['CD', 'cc-cd'],
      ['CC', 'cc-cc'], ['CE', 'cc-ce']
    ];
    const ids = new Set();
    (descriptores || []).forEach(d => {
      const hit = mapa.find(([pref]) => String(d).startsWith(pref));
      if (hit) ids.add(hit[1]);
    });
    return [...ids];
  },

  // --- Copia de seguridad: estado, sellado y copia previa a importar ---

  // Estado de la copia para avisar en Inicio (R-01). Puro: recibe el «ahora»
  // para poder comprobarlo sin depender del reloj.
  estadoCopia(ahora) {
    const meta = this.db.meta || {};
    const ultima = meta.ultimaExportacion || null;
    const hayDatos = !this.vacio();
    const dias = ultima ? Math.floor(((ahora || Date.now()) - new Date(ultima).getTime()) / 86400000) : null;
    let nivel = 'ok';
    if (hayDatos && !ultima) nivel = 'nunca';
    else if (hayDatos && meta.cambiosSinCopia) nivel = 'pendiente';
    else if (hayDatos && dias >= this.DIAS_COPIA) nivel = 'antigua';
    return { ultima, dias, nivel, hayDatos };
  },

  // Sella una exportación correcta: fija la fecha y quita «cambios sin copiar».
  marcarCopia() {
    this.copiaEnSesion = true; // constancia para el asistente de fin de curso (D-60)
    this.db.meta = this.db.meta || {};
    this.db.meta.ultimaExportacion = new Date().toISOString();
    this.db.meta.cambiosSinCopia = false;
    this.save(true);
  },

  // Copia del estado actual justo antes de una importación (que reemplaza
  // todo). Permite deshacerla desde Inicio.
  copiarAntesDeImportar() {
    try {
      localStorage.setItem(this.KEY_PREVIA, JSON.stringify({ fecha: new Date().toISOString(), db: this.db }));
      return true;
    } catch (e) {
      return false;
    }
  },

  copiaPrevia() {
    try {
      const raw = localStorage.getItem(this.KEY_PREVIA);
      if (!raw) return null;
      const o = JSON.parse(raw);
      return o && o.db ? o : null;
    } catch (e) {
      return null;
    }
  },

  limpiarCopiaPrevia() {
    try { localStorage.removeItem(this.KEY_PREVIA); } catch (e) { /* noop */ }
  },

  restaurarCopiaPrevia() {
    const o = this.copiaPrevia();
    if (!o) return false;
    try {
      this.db = this.migrar(o.db);
      this.limpiarCopiaPrevia();
      this.save();
      return true;
    } catch (e) {
      return false;
    }
  },

  reiniciar() {
    try { localStorage.removeItem(this.KEY); } catch (e) {}
    this.limpiarCopiaPrevia();
    this.db = this.defaults();
    this.save();
  },

  // --- Alta y edición de grupos, alumnado y asignaturas ---
  // La escritura vive aquí (no en el modal) para que sea la misma al crear y
  // al editar, y para poder comprobarla sin navegador. `id` ausente = crear;
  // `id` presente = editar en sitio, conservando el id (y con él las notas).
  // Renombrar una asignatura NO toca sus criterios (van ligados por id), así
  // que ni el currículo ni las notas se pierden.

  guardarAsignatura(datos, id) {
    const nombre = String(datos.nombre || '').trim();
    if (!nombre) return null;
    if (id) {
      const a = this.db.asignaturas.find(x => x.id === id);
      if (!a) return null;
      a.nombre = nombre;
      a.etapa = datos.etapa || a.etapa;
      if (datos.curso != null) a.curso = String(datos.curso);
      if (datos.fuente != null) a.fuente = String(datos.fuente);
      this.save();
      return a;
    }
    const nueva = {
      id: Utils.uid(),
      nombre,
      area: String(datos.area || ''),
      etapa: datos.etapa || 'Primaria',
      curso: datos.curso != null ? String(datos.curso) : '',
      fuente: datos.fuente != null ? String(datos.fuente) : ''
    };
    this.db.asignaturas.push(nueva);
    this.save();
    return nueva;
  },

  guardarGrupo(datos, id) {
    const nombre = String(datos.nombre || '').trim();
    if (!nombre) return null;
    const etapa = datos.etapa || 'Primaria';
    if (id) {
      const g = this.db.grupos.find(x => x.id === id);
      if (!g) return null;
      g.nombre = nombre;
      g.etapa = etapa;
      this.save();
      return g;
    }
    const nuevo = { id: Utils.uid(), nombre, etapa };
    this.db.grupos.push(nuevo);
    this.save();
    return nuevo;
  },

  guardarAlumno(datos, id) {
    const nombre = String(datos.nombre || '').trim();
    const apellidos = String(datos.apellidos || '').trim();
    if (!nombre && !apellidos) return null;
    if (id) {
      const a = this.db.alumnos.find(x => x.id === id);
      if (!a) return null;
      a.nombre = nombre;
      a.apellidos = apellidos;
      if (datos.grupoId) a.grupoId = datos.grupoId;
      this.save();
      return a;
    }
    const nuevo = { id: Utils.uid(), nombre, apellidos, grupoId: datos.grupoId || null };
    this.db.alumnos.push(nuevo);
    this.save();
    return nuevo;
  },

  // Alta masiva: añade alumnado a un grupo desde un texto (un alumno por línea).
  // Formato «Apellidos, Nombre»; si una línea no lleva coma, se toma entera como
  // nombre. Ignora líneas vacías y evita duplicados ya presentes en el grupo.
  // Devuelve un resumen para informar al docente. La escritura vive aquí (no en
  // el modal) para poder comprobarla sin navegador.
  guardarAlumnosDesdeTexto(grupoId, texto) {
    const resp = { creados: 0, duplicados: 0 };
    const clave = a => (String(a.apellidos || '') + '\u0000' + String(a.nombre || '')).toLowerCase();
    const existentes = new Set(this.db.alumnos.filter(a => a.grupoId === grupoId).map(clave));
    const vistos = new Set();
    for (const linea of String(texto || '').split(/\r?\n/)) {
      const limpia = linea.trim();
      if (!limpia) continue;
      const coma = limpia.indexOf(',');
      const apellidos = coma >= 0 ? limpia.slice(0, coma).trim() : '';
      const nombre = coma >= 0 ? limpia.slice(coma + 1).trim() : limpia;
      if (!nombre && !apellidos) continue;
      const c = clave({ apellidos, nombre });
      if (existentes.has(c) || vistos.has(c)) { resp.duplicados++; continue; }
      vistos.add(c);
      this.db.alumnos.push({ id: Utils.uid(), nombre, apellidos, grupoId: grupoId || null });
      resp.creados++;
    }
    if (resp.creados) this.save();
    return resp;
  },

  // --- Ficha del alumno (fase 1) ---
  // Anotaciones de la ficha: texto libre con fecha (editable, hoy por
  // defecto), guardadas en `alumno.notas` — NUNCA participan en cálculos ni
  // salen en informes impresos (material interno del docente). Las
  // observaciones de los instrumentos NO se duplican: viven donde siempre
  // (`db.observaciones[instrumentoId]`, D-74c) y el historial las lee del
  // almacén real, enlazadas por los registros del alumno en cada instrumento.

  // Alta de una anotación de ficha: { fecha (ISO), texto }. Devuelve la
  // anotación guardada, o null si no hay texto (una anotación vacía no
  // existe) o el alumno no existe.
  guardarNotaAlumno(alumnoId, fecha, texto) {
    const a = this.db.alumnos.find(x => x.id === alumnoId);
    const t = String(texto == null ? '' : texto).trim();
    if (!a || !t) return null;
    if (!Array.isArray(a.notas)) a.notas = [];
    const anotacion = { fecha: String(fecha || '').trim() || Utils.hoy(), texto: t };
    a.notas.push(anotacion);
    this.save();
    return anotacion;
  },

  // Historial de la ficha: las anotaciones propias (tipo «ficha») y las
  // observaciones de los instrumentos donde el alumno TIENE REGISTRO
  // (`db.registros[instId][alumnoId]` con alguna nota — la exclusión
  // «noRealiza» no cuenta: no hay notas que comentar). Cada entrada de
  // instrumento lleva el id y el título para el enlace; el texto es el de
  // `db.observaciones`, leído en vivo (nunca copiado). Orden: fecha
  // descendente (lo más reciente arriba).
  historialAlumno(alumnoId) {
    const a = this.db.alumnos.find(x => x.id === alumnoId);
    if (!a) return [];
    const fichas = (Array.isArray(a.notas) ? a.notas : [])
      .filter(n => n && String(n.texto || '').trim())
      .map(n => ({ tipo: 'ficha', fecha: String(n.fecha || ''), texto: String(n.texto) }));
    const registros = this.db.registros || {};
    const observaciones = this.db.observaciones || {};
    const insts = [];
    Object.keys(registros).forEach(instId => {
      const reg = registros[instId] && registros[instId][alumnoId];
      if (!reg || typeof reg !== 'object') return;
      const conNota = Object.keys(reg).some(k => k !== 'noRealiza' && reg[k] != null && reg[k] !== '');
      if (!conNota) return;
      const texto = String(observaciones[instId] == null ? '' : observaciones[instId]).trim();
      if (!texto) return;
      const inst = this.db.instrumentos.find(x => x.id === instId);
      insts.push({
        tipo: 'instrumento',
        fecha: String((inst && inst.fecha) || ''),
        texto,
        instrumentoId: instId,
        instrumentoTitulo: inst ? String(inst.titulo || '') : ''
      });
    });
    return fichas.concat(insts)
      .sort((x, y) => String(y.fecha || '').localeCompare(String(x.fecha || '')));
  },

  // --- Borrado en cascada (punto único) ---
  // Antes cada vista reimplementaba su cascada a mano y dos de ellas dejaban
  // datos huérfanos: notas de instrumentos que ya no existían y notas de
  // alumnado borrado. Aquí vive la ÚNICA cascada, de modo que borrar una clase,
  // un grupo o una asignatura nunca deja registros colgando.

  // Quita los instrumentos de una lista de clases y sus notas. Suma el número
  // de instrumentos eliminados en `resp.instrumentos`.
  _purgarInstrumentosDeClases(claseIds, resp) {
    const ids = new Set(claseIds);
    const instIds = this.db.instrumentos.filter(i => ids.has(i.claseId)).map(i => i.id);
    instIds.forEach(id => delete this.db.registros[id]);
    if (instIds.length) {
      const set = new Set(instIds);
      this.db.instrumentos = this.db.instrumentos.filter(i => !set.has(i.id));
    }
    resp.instrumentos += instIds.length;
  },

  // Quita las notas de una lista de alumnado en TODOS los instrumentos.
  _purgarRegistrosDeAlumnos(alumnoIds) {
    const ids = new Set(alumnoIds);
    Object.keys(this.db.registros).forEach(instId => {
      const reg = this.db.registros[instId] || {};
      Object.keys(reg).forEach(al => { if (ids.has(al)) delete reg[al]; });
    });
  },

  // Quita referencias ACI cuyo currículo ya no existe (p. ej. al borrar la
  // asignatura que daba criterios a un nivel). Sin esto, el alumnado de ese
  // nivel caería en silencio al currículo base.
  _purgarAciHuerfano() {
    const vivas = new Set(this.db.asignaturas.map(a => a.id));
    this.db.clases.forEach(c => {
      if (Array.isArray(c.nivelesAci)) {
        c.nivelesAci = c.nivelesAci.filter(n => !n.asignaturaId || vivas.has(n.asignaturaId));
      }
      if (c.adaptaciones && typeof c.adaptaciones === 'object') {
        const codigos = new Set((c.nivelesAci || []).map(n => Calc.nivelNorm(n.codigo)));
        const adap = {};
        Object.keys(c.adaptaciones).forEach(k => {
          const v = Calc.nivelNorm(c.adaptaciones[k]);
          if (v && codigos.has(v)) adap[k] = c.adaptaciones[k];
        });
        c.adaptaciones = adap;
      }
    });
  },

  // Borra una clase con sus instrumentos y sus notas.
  borrarClase(claseId) {
    const resp = { instrumentos: 0 };
    this._purgarInstrumentosDeClases([claseId], resp);
    this.db.clases = this.db.clases.filter(c => c.id !== claseId);
    this.save();
    return resp;
  },

  // Borra un alumno y sus notas en todos los instrumentos.
  borrarAlumno(alumnoId) {
    this.db.alumnos = this.db.alumnos.filter(a => a.id !== alumnoId);
    this._purgarRegistrosDeAlumnos([alumnoId]);
    this.save();
  },

  // Borra un grupo con su alumnado, sus clases, sus instrumentos y sus notas.
  borrarGrupo(grupoId) {
    const resp = { alumnos: 0, clases: 0, instrumentos: 0 };
    const claseIds = this.db.clases.filter(c => c.grupoId === grupoId).map(c => c.id);
    resp.clases = claseIds.length;
    this._purgarInstrumentosDeClases(claseIds, resp);
    this.db.clases = this.db.clases.filter(c => c.grupoId !== grupoId);
    const alumnoIds = this.db.alumnos.filter(a => a.grupoId === grupoId).map(a => a.id);
    resp.alumnos = alumnoIds.length;
    this.db.alumnos = this.db.alumnos.filter(a => a.grupoId !== grupoId);
    this._purgarRegistrosDeAlumnos(alumnoIds);
    this.db.grupos = this.db.grupos.filter(g => g.id !== grupoId);
    this.save();
    return resp;
  },

  // Borra una asignatura con su currículo, sus clases, sus instrumentos y sus
  // notas, y limpia las referencias ACI que apuntaban a ella.
  borrarAsignatura(asignaturaId) {
    const resp = { criterios: 0, clases: 0, instrumentos: 0 };
    const claseIds = this.db.clases.filter(c => c.asignaturaId === asignaturaId).map(c => c.id);
    resp.clases = claseIds.length;
    this._purgarInstrumentosDeClases(claseIds, resp);
    resp.criterios = this.db.criterios.filter(x => x.asignaturaId === asignaturaId).length;
    this.db.criterios = this.db.criterios.filter(x => x.asignaturaId !== asignaturaId);
    this.db.competenciasEspecificas = this.db.competenciasEspecificas.filter(x => x.asignaturaId !== asignaturaId);
    this.db.clases = this.db.clases.filter(x => x.asignaturaId !== asignaturaId);
    this.db.asignaturas = this.db.asignaturas.filter(x => x.id !== asignaturaId);
    this._purgarAciHuerfano();
    this.save();
    return resp;
  },

  // --- Fin de curso (D-60, «mapa completo») ---
  // Dos verbos por asignatura, decisión del docente: SIN paridad automática.
  // Cada asignatura REAL (con alguna clase con alumnado) ofrece en el
  // asistente «Promocionar a N+1º» o «Terminar»; la paridad del diseño
  // anterior (impares promocionan / pares se eliminan o empiezan el curso
  // sin cambiar de nivel) quedó fuera, junto con la acción de reinicio del
  // lote de checkboxes que la aplicaba.
  //
  // La paridad SOLO sobrevive como utilidad pura de la vista (App.finCurso
  // .paridadDeCurso) para numerar el botón «Promocionar a N+1º» y detectar
  // asignaturas sin curso; la escritura de datos vive aquí, junto a la
  // cascada de borrado.
  //
  // Asignaturas REALES vs SOPORTE ACI: una asignatura es REAL si tiene
  // alguna clase con alumnado (ahí viven sus calificaciones y ahí
  // pertenecen sus alumnos); las SIN clases con alumnado son contenedoras
  // de currículo para los niveles ACI de otras clases y no aparecen en el
  // asistente: se eliminan junto con la real que las usa, si es su única
  // usuaria (ver soportesAciDe).

  // ¿Es real? Tiene al menos una clase cuyo grupo lleva alumnado.
  esAsignaturaReal(a) {
    if (!a) return false;
    return this.db.clases.some(c => c.asignaturaId === a.id
      && this.db.alumnos.some(al => al.grupoId === c.grupoId));
  },

  // Soportes ACI EXCLUSIVAS de las asignaturas que se van: son soporte (sin
  // clases con alumnado), las referencia alguna clase de esas asignaturas
  // (nivelesAci[].asignaturaId) y NINGUNA clase que sobrevive las
  // referencia. Se eliminan junto con su real; si otra clase viva las usa,
  // se quedan.
  soportesAciDe(ids) {
    const van = new Set(Array.isArray(ids) ? ids : []);
    const referidasPorSobrevivientes = new Set();
    this.db.clases.filter(c => !van.has(c.asignaturaId)).forEach(c =>
      (c.nivelesAci || []).forEach(n => { if (n.asignaturaId) referidasPorSobrevivientes.add(n.asignaturaId); }));
    const salida = [];
    this.db.clases.filter(c => van.has(c.asignaturaId)).forEach(c =>
      (c.nivelesAci || []).forEach(n => {
        const a = n.asignaturaId && this.db.asignaturas.find(x => x.id === n.asignaturaId);
        if (!a || salida.some(s => s.id === a.id)) return;
        if (!this.esAsignaturaReal(a) && !referidasPorSobrevivientes.has(a.id)) salida.push(a);
      }));
    return salida;
  },

  // Promociona una asignatura al nivel siguiente. La asignatura CONSERVA su
  // id (sus clases y su grupo no se tocan), cambia su nivel y arranca SIN
  // instrumentos, notas ni currículo: lo del nivel que se cierra se elimina,
  // de modo que la promovida queda en el estado normal «sin currículo» y el
  // docente carga el del nivel nuevo con «Recuperar currículo oficial» (que
  // exige una asignatura sin currículo). El banco de instrumentos no se
  // toca: sus moldes guardan los criterios por código y sobreviven igual.
  // El GRUPO viaja con ella: si su nombre lleva el curso que se deja
  // («3ºA»), pasa al nuevo («4ºA») — solo si NINGUNA otra asignatura lo usa
  // (un grupo compartido se renombra a mano, cuando toque, para no corromper
  // a la que se queda). Devuelve { clases, instrumentos, criterios, grupos }
  // o null si no hay nada.
  promocionarAsignatura(asignaturaId, cursoNuevo) {
    const a = this.db.asignaturas.find(x => x.id === asignaturaId);
    const nuevo = String(cursoNuevo == null ? '' : cursoNuevo).trim();
    if (!a || !nuevo) return null;
    const resp = { clases: 0, instrumentos: 0, criterios: 0, grupos: [] };
    const claseIds = this.db.clases.filter(c => c.asignaturaId === asignaturaId).map(c => c.id);
    resp.clases = claseIds.length;
    this._purgarInstrumentosDeClases(claseIds, resp);
    resp.criterios = this.db.criterios.filter(c => c.asignaturaId === asignaturaId).length;
    this.db.criterios = this.db.criterios.filter(c => c.asignaturaId !== asignaturaId);
    this.db.competenciasEspecificas = this.db.competenciasEspecificas.filter(c => c.asignaturaId !== asignaturaId);
    // El currículo importado también trae sus saberes: se van con el nivel.
    delete a.saberesBasicos;
    // Nombre visible: si acaba en « Nº» se sustituye el sufijo, para que la
    // promovida se llame como su nivel nuevo. Un nombre editado a mano (sin
    // el sufijo del curso) se respeta entero, como en «Editar asignatura».
    const anterior = String(a.curso || '').trim();
    const nombre = String(a.nombre || '');
    if (anterior && nombre.endsWith(' ' + anterior)) {
      a.nombre = nombre.slice(0, nombre.length - anterior.length - 1) + ' ' + nuevo;
    }
    a.curso = nuevo;
    // El nombre del GRUPO solo se actualiza si encaja el patrón del curso
    // (ver renombresDeGrupo); la previsión de la UI sale de ESTA MISMA
    // función, así que la confirmación nunca promete lo que no ocurrirá.
    resp.grupos = this.renombresDeGrupo(asignaturaId, anterior, nuevo);
    resp.grupos.forEach(r => {
      const g = this.db.grupos.find(x => x.id === r.id);
      if (g) g.nombre = r.despues;
    });
    this.save();
    return resp;
  },

  // Grupos cuyo nombre se RENOMBRARÍA al promocionar una asignatura de
  // `cursoActual` a `cursoNuevo` (sin mutar nada: la UI lo usa para la
  // confirmación, y promocionarAsignatura lo aplica). Un grupo se renombra
  // SOLO si (1) ninguna otra asignatura tiene clases sobre él y (2) su
  // nombre encaja el patrón del curso que se deja: «3ºA» → «4ºA», «3º A» →
  // «4º A». «Equipo azul» no encaja y no se toca.
  renombresDeGrupo(asignaturaId, cursoActual, cursoNuevo) {
    const na = parseInt(String(cursoActual == null ? '' : cursoActual).trim(), 10);
    const nn = parseInt(String(cursoNuevo == null ? '' : cursoNuevo).trim(), 10);
    if (!na || !nn || nn !== na + 1) return [];
    const propias = this.db.clases.filter(c => c.asignaturaId === asignaturaId);
    if (!propias.length) return [];
    const propiasIds = new Set(propias.map(c => c.id));
    const deOtras = new Set(this.db.clases.filter(c => !propiasIds.has(c.id)).map(c => c.grupoId));
    const salida = [];
    const vistas = new Set();
    propias.forEach(c => {
      if (vistas.has(c.grupoId) || deOtras.has(c.grupoId)) return;
      vistas.add(c.grupoId);
      const g = this.db.grupos.find(x => x.id === c.grupoId);
      if (!g) return;
      const m = new RegExp('^' + na + 'º(.*)$').exec(String(g.nombre || '').trim());
      const despues = m ? nn + 'º' + m[1] : '';
      if (despues && despues !== g.nombre) salida.push({ id: g.id, antes: g.nombre, despues });
    });
    return salida;
  },

  // Grupos que quedarían HUÉRFANOS si desaparecieran las asignaturas de
  // `ids` (con sus clases): los referenciados solo por clases de esas
  // asignaturas. Los usa la confirmación de «Terminar», que ofrece la
  // casilla «También eliminar el grupo con su alumnado» MARCADA por
  // defecto. Devuelve [{ id, nombre, alumnos }].
  gruposHuerfanosDe(ids) {
    const van = new Set(Array.isArray(ids) ? ids : []);
    const deLasQueSeVan = new Set();
    const deLasSobrevivientes = new Set();
    this.db.clases.forEach(c => {
      (van.has(c.asignaturaId) ? deLasQueSeVan : deLasSobrevivientes).add(c.grupoId);
    });
    const salida = [];
    deLasQueSeVan.forEach(gid => {
      if (deLasSobrevivientes.has(gid) || salida.some(x => x.id === gid)) return;
      const g = this.db.grupos.find(x => x.id === gid);
      if (g) salida.push({
        id: g.id,
        nombre: g.nombre,
        alumnos: this.db.alumnos.filter(a => a.grupoId === gid).length
      });
    });
    return salida;
  },

  // --- Banco de instrumentos (D-48) ---
  // Guarda un instrumento del curso como molde reutilizable. Devuelve el molde.
  // v0.11.5: el molde NO guarda T ni UD del instrumento de origen (el destino
  // se pregunta explícitamente al usarlo) y lleva su CURSO y su ÁREA PROPIOS
  // (lo que manda es el molde; `origen` queda como historial informativo).
  // Calc.moldeDeInstrumento (que no se toca) aún copia `unidad`: se despella
  // aquí, junto con cualquier `periodo` que un molde antiguo arrastrara.
  guardarEnBanco(inst) {
    if (!Array.isArray(this.db.bancoInstrumentos)) this.db.bancoInstrumentos = [];
    const molde = Calc.moldeDeInstrumento(this.db, inst);
    delete molde.unidad;
    delete molde.periodo;
    const claseOrigen = (this.db.clases || []).find(c => c.id === inst.claseId);
    const asigOrigen = claseOrigen
      ? (this.db.asignaturas || []).find(a => a.id === claseOrigen.asignaturaId)
      : null;
    molde.curso = asigOrigen ? String(asigOrigen.curso || '') : '';
    molde.area = asigOrigen ? String(asigOrigen.area || '') : '';
    this.db.bancoInstrumentos.push(molde);
    this.save();
    return molde;
  },

  // Áreas del currículo oficial (las que traen las plantillas del decreto),
  // ordenadas — la lista del selector de área del editor de moldes.
  areasOficiales() {
    const plantillas = typeof PLANTILLAS_CURRICULO === 'undefined' ? [] : PLANTILLAS_CURRICULO;
    return [...new Set(plantillas.map(p => (p.asignatura || {}).nombre || '').filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'es'));
  },

  // Fija SOLO el curso propio de un molde (lo que el docente responde en el
  // modal de uso cuando el molde no tiene curso conocido): una edición mínima
  // que no toca estructura, criterios ni origen. Devuelve el molde o null.
  fijarCursoMolde(moldeId, curso) {
    const m = (this.db.bancoInstrumentos || []).find(x => x.id === moldeId);
    if (!m) return null;
    m.curso = String(curso || '').trim();
    this.save();
    return m;
  },

  // Curso REAL de una asignatura: el campo `curso` y, si está vacío, el nivel
  // que cierra su nombre («… 6º», «… 1º de Primaria»). Es la MISMA regla que
  // usa `ClasesView.cursoDeAsignatura` (duplicado a propósito: storage.js no
  // depende de las vistas y la regla es de 5 líneas); sin ella, el banco
  // comparaba el campo a secas y una asignatura con el campo vacío pero el
  // curso en el nombre (las largas del decreto, las creadas a mano) hacía
  // saltar la regla de curso en silencio: el molde de otro curso se importaba
  // «tragándolo». Devuelve '' si no hay forma de saberlo (fail-closed).
  cursoDeAsignatura(a) {
    if (!a) return '';
    const campo = String(a.curso || '').trim();
    if (campo) return campo;
    const m = String(a.nombre || '').match(/([1-6])º(?:\s+de\s+(?:Primaria|Infantil))?\s*$/i);
    return m ? m[1] + 'º' : '';
  },

  // Criterios disponibles de un CURSO, agrupados por asignatura — la fuente
  // del selector de criterios del editor de moldes del banco. Se lee de la
  // BASE (el currículo que el docente tiene importado): son los códigos y
  // descripciones reales que usa el resto de la app; las plantillas del
  // decreto traerían el catálogo completo de todas las áreas, incluidas las
  // que el docente no usa. Si ese nivel no está importado no hay grupos: el
  // molde se guarda sin criterios y se asignan luego en la ficha del
  // instrumento (la regla de «curso distinto» ya lo contempla). Devuelve
  // [{ asignaturaId, asignatura, criterios: [{ codigo, descripcion }] }].
  criteriosDeCurso(curso) {
    const nivel = String(curso || '').trim();
    if (!nivel) return [];
    const salida = [];
    (this.db.asignaturas || []).forEach(a => {
      if (String(a.curso || '').trim() !== nivel) return;
      const crits = (this.db.criterios || [])
        .filter(x => x.asignaturaId === a.id)
        .sort((x, y) => String(x.codigo).localeCompare(String(y.codigo), 'es'));
      if (crits.length) salida.push({
        asignaturaId: a.id,
        asignatura: a.nombre,
        criterios: crits.map(x => ({ codigo: x.codigo, descripcion: x.descripcion }))
      });
    });
    return salida;
  },

  // Criterios del CURRÍCULO OFICIAL de un curso, agrupados por área — la
  // FUENTE PROPIA del banco (v0.11.5): sale de las plantillas del decreto
  // (`PLANTILLAS_CURRICULO`, js/plantillas.js) filtradas por el nivel, de
  // modo que el docente puede PREPARAR moldes de cursos que no imparte este
  // año aunque no tenga asignaturas de ese nivel importadas. Los criterios
  // viajan por CÓDIGO, así que al USAR el molde los resuelve el currículo de
  // la clase de destino (regla de siempre). Devuelve
  // [{ asignatura (área), etapa, criterios: [{ codigo, descripcion }] }].
  criteriosDePlantilla(curso) {
    const nivel = String(curso || '').trim();
    if (!nivel) return [];
    const plantillas = typeof PLANTILLAS_CURRICULO === 'undefined' ? [] : PLANTILLAS_CURRICULO;
    const salida = [];
    plantillas.forEach(p => {
      const asig = p.asignatura || {};
      if (!(asig.cursos || []).map(String).includes(nivel)) return;
      const crits = (p.criterios || [])
        .map(c => ({ codigo: c.codigo, descripcion: c.descripcion }))
        .sort((x, y) => String(x.codigo).localeCompare(String(y.codigo), 'es'));
      if (crits.length) salida.push({
        asignatura: asig.nombre || '',
        etapa: asig.etapa || '',
        criterios: crits
      });
    });
    return salida;
  },

  // Duplica un molde del banco: copia INDEPENDIENTE (id nuevo) con el nombre
  // del original + « (copia)» — misma estructura, mismos criterios y mismo
  // curso de origen —, lista para editarla y adaptarla a otro curso con otros
  // criterios (el caso de los instrumentos comunes: comportamiento, libretas,
  // presentaciones…). Devuelve la copia, o null si el molde no existe.
  duplicarMolde(moldeId) {
    const m = (this.db.bancoInstrumentos || []).find(x => x.id === moldeId);
    if (!m) return null;
    const copia = JSON.parse(JSON.stringify(m));
    copia.id = Utils.uid();
    copia.titulo = m.titulo + ' (copia)';
    this.db.bancoInstrumentos.push(copia);
    this.save();
    return copia;
  },

  // Crea o edita un molde del banco SIN instrumento vivo (el «Crear molde»
  // del modal de gestión). Editor mínimo: nombre, tipo, curso de origen,
  // modo de criterios (desglosado/global) y apartados (descripción, puntos,
  // peso y criterios). Los criterios viajan por CÓDIGO como en todo el banco:
  // `criteriosCodes` (array por apartado) y `criterioCodesGlobal`. Al editar,
  // si la llamada no trae criterios (compatibilidad), se conservan los que ya
  // tenía el molde por posición; si los trae, se sustituyen — la estructura
  // nunca se pierde. Devuelve el molde, o null sin título.
  guardarMoldeBanco(datos, id) {
    const titulo = String(datos.titulo || '').trim();
    if (!titulo) return null;
    const lista = this.db.bancoInstrumentos = this.db.bancoInstrumentos || [];
    const tipo = String(datos.tipo || 'Control');
    const curso = String(datos.curso || '').trim();
    const area = String(datos.area || '').trim();
    const modo = datos.criteriosModo != null ? String(datos.criteriosModo) : null;
    const codesPorApartado = Array.isArray(datos.criteriosCodes) ? datos.criteriosCodes : null;
    const codesGlobal = Array.isArray(datos.criterioCodesGlobal) ? datos.criterioCodesGlobal : null;
    const entrada = Array.isArray(datos.apartados) ? datos.apartados : [];
    const num = (v, def) => (isFinite(Number(v)) && Number(v) > 0 ? Number(v) : def);
    if (id) {
      const m = lista.find(x => x.id === id);
      if (!m) return null;
      m.titulo = titulo;
      m.tipo = tipo;
      // Curso y área PROPIOS: lo que manda el molde (el origen queda como
      // historial, sin reescribirse).
      m.curso = curso;
      m.area = area;
      m.criteriosModo = modo || m.criteriosModo || 'desglosado';
      m.criterioCodesGlobal = codesGlobal || m.criterioCodesGlobal || [];
      m.apartados = entrada.map((ap, i) => {
        const previo = (m.apartados || [])[i] || {};
        return {
          descripcion: String(ap.descripcion || '').trim(),
          maxPts: num(ap.maxPts, previo.maxPts || 10),
          peso: num(ap.peso, previo.peso || 1),
          niveles: previo.niveles || [],
          criterioCodes: codesPorApartado
            ? (codesPorApartado[i] || [])
            : (previo.criterioCodes || [])
        };
      });
      this.save();
      return m;
    }
    const nuevo = {
      id: Utils.uid(),
      titulo,
      tipo,
      curso,
      area,
      saberes: '',
      url: '',
      niveles: [],
      criteriosModo: modo || 'desglosado',
      criterioCodesGlobal: codesGlobal || [],
      apartados: entrada.map((ap, i) => ({
        descripcion: String(ap.descripcion || '').trim(),
        maxPts: num(ap.maxPts, 10),
        peso: num(ap.peso, 1),
        niveles: [],
        criterioCodes: (codesPorApartado && codesPorApartado[i]) || []
      })),
      origen: { asignaturaId: '', asignatura: '', etapa: '', guardadoEn: Utils.hoy() }
    };
    lista.push(nuevo);
    this.save();
    return nuevo;
  },

  borrarDelBanco(moldeId) {
    this.db.bancoInstrumentos = (this.db.bancoInstrumentos || []).filter(m => m.id !== moldeId);
    this.save();
  },

  // Crea un instrumento nuevo en `claseId` a partir de un molde del banco, con
  // el T y la unidad de programación (UD, proyecto…) que se preguntan al
  // usarlo — el molde no guarda ni aporta ninguna de las dos. REGLA DEL
  // DOCENTE (el uso se ENDURECE): si el curso PROPIO del molde es distinto
  // del del destino, el uso se NIEGA — NO se crea nada y se devuelve
  // `{ negado: true, motivo }` con la receta («duplícalo y edítalo a Nº»):
  // la adaptación de curso vive en el EDITOR DE MOLDES (duplicar → editar
  // curso/área → criterios del currículo oficial de ese curso), no en el
  // momento de usar. Antes se creaba «sin criterios con aviso», y con
  // códigos del decreto que se repiten entre cursos llegó a resolverse en el
  // curso equivocado. Con el mismo curso (o por nivel ACI), los códigos se
  // resuelven contra el currículo de destino como siempre y algún código que
  // falte se avisa SIN crear nada.
  anadirDesdeBanco(moldeId, claseId, nivel, periodo, unidad) {
    const molde = (this.db.bancoInstrumentos || []).find(m => m.id === moldeId);
    if (!molde) return { faltan: ['(el molde ya no está en el banco)'] };
    const destino = String(unidad == null ? '' : unidad).trim();
    const cursoOrigen = String((molde.curso != null ? molde.curso
      : (molde.origen || {}).curso) || '').trim();
    const asigDestino = Calc.asignaturaDeNivel(claseId, nivel || '');
    const cursoDestino = this.cursoDeAsignatura(asigDestino);
    // FAIL-CLOSED (decisión del docente, tras el «traga»): si no se sabe el
    // curso del destino o el del molde, NO se decide comparando a ciegas —
    // se niega el uso con el motivo y nada se crea. La guarda antigua
    // `if (cursoOrigen && cursoDestino && …)` saltaba en silencio con el
    // dato vacío y dejaba importar (incluso resolviendo criterios del
    // destino con un código coincidente).
    if (!cursoDestino) {
      return {
        negado: true,
        molde,
        motivo: 'No se sabe qué curso evalúa esta clase: rellena el curso de la asignatura en «Asignaturas y clases» e inténtalo de nuevo.'
      };
    }
    if (!cursoOrigen) {
      return {
        negado: true,
        molde,
        motivo: 'No se sabe el curso de este molde: dilo en el modal de uso (se guarda en el molde para la próxima).'
      };
    }
    if (cursoOrigen !== cursoDestino) {
      return {
        negado: true,
        molde,
        motivo: `Este molde es de ${cursoOrigen} y esta clase evalúa ${cursoDestino}. ` +
          `Si lo quieres para ${cursoDestino}, duplícalo y edítalo a ${cursoDestino}.`
      };
    }
    const r = Calc.instrumentoDesdeMolde(molde, claseId, nivel, periodo);
    if (r.faltan.length) return { faltan: r.faltan, molde };
    r.inst.unidad = destino;
    this.db.instrumentos.push(r.inst);
    this.save();
    return { inst: r.inst, faltan: [], molde };
  },

  importarCurriculo(datos, opciones) {
    if (!datos || datos.tipo !== 'curriculo-evalcrit' || datos.version !== 1) {
      throw new Error('El archivo no es una plantilla de currículo Evalora válida');
    }
    const asig = datos.asignatura || {};
    const nombre = String(asig.nombre || '').trim();
    const etapa = String(asig.etapa || '').trim();
    if (!nombre) throw new Error('Falta el nombre de la asignatura');
    if (!Array.isArray(datos.competenciasEspecificas) || !datos.competenciasEspecificas.length) {
      throw new Error('La plantilla no incluye competencias específicas');
    }
    if (!Array.isArray(datos.criterios) || !datos.criterios.length) {
      throw new Error('La plantilla no incluye criterios de evaluación');
    }
    const cesCodigos = datos.competenciasEspecificas.map(c => c.codigo);
    if (new Set(cesCodigos).size !== cesCodigos.length) {
      throw new Error('Hay competencias específicas con código repetido');
    }
    const critCodigos = datos.criterios.map(c => c.codigo);
    if (new Set(critCodigos).size !== critCodigos.length) {
      throw new Error('Hay criterios con código repetido');
    }
    for (const c of datos.criterios) {
      if (!cesCodigos.includes(c.ceCodigo)) {
        throw new Error(`El criterio ${c.codigo} referencia una competencia específica inexistente (${c.ceCodigo})`);
      }
    }

    const opts = opciones || {};
    const cursosPlantilla = Array.isArray(asig.cursos) && asig.cursos.length
      ? asig.cursos.map(c => String(c).trim()).filter(Boolean)
      : [''];
    // Sin `opciones.cursos` se comporta como antes (una asignatura por curso de
    // la plantilla). Con `opciones.cursos` solo se crea el curso pedido.
    let cursos = cursosPlantilla;
    if (Array.isArray(opts.cursos) && opts.cursos.length) {
      const pedidos = opts.cursos.map(c => String(c).trim()).filter(Boolean);
      cursos = cursosPlantilla.filter(c => pedidos.indexOf(c) !== -1);
      if (!cursos.length) {
        throw new Error(`La plantilla de ${nombre} no cubre el curso ${pedidos.join(', ')}`);
      }
    }
    const n = datos.criterios.length;
    const pesoIgual = Math.round((100 / n) * 10000) / 10000;
    const fuente = typeof datos.fuente === 'string' ? datos.fuente.trim() : '';
    const creadas = [];
    const ids = [];

    // Rellena una asignatura (nueva o ya existente) con las competencias
    // específicas, los criterios y los saberes de la plantilla. Aborta si esa
    // asignatura ya tiene currículo: nunca se pisa lo que ya hay.
    const rellenar = (target, curso) => {
      if (this.db.competenciasEspecificas.some(e => e.asignaturaId === target.id)) {
        throw new Error(`La asignatura «${target.nombre}» ya tiene currículo. Elimínalo primero o renombra la asignatura en la plantilla.`);
      }
      target.curso = curso;
      if (fuente) target.fuente = fuente;

      const idEsp = {};
      for (const ce of datos.competenciasEspecificas) {
        const obj = {
          id: Utils.uid(),
          asignaturaId: target.id,
          codigo: ce.codigo,
          descripcion: ce.descripcion,
          perfilSalida: Array.isArray(ce.perfilSalida) ? ce.perfilSalida : []
        };
        this.db.competenciasEspecificas.push(obj);
        idEsp[ce.codigo] = obj;
      }

      datos.criterios.forEach((c, i) => {
        const esp = idEsp[c.ceCodigo];
        const peso = (typeof c.peso === 'number' && !isNaN(c.peso))
          ? c.peso
          : (i === n - 1 ? Math.round((100 - pesoIgual * (n - 1)) * 10000) / 10000 : pesoIgual);
        const claveIds = [...new Set(esp.perfilSalida ? this.claveDesdeDescriptores(esp.perfilSalida) : [])];
        this.db.criterios.push({
          id: Utils.uid(),
          asignaturaId: target.id,
          codigo: c.codigo,
          descripcion: c.descripcion,
          peso,
          espIds: [esp.id],
          claveIds
        });
      });

      if (Array.isArray(datos.saberesBasicos)) {
        target.saberesBasicos = datos.saberesBasicos;
      }
    };

    if (opts.asignaturaId) {
      // Recuperar el currículo en una asignatura ya creada (una sola), sin
      // duplicarla. Sirve para arreglar las creadas a mano sin currículo.
      const target = this.db.asignaturas.find(a => a.id === opts.asignaturaId);
      if (!target) throw new Error('La asignatura indicada ya no existe');
      if (!target.area) target.area = nombre;
      const etiqueta = String(opts.etiqueta || '').trim();
      const cursoTarget = String(opts.curso || target.curso || '').trim();
      if (etiqueta) target.nombre = cursoTarget ? `${etiqueta} ${cursoTarget}` : etiqueta;
      rellenar(target, String(opts.curso || target.curso || cursos[0] || '').trim());
      creadas.push(target.nombre);
      ids.push(target.id);
    } else {
      for (const curso of cursos) {
        const nombreCompleto = curso ? `${nombre} ${curso}` : nombre;
        let target = this.db.asignaturas.find(a =>
          a.nombre.toLowerCase() === nombreCompleto.toLowerCase() && (a.etapa || '') === etapa);
        if (!target) {
          // El nombre del área va aparte del nombre visible: así el desplegable
          // puede agrupar por área aunque el docente renombre la asignatura. Si
          // no se indica etiqueta (Inglés/Francés, Plástica/Música), es el del
          // decreto y el nombre visible es «área + curso», como siempre.
          const etiqueta = String(opts.etiqueta || '').trim();
          target = {
            id: Utils.uid(),
            nombre: etiqueta ? (curso ? `${etiqueta} ${curso}` : etiqueta) : nombreCompleto,
            area: nombre,
            etapa,
            curso,
            fuente
          };
          this.db.asignaturas.push(target);
        }
        rellenar(target, curso);
        creadas.push(nombreCompleto);
        ids.push(target.id);
      }
    }

    this.save();
    return {
      asignaturas: creadas,
      ids,
      ces: datos.competenciasEspecificas.length,
      criterios: n,
      pesosAjustados: typeof datos.criterios[0].peso !== 'number'
    };
  },

  // Importa una rúbrica generada por una IA (formato "rubrica-evalcrit", ver §14
  // del SSOT). `claseId` fija la asignatura y, con ella, los códigos de criterio.
  // Lanza Error con un mensaje en castellano si algo no cuadra: en ese caso no
  // se importa nada.
  importarRubrica(datos, claseId, periodo) {
    if (!datos || datos.tipo !== 'rubrica-evalcrit' || datos.version !== 1) {
      throw new Error('El texto no es una rúbrica Evalora válida (debe empezar por "tipo": "rubrica-evalcrit").');
    }
    const titulo = String(datos.titulo || '').trim();
    if (!titulo) throw new Error('La rúbrica no tiene título.');

    const items = Array.isArray(datos.items) ? datos.items : [];
    if (!items.length) throw new Error('La rúbrica no trae ningún ítem.');

    const nivel = String(datos.nivel || '').trim();
    const asig = Calc.asignaturaDeNivel(claseId, nivel);
    if (!asig) throw new Error('Esta clase no tiene una asignatura asociada con currículo.');

    const porCodigo = {};
    this.db.criterios
      .filter(c => c.asignaturaId === asig.id)
      .forEach(c => { porCodigo[String(c.codigo).trim().toLowerCase()] = c.id; });

    const vistos = new Set();
    const desconocidos = new Set();
    const apartados = items.map((it, i) => {
      const nombre = String((it && it.criterio) || '').trim();
      if (!nombre) throw new Error(`El ítem ${i + 1} no tiene nombre en el campo "criterio".`);
      if (vistos.has(nombre.toLowerCase())) throw new Error(`El ítem «${nombre}» está repetido.`);
      vistos.add(nombre.toLowerCase());

      const peso = Number(it.peso);
      if (!isFinite(peso) || peso <= 0) throw new Error(`El ítem «${nombre}» necesita un "peso" mayor que 0.`);

      const niveles = (Array.isArray(it.niveles) ? it.niveles : [])
        .filter(n => n && isFinite(Number(n.pct)))
        .map(n => ({ pct: Number(n.pct), descriptor: String(n.descriptor || '').trim() }))
        .sort((a, b) => a.pct - b.pct);
      if (niveles.length < 2) throw new Error(`El ítem «${nombre}» necesita al menos 2 niveles.`);

      const codigos = Array.isArray(it.criterios) ? it.criterios : [];
      const criterioIds = [];
      for (const cod of codigos) {
        const limpio = String(cod).trim();
        const id = porCodigo[limpio.toLowerCase()];
        if (id && !criterioIds.includes(id)) criterioIds.push(id);
        else if (!id && limpio) desconocidos.add(limpio);
      }
      return { id: Utils.uid(), orden: i + 1, descripcion: nombre, maxPts: 100, criterioIds, peso, niveles };
    });

    if (desconocidos.size) {
      throw new Error(`Estos criterios no existen en ${asig.nombre}: ${[...desconocidos].join(', ')}. ` +
        'Pídele a la IA que use solo los códigos de la lista, o créalos en la vista Currículo.');
    }
    const sinCriterios = apartados.filter(a => !a.criterioIds.length);
    if (sinCriterios.length) {
      throw new Error(`Estos ítems no indican ningún criterio: ${sinCriterios.map(a => a.descripcion).join(', ')}.`);
    }

    const instrumento = {
      id: Utils.uid(),
      claseId,
      tipo: 'Rúbrica',
      titulo,
      fecha: Utils.hoy(),
      periodo: periodo || 'T1',
      saberes: String(datos.saberes || ''),
      unidad: String(datos.unidad || '').trim(),
      nivel,
      // Escala por defecto: la del primer ítem. Cada ítem guarda además la suya.
      niveles: apartados[0].niveles.map(n => ({ pct: n.pct, descriptor: n.descriptor })),
      apartados,
      criteriosModo: 'desglosado',
      criterioIdsGlobal: []
    };
    this.db.instrumentos.push(instrumento);
    this.save();
    return { id: instrumento.id, titulo, items: apartados.length };
  },

  demoSeed() {
    const db = this.defaults();
    const g = { id: Utils.uid(), nombre: '3ºA', etapa: 'Primaria' };
    db.grupos.push(g);
    const nombres = [
      ['García', 'Lucía'], ['López', 'Mateo'], ['Martínez', 'Sofía'],
      ['Sánchez', 'Hugo'], ['Fernández', 'María'], ['Pérez', 'Daniel']
    ];
    for (const [ape, nom] of nombres) {
      db.alumnos.push({ id: Utils.uid(), nombre: nom, apellidos: ape, grupoId: g.id });
    }
    const mat = { id: Utils.uid(), nombre: 'Matemáticas', etapa: 'Primaria' };
    db.asignaturas.push(mat);
    const clase = { id: Utils.uid(), asignaturaId: mat.id, grupoId: g.id };
    db.clases.push(clase);
    const ce1 = { id: Utils.uid(), asignaturaId: mat.id, codigo: 'CE1', descripcion: 'Resuelve problemas de la vida cotidiana' };
    const ce2 = { id: Utils.uid(), asignaturaId: mat.id, codigo: 'CE2', descripcion: 'Razona y argumenta matemáticamente' };
    db.competenciasEspecificas.push(ce1, ce2);
    const c1 = { id: Utils.uid(), asignaturaId: mat.id, codigo: 'MAT 1.1', descripcion: 'Resuelve problemas de suma y resta', peso: 50, espIds: [ce1.id], claveIds: ['cc-stem'] };
    const c2 = { id: Utils.uid(), asignaturaId: mat.id, codigo: 'MAT 2.1', descripcion: 'Domina las tablas de multiplicar', peso: 25, espIds: [ce1.id], claveIds: [] };
    const c3 = { id: Utils.uid(), asignaturaId: mat.id, codigo: 'MAT 2.2', descripcion: 'Explica el proceso seguido', peso: 25, espIds: [ce2.id], claveIds: ['cc-ccl'] };
    db.criterios.push(c1, c2, c3);
    const ap1 = { id: Utils.uid(), orden: 1, descripcion: 'Problemas escritos', maxPts: 4, criterioIds: [c1.id] };
    const ap2 = { id: Utils.uid(), orden: 2, descripcion: 'Tablas de multiplicar', maxPts: 2, criterioIds: [c2.id] };
    const ap3 = { id: Utils.uid(), orden: 3, descripcion: 'Explicación oral o escrita', maxPts: 2, criterioIds: [c3.id] };
    const inst = {
      id: Utils.uid(), claseId: clase.id, tipo: 'Control', titulo: 'Control de prueba',
      fecha: Utils.hoy(), periodo: 'T1', saberes: '', niveles: [], apartados: [ap1, ap2, ap3]
    };
    db.instrumentos.push(inst);
    const valores = [
      [3.5, 2, 1], [4, 1, 2], [2, 0.5, 1], [3, 1.5, 2], [4, 2, 2], [1.5, 1, 0]
    ];
    const reg = {};
    db.alumnos.forEach((al, i) => {
      reg[al.id] = {};
      inst.apartados.forEach((ap, j) => { reg[al.id][ap.id] = valores[i % valores.length][j]; });
    });
    db.registros[inst.id] = reg;
    this.db = db;
    this.save();
  }
};
