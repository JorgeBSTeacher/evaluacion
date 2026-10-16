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

  // Unifica la forma de un código de nivel: sin espacios y en mayúsculas, y
  // «BASE» se trata como base interna (''). Es la ÚNICA forma de comparar
  // códigos en todo el programa: si no se normaliza, un «b» tecleado por el
  // docente no casaría con el nivel «B» guardado y el alumnado desaparecería.
  nivelNorm(codigo) {
    const v = String(codigo == null ? '' : codigo).trim().toUpperCase();
    return v === 'BASE' ? '' : v;
  },

  nivelesAciDeClase(claseId) {
    const cl = this.clase(claseId);
    const arr = (cl && Array.isArray(cl.nivelesAci)) ? cl.nivelesAci : [];
    // Se devuelven con el código normalizado (y sin códigos vacíos) para que
    // todas las vistas y comparaciones usen la misma forma.
    return arr
      .map(n => Object.assign({}, n, { codigo: this.nivelNorm(n.codigo) }))
      .filter(n => n.codigo);
  },

  nivelDeAlumno(claseId, alumnoId) {
    const cl = this.clase(claseId);
    const c = this.nivelNorm((cl && cl.adaptaciones && cl.adaptaciones[alumnoId]) || '');
    if (!c) return '';
    // Si el código no corresponde a ningún nivel definido (p. ej. un nivel
    // borrado), el alumnado cae a base: mejor corregido contra el currículo de
    // su clase que desaparecido de la cuadrícula y del informe.
    return this.nivelesAciDeClase(claseId).some(n => n.codigo === c) ? c : '';
  },

  etiquetaNivel(claseId, codigo) {
    const c = this.nivelNorm(codigo);
    if (!c) return 'Base';
    const n = this.nivelesAciDeClase(claseId).find(x => x.codigo === c);
    return n ? (n.etiqueta || n.codigo) : c;
  },

  asignaturaDeNivel(claseId, codigo) {
    const c = this.nivelNorm(codigo);
    if (c) {
      const n = this.nivelesAciDeClase(claseId).find(x => x.codigo === c);
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

  // --- Criterios de un instrumento frente al currículo de su nivel ACI ---
  // Un instrumento con nivel solo debe evaluar criterios de SU currículo; si
  // apunta a otro (p. ej. una copia de examen paralelo), sus notas no salen en
  // el informe. Estas helpers lo detectan y lo corrigen.

  // Clave numérica de un criterio: «MAT.TC.2.2» → «2.2». La numeración es la
  // misma en todos los ciclos (es el criterio oficial adaptado), así que sirve
  // para reconocer el criterio equivalente de otro currículo.
  claveCriterio(codigo) {
    const m = String(codigo == null ? '' : codigo).match(/(\d+(?:\.\d+)+)\s*$/);
    return m ? m[1] : '';
  },

  // Nivel ACI (con su currículo) dentro de un `db` concreto. Devuelve null si el
  // código es vacío/BASE, si el nivel no existe o si su asignatura ya no está.
  nivelAciEn(db, claseId, codigo) {
    const c = this.nivelNorm(codigo);
    if (!c) return null;
    const cl = (db.clases || []).find(x => x.id === claseId);
    if (!cl) return null;
    const n = (cl.nivelesAci || [])
      .map(x => Object.assign({}, x, { codigo: this.nivelNorm(x.codigo) }))
      .find(x => x.codigo === c);
    if (!n || !n.asignaturaId) return null;
    return (db.asignaturas || []).some(a => a.id === n.asignaturaId) ? n : null;
  },

  // Ids de criterio de un instrumento que NO pertenecen al currículo de su
  // nivel ACI. Los instrumentos comunes (sin nivel) no tienen currículo propio.
  criteriosFueraDeNivel(db, inst) {
    if (!inst) return [];
    const nv = this.nivelAciEn(db, inst.claseId, inst.nivel);
    if (!nv) return [];
    const porId = {};
    (db.criterios || []).forEach(c => { porId[c.id] = c; });
    const fuera = [];
    const mirar = ids => (ids || []).forEach(id => {
      const c = porId[id];
      if (c && c.asignaturaId !== nv.asignaturaId) fuera.push(id);
    });
    mirar(inst.criterioIdsGlobal);
    (inst.apartados || []).forEach(ap => mirar(ap.criterioIds));
    return [...new Set(fuera)];
  },

  // Reapunta los criterios de un instrumento al currículo de su nivel ACI,
  // emparejando por número de criterio («MAT.TC.2.2» ↔ «MAT.SC.2.2»). Las notas
  // cuelgan del apartado, no del criterio, así que no se pierde ninguna.
  // Devuelve true si cambió algo. Si un criterio no tiene equivalente, se deja
  // el bloque tal cual (mejor visible que reapuntado a medias).
  repararCriteriosDeInstrumento(db, inst) {
    if (!inst) return false;
    if (!this.criteriosFueraDeNivel(db, inst).length) return false;
    const nv = this.nivelAciEn(db, inst.claseId, inst.nivel);
    const porId = {};
    (db.criterios || []).forEach(c => { porId[c.id] = c; });
    const destino = {};   // clave de criterio → id dentro del currículo del nivel
    (db.criterios || []).filter(c => c.asignaturaId === nv.asignaturaId).forEach(c => {
      const k = this.claveCriterio(c.codigo);
      if (k && destino[k] == null) destino[k] = c.id;
    });
    const remapear = ids => {
      const salida = [];
      let cambio = false;
      for (const id of (ids || [])) {
        const c = porId[id];
        if (!c || c.asignaturaId === nv.asignaturaId) {
          if (salida.indexOf(id) === -1) salida.push(id);
          continue;
        }
        const k = this.claveCriterio(c.codigo);
        const nuevo = k ? destino[k] : null;
        if (!nuevo) return { ok: false };
        if (salida.indexOf(nuevo) === -1) salida.push(nuevo);
        cambio = true;
      }
      return { ok: true, ids: salida, cambio };
    };
    let cambio = false;
    const g = remapear(inst.criterioIdsGlobal);
    if (g.ok && g.cambio) { inst.criterioIdsGlobal = g.ids; cambio = true; }
    (inst.apartados || []).forEach(ap => {
      const a = remapear(ap.criterioIds);
      if (a.ok && a.cambio) { ap.criterioIds = a.ids; cambio = true; }
    });
    return cambio;
  },

  // Repasa todos los instrumentos de un `db` (al cargar o importar un backup).
  // Devuelve cuántos ha corregido.
  repararCriteriosDeInstrumentos(db) {
    let n = 0;
    (db.instrumentos || []).forEach(inst => { if (this.repararCriteriosDeInstrumento(db, inst)) n++; });
    return n;
  },

  // Un instrumento sin nivel es común a todos; con nivel, solo para ese nivel
  // ('' o 'BASE' = base, es decir, alumnado sin adaptación).
  instrumentoParaNivel(inst, codigo) {
    if (!inst || !inst.nivel) return true;
    return this.nivelNorm(inst.nivel) === this.nivelNorm(codigo);
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

  // Cuánto falta por corregir de un instrumento: alumnado asignado que todavía
  // tiene algún apartado sin nota. Lo que se deja en blanco se cuenta como
  // pendiente (una ausencia también queda en blanco, y así se ve).
  progresoInstrumento(inst) {
    if (!inst) return { hechos: 0, total: 0, pendientes: 0 };
    const alumnos = this.alumnosDeInstrumento(inst);
    const registros = (Storage.db.registros || {})[inst.id] || {};
    let hechos = 0;
    if (inst.apartados && inst.apartados.length) {
      alumnos.forEach(a => {
        const fila = registros[a.id] || {};
        const completo = inst.apartados.every(ap => {
          const v = fila[ap.id];
          return v !== undefined && v !== null && v !== '';
        });
        if (completo) hechos++;
      });
    }
    return { hechos, total: alumnos.length, pendientes: alumnos.length - hechos };
  },

  // Instrumentos de una clase ordenados para corregir: lo que más falta tiene
  // primero y, a igualdad, lo más reciente.
  instrumentosPorCorregir(claseId) {
    return this.instrumentosDeClase(claseId)
      .map(i => ({ i, p: this.progresoInstrumento(i) }))
      .sort((a, b) => (b.p.pendientes - a.p.pendientes)
        || String(b.i.fecha || '').localeCompare(String(a.i.fecha || '')))
      .map(x => x.i);
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

  // Niveles aplicables a un ítem de rúbrica: los propios si los define, si no los
  // de la escala común del instrumento. Siempre de menor a mayor
  // (nivel 1 = más bajo … nivel N = más alto).
  nivelesDeApartado(inst, ap) {
    const comunes = (inst && inst.niveles) || [];
    const propios = (ap && Array.isArray(ap.niveles))
      ? ap.niveles.filter(n => n && !isNaN(Number(n.pct)))
      : [];
    const base = propios.length ? propios : comunes;
    return base.slice().sort((a, b) => Number(a.pct) - Number(b.pct));
  },

  // Etiquetas de unidad didáctica presentes en una lista de instrumentos, ordenadas alfabéticamente.
  unidadesDe(insts) {
    return [...new Set((insts || []).map(i => i.unidad).filter(Boolean))]
      .sort((a, b) => String(a).localeCompare(String(b), 'es'));
  },

  // Instrumentos de una unidad concreta. `unidad` vacío o nulo = todos.
  instrumentosDeUnidad(insts, unidad) {
    if (!unidad) return insts || [];
    return (insts || []).filter(i => i.unidad === unidad);
  },

  // Unidades didácticas ya usadas en una asignatura (todas sus clases). Sirve
  // para sugerirlas al escribir: una UD1 de 6ºA se ofrece también en 6ºB.
  unidadesDeAsignatura(asigId) {
    const clases = Storage.db.clases.filter(c => c.asignaturaId === asigId).map(c => c.id);
    return this.unidadesDe(Storage.db.instrumentos.filter(i => clases.indexOf(i.claseId) !== -1));
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
      for (const ap of inst.apartados) {
        const v = reg[ap.id];
        if (v == null || isNaN(v)) continue;
        const niveles = this.nivelesDeApartado(inst, ap);
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
