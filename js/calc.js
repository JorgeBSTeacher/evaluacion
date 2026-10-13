const Calc = {
  byId(lista, id) {
    return (lista || []).find(x => x.id === id) || null;
  },

  clase(claseId) { return this.byId(Storage.db.clases, claseId); },
  asignatura(asigId) { return this.byId(Storage.db.asignaturas, asigId); },
  criterio(critId) { return this.byId(Storage.db.criterios, critId); },
  instrumento(instId) { return this.byId(Storage.db.instrumentos, instId); },
  alumno(aluId) { return this.byId(Storage.db.alumnos, aluId); },

  asignaturaDeClase(claseId) {
    const cl = this.clase(claseId);
    return cl ? this.asignatura(cl.asignaturaId) : null;
  },

  alumnosDeClase(claseId) {
    const cl = this.clase(claseId);
    if (!cl) return [];
    return Storage.db.alumnos
      .filter(a => a.grupoId === cl.grupoId)
      .sort((x, y) => (x.apellidos + x.nombre).localeCompare(y.apellidos + y.nombre, 'es'));
  },

  criteriosDeClase(claseId) {
    const asig = this.asignaturaDeClase(claseId);
    if (!asig) return [];
    return Storage.db.criterios
      .filter(c => c.asignaturaId === asig.id)
      .sort((x, y) => String(x.codigo).localeCompare(String(y.codigo), 'es'));
  },

  competenciasEspecificasDeClase(claseId) {
    return this.competenciasEspecificasDeNivel(claseId, '');
  },

  clavesDeClase(claseId) {
    return this.clavesDeNivel(claseId, '');
  },

  competenciasEspecificasDeNivel(claseId, codigo) {
    const asig = this.asignaturaDeNivel(claseId, codigo);
    if (!asig) return [];
    return Storage.db.competenciasEspecificas.filter(c => c.asignaturaId === asig.id);
  },

  clavesDeNivel(claseId, codigo) {
    const usadas = new Set();
    this.criteriosDeNivel(claseId, codigo).forEach(c => (c.claveIds || []).forEach(k => usadas.add(k)));
    return Storage.db.competenciasClave.filter(k => usadas.has(k.id));
  },

  // --- Adaptaciones curriculares (ACI) ---
  // Cada nivel ACI de una clase apunta a la asignatura (currículo) de otro curso.
  nivelesAciDeClase(claseId) {
    const cl = this.clase(claseId);
    return (cl && Array.isArray(cl.nivelesAci)) ? cl.nivelesAci : [];
  },

  nivelDeAlumno(claseId, alumnoId) {
    const cl = this.clase(claseId);
    return (cl && cl.adaptaciones && cl.adaptaciones[alumnoId]) || '';
  },

  etiquetaNivel(claseId, codigo) {
    if (!codigo || codigo === 'BASE') return 'Base';
    const n = this.nivelesAciDeClase(claseId).find(x => x.codigo === codigo);
    return n ? (n.etiqueta || n.codigo) : codigo;
  },

  asignaturaDeNivel(claseId, codigo) {
    if (codigo) {
      const n = this.nivelesAciDeClase(claseId).find(x => x.codigo === codigo);
      if (n && n.asignaturaId && this.asignatura(n.asignaturaId)) return this.asignatura(n.asignaturaId);
    }
    return this.asignaturaDeClase(claseId);
  },

  asignaturaDeAlumno(claseId, alumnoId) {
    return this.asignaturaDeNivel(claseId, this.nivelDeAlumno(claseId, alumnoId));
  },

  criteriosDeNivel(claseId, codigo) {
    const asig = this.asignaturaDeNivel(claseId, codigo);
    if (!asig) return [];
    return Storage.db.criterios
      .filter(c => c.asignaturaId === asig.id)
      .sort((x, y) => String(x.codigo).localeCompare(String(y.codigo), 'es'));
  },

  criteriosDeAlumno(claseId, alumnoId) {
    return this.criteriosDeNivel(claseId, this.nivelDeAlumno(claseId, alumnoId));
  },

  // Un instrumento sin nivel es común a todos; con nivel, solo para ese nivel
  // ('' = base, es decir, alumnado sin adaptación).
  instrumentoParaNivel(inst, codigo) {
    if (!inst || !inst.nivel) return true;
    return inst.nivel === (codigo || 'BASE');
  },

  instrumentoParaAlumno(inst, claseId, alumnoId) {
    return this.instrumentoParaNivel(inst, this.nivelDeAlumno(claseId, alumnoId));
  },

  alumnosDeInstrumento(inst) {
    return this.alumnosDeClase(inst.claseId).filter(a => this.instrumentoParaAlumno(inst, inst.claseId, a.id));
  },

  instrumentosDeAlumno(claseId, alumnoId, periodo) {
    return this.instrumentosDeClase(claseId, periodo)
      .filter(i => this.instrumentoParaAlumno(i, claseId, alumnoId));
  },

  logroCriterioEnInstrumento(inst, alumnoId, criterioId) {
    const modo = inst.criteriosModo || 'desglosado';
    const reg = (Storage.db.registros[inst.id] || {})[alumnoId] || {};
    if (modo === 'global') {
      const globalIds = inst.criterioIdsGlobal || [];
      if (globalIds.length && !globalIds.includes(criterioId)) return null;
      let obt = 0, max = 0, hay = false;
      for (const ap of inst.apartados) {
        const v = reg[ap.id];
        if (v == null || isNaN(v)) continue;
        obt += Number(v);
        max += ap.maxPts;
        hay = true;
      }
      return hay && max > 0 ? obt / max : null;
    }
    let obt = 0, max = 0, hay = false;
    for (const ap of inst.apartados) {
      if (!ap.criterioIds.includes(criterioId)) continue;
      const v = reg[ap.id];
      if (v == null || isNaN(v)) continue;
      obt += Number(v);
      max += ap.maxPts;
      hay = true;
    }
    return hay && max > 0 ? obt / max : null;
  },

  instrumentosDeClase(claseId, periodo) {
    const lista = Storage.db.instrumentos.filter(i => i.claseId === claseId);
    if (!periodo || periodo === 'Final') return lista;
    return lista.filter(i => i.periodo === periodo);
  },

  logroCriterio(criterioId, claseId, alumnoId, periodo) {
    const insts = this.instrumentosDeAlumno(claseId, alumnoId, periodo).filter(i => {
      if ((i.criteriosModo || 'desglosado') === 'global') {
        return (i.criterioIdsGlobal || []).includes(criterioId);
      }
      return i.apartados.some(ap => ap.criterioIds.includes(criterioId));
    });
    const logros = [];
    for (const inst of insts) {
      const l = this.logroCriterioEnInstrumento(inst, alumnoId, criterioId);
      if (l != null) logros.push(l);
    }
    if (!logros.length) return null;
    return logros.reduce((a, b) => a + b, 0) / logros.length;
  },

  notaPonderada(claseId, alumnoId, periodo, filtroCriterios) {
    const todos = this.criteriosDeAlumno(claseId, alumnoId);
    const criterios = filtroCriterios ? todos.filter(filtroCriterios) : todos;
    let suma = 0, pesos = 0;
    for (const c of criterios) {
      const l = this.logroCriterio(c.id, claseId, alumnoId, periodo);
      if (l == null) continue;
      suma += l * c.peso;
      pesos += c.peso;
    }
    if (pesos <= 0) return null;
    return (suma / pesos) * 10;
  },

  notaEvaluacion(claseId, alumnoId, periodo) {
    return this.notaPonderada(claseId, alumnoId, periodo, null);
  },

  notaCompetencia(claseId, alumnoId, espId, periodo) {
    return this.notaPonderada(claseId, alumnoId, periodo, c => c.espIds.includes(espId));
  },

  notaClave(claseId, alumnoId, claveId, periodo) {
    return this.notaPonderada(claseId, alumnoId, periodo, c => (c.claveIds || []).includes(claveId));
  },

  notaInstrumento(inst, alumnoId) {
    const reg = (Storage.db.registros[inst.id] || {})[alumnoId] || {};
    const esRubrica = inst.tipo === 'Rúbrica';
    if (esRubrica) {
      let suma = 0, pesos = 0;
      const niveles = (inst.niveles || []).slice().sort((a, b) => b.pct - a.pct);
      for (const ap of inst.apartados) {
        const v = reg[ap.id];
        if (v == null || isNaN(v)) continue;
        const nv = niveles.find(n => Math.abs(Number(v) - Number(n.pct)) < 1e-9);
        const pct = nv ? Number(nv.pct) : Number(v);
        const p = ap.peso == null || isNaN(ap.peso) ? 1 : Number(ap.peso);
        suma += (pct / 100) * p;
        pesos += p;
      }
      if (pesos <= 0) return null;
      return (suma / pesos) * 10;
    }
    let obt = 0, max = 0;
    for (const ap of inst.apartados) {
      const v = reg[ap.id];
      max += ap.maxPts;
      if (v != null && !isNaN(v)) obt += Number(v);
    }
    return max > 0 ? (obt / max) * 10 : null;
  },

  clasif(n) {
    if (n == null || isNaN(n)) return 'na';
    return n >= 5 ? 'ok' : 'ko';
  },

  badgeHtml(n) {
    return '<span class="badge ' + this.clasif(n) + '">' + Utils.fmt(n) + '</span>';
  }
};
