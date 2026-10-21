const Storage = {
  KEY: 'evalcrit:data',
  // Copia del estado anterior a una importación, para poder deshacerla:
  // importar reemplaza TODOS los datos (ver «Copia de seguridad» más abajo).
  KEY_PREVIA: 'evalcrit:preimport',
  // Días sin copia de seguridad a partir de los cuales se avisa en Inicio.
  DIAS_COPIA: 7,
  db: null,

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
      registros: {}
    };
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
    const dot = document.getElementById('estado-guardado');
    if (dot) {
      dot.classList.add('guardando');
      setTimeout(() => dot.classList.remove('guardando'), 400);
    }
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

  async guardar() {
    // Guarda siempre en el mismo fichero (evalcrit.json) dentro de la carpeta
    // de backups elegida: sobrescribe, evitando amontonar archivos.
    const contenido = JSON.stringify(this.db, null, 2);
    if (!this.puedeCarpeta()) return this.exportar();
    let dir = await this.idbLeer('dir');
    if (!dir) dir = await this.elegirCarpetaBackup();
    if (!dir) return false; // el usuario canceló
    let perm = 'granted';
    if (dir.queryPermission) perm = await dir.queryPermission({ mode: 'readwrite' });
    if (perm !== 'granted' && dir.requestPermission) {
      perm = await dir.requestPermission({ mode: 'readwrite' });
    }
    if (perm !== 'granted') {
      // Sin permiso: caemos al export normal para no perder nada.
      return this.exportar();
    }
    try {
      const fh = await dir.getFileHandle('evalcrit.json', { create: true });
      const w = await fh.createWritable();
      await w.write(contenido);
      await w.close();
      this.marcarCopia();
      UI.toast('Guardado en «' + dir.name + '/evalcrit.json»');
      return true;
    } catch (e) {
      if (e && e.name === 'AbortError') return false;
      console.error(e);
      return this.exportar();
    }
  },

  async exportar() {
    const contenido = JSON.stringify(this.db, null, 2);
    const nombre = `backup-${Utils.fechaLegible()}-${Utils.horaCorta()}.json`;
    let destino = '';
    try {
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
          types: [{ description: 'Backup EvalCrit (JSON)', accept: { 'application/json': ['.json'] } }]
        });
        const w = await fh.createWritable();
        await w.write(contenido);
        await w.close();
        destino = `«${fh.name}»`;
      }
    } catch (e) {
      if (e && e.name === 'AbortError') return false;
      console.error(e);
    }
    if (!destino) {
      const blob = new Blob([contenido], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = nombre;
      document.body.appendChild(a);
      a.click();
      a.remove();
      destino = 'Descargas';
    }
    this.marcarCopia();
    UI.toast(destino === 'Descargas'
      ? 'Backup en Descargas: cópialo a la carpeta backups/ del proyecto'
      : `Backup guardado en ${destino}`);
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
    if (!db.meta || typeof db.meta !== 'object') db.meta = { ultimaExportacion: null };
    if (db.meta.cambiosSinCopia == null) db.meta.cambiosSinCopia = false;
    db.grupos.forEach(g => { if (g.etapa == null) g.etapa = ''; });
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
      if (m.unidad == null) m.unidad = '';
      if (m.criteriosModo == null) m.criteriosModo = 'desglosado';
      if (!Array.isArray(m.niveles)) m.niveles = [];
      if (!Array.isArray(m.criterioCodesGlobal)) m.criterioCodesGlobal = [];
      if (!m.origen || typeof m.origen !== 'object') m.origen = {};
      if (!Array.isArray(m.apartados)) m.apartados = [];
      m.apartados.forEach(ap => {
        if (!Array.isArray(ap.criterioCodes)) ap.criterioCodes = [];
        if (!Array.isArray(ap.niveles)) ap.niveles = [];
      });
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

  // --- Banco de instrumentos (D-48) ---
  // Guarda un instrumento del curso como molde reutilizable. Devuelve el molde.
  guardarEnBanco(inst) {
    if (!Array.isArray(this.db.bancoInstrumentos)) this.db.bancoInstrumentos = [];
    const molde = Calc.moldeDeInstrumento(this.db, inst);
    this.db.bancoInstrumentos.push(molde);
    this.save();
    return molde;
  },

  borrarDelBanco(moldeId) {
    this.db.bancoInstrumentos = (this.db.bancoInstrumentos || []).filter(m => m.id !== moldeId);
    this.save();
  },

  // Crea un instrumento nuevo en `claseId` a partir de un molde del banco. Si
  // algún criterio del molde no existe en el currículo de destino, no crea nada
  // y devuelve esa lista en `faltan`.
  anadirDesdeBanco(moldeId, claseId, nivel, periodo) {
    const molde = (this.db.bancoInstrumentos || []).find(m => m.id === moldeId);
    if (!molde) return { faltan: ['(el molde ya no está en el banco)'] };
    const r = Calc.instrumentoDesdeMolde(molde, claseId, nivel, periodo);
    if (r.faltan.length) return { faltan: r.faltan, molde };
    this.db.instrumentos.push(r.inst);
    this.save();
    return { inst: r.inst, faltan: [], molde };
  },

  importarCurriculo(datos, opciones) {
    if (!datos || datos.tipo !== 'curriculo-evalcrit' || datos.version !== 1) {
      throw new Error('El archivo no es una plantilla de currículo EvalCrit válida');
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
      throw new Error('El texto no es una rúbrica EvalCrit válida (debe empezar por "tipo": "rubrica-evalcrit").');
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
