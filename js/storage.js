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
