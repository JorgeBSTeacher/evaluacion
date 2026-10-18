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

  // --- Banco de instrumentos (D-48) ---
  // Un «molde» es la plantilla de un instrumento (título, tipo, apartados y
  // criterios) guardada para reutilizarla en otra clase o en el curso siguiente.
  // Guarda los criterios por CÓDIGO, no por id: así el molde sigue siendo válido
  // aunque su asignatura de origen desaparezca, y los ids reales los pone el
  // currículo de la clase de destino al añadirlo.

  // Molde a partir de un instrumento ya guardado. `db` explícito para poder
  // probarlo sin depender del estado global.
  moldeDeInstrumento(db, inst) {
    const porId = {};
    (db.criterios || []).forEach(c => { porId[c.id] = c; });
    const codigos = ids => [...new Set((ids || [])
      .map(id => (porId[id] || {}).codigo)
      .filter(Boolean))];
    const clase = (db.clases || []).find(c => c.id === inst.claseId);
    const asig = clase ? (db.asignaturas || []).find(a => a.id === clase.asignaturaId) : null;
    return {
      id: Utils.uid(),
      titulo: inst.titulo || '',
      tipo: inst.tipo || 'Control',
      unidad: inst.unidad || '',
      saberes: inst.saberes || '',
      url: inst.url || '',
      niveles: (inst.niveles || []).map(n => ({ pct: n.pct, descriptor: n.descriptor })),
      criteriosModo: inst.criteriosModo || 'desglosado',
      criterioCodesGlobal: codigos(inst.criterioIdsGlobal),
      apartados: (inst.apartados || []).map(ap => ({
        descripcion: ap.descripcion || '',
        maxPts: ap.maxPts,
        peso: ap.peso,
        niveles: (ap.niveles || []).map(n => ({ pct: n.pct, descriptor: n.descriptor })),
        criterioCodes: codigos(ap.criterioIds)
      })),
      origen: {
        asignaturaId: asig ? asig.id : '',
        asignatura: asig ? asig.nombre : '',
        etapa: asig ? (asig.etapa || '') : '',
        guardadoEn: Utils.hoy()
      }
    };
  },

  // Instrumento nuevo a partir de un molde del banco, para la clase y el nivel
  // indicados. Los códigos se resuelven contra el currículo de destino por
  // código EXACTO (la numeración cambia entre ciclos; para reapuntar entre
  // ciclos está «Duplicar» con el nivel). Devuelve { inst, faltan }: si `faltan`
  // no está vacío, NO debe crearse el instrumento.
  instrumentoDesdeMolde(molde, claseId, nivel, periodo) {
    const asig = this.asignaturaDeNivel(claseId, nivel || '');
    const faltan = [];
    const porCodigo = {};
    if (asig) {
      Storage.db.criterios
        .filter(c => c.asignaturaId === asig.id)
        .forEach(c => { porCodigo[String(c.codigo).trim().toLowerCase()] = c.id; });
    }
    const resolver = codigos => {
      const ids = [];
      (codigos || []).forEach(cod => {
        const id = porCodigo[String(cod).trim().toLowerCase()];
        if (id) { if (ids.indexOf(id) === -1) ids.push(id); }
        else if (faltan.indexOf(cod) === -1) faltan.push(cod);
      });
      return ids;
    };
    const apartados = (molde.apartados || []).map((ap, i) => ({
      id: Utils.uid(),
      orden: i + 1,
      descripcion: ap.descripcion || '',
      maxPts: ap.maxPts,
      peso: ap.peso,
      niveles: (ap.niveles || []).map(n => ({ pct: n.pct, descriptor: n.descriptor })),
      criterioIds: resolver(ap.criterioCodes)
    }));
    const inst = {
      id: Utils.uid(),
      claseId,
      tipo: molde.tipo || 'Control',
      titulo: molde.titulo || '',
      fecha: Utils.hoy(),
      periodo: periodo || 'T1',
      saberes: molde.saberes || '',
      unidad: molde.unidad || '',
      url: molde.url || '',
      nivel: this.nivelNorm(nivel || ''),
      niveles: (molde.niveles || []).map(n => ({ pct: n.pct, descriptor: n.descriptor })),
      apartados,
      criteriosModo: molde.criteriosModo || 'desglosado',
      criterioIdsGlobal: resolver(molde.criterioCodesGlobal)
    };
    return { inst, faltan };
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

  // Logro de un criterio en una lista explícita de instrumentos. Extraído de
  // logroCriterio para poder analizar un alcance arbitrario (D-59): filtrar por
  // unidad, por instrumento concreto o por todo el curso.
  logroCriterioEnInsts(criterioId, claseId, alumnoId, insts) {
    const aplicables = (insts || []).filter(i =>
      this.instrumentoParaAlumno(i, claseId, alumnoId) && (
        (i.criteriosModo || 'desglosado') === 'global'
          ? (i.criterioIdsGlobal || []).includes(criterioId)
          : i.apartados.some(ap => ap.criterioIds.includes(criterioId))
      )
    );
    const logros = [];
    for (const inst of aplicables) {
      const l = this.logroCriterioEnInstrumento(inst, alumnoId, criterioId);
      if (l != null) logros.push(l);
    }
    if (!logros.length) return null;
    return logros.reduce((a, b) => a + b, 0) / logros.length;
  },

  logroCriterio(criterioId, claseId, alumnoId, periodo) {
    return this.logroCriterioEnInsts(criterioId, claseId, alumnoId,
      this.instrumentosDeClase(claseId, periodo));
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

  // === Análisis para la pestaña Informe (D-59) ===
  // Solo lectura sobre datos existentes. No modifican db ni Storage.

  // Instrumentos de una clase filtrados por alcance.
  // `filtros` = { periodo, unidad, instrumentoId } — todos opcionales.
  instrumentosAlcance(claseId, filtros) {
    const f = filtros || {};
    let insts = this.instrumentosDeClase(claseId, f.periodo);
    if (f.unidad) insts = insts.filter(i => i.unidad === f.unidad);
    if (f.instrumentoId) insts = insts.filter(i => i.id === f.instrumentoId);
    return insts;
  },

  // Media de la clase para un criterio en un alcance. Devuelve 0–1 o null.
  mediaClaseCriterio(criterioId, claseId, insts) {
    const alumnos = this.alumnosDeClase(claseId);
    const valores = alumnos
      .map(a => this.logroCriterioEnInsts(criterioId, claseId, a.id, insts))
      .filter(v => v != null);
    if (!valores.length) return null;
    return valores.reduce((s, v) => s + v, 0) / valores.length;
  },

  // Nota global (0–10) de un alumno en un alcance de instrumentos.
  notaEnInsts(claseId, alumnoId, insts) {
    const criterios = this.criteriosDeAlumno(claseId, alumnoId);
    let suma = 0, pesos = 0;
    for (const c of criterios) {
      const l = this.logroCriterioEnInsts(c.id, claseId, alumnoId, insts);
      if (l == null) continue;
      suma += l * c.peso;
      pesos += c.peso;
    }
    if (pesos <= 0) return null;
    return (suma / pesos) * 10;
  },

  // Datos para la tabla de criterios (absoluto × relativo) de la pestaña Informe.
  // Para cada criterio: media de la clase y, por alumno, logro + estado absoluto
  // (≥50%) y relativo (≥ media de clase). `criterios` los decide la vista.
  tablaCriteriosInforme(claseId, insts, criterios) {
    const alumnos = this.alumnosDeClase(claseId);
    return (criterios || []).map(c => {
      const media = this.mediaClaseCriterio(c.id, claseId, insts);
      const filas = alumnos.map(a => {
        const logro = this.logroCriterioEnInsts(c.id, claseId, a.id, insts);
        return {
          alumno: a,
          logro,
          absoluto: logro == null ? null : logro >= 0.5,
          relativo: (logro == null || media == null) ? null : logro >= media
        };
      });
      return { criterio: c, media, filas };
    });
  },

  // Reglas de detección para la pestaña Informe. `criterios` los decide la vista
  // (según el nivel ACI seleccionado). Devuelve hallazgos ordenados por
  // severidad: críticos primero, luego atención, por porcentaje descendente.
  hallazgos(claseId, insts, criterios) {
    const alumnos = this.alumnosDeClase(claseId);
    const UMB = { critico: 50, atencion: 30, fallosPregunta: 50 };
    const salida = [];

    // Regla 1: criterios con alto porcentaje de alumnos por debajo del 50%.
    for (const c of criterios || []) {
      const logros = alumnos
        .map(a => this.logroCriterioEnInsts(c.id, claseId, a.id, insts))
        .filter(v => v != null);
      if (logros.length < 2) continue;
      const pct = Math.round(logros.filter(v => v < 0.5).length / logros.length * 100);
      const ref = `«${c.codigo} — ${c.descripcion}»`;
      if (pct >= UMB.critico) {
        salida.push({
          nivel: 'critico', tipo: 'criterio', criterioId: c.id,
          codigo: c.codigo, pct,
          texto: `${pct}% de la clase por debajo del 50% en ${ref}`
        });
      } else if (pct >= UMB.atencion) {
        salida.push({
          nivel: 'atencion', tipo: 'criterio', criterioId: c.id,
          codigo: c.codigo, pct,
          texto: `${pct}% de la clase por debajo del 50% en ${ref}`
        });
      }
    }

    // Regla 2: preguntas (apartados) con alto índice de fallos.
    for (const inst of insts || []) {
      const alumnosAp = this.alumnosDeInstrumento(inst);
      for (const ap of inst.apartados || []) {
        const notas = alumnosAp
          .map(a => ((Storage.db.registros[inst.id] || {})[a.id] || {})[ap.id])
          .filter(v => v != null && v !== '' && !isNaN(v))
          .map(Number);
        if (notas.length < 2) continue;
        const max = inst.tipo === 'Rúbrica' ? 100 : Number(ap.maxPts) || 1;
        const pct = Math.round(notas.filter(v => v / max < 0.5).length / notas.length * 100);
        if (pct >= UMB.fallosPregunta) {
          salida.push({
            nivel: pct >= 80 ? 'critico' : 'atencion', tipo: 'pregunta',
            instrumentoId: inst.id, apartadoId: ap.id,
            titulo: inst.titulo, pregunta: ap.descripcion, pct,
            texto: `«${ap.descripcion}» en ${inst.titulo}: ${pct}% de fallos`
          });
        }
      }
    }

    const orden = { critico: 0, atencion: 1, bien: 2 };
    salida.sort((a, b) => (orden[a.nivel] - orden[b.nivel]) || (b.pct - a.pct));
    return salida;
  },

  // Distribución de notas (0–10) en un alcance. Devuelve buckets para el
  // histograma, la media y las notas sueltas. `nivelCodigo` (opcional) restringe
  // el alumnado: ausente = todo el grupo, '' = base, otro = ese nivel ACI.
  distribucionNotas(claseId, insts, nivelCodigo) {
    let alumnos = this.alumnosDeClase(claseId);
    if (nivelCodigo !== undefined && nivelCodigo !== null) {
      const nv = this.nivelNorm(nivelCodigo);
      alumnos = alumnos.filter(a => this.nivelDeAlumno(claseId, a.id) === nv);
    }
    const notas = alumnos
      .map(a => this.notaEnInsts(claseId, a.id, insts))
      .filter(n => n != null);
    if (!notas.length) return { notas: [], buckets: [], media: null };
    const buckets = Array.from({ length: 10 }, (_, i) => ({
      rango: `${i}–${i + 1}`, cantidad: 0
    }));
    for (const n of notas) {
      buckets[Math.min(9, Math.floor(n))].cantidad++;
    }
    const media = notas.reduce((s, n) => s + n, 0) / notas.length;
    return { notas, buckets, media };
  },

  clasif(n) {
    if (n == null || isNaN(n)) return 'na';
    return n >= 5 ? 'ok' : 'ko';
  },

  badgeHtml(n) {
    return '<span class="badge ' + this.clasif(n) + '">' + Utils.fmt(n) + '</span>';
  }
};
