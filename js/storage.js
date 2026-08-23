const Storage = {
  KEY: 'evalcrit:data',
  db: null,

  defaults() {
    return {
      schemaVersion: 1,
      cursoEscolar: '2025/2026',
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
      this.db = raw ? JSON.parse(raw) : this.defaults();
    } catch (e) {
      this.db = this.defaults();
    }
    const d = this.defaults();
    for (const k of Object.keys(d)) {
      if (this.db[k] == null) this.db[k] = d[k];
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

  exportar() {
    const blob = new Blob([JSON.stringify(this.db, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'evalcrit-backup-' + Utils.stamp() + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    UI.toast('Backup exportado');
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
          this.db = datos;
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

    let target = this.db.asignaturas.find(a =>
      a.nombre.toLowerCase() === nombre.toLowerCase() && (a.etapa || '') === etapa);
    if (target && this.db.competenciasEspecificas.some(e => e.asignaturaId === target.id)) {
      throw new Error(`La asignatura «${nombre}» ya tiene currículo. Elimínalo primero o renombra la asignatura en la plantilla.`);
    }
    if (!target) {
      target = { id: Utils.uid(), nombre, etapa };
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

    const n = datos.criterios.length;
    const pesoIgual = Math.round((100 / n) * 10000) / 10000;
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

    this.save();
    return {
      asignaturaId: target.id,
      asignatura: `${nombre}${etapa ? ` (${etapa})` : ''}`,
      ces: datos.competenciasEspecificas.length,
      criterios: n,
      pesosAjustados: typeof datos.criterios[0].peso !== 'number'
    };
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
