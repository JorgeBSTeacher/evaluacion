const Storage = {
  KEY: 'evalcrit:data',
  db: null,

  defaults() {
    const hoy = new Date();
    const inicio = hoy.getMonth() >= 6 ? hoy.getFullYear() : hoy.getFullYear() - 1;
    return {
      schemaVersion: 1,
      cursoEscolar: `${inicio}/${inicio + 1}`,
      meta: { ultimaExportacion: null },
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

  save() {
    const dot = document.getElementById('estado-guardado');
    if (dot) {
      dot.classList.add('guardando');
      setTimeout(() => dot.classList.remove('guardando'), 400);
    }
    try {
      localStorage.setItem(this.KEY, JSON.stringify(this.db));
    } catch (e) {
      UI.toast('Error al guardar: exporta tu backup ahora');
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
    if (!dir) return; // el usuario canceló
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
      this.db.meta = this.db.meta || {};
      this.db.meta.ultimaExportacion = new Date().toISOString();
      this.save();
      UI.toast('Guardado en «' + dir.name + '/evalcrit.json»');
    } catch (e) {
      if (e && e.name === 'AbortError') return;
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
      if (e && e.name === 'AbortError') return;
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
    this.db.meta = this.db.meta || {};
    this.db.meta.ultimaExportacion = new Date().toISOString();
    this.save();
    UI.toast(destino === 'Descargas'
      ? 'Backup en Descargas: cópialo a la carpeta backups/ del proyecto'
      : `Backup guardado en ${destino}`);
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
          this.db = this.migrar(datos);
          this.save();
          resolve(true);
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
    db.grupos.forEach(g => { if (g.etapa == null) g.etapa = ''; });
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

  reiniciar() {
    try { localStorage.removeItem(this.KEY); } catch (e) {}
    this.db = this.defaults();
    this.save();
  },

  importarCurriculo(datos) {
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

    const cursos = Array.isArray(asig.cursos) && asig.cursos.length
      ? asig.cursos.map(c => String(c).trim()).filter(Boolean)
      : [''];
    const n = datos.criterios.length;
    const pesoIgual = Math.round((100 / n) * 10000) / 10000;
    const creadas = [];
    const ids = [];

    for (const curso of cursos) {
      const nombreCompleto = curso ? `${nombre} ${curso}` : nombre;
      let target = this.db.asignaturas.find(a =>
        a.nombre.toLowerCase() === nombreCompleto.toLowerCase() && (a.etapa || '') === etapa);
      if (target && this.db.competenciasEspecificas.some(e => e.asignaturaId === target.id)) {
        throw new Error(`La asignatura «${nombreCompleto}» ya tiene currículo. Elimínalo primero o renombra la asignatura en la plantilla.`);
      }
      if (!target) {
        target = { id: Utils.uid(), nombre: nombreCompleto, etapa };
        this.db.asignaturas.push(target);
      }

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
      creadas.push(nombreCompleto);
      ids.push(target.id);
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
