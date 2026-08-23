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
    const asig = this.asignaturaDeClase(claseId);
    if (!asig) return [];
    return Storage.db.competenciasEspecificas.filter(c => c.asignaturaId === asig.id);
  },

  clavesDeClase(claseId) {
    const usadas = new Set();
    this.criteriosDeClase(claseId).forEach(c => (c.claveIds || []).forEach(k => usadas.add(k)));
    return Storage.db.competenciasClave.filter(k => usadas.has(k.id));
  },

  logroCriterioEnInstrumento(inst, alumnoId, criterioId) {
    const reg = (Storage.db.registros[inst.id] || {})[alumnoId] || {};
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
    const insts = this.instrumentosDeClase(claseId, periodo).filter(i =>
      i.apartados.some(ap => ap.criterioIds.includes(criterioId))
    );
    const logros = [];
    for (const inst of insts) {
      const l = this.logroCriterioEnInstrumento(inst, alumnoId, criterioId);
      if (l != null) logros.push(l);
    }
    if (!logros.length) return null;
    return logros.reduce((a, b) => a + b, 0) / logros.length;
  },

  notaPonderada(claseId, alumnoId, periodo, filtroCriterios) {
    const todos = this.criteriosDeClase(claseId);
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
