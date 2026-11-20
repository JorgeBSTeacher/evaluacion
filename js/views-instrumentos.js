const InstrumentosView = (() => {
  let claseSel = null;
  let perSel = 'Todos';           // 'Todos' | 'T1' | 'T2' | 'T3'
  // Claves «periodo::unidad» de los bloques que el usuario ha desplegado.
  // El conjunto vacío significa «todos cerrados».
  const udsAbiertas = new Set();
  const TIPOS = ['Control', 'Rúbrica', 'Proyecto', 'Otro'];
  const PERIODOS = ['T1', 'T2', 'T3'];
  const NIVELES_ESTANDAR = [{ pct: 25 }, { pct: 50 }, { pct: 75 }, { pct: 100 }];

  // Sugerencias para el campo «Unidad»: un <datalist> editable (sugiere, no
  // obliga). Recoge las unidades ya usadas en toda la asignatura; si todavía no
  // hay ninguna, devuelve cadena vacía y el campo queda como texto libre.
  function datalistUnidades(asigId) {
    const us = Calc.unidadesDeAsignatura(asigId);
    if (!us.length) return '';
    return `<datalist id="lista-unidades">${us
      .map(u => `<option value="${Utils.esc(u)}"></option>`).join('')}</datalist>`;
  }

  function instrumentosDe() {
    return Storage.db.instrumentos
      .filter(i => i.claseId === claseSel)
      .sort((a, b) => (String(a.unidad || '').localeCompare(String(b.unidad || ''), 'es'))
        || (a.fecha || '').localeCompare(b.fecha || ''));
  }

  // M-10: explicación completa de un nivel de evaluación para el `title` de sus
  // badges. Base: el currículo ordinario del curso; ACI: el currículo del curso
  // al que apunta la adaptación (puede ser otro curso y otra asignatura).
  // Duplicado a propósito en views-informe.js: las superficies de edición no
  // permiten un módulo común y es una función pura de 5 líneas.
  function titleNivel(claseId, codigo) {
    const nv = Calc.nivelNorm(codigo);
    if (!nv) return 'Currículo del curso de la asignatura';
    const asig = (Calc.asignaturaDeNivel(claseId, nv) || {}).nombre || '';
    if (!asig) return 'Nivel ACI ' + Calc.etiquetaNivel(claseId, nv);
    return 'Nivel ACI ' + Calc.etiquetaNivel(claseId, nv) + ': se evalúa con el currículo de ' + asig;
  }

  // Media de las notas corregidas de un instrumento (la misma cuenta que usa
  // la fila del listado). sinNotaEsCero (D-74b): false (por defecto) = solo
  // promedia los alumnos con nota; true = el vacio vale 0. Un alumno tiene
  // nota si algun apartado tiene valor en su registro (notaInstrumento
  // devuelve 0 tanto para "todo a 0" como para "sin nota"); quien esta
  // excluido («no realiza esta evaluacion») nunca tiene nota.
  function mediaDeInstrumento(i) {
    const sinNotaEsCero = !!(Storage.db && Storage.db.configuracion && Storage.db.configuracion.sinNotaEsCero);
    const tieneNota = (alumnoId) => {
      const fila = ((Storage.db.registros && Storage.db.registros[i.id]) || {})[alumnoId];
      if (!fila || fila.noRealiza === true) return false;
      return !!(i.apartados && i.apartados.some(ap => fila[ap.id] != null && fila[ap.id] !== ''));
    };
    const notas = Calc.alumnosDeInstrumento(i)
      .map(a => (tieneNota(a.id) ? Calc.notaInstrumento(i, a.id) : (sinNotaEsCero ? 0 : null)))
      .filter(n => n != null);
    return notas.length ? notas.reduce((x, y) => x + y, 0) / notas.length : null;
  }

  // Celdas compartidas de las filas de instrumento (título con enlace, la
  // pareja nivel · unidad y las 2 acciones) para no duplicar su HTML entre la
  // fila normal y la fila de un título único dentro de un bloque con variantes.
  function celdaTitulo(i) {
    const url = Utils.urlPintable(i.url);
    return url
      ? `<a href="${Utils.esc(url)}" target="_blank" rel="noopener" title="Enlace del instrumento: ${Utils.esc(url)}"><b>${Utils.esc(i.titulo)}</b></a>`
      : `<b>${Utils.esc(i.titulo)}</b>`;
  }
  function celdaNivelUnidad(i) {
    const nivelTxt = i.nivel ? Calc.etiquetaNivel(i.claseId, i.nivel) : '';
    return `${nivelTxt ? `<span class="badge info" title="${Utils.esc(titleNivel(i.claseId, i.nivel))}">${Utils.esc(nivelTxt)}</span> ` : ''}${i.unidad ? `<span class="badge na">${Utils.esc(i.unidad)}</span>` : ''}${!nivelTxt && !i.unidad ? '<span style="color:var(--tinta-suave)">—</span>' : ''}`;
  }
  function celdaAcciones(i) {
    return `<div class="acciones">
          <button class="btn btn-mini btn-primario corregir">Corregir</button>
          <button class="icon-btn mas-acciones" title="Más acciones" aria-label="Más acciones de ${Utils.esc(i.titulo)}">⋯</button>
        </div>`;
  }

  // Fila de la tabla de instrumentos (sin columna de periodo: el trimestre ya
  // es el encabezado de sección).
  function filaInstrumento(i) {
    const media = mediaDeInstrumento(i);
    return `<tr data-inst="${i.id}">
      <td>${celdaTitulo(i)}</td>
      <td><span class="badge info">${Utils.esc(i.tipo)}</span></td>
      <td>${celdaNivelUnidad(i)}</td>
      <td>${Utils.esc(i.fecha)}</td>
      <td>${i.apartados.length} ${i.tipo === 'Proyecto' ? 'partes/fases' : 'apartados'}</td>
      <td>${Calc.badgeHtml(media)}</td>
      <td>${celdaAcciones(i)}</td>
    </tr>`;
  }

  // M-17: fila de un título único dentro de un bloque con variantes: la misma
  // fila de siempre, con sus celdas reordenadas para casar con la cabecera
  // «Título · Nivel · Tipo» de la tabla agrupada.
  function filaUnicaGrupo(i) {
    const media = mediaDeInstrumento(i);
    return `<tr data-inst="${i.id}">
      <td>${celdaTitulo(i)}</td>
      <td>${celdaNivelUnidad(i)}</td>
      <td><span class="badge info">${Utils.esc(i.tipo)}</span></td>
      <td>${Utils.esc(i.fecha)}</td>
      <td>${i.apartados.length} ${i.tipo === 'Proyecto' ? 'partes/fases' : 'apartados'}</td>
      <td>${Calc.badgeHtml(media)}</td>
      <td>${celdaAcciones(i)}</td>
    </tr>`;
  }

  // M-17: clave de agrupación por título: sin espacios sobrantes e insensible
  // a mayúsculas/minúsculas. Dos instrumentos con la misma clave son variantes
  // del mismo instrumento (p. ej. la versión base y la ACI de un examen).
  function claveTitulo(t) {
    return String(t || '').trim().toLowerCase();
  }

  // M-17: agrupa los instrumentos de un bloque por título, conservando el
  // orden actual (cada grupo ocupa la posición de su primera aparición).
  // Los títulos únicos quedan como grupos de 1: quien llama decide si se
  // agrupan o se pintan como fila normal.
  function gruposDeTitulo(insts) {
    const grupos = [];
    (insts || []).forEach(i => {
      const clave = claveTitulo(i.titulo);
      let g = grupos.find(x => x.clave === clave);
      if (!g) { g = { clave, titulo: i.titulo, insts: [] }; grupos.push(g); }
      g.insts.push(i);
    });
    return grupos;
  }

  // M-17: fila de grupo (colspan completo) de un título con variantes:
  // título común, cuántas variantes hay y el total de pendientes del grupo.
  function filaGrupoInst(g) {
    const n = g.insts.length;
    const progreso = g.insts.reduce((acc, i) => {
      const p = Calc.progresoInstrumento(i);
      acc.pendientes += p.pendientes;
      acc.total += p.total;
      return acc;
    }, { pendientes: 0, total: 0 });
    const marca = !progreso.total
      ? '<span class="badge na">Sin alumnado</span>'
      : progreso.pendientes
        ? `<span class="badge warn">${progreso.pendientes} pendiente${progreso.pendientes === 1 ? '' : 's'}</span>`
        : '<span class="badge ok">Al día</span>';
    return `<tr class="fila-grupo-inst">
      <td colspan="7"><b>${Utils.esc(g.titulo)}</b> <span class="badge info">${n} variante${n === 1 ? '' : 's'}</span> ${marca}</td>
    </tr>`;
  }

  // M-17: fila de una variante (mismo título que su grupo): el nivel como
  // primera celda (badge con el title del nivel) y después tipo, fecha,
  // apartados, media y sus 2 acciones. La celda del nivel ocupa 2 columnas
  // (título y nivel de la cabecera) para que la fila cuadre con las 7 columnas.
  function filaVariante(i) {
    const media = mediaDeInstrumento(i);
    const nivelTxt = i.nivel ? Calc.etiquetaNivel(i.claseId, i.nivel) : '';
    return `<tr data-inst="${i.id}">
      <td colspan="2">${nivelTxt ? `<span class="badge info" title="${Utils.esc(titleNivel(i.claseId, i.nivel))}">${Utils.esc(nivelTxt)}</span>` : '<span style="color:var(--tinta-suave)">—</span>'}</td>
      <td><span class="badge info">${Utils.esc(i.tipo)}</span></td>
      <td>${Utils.esc(i.fecha)}</td>
      <td>${i.apartados.length} ${i.tipo === 'Proyecto' ? 'partes/fases' : 'apartados'}</td>
      <td>${Calc.badgeHtml(media)}</td>
      <td>
        <div class="acciones">
          <button class="btn btn-mini btn-primario corregir">Corregir</button>
          <button class="icon-btn mas-acciones" title="Más acciones" aria-label="Más acciones de ${Utils.esc(i.titulo)}">⋯</button>
        </div>
      </td>
    </tr>`;
  }

  function tablaInstrumentos(insts) {
    // M-17: solo se agrupa si algún título del bloque tiene varias variantes
    // (base y ACI, por ejemplo); con títulos únicos, la tabla de siempre.
    const grupos = gruposDeTitulo(insts);
    if (!grupos.some(g => g.insts.length > 1)) {
      return `<table class="tabla">
        <thead><tr><th>Título</th><th>Tipo</th><th>Nivel · Unidad</th><th>Fecha</th><th>Apartados</th><th>Media</th><th></th></tr></thead>
        <tbody>${insts.map(filaInstrumento).join('')}</tbody>
      </table>`;
    }
    // Con variantes: el título común va en la fila de grupo y cada variante
    // se identifica por su nivel. Los títulos únicos del bloque siguen como
    // filas normales (misma forma que siempre).
    return `<table class="tabla">
      <thead><tr><th>Título</th><th>Nivel</th><th>Tipo</th><th>Fecha</th><th>Apartados</th><th>Media</th><th></th></tr></thead>
      <tbody>${grupos.map(g => g.insts.length > 1
        ? filaGrupoInst(g) + g.insts.map(filaVariante).join('')
        : filaUnicaGrupo(g.insts[0])).join('')}</tbody>
    </table>`;
  }

  // Bloque plegable de una unidad: cabecera siempre visible, cuerpo con la tabla.
  function bloqueUnidad(periodo, unidad, insts) {
    const clave = periodo + '::' + unidad;
    const abierta = udsAbiertas.has(clave);
    const n = insts.length;
    return `<div class="ud-bloque${abierta ? ' abierta' : ''}">
      <button type="button" class="ud-cabecera" data-ud-clave="${Utils.esc(clave)}" aria-expanded="${abierta}">
        <span class="ud-flecha">${abierta ? '▾' : '▸'}</span>
        <b>${Utils.esc(unidad || 'Sin unidad')}</b>
        <small>${n} instrumento${n === 1 ? '' : 's'}</small>
      </button>
      <div class="ud-cuerpo">${tablaInstrumentos(insts)}</div>
    </div>`;
  }

  // Descriptor que un ítem de rúbrica define para un nivel concreto ('' = usa el común).
  function descriptorPropio(ap, pct) {
    const n = (ap.niveles || []).find(x => Math.abs(Number(x.pct) - Number(pct)) < 1e-9);
    return n ? (n.descriptor || '') : '';
  }

function columnasNivel(filas) {
      const pcts = new Set();
      (filas || []).forEach(f => (f.niveles || []).forEach(n => pcts.add(Number(n.pct))));
      const lista = pcts.size ? [...pcts] : NIVELES_ESTANDAR.map(n => n.pct);
      return lista.sort((a, b) => a - b).map(pct => ({ pct, descriptor: '' }));
    }

  function plantillaColumnas(nColsNivel) {
    // Debe tener exactamente las mismas columnas que la cabecera y la fila:
    // descripción · peso · N niveles · botón criterios · quitar.
    return `minmax(150px,1.5fr) 82px ${'minmax(130px,1fr) '.repeat(nColsNivel)}auto auto`;
  }

  function filaApartado(ap, grupos, esRubrica, modoGlobal, columnasNv) {
    const peso = ap.peso != null ? ap.peso : (esRubrica ? 1 : ap.maxPts);
    const cols = esRubrica ? (columnasNv || []) : [];
    return `
      <div class="apartado-fila${esRubrica ? ' rub' : ''}" data-id="${ap.id}"${esRubrica ? ` style="grid-template-columns:${plantillaColumnas(cols.length)}"` : ''}>
        <input type="text" class="ap-desc" placeholder="${esRubrica ? 'Ítem evaluado (ej. Ortografía)' : 'Pregunta, parte o fase'}" value="${Utils.esc(ap.descripcion)}">
        ${esRubrica ? '' : `<div class="col-saberes"><small>Saberes básicos</small><input type="text" class="ap-saberes" placeholder="separados por coma" value="${Utils.esc(ap.saberes || '')}"></div>`}
        ${esRubrica
          ? `<input type="number" class="ap-peso" min="0.01" step="0.5" value="${peso}" title="Peso de este ítem en la rúbrica">`
          : `<label class="col-peso"><small>Peso</small><input type="number" class="ap-max" min="0.5" step="0.5" value="${ap.maxPts}" title="Puntos máximos"></label>`}
        ${cols.map((nv, k) => `
          <input type="text" class="ap-nv" data-pct="${nv.pct}"
            value="${Utils.esc(descriptorPropio(ap, nv.pct))}"
            placeholder="Descriptor del nivel"
            title="Nivel ${k + 1} · ${nv.pct}%">`).join('')}
        ${modoGlobal
          ? '<small style="color:var(--tinta-suave)">aplica criterios globales</small>'
          : `<button type="button" class="btn btn-mini toggle-crit" title="Elegir criterios evaluados">Criterios</button>`}
        <button type="button" class="btn btn-mini quitar-ap">Quitar</button>
        ${modoGlobal ? '' : `<div class="zona-crit" style="display:none">${UI.chipsCriteriosMulti(grupos, ap.criterioIds)}</div>`}
      </div>`;
  }

  // Cabecera de la cuadrícula de rúbrica: criterio · peso · nivel 1 … nivel N.
  function cabeceraRubrica(columnasNv) {
    return `
      <div class="rub-head" style="grid-template-columns:${plantillaColumnas(columnasNv.length)}">
        <span>Criterio</span>
        <span>Peso</span>
        ${columnasNv.map((nv, k) => `<span title="${Utils.esc(nv.descriptor || '')}">Nivel ${k + 1}<br><small>${nv.pct}%</small></span>`).join('')}
        <span></span>
        <span></span>
      </div>`;
  }

  function modalInstrumento(inst, claseIdFijo, alCerrar) {
    const db = Storage.db;
    const cid = inst ? inst.claseId : (claseIdFijo || claseSel);
    if (!cid) { alert('Primero selecciona una clase'); return; }
    const asig = Calc.asignaturaDeClase(cid);
    if (!asig) { alert('Error: esta clase no tiene asignatura asociada'); return; }
    const claseId = cid;
    const esNueva = !inst;
    const tipoIni = inst ? inst.tipo : 'Control';
    const nivelesAci = Calc.nivelesAciDeClase(claseId);
    const nivelIni = inst ? (inst.nivel || '') : '';
    const opcionesNivel = '<option value="">Común (todo el alumnado)</option><option value="BASE"' + (nivelIni === 'BASE' ? ' selected' : '') + '>Base (sin adaptación)</option>'
      + nivelesAci.map(n => `<option value="${Utils.esc(n.codigo)}" ${nivelIni === n.codigo ? 'selected' : ''}>${Utils.esc(n.etiqueta || n.codigo)}</option>`).join('');
    UI.openModal({
      titulo: esNueva ? 'Nuevo instrumento' : 'Editar instrumento',
      cuerpo: `
        <label class="campo"><span>Título</span>
          <input type="text" id="f-titulo" value="${Utils.esc(inst ? inst.titulo : '')}" placeholder="Ej. Control de unidades 1-3"></label>
        <div class="fila-campos">
          <label class="campo"><span>Tipo</span>
            <select id="f-tipo">${TIPOS.map(t => `<option ${t === tipoIni ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
          <label class="campo"><span>Periodo</span>
            <select id="f-periodo">${PERIODOS.map(p => `<option ${inst && inst.periodo === p ? 'selected' : ''}>${p}</option>`).join('')}</select></label>
          <label class="campo"><span>Fecha</span>
            <input type="date" id="f-fecha" value="${inst ? inst.fecha : Utils.hoy()}"></label>
        </div>
        <div class="fila-campos">
          <label class="campo"><span>Unidad (agrupa exámenes del mismo tema)</span>
            <input type="text" id="f-unidad" list="lista-unidades" value="${Utils.esc(inst ? (inst.unidad || '') : '')}" placeholder="Ej. UD5" title="Puedes elegir una unidad ya usada o escribir una nueva">
            ${datalistUnidades(asig.id)}</label>
          ${nivelesAci.length ? `<label class="campo"><span>Nivel ACI</span>
            <select id="f-nivel">${opcionesNivel}</select></label>` : '<input type="hidden" id="f-nivel" value="">'}
        </div>
        <div class="fila-campos" id="fila-critmodo" style="margin-bottom:10px">
          <label class="campo"><span>¿Cómo se evalúan los criterios?</span>
            <select id="f-critmodo">
              <option value="desglosado" ${(inst && inst.criteriosModo) === 'desglosado' ? 'selected' : (!inst ? 'selected' : '')}>Desglosado: cada apartado marca sus criterios</option>
              <option value="global" ${(inst && inst.criteriosModo) === 'global' ? 'selected' : ''}>Global: todo el instrumento evalúa los mismos criterios</option>
            </select>
            <small class="hint">«Desglosado» es lo habitual. «Global» sirve cuando toda la prueba cuenta lo mismo.</small>
          </label>
        </div>

        <div id="bloque-niveles" style="display:none">
          ${esNueva ? `<div class="aviso" style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">
            <span>¿Ya la tienes hecha (por ejemplo, con una IA)? No hace falta escribirla a mano.</span>
            <button class="btn btn-mini" type="button" id="btn-importar-rub">Importar rúbrica (IA)</button>
          </div>` : ''}
        </div>

        <div id="bloque-criterios-global" style="display:none">
          <label class="campo"><span>Criterios de evaluación que se trabajan</span>
            <div id="chips-criterios-global"></div>
          </label>
        </div>

        <label class="campo"><span id="lbl-apartados">Apartados y criterios que evalúan</span>
          <small id="hint-asig-crit" style="display:block;color:var(--tinta-suave)"></small>
          <div id="lista-apartados"></div>
        </label>
        <button class="btn btn-mini" type="button" id="add-ap">Añadir apartado</button>
        <label class="campo" style="margin-top:14px"><span>Saberes básicos (opcional, informativo)</span>
          <textarea id="f-saberes" rows="2" placeholder="Opcional">${Utils.esc(inst ? inst.saberes : '')}</textarea></label>
        <label class="campo" style="margin-top:14px"><span>Enlace (opcional)</span>
          <input type="url" id="f-url" value="${Utils.esc(inst ? (inst.url || '') : '')}" placeholder="https://… (examen, proyecto, materiales)">
          <small class="hint">Dirección del examen, del proyecto o de los materiales. Quedará a mano en el listado y al corregir.</small></label>`,
      textoGuardar: esNueva ? 'Crear' : 'Guardar cambios',
      alCerrar,
      alGuardar(body) {
        const unidadAnterior = inst ? (inst.unidad || '') : '';
        const titulo = body.querySelector('#f-titulo').value.trim();
        const tipo = body.querySelector('#f-tipo').value;
        const periodo = body.querySelector('#f-periodo').value;
        const fecha = body.querySelector('#f-fecha').value || Utils.hoy();
        const saberes = body.querySelector('#f-saberes').value.trim();
        const unidad = body.querySelector('#f-unidad').value.trim();
        const nivel = (body.querySelector('#f-nivel') || {}).value || '';
        const urlCampo = body.querySelector('#f-url');
        const url = urlCampo ? Utils.urlLimpia(urlCampo.value) : (inst ? (inst.url || '') : '');
        const esRubrica = tipo === 'Rúbrica';

        const apartados = [];
        let orden = 0;
        const criteriosModo = body.querySelector('#f-critmodo') ? body.querySelector('#f-critmodo').value : 'desglosado';
        const esModoGlobal = criteriosModo === 'global' && !esRubrica;
        for (const fila of body.querySelectorAll('.apartado-fila')) {
          orden++;
          const desc = fila.querySelector('.ap-desc').value.trim();
          const maxPts = esRubrica ? 100 : parseFloat(fila.querySelector('.ap-max').value);
          const criterioIds = esModoGlobal ? [] : UI.valoresChips(fila.querySelector('.zona-crit'));
          if (esRubrica) {
            if (isNaN(maxPts) || maxPts <= 0) maxPts = 100;
          } else {
            if (!esModoGlobal && !criterioIds.length) { alert('Cada apartado necesita al menos un criterio (botón «Criterios»)'); return false; }
            if (isNaN(maxPts) || maxPts <= 0) { alert('Cada apartado necesita puntos máximos'); return false; }
          }
          const peso = fila.querySelector('.ap-peso') ? parseFloat(fila.querySelector('.ap-peso').value) : (esRubrica ? 1 : maxPts);
          const saberes = (fila.querySelector('.ap-saberes') || {}).value || '';
          const nivelesItem = Array.from(fila.querySelectorAll('.ap-nv'))
            .map(i => ({ pct: Number(i.dataset.pct), descriptor: i.value.trim() }))
            .filter(n => n.descriptor);
          if (esRubrica && nivelesItem.length < 2) {
            alert('El ítem «' + (desc || 'sin nombre') + '» necesita al menos dos descriptores de nivel.');
            return false;
          }
          apartados.push({
            id: fila.dataset.id && fila.dataset.id !== 'nuevo' ? fila.dataset.id : Utils.uid(),
            orden, descripcion: desc, maxPts, criterioIds,
            peso: (isNaN(peso) || peso <= 0) ? 1 : peso,
            niveles: esRubrica ? nivelesItem : [],
            saberes: saberes.trim()
          });
        }
        if (!apartados.length) { alert('Añade al menos un apartado'); return false; }
        const criterioIdsGlobal = UI.valoresChips(body.querySelector('#chips-criterios-global') || body);
        if (esModoGlobal && !criterioIdsGlobal.length) { alert('Selecciona al menos un criterio global en el bloque superior'); return false; }
        // Blindaje: un instrumento con nivel ACI solo puede evaluar criterios de
        // SU currículo. Si la selección no encaja (p. ej. se cambió el nivel a
        // última hora), no se guarda y se avisa.
        if (Calc.criteriosFueraDeNivel(Storage.db, { claseId, nivel, criterioIdsGlobal, apartados }).length) {
          alert('Los criterios seleccionados no son del currículo del nivel elegido. Revisa el nivel y los criterios antes de guardar.');
          return false;
        }

        const nivelesInst = esRubrica
          ? (apartados[0].niveles || [])
          : (inst ? (inst.niveles || []) : NIVELES_ESTANDAR.map(n => ({ pct: n.pct, descriptor: '' })));

        if (esNueva) {
          Storage.db.instrumentos.push({ id: Utils.uid(), claseId, tipo, titulo, fecha, periodo, saberes, unidad, nivel, niveles: nivelesInst, apartados, criteriosModo, criterioIdsGlobal, url });
        } else {
          Object.assign(inst, { tipo, titulo, fecha, periodo, saberes, unidad, nivel, niveles: nivelesInst, apartados, criteriosModo, criterioIdsGlobal, url });
        }
        // Si la UD cambió de nombre y la anterior ya no la usa nadie, su color
        // pasa al nombre nuevo (conserva la identidad visual de la unidad).
        Storage.migrarColorUd(unidadAnterior, unidad);
        Storage.save();
      }
    });

    const body = document.querySelector('.modal-body');
    const btnImpRub = body.querySelector('#btn-importar-rub');
    if (btnImpRub) {
      // La rúbrica importada se crea como instrumento nuevo: cerramos este
      // formulario y abrimos el importador con la clase y el periodo ya puestos.
      btnImpRub.onclick = () => modalImportarRubrica(claseId, (body.querySelector('#f-periodo') || {}).value);
    }
    const selTipo = body.querySelector('#f-tipo');
    const listaAp = body.querySelector('#lista-apartados');
    const chipsGlobal = body.querySelector('#chips-criterios-global');
    chipsGlobal.dataset.asig = String(nivelIni || '');
    chipsGlobal.innerHTML = UI.chipsCriteriosMulti(
      Calc.nivelesParaInstrumento(claseId, nivelIni || ''),
      inst ? (inst.criterioIdsGlobal || []) : []);
    UI.wireChips(chipsGlobal);

    // Columnas de la cuadrícula de rúbrica: la unión de los niveles propios de
    // los ítems. Si todavía no hay ninguno (rúbrica nueva), la escala estándar.
    

    function nivelActual() {
      const s = body.querySelector('#f-nivel');
      return s ? s.value : '';
    }

    function estadoFilas() {
      const esRub = selTipo.value === 'Rúbrica';
      return Array.from(listaAp.querySelectorAll('.apartado-fila')).map(fila => {
        const zona = fila.querySelector('.zona-crit');
        return {
          id: fila.dataset.id,
          descripcion: fila.querySelector('.ap-desc').value,
          // En modo global el apartado no tiene zona de criterios propios.
          criterioIds: zona ? UI.valoresChips(zona) : [],
          maxPts: esRub ? 100 : parseFloat((fila.querySelector('.ap-max') || {}).value),
          peso: fila.querySelector('.ap-peso') ? parseFloat(fila.querySelector('.ap-peso').value) : null,
          niveles: Array.from(fila.querySelectorAll('.ap-nv')).map(i => ({ pct: Number(i.dataset.pct), descriptor: i.value }))
        };
      });
    }

    // Repinta la lista de ítems conservando lo escrito y, en rúbricas, la
    // cabecera «criterio · peso · nivel 1 … nivel N».
    function pintaFilas(filas, nivel) {
      const esRub = selTipo.value === 'Rúbrica';
      const cols = esRub ? columnasNivel(filas) : [];
      listaAp.innerHTML = '';
      if (esRub) listaAp.insertAdjacentHTML('beforeend', cabeceraRubrica(cols).trim());
      (filas || []).forEach(f => addFilaApartado(f, nivel, cols));
    }

    // La cuadrícula se repinta siempre desde el estado de los ítems; no hay
    // editor de escala común, por lo que no es necesario repintarla por ese lado.

    function actualizaEtiquetaCrit(fila) {
      const zona = fila.querySelector('.zona-crit');
      if (!zona) return;
      const n = zona.querySelectorAll('input:checked').length;
      fila.querySelector('.toggle-crit').textContent = 'Criterios (' + n + ')';
    }

    // Modal de segunda capa para elegir los criterios de un apartado. Evita que
    // la fila crezca sin límite (un instrumento común tiene 68 chips).
    function modalCriteriosApartado(fila, grupos) {
      const zona = fila.querySelector('.zona-crit');
      const seleccion = new Set(UI.valoresChips(zona));
      const detalle = g => `<details class="chips-nivel"${g._abierto ? ' open' : ''}><summary>${Utils.esc(g.etiqueta)} · <span class="chips-nivel-cuenta">${g.criterios.filter(c => seleccion.has(c.id)).length}</span></summary><div class="chips-grupo">${g.criterios.map(c => `<label class="chip ${seleccion.has(c.id) ? 'on' : ''}"><input type="checkbox" value="${c.id}" ${seleccion.has(c.id) ? 'checked' : ''}>${Utils.esc(c.codigo)} · ${Utils.esc(c.descripcion)}</label>`).join('')}</div></details>`;
      const gruposHtml = grupos.map((g, i) => { g._abierto = i === 0; return g; });
      const body = UI.openModal({
        titulo: 'Criterios del apartado',
        cuerpo: `<p class="hint">Marca los criterios que evalúa este apartado. Cada alumno se evalúa con los criterios de su nivel.</p>
          <input type="search" id="busca-crit" placeholder="Buscar por código o descripción" style="margin-bottom:8px">
          <div id="lista-niveles">${gruposHtml.map(detalle).join('')}</div>`,
        textoGuardar: 'Listo',
        alGuardar(body2) {
          const elegidos = new Set(UI.valoresChips(body2.querySelector('#lista-niveles')));
          zona.innerHTML = UI.chipsCriteriosMulti(grupos, elegidos);
          UI.wireChips(zona);
          zona.querySelectorAll('.chip input').forEach(inp =>
            inp.addEventListener('change', () => actualizaEtiquetaCrit(fila)));
          actualizaEtiquetaCrit(fila);
          return true;
        }
      }, 2);
      const busca = body.querySelector('#busca-crit');
      if (busca) busca.oninput = () => {
        const q = busca.value.trim().toLowerCase();
        body.querySelectorAll('#lista-niveles .chip').forEach(ch => {
          ch.style.display = !q || ch.textContent.toLowerCase().includes(q) ? '' : 'none';
        });
      };
    }

    function addFilaApartado(ap, nivel, cols) {
      const esRubrica = selTipo.value === 'Rúbrica';
      const modoGlobal = !esRubrica && (body.querySelector('#f-critmodo') || {}).value === 'global';
      const grupos = Calc.nivelesParaInstrumento(claseId, nivel || nivelActual());
      const div = document.createElement('div');
      div.innerHTML = filaApartado(ap || { id: 'nuevo', descripcion: '', maxPts: '', criterioIds: [] }, grupos, esRubrica, modoGlobal, cols).trim();
      const fila = div.firstElementChild;
      fila.querySelector('.quitar-ap').onclick = () => { fila.remove(); };
      if (fila.querySelector('.toggle-crit')) {
        fila.querySelector('.toggle-crit').onclick = () => {
          modalCriteriosApartado(fila, Calc.nivelesParaInstrumento(claseId, nivelActual()));
        };
      }
      UI.wireChips(fila);
      fila.querySelectorAll('.chip input').forEach(inp =>
        inp.addEventListener('change', () => actualizaEtiquetaCrit(fila)));
      actualizaEtiquetaCrit(fila);
      listaAp.appendChild(fila);
    }

    function refrescaTipo() {
      const esRubrica = selTipo.value === 'Rúbrica';
      const critmodo = (body.querySelector('#f-critmodo') || {}).value || 'desglosado';
      body.querySelector('#bloque-niveles').style.display = esRubrica ? '' : 'none';
      body.querySelector('#bloque-criterios-global').style.display = (critmodo === 'global' && !esRubrica) ? '' : 'none';
      body.querySelector('#fila-critmodo').style.display = esRubrica ? 'none' : '';
      const lbl = body.querySelector('#lbl-apartados');
      if (lbl) lbl.textContent = esRubrica ? 'Ítems de la rúbrica · criterio, peso y niveles' : 'Apartados y criterios que evalúan';
      const btnAp = body.querySelector('#add-ap');
      if (btnAp) btnAp.textContent = esRubrica ? 'Añadir ítem' : 'Añadir apartado';
      pintaFilas(estadoFilas(), nivelActual());
    }

    function refrescaNivel() {
      const nivel = nivelActual();
      const grupos = Calc.nivelesParaInstrumento(claseId, nivel);
      const idNuevo = String(nivel);
      // Si ya estábamos pintando este mismo nivel, respetamos lo que el docente
      // tenga marcado; si venimos de otro (o es la primera pintada), partimos de
      // los criterios guardados del instrumento.
      const seleccion = (chipsGlobal.dataset.asig === idNuevo)
        ? UI.valoresChips(chipsGlobal)
        : (inst ? (inst.criterioIdsGlobal || []) : []);
      chipsGlobal.dataset.asig = idNuevo;
      const hint = body.querySelector('#hint-asig-crit');
      if (hint) {
        hint.textContent = nivel
          ? 'Criterios del currículo de ' + ((Calc.asignaturaDeNivel(claseId, nivel) || {}).nombre || '') +
            ' (nivel ' + Calc.etiquetaNivel(claseId, nivel) + ')'
          : 'Criterios de todos los niveles: el instrumento es común a todo el grupo y cada alumno se evalúa con los suyos.';
      }
      pintaFilas(estadoFilas(), nivel);
      chipsGlobal.innerHTML = UI.chipsCriteriosMulti(grupos, seleccion);
      UI.wireChips(chipsGlobal);
    }
    selTipo.onchange = refrescaTipo;
    if (body.querySelector('#f-critmodo')) body.querySelector('#f-critmodo').onchange = refrescaTipo;
    const selNivelEl = body.querySelector('#f-nivel');
    let nivelSel = nivelIni;
    if (selNivelEl) selNivelEl.onchange = () => {
      const nivel = nivelActual();
      const idNuevo = String((Calc.asignaturaDeNivel(claseId, nivel) || asig).id);
      // Cambiar de nivel cambia el currículo: los criterios marcados dejan de
      // encajar. Avisamos antes de descartar la selección (no se pierde ninguna
      // nota: solo qué criterios tenía marcados el formulario).
      if (chipsGlobal.dataset.asig && chipsGlobal.dataset.asig !== idNuevo &&
          (UI.valoresChips(chipsGlobal).length ||
           Array.from(listaAp.querySelectorAll('.zona-crit')).some(z => UI.valoresChips(z).length))) {
        const destino = Calc.asignaturaDeNivel(claseId, nivel);
        if (!confirm('Vas a cambiar a «' + (destino ? destino.nombre : 'otro currículo') +
          '». Los criterios que tienes marcados son del currículo actual y dejarán de estar marcados ' +
          '(no se pierde ninguna nota). ¿Continuar?')) {
          selNivelEl.value = nivelSel;
          return;
        }
      }
      nivelSel = nivel;
      refrescaNivel();
    };
    body.querySelector('#add-ap').onclick = () => addFilaApartado(null, null, selTipo.value === 'Rúbrica' ? columnasNivel(estadoFilas()) : []);

    if (esNueva) {
      addFilaApartado(null, null, selTipo.value === 'Rúbrica' ? columnasNivel([]) : []);
    } else {
      const cols = selTipo.value === 'Rúbrica' ? columnasNivel(inst.apartados) : [];
      inst.apartados.forEach(a => addFilaApartado(a, inst.nivel, cols));
    }
    refrescaTipo();
    refrescaNivel();
  }

  function borrarInstrumento(el, inst) {
    if (!confirm(`¿Eliminar "${inst.titulo}" y todas sus notas?`)) return;
    delete Storage.db.registros[inst.id];
    Storage.db.instrumentos = Storage.db.instrumentos.filter(i => i.id !== inst.id);
    Storage.save();
    render(el);
  }

  // --- Banco de instrumentos (D-48) ---
  // Guarda una copia del instrumento (título, apartados y criterios) para
  // reutilizarla en otra clase o el curso siguiente. No toca el original.
  function guardarAlBanco(el, inst) {
    Storage.guardarEnBanco(inst);
    UI.toast('Guardado en el banco: ' + inst.titulo);
    render(el);
  }

  // M-08: menú de acciones secundarias de una fila. En la fila solo quedan
  // visibles «Corregir» (lo más frecuente) y este «⋯»; Editar, Duplicar, Al
  // banco y Eliminar viven aquí, un botón por línea, para que en táctil no
  // quepan dos toques cerca (el borrado ya no va pegado a las demás acciones).
  function accionesInstrumento(el, inst) {
    const body = UI.openModal({
      titulo: `Acciones de ${inst.titulo}`,
      cuerpo: `<div class="acciones-modal">
        <button class="btn" data-acc="editar">Editar</button>
        <button class="btn" data-acc="duplicar">Duplicar</button>
        <button class="btn" data-acc="al-banco">Al banco</button>
        <button class="btn btn-peligro" data-acc="eliminar">Eliminar</button>
      </div>`
    });
    body.querySelectorAll('.acciones-modal button').forEach(b => {
      b.onclick = () => {
        // El menú se cierra primero: cada acción abre su propio modal (o pide
        // confirmación) y refresca por su cuenta, igual que desde la fila.
        UI.closeModal();
        if (b.dataset.acc === 'editar') modalInstrumento(inst);
        else if (b.dataset.acc === 'duplicar') duplicarInstrumento(inst);
        else if (b.dataset.acc === 'al-banco') guardarAlBanco(el, inst);
        else if (b.dataset.acc === 'eliminar') borrarInstrumento(el, inst);
      };
    });
  }

  // Lista del banco para añadir una copia a la clase activa, con las notas en
  // blanco y los criterios reapuntados al currículo de esa clase.
  function modalBanco(el) {
    const banco = (Storage.db.bancoInstrumentos || []).slice().reverse(); // los últimos, primero
    const asig = Calc.asignaturaDeClase(claseSel);
    const clase = Calc.clase(claseSel);
    const grupo = clase ? (Calc.byId(Storage.db.grupos, clase.grupoId) || {}) : {};
    const destino = asig ? `${asig.nombre} · ${grupo.nombre || '?'}` : 'la clase elegida';
    if (!banco.length) {
      UI.openModal({
        titulo: 'Banco de instrumentos',
        cuerpo: `<div class="aviso">Todavía no has guardado ningún instrumento en el banco.
          Para guardar uno, tócalo en la lista con <b>«Al banco»</b> y quedará disponible aquí.</div>`
      });
      return;
    }
    // Las asignaturas del filtro salen de lo que hay guardado, no de un
    // catálogo: si no hay moldes de Inglés, no aparece la opción. Si todos los
    // moldes son de la misma asignatura, el filtro no aporta y no se pinta.
    const asignaturas = [...new Set(banco
      .map(m => (m.origen && m.origen.asignatura) || '')
      .filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
    const conFiltro = asignaturas.length > 1;
    const cuerpo = `
      <p class="hint">Instrumentos guardados para reutilizar. Al pulsar «Usar» se añade una copia a
        <b>${Utils.esc(destino)}</b>, con las notas en blanco y los mismos apartados y criterios.</p>
      ${conFiltro ? `<label class="campo"><span>Ver los de</span>
        <select id="banco-filtro">
          <option value="">Todas las asignaturas (${banco.length})</option>
          ${asignaturas.map(a => {
            const n = banco.filter(m => m.origen && m.origen.asignatura === a).length;
            return `<option value="${Utils.esc(a)}">${Utils.esc(a)} (${n})</option>`;
          }).join('')}
        </select></label>` : ''}
      <label class="campo"><span>Periodo del instrumento que se añada</span>
        <select id="banco-periodo">${PERIODOS.map(p => `<option ${p === 'T1' ? 'selected' : ''}>${p}</option>`).join('')}</select></label>
      <div id="banco-lista">${banco.map(m => `
        <div class="fila-banco" data-molde="${Utils.esc(m.id)}" data-asignatura="${Utils.esc((m.origen && m.origen.asignatura) || '')}">
          <span class="fila-banco-txt">
            <b>${Utils.esc(m.titulo || '(sin título)')}</b>
            <small>${Utils.esc(m.tipo || '')}${m.unidad ? ' · ' + Utils.esc(m.unidad) : ''}${m.origen && m.origen.asignatura ? ' · de ' + Utils.esc(m.origen.asignatura) : ''} · ${(m.apartados || []).length} apartado${(m.apartados || []).length === 1 ? '' : 's'}</small>
          </span>
          <button type="button" class="btn btn-mini btn-primario banco-usar">Usar</button>
          <button type="button" class="icon-btn banco-quitar" title="Quitar del banco (no borra ningún instrumento del curso)">×</button>
        </div>`).join('')}</div>
      <div id="banco-vacio" class="aviso" style="display:none">No hay instrumentos de esa asignatura en el banco.</div>`;
    const mbody = UI.openModal({ titulo: 'Banco de instrumentos', cuerpo });

    // Filtro por asignatura: oculta filas sin recargar el modal.
    const selFiltro = mbody.querySelector('#banco-filtro');
    if (selFiltro) selFiltro.addEventListener('change', () => {
      const valor = selFiltro.value;
      let visibles = 0;
      mbody.querySelectorAll('.fila-banco').forEach(fila => {
        const coincide = !valor || fila.dataset.asignatura === valor;
        fila.style.display = coincide ? '' : 'none';
        if (coincide) visibles++;
      });
      const vacio = mbody.querySelector('#banco-vacio');
      if (vacio) vacio.style.display = visibles ? 'none' : '';
    });
    mbody.querySelectorAll('.banco-usar').forEach(b => {
      b.onclick = () => {
        const moldeId = b.closest('[data-molde]').dataset.molde;
        const periodo = (mbody.querySelector('#banco-periodo') || {}).value || 'T1';
        const r = Storage.anadirDesdeBanco(moldeId, claseSel, '', periodo);
        if (r.faltan.length) {
          const nombre = (r.molde && r.molde.titulo) || '';
          alert('No se puede añadir «' + nombre + '» a ' + (asig ? asig.nombre : 'esta clase') +
            '.\n\nEstos criterios del instrumento no existen en esa asignatura:\n' + r.faltan.join(', ') +
            '\n\nSe guardó desde un currículo distinto. Créalos en «Currículo», o guárdalo desde una clase que use esa asignatura.');
          return;
        }
        UI.closeModal();
        UI.toast('Añadido: ' + r.inst.titulo);
        render(el);
      };
    });
    mbody.querySelectorAll('.banco-quitar').forEach(b => {
      b.onclick = () => {
        const fila = b.closest('[data-molde]');
        const m = (Storage.db.bancoInstrumentos || []).find(x => x.id === fila.dataset.molde);
        if (!confirm('¿Quitar «' + ((m && m.titulo) || '') + '» del banco?\n\nNo se borra ningún instrumento del curso.')) return;
        Storage.borrarDelBanco(fila.dataset.molde);
        modalBanco(el);
      };
    });
  }

  // «¿Qué quieres corregir?»: listado de la clase ordenado por lo que falta.
  // Cada fila es un botón único: título a la izquierda, tipo/periodo como
  // <small> y badge de estado (Corregir/Completo) a la derecha; el click
  // entra en la corrección. Las filas se generan aparte para poder
  // comprobarlas sin navegador.
  function filasCorregirHtml(lista) {
    return lista.map(i => {
      const p = Calc.progresoInstrumento(i);
      let marca = 'Sin alumnado', clase = 'na';
      if (p.total) {
        if (!p.pendientes) { marca = 'Completo'; clase = 'ok'; }
        else { marca = `Corregir · ${p.pendientes} pendiente${p.pendientes === 1 ? '' : 's'}`; clase = 'warn'; }
      }
      const meta = [i.tipo, i.periodo, i.unidad || 'sin unidad'].join(' · ');
      return `<button type="button" class="fila-corrige" data-inst="${i.id}">
        <span class="fila-corrige-txt"><b>${Utils.esc(i.titulo)}</b><small>${Utils.esc(meta)}</small></span>
        <span class="badge ${clase}">${marca}</span>
      </button>`;
    }).join('');
  }

  function modalCalificar(claseId, alElegir) {
    const lista = Calc.instrumentosPorCorregir(claseId);
    const mbody = UI.openModal({
      titulo: '¿Qué quieres corregir?',
      cuerpo: `<p class="hint">Instrumentos de esta clase, con lo que falta por corregir primero. Toca uno para corregirlo.</p>
        ${filasCorregirHtml(lista) || '<div class="aviso">Esta clase todavía no tiene instrumentos. Créalos en «Instrumentos».</div>'}`
    });
    mbody.querySelectorAll('.fila-corrige').forEach(b => {
      b.onclick = () => { UI.closeModal(); alElegir(b.dataset.inst); };
    });
  }

  // Marca o desmarca «no realiza esta evaluación» para un alumno en un
  // instrumento. Al marcar se borran sus apartados (una exclusión con notas
  // viejas seria una contradicción); al desmarcar se deja el registro limpio.
  // La escritura de un apartado con valor también quita la marca (ver
  // renderCorreccion), porque volver a corregir es volver a evaluar.
  function toggleNoRealiza(inst, alumnoId, valor) {
    if (!Storage.db.registros[inst.id]) Storage.db.registros[inst.id] = {};
    if (!Storage.db.registros[inst.id][alumnoId]) Storage.db.registros[inst.id][alumnoId] = {};
    const reg = Storage.db.registros[inst.id][alumnoId];
    if (valor) {
      reg.noRealiza = true;
      (inst.apartados || []).forEach(ap => delete reg[ap.id]);
    } else {
      delete reg.noRealiza;
      if (!Object.keys(reg).length) delete Storage.db.registros[inst.id][alumnoId];
    }
    Storage.save();
  }

  // Panel de exclusión: se abre al tocar el nombre del alumno en la corrección.
  function modalNoRealiza(inst, alumnoId, el, volverA, alumnoIdVista) {
    const a = Calc.alumno(alumnoId) || {};
    const reg = ((Storage.db.registros && Storage.db.registros[inst.id]) || {})[alumnoId] || {};
    UI.openModal({
      titulo: '¿Realiza esta evaluación?',
      cuerpo: `
        <p class="hint"><b>${Utils.esc(App.nombreVisible(a))}</b> · ${Utils.esc(inst.titulo)}</p>
        <label class="campo campo--toggle"><input type="checkbox" id="no-realiza"${reg.noRealiza === true ? ' checked' : ''}><span>No realiza esta evaluación</span></label>
        <p class="hint">Si lo marcas, se dejan en blanco sus apartados y no cuenta en la nota del instrumento, en el progreso ni en la media de la UD.</p>`,
      textoGuardar: 'Guardar',
      alGuardar(body, cerrar) {
        const chk = body.querySelector('#no-realiza');
        toggleNoRealiza(inst, alumnoId, !!(chk && chk.checked));
        // Cerramos a mano y devolvemos false: UI.openModal cerraría y llamaría
        // a App.refrescar(), que sacaria al docente de la corrección. Aqui
        // manda el repintado de renderCorreccion.
        cerrar();
        renderCorreccion(el, inst.id, volverA, alumnoIdVista);
        return false;
      }
    });
  }

  // `volverA` permite volver a la vista desde la que se abrió (p. ej. la
  // Cuadrícula) en lugar de ir siempre al listado de Instrumentos.
  // `alumnoId` arranca la corrección en ese alumno (por ejemplo, al tocar su
  // nota en la Cuadrícula) en lugar de en el primero de la lista.
  function renderCorreccion(el, instId, volverA, alumnoId) {
    const inst = Calc.instrumento(instId);
    if (!inst) { render(el); return; }
    const alumnos = Calc.alumnosDeInstrumento(inst);
    const esRubrica = inst.tipo === 'Rúbrica';
    const url = Utils.urlPintable(inst.url);
    // ¿Este alumno queda excluido de la evaluación? Al marcarse se borran sus
    // apartados; al escribir cualquier apartado se quita la marca.
    const esNoRealiza = (alumnoId) => {
      const fila = ((Storage.db.registros && Storage.db.registros[inst.id]) || {})[alumnoId] || {};
      return fila.noRealiza === true;
    };
    const insigniaNoRealiza = '<span class="badge no-realiza">No realiza</span>';

    el.innerHTML = `
      <section class="card no-print">
        <div class="card-head">
          <h2>${Utils.esc(inst.titulo)}</h2>
          <div class="acciones">
            ${url ? `<a class="btn" href="${Utils.esc(url)}" target="_blank" rel="noopener" title="${Utils.esc(url)}">Abrir enlace</a>` : ''}
            <span id="slot-privacidad"></span>
            <button class="btn" id="volver">Volver</button>
          </div>
        </div>
        <div class="chips" style="margin-bottom:10px">
          <span class="badge info">${Utils.esc(inst.tipo)}</span>
          <span class="badge info">${Utils.esc(inst.periodo)}</span>
          ${inst.unidad ? `<span class="badge info">${Utils.esc(inst.unidad)}</span>` : ''}
          ${inst.nivel ? `<span class="badge info" title="${Utils.esc(titleNivel(inst.claseId, inst.nivel))}">Nivel ${Utils.esc(Calc.etiquetaNivel(inst.claseId, inst.nivel))}</span>` : ''}
          <span class="badge na">${inst.apartados.length} ${inst.tipo === 'Proyecto' ? 'partes/fases' : 'apartados'}</span>
          ${esRubrica ? '<small style="align-self:center;color:var(--tinta-suave)">Toca un nivel para puntuar; tócalo otra vez para vaciar.</small>' : ''}
        </div>
        <div class="barra-correccion no-print" id="barra-nav">
          <button class="btn btn-mini" id="btn-anterior">← Anterior</button>
          <span id="nav-info"></span>
          <button class="btn btn-mini btn-primario" id="btn-siguiente">Guardar y siguiente →</button>
        </div>
        <div class="scroll-correccion">
          <table class="tabla" id="tabla-corrige">
            <thead><tr><th>Alumno</th>${inst.apartados.map(ap =>
              `<th title="${Utils.esc(descripcionNiveles(inst, ap))}">${Utils.esc(ap.descripcion)}<br><small>${esRubrica ? 'niveles 1 a ' + Calc.nivelesDeApartado(inst, ap).length : 'sobre ' + Utils.fmtReal(ap.maxPts)}</small></th>`
            ).join('')}<th>Nota</th></tr></thead>
            <tbody>
              ${alumnos.map(a => {
                const reg = (Storage.db.registros[inst.id] || {})[a.id] || {};
                return `<tr data-alumno="${a.id}">
                  <td><button type="button" class="nombre-alumno" data-alumno="${a.id}" title="Toca para marcar si realiza esta evaluación">${Utils.esc(App.nombreVisible(a))}${esNoRealiza(a.id) ? ' ' + insigniaNoRealiza : ''}</button></td>
                  ${inst.apartados.map(ap => `
                    <td data-apartado="${ap.id}">
                      ${esRubrica
                        ? `<div class="segmentos">${Calc.nivelesDeApartado(inst, ap).map(nv => {
                            const on = Number(reg[ap.id]) === nv.pct ? 'on' : '';
                            return `<button type="button" class="${on}" data-val="${nv.pct}" title="${Utils.esc(nv.descriptor || '')}">${nv.pct}</button>`;
                          }).join('')}</div>`
                        : `<input type="number" class="inp-nota" min="0" max="${ap.maxPts}" step="any"
                            style="min-width:76px" value="${reg[ap.id] ?? ''}" placeholder="—">`}
                    </td>`).join('')}
                  <td class="celda-nota-final"></td>
                </tr>`;
              }).join('') || '<tr><td colspan="9" class="vacio">Este instrumento no tiene alumnado asignado.</td></tr>'}
            </tbody>
          </table>
        </div>
        ${esRubrica ? `<details class="no-print leyenda-rubrica">
          <summary>Ver los descriptores de cada nivel (útil en tableta, donde no hay tooltips)</summary>
          ${inst.apartados.map(ap => `
            <div class="leg-item">
              <b>${Utils.esc(ap.descripcion)}</b>
              <ul>${Calc.nivelesDeApartado(inst, ap).map((nv, k) =>
                `<li><span class="badge info">Nivel ${k + 1} · ${nv.pct}%</span> ${Utils.esc(nv.descriptor || '—')}</li>`).join('')}</ul>
            </div>`).join('')}
        </details>` : ''}
      </section>
      <p class="no-print" style="color:var(--tinta-suave);font-size:13px">
        La nota mostrada es la del instrumento (informativa). Las ponderaciones por criterio se aplican en la Cuadrícula.
      </p>`;

    // Privacidad también en la corrección: el docente puede proyectarla.
    if (typeof App !== 'undefined' && App.crearBotonPrivacidad) {
      const slot = el.querySelector('#slot-privacidad');
      if (slot && typeof slot.replaceWith === 'function') {
        slot.replaceWith(App.crearBotonPrivacidad(() => renderCorreccion(el, instId, volverA, alumnoId)));
      } else if (slot && slot.parentNode && typeof slot.parentNode.insertBefore === 'function') {
        // El DOM del arnés no tiene replaceWith: inserta delante y quita el hueco.
        const btn = App.crearBotonPrivacidad(() => renderCorreccion(el, instId, volverA, alumnoId));
        slot.parentNode.insertBefore(btn, slot);
        if (typeof slot.remove === 'function') slot.remove();
      }
    }
    // Al salir de la corrección se limpia el resaltado del alumno en curso: si
    // el docente vuelve a este instrumento en la misma vista (p. ej. desde la
    // cola con Volver), no debe reaparecer el sombreado viejo.
    const salir = () => {
      filas.forEach(tr => tr.classList.remove('fila-actual'));
      return volverA ? volverA() : render(el);
    };
    el.querySelector('#volver').onclick = () => salir();

    const tabla = el.querySelector('#tabla-corrige');

    // Un instrumento sin ninguna anotación no tiene nota: se muestra «—» y no
    // un 0 (un 0 es una nota puesta que resulta en cero).
    const tieneNota = (alumnoId) => {
      const fila = ((Storage.db.registros && Storage.db.registros[inst.id]) || {})[alumnoId] || {};
      if (fila.noRealiza === true) return false;
      return inst.apartados.some(ap => fila[ap.id] != null && fila[ap.id] !== '');
    };
    function notaFila(tr) {
      const alumnoId = tr.dataset.alumno;
      // Excluido: se dice por extenso, no con un «—» (que es «sin corregir»).
      if (esNoRealiza(alumnoId)) {
        tr.querySelector('.celda-nota-final').innerHTML = insigniaNoRealiza;
        return;
      }
      const n = tieneNota(alumnoId) ? Calc.notaInstrumento(inst, alumnoId) : null;
      tr.querySelector('.celda-nota-final').innerHTML = Calc.badgeHtml(n, true);
    }

    const persistir = Utils.debounce(() => Storage.save(), 400);
    // El aviso se agrupa: si alguien teclea «77» en un apartado de 1 punto, el
    // recorte salta en la primera tecla y no queremos un toast por tecla.
    const avisarRecorte = Utils.debounce((max) => {
      UI.toast('Esta pregunta vale como máximo ' + Utils.fmtReal(max) + '; se ha ajustado a esa puntuación');
    }, 800);

    // Escape cierra la edición de la celda: suelta el foco (desaparece el cursor)
    // y vuelve a la tabla, sin mover de alumno ni perder nada, porque cada tecla
    // ya quedó guardada. No repinta: repintar aquí mataría el foco y el flujo.
    tabla.addEventListener('keydown', ev => {
      if (ev.key !== 'Escape') return;
      const inp = ev.target && ev.target.classList && ev.target.classList.contains('inp-nota') ? ev.target : null;
      if (!inp) return;
      ev.preventDefault();
      inp.blur();
    });

    tabla.querySelectorAll('tbody tr[data-alumno]').forEach(tr => {
      const alumnoId = tr.dataset.alumno;

      // El nombre es el punto de entrada de la exclusión. `stopPropagation`
      // evita que el click llegue al gesto de «ir a la fila» de la tabla.
      const btnNombre = tr.querySelector('.nombre-alumno');
      if (btnNombre) {
        btnNombre.onclick = ev => {
          ev.stopPropagation();
          modalNoRealiza(inst, btnNombre.dataset.alumno, el, volverA, alumnoId);
        };
      }

      tr.querySelectorAll('.inp-nota').forEach(inp => {
        // Único camino para escribir una nota: leer, validar, recortar y guardar
        // EN EL MODELO, y por último pintar desde el modelo. El `max` del HTML es
        // solo una pista del navegador (no impide teclear de más) y `calc.js` NO
        // recorta: si aquí entrara un 7 en un apartado de 1, la nota del
        // instrumento saldría disparada ((7/1)*10 = 70). Por eso el recorte vive
        // aquí, en la única puerta de entrada.
        inp.addEventListener('input', () => {
          const td = inp.closest('td');
          const apartadoId = td.dataset.apartado;
          // El máximo se lee del MODELO (ap.maxPts), no de la propiedad `max` del
          // input: la propiedad no es fiable en todos los entornos y el modelo es
          // la fuente de verdad.
          const ap = inst.apartados.find(a => a.id === apartadoId);
          const max = ap ? parseFloat(ap.maxPts) : NaN;
          const texto = inp.value.trim();
          if (!Storage.db.registros[inst.id]) Storage.db.registros[inst.id] = {};
          if (!Storage.db.registros[inst.id][alumnoId]) Storage.db.registros[inst.id][alumnoId] = {};
          const regAlu = Storage.db.registros[inst.id][alumnoId];
          if (texto === '') {
            delete regAlu[apartadoId];
          } else {
            const num = parseFloat(texto.replace(',', '.'));
            // Un texto que no es un número («-», letras) no es un dato: no se
            // guarda ni se pisa lo que ya hubiera. La celda se marca mientras
            // dure, para no dejar un valor fantasma sin avisar.
            if (isNaN(num) || num < 0) {
              inp.classList.add('nota-invalida');
              notaFila(tr);
              return;
            }
            inp.classList.remove('nota-invalida');
            // Escribir un apartado con valor reactiva al alumno: fuera la
            // marca de «no realiza».
            if (regAlu.noRealiza === true) delete regAlu.noRealiza;
            if (!isNaN(max) && num > max) {
              // No se acepta nunca un valor por encima del máximo: se recorta en
              // el MODELO (no solo en el DOM, que era el fallo del valor fantasma)
              // y se avisa una vez, no en cada tecla.
              regAlu[apartadoId] = max;
              inp.value = max;
              avisarRecorte(max);
            } else {
              regAlu[apartadoId] = num;
            }
          }
          persistir();
          // Nota asignada: fuera el marcado del alumno (ya no está pendiente).
          if (tieneNota(alumnoId)) tr.classList.remove('fila-actual');
          notaFila(tr);
        });
      });

      tr.querySelectorAll('.segmentos button').forEach(btn => {
        btn.onclick = () => {
          const td = btn.closest('td');
          const apartadoId = td.dataset.apartado;
          if (!Storage.db.registros[inst.id]) Storage.db.registros[inst.id] = {};
          if (!Storage.db.registros[inst.id][alumnoId]) Storage.db.registros[inst.id][alumnoId] = {};
          const regAlu = Storage.db.registros[inst.id][alumnoId];
          if (btn.classList.contains('on')) {
            delete regAlu[apartadoId];
            btn.classList.remove('on');
          } else {
            td.querySelectorAll('button.on').forEach(x => x.classList.remove('on'));
            btn.classList.add('on');
            regAlu[apartadoId] = parseFloat(btn.dataset.val);
            // Puntuar un nivel de la rúbrica también reactiva al alumno.
            if (regAlu.noRealiza === true) delete regAlu.noRealiza;
          }
          Storage.save();
          // Nota asignada: fuera el marcado del alumno (ya no está pendiente).
          if (tieneNota(alumnoId)) tr.classList.remove('fila-actual');
          notaFila(tr);
        };
      });

      notaFila(tr);
    });

    const filas = [...tabla.querySelectorAll('tbody tr[data-alumno]')];
    const navInfo = el.querySelector('#nav-info');
    let idx = 0;

    // Al llegar desde fuera (tocar una nota en la Cuadrícula) se arranca en el
    // alumno tocado, no en el primero. Si el id no está en este instrumento
    // (no aplica a ese alumno, p. ej. un nivel ACI) se cae al primero.
    const idxInicial = () => {
      if (!alumnoId) return 0;
      const k = filas.findIndex(tr => tr.dataset.alumno === alumnoId);
      return k < 0 ? 0 : k;
    };

    function pintaNav() {
      if (!filas.length) return;
      const a = alumnos[idx];
      navInfo.innerHTML = `Alumno <b>${idx + 1}</b> de <b>${filas.length}</b> · ${Utils.esc(App.nombreVisible(a))}`;
    }

    function irA(i, opciones) {
      const op = opciones || {};
      if (!filas.length) return;
      idx = Math.max(0, Math.min(filas.length - 1, i));
      // El marcado vive mientras el alumno está pendiente: en cuanto tiene
      // nota asignada, desaparece (petición del docente).
      filas.forEach((tr, k) => tr.classList.toggle('fila-actual', k === idx && !tieneNota(tr.dataset.alumno)));
      if (op.scroll !== false && filas[idx].scrollIntoView) filas[idx].scrollIntoView({ block: 'center', behavior: 'smooth' });
      const primer = filas[idx].querySelector('.inp-nota');
      if (primer && op.foco !== false) primer.focus({ preventScroll: true });
      pintaNav();
    }

    if (filas.length) {
      el.querySelector('#btn-anterior').onclick = () => { Storage.save(); irA(idx - 1); };
      el.querySelector('#btn-siguiente').onclick = () => {
        Storage.save();
        if (idx >= filas.length - 1) {
          // Era el último: fin de la corrección. Se limpia el resaltado y se
          // vuelve al listado (ya no hay «siguiente» que marcar).
          UI.toast('Era el último alumno; notas guardadas');
          return volverA ? volverA() : render(el);
        }
        irA(idx + 1);
      };
      filas.forEach((tr, k) => tr.addEventListener('click', () => irA(k, { scroll: false, foco: false })));
      // Si venimos de tocar una nota concreta, hay que dejar visible ese alumno
      // (puede ser el 20 de 25); si no, se mantiene el arranque sin scroll.
      irA(idxInicial(), alumnoId ? { foco: false } : { scroll: false, foco: false });
    } else {
      const barra = el.querySelector('#barra-nav');
      if (barra) barra.remove();
    }
  }

  function duplicarInstrumento(inst) {
    const niveles = Calc.nivelesAciDeClase(inst.claseId).filter(n => n.codigo !== inst.nivel);
    const cuerpo = niveles.length ? `
      <div class="aviso">Se creará una copia de <b>${Utils.esc(inst.titulo)}</b> (mismos apartados y criterios${inst.unidad ? `, misma unidad <b>${Utils.esc(inst.unidad)}</b>` : ''}) por cada nivel marcado, con las notas en blanco.</div>
      <label class="campo"><span>Nivel(es) de la copia</span>
        <div class="chips" data-campo="niveles-dup">${niveles.map(n =>
          `<label class="chip"><input type="checkbox" value="${Utils.esc(n.codigo)}">${Utils.esc(n.etiqueta || n.codigo)}</label>`).join('')}</div>
      </label>`
      : '<div class="aviso">Esta clase no tiene niveles ACI disponibles. Añádelos con el botón <b>ACI</b> en «Asignaturas y clases».</div>';
    const mbody = UI.openModal({
      titulo: 'Examen paralelo',
      cuerpo,
      textoGuardar: niveles.length ? 'Crear copias' : 'Cerrar',
      alGuardar(body) {
        if (!niveles.length) return;
        const elegidos = UI.valoresChips(body.querySelector('[data-campo=niveles-dup]'));
        if (!elegidos.length) { alert('Marca al menos un nivel'); return false; }
        const copias = elegidos.map(codigo => {
          const copia = {
            id: Utils.uid(),
            claseId: inst.claseId,
            tipo: inst.tipo,
            titulo: `${inst.titulo} (${Calc.etiquetaNivel(inst.claseId, codigo)})`,
            fecha: inst.fecha,
            periodo: inst.periodo,
            saberes: inst.saberes,
            unidad: inst.unidad,
            nivel: codigo,
            niveles: (inst.niveles || []).map(n => ({ pct: n.pct, descriptor: n.descriptor })),
            criteriosModo: inst.criteriosModo || 'desglosado',
            criterioIdsGlobal: (inst.criterioIdsGlobal || []).slice(),
            apartados: (inst.apartados || []).map(ap => ({
              id: Utils.uid(),
              orden: ap.orden,
              descripcion: ap.descripcion,
              maxPts: ap.maxPts,
              criterioIds: (ap.criterioIds || []).slice(),
              peso: ap.peso,
              niveles: (ap.niveles || []).map(n => ({ pct: n.pct, descriptor: n.descriptor }))
            }))
          };
          // La copia cambia de nivel: sus criterios deben ser los del currículo
          // de ese nivel, no los del original (puede ser de otro ciclo). Se
          // reapuntan por número de criterio; las notas nacen en blanco.
          Calc.repararCriteriosDeInstrumento(Storage.db, copia);
          return copia;
        });
        const sinPar = copias.filter(c => Calc.criteriosFueraDeNivel(Storage.db, c).length);
        if (sinPar.length) {
          alert('No se puede crear el examen paralelo de: ' +
            sinPar.map(c => Calc.etiquetaNivel(inst.claseId, c.nivel)).join(', ') +
            '.\n\nAlguno de los criterios del original no tiene equivalente en ese currículo. ' +
            'Crea esos criterios en «Currículo» (o duplica a un nivel con la misma estructura) y vuelve a intentarlo.');
          return false;
        }
        copias.forEach(c => Storage.db.instrumentos.push(c));
        Storage.save();
        UI.toast('Creado(s): ' + copias.map(c => c.titulo).join(', '));
      }
    });
    UI.wireChips(mbody);
  }

  // Texto de ayuda con los descriptores de un ítem (para el title de la corrección).
  function descripcionNiveles(inst, ap) {
    return Calc.nivelesDeApartado(inst, ap)
      .map((nv, k) => `Nivel ${k + 1} (${nv.pct}%): ${nv.descriptor || '—'}`)
      .join(' · ');
  }

  // Instrucciones listas para pegar en cualquier chat de IA (plantillas/rubrica-para-ia.md).
  // Los huecos (___) son para que cada docente los rellene a su gusto.
  function promptIa(asignatura, criterios) {
    const codigos = criterios.length
      ? criterios.map(c => `  - ${c.codigo} — ${c.descripcion}`).join('\n')
      : '  (Esta asignatura aún no tiene criterios: créalos en la vista Currículo.)';
    return `Actúa como docente experto en evaluación por rúbricas conforme a la LOMLOE (Primaria, Cantabria). Genera una rúbrica a partir de mis datos.

Devuelve EXCLUSIVAMENTE un objeto JSON válido, sin texto antes ni después y sin comentarios:

{
  "tipo": "rubrica-evalcrit",
  "version": 1,
  "titulo": "___",
  "unidad": "___",
  "nivel": "",
  "items": [
    {
      "criterio": "___",
      "peso": 1,
      "criterios": ["CODIGO"],
      "niveles": [
        { "pct": 25, "descriptor": "___" },
        { "pct": 50, "descriptor": "___" },
        { "pct": 75, "descriptor": "___" },
        { "pct": 100, "descriptor": "___" }
      ]
    }
  ]
}

Reglas:
- Cada ítem lleva exactamente 4 niveles (pct 25, 50, 75 y 100), de más bajo a más alto.
- "criterio" es el nombre del ítem evaluado (texto breve, en español).
- "peso" es un número mayor que 0: la importancia relativa del ítem.
- "criterios" solo puede usar códigos de la lista de abajo.
- Cada "descriptor" describe qué hace el alumno en ese nivel, con lenguaje observable.

MIS DATOS
- Asignatura: ${asignatura}   Curso: ___
- Ítems que quiero evaluar: ___
- Nivel ACI (déjalo vacío si es para todo el alumnado): ___
- Criterios disponibles (usa SOLO estos códigos):
${codigos}`;
  }

  function copiarAlPortapapeles(texto) {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(texto).then(() => true).catch(() => false);
    }
    return Promise.resolve(false);
  }

  // Importa una rúbrica pegada desde cualquier chat de IA (P-08). Se puede abrir
  // desde el listado o al crear un instrumento de tipo rúbrica (clase/periodo ya
  // elegidos, para no volver a preguntarlos).
  function modalImportarRubrica(claseIdIni, periodoIni) {
    const claseId = claseIdIni || claseSel;
    if (!claseId || !Calc.clase(claseId)) { alert('Primero selecciona una clase'); return; }
    const asig = Calc.asignaturaDeClase(claseId);
    if (!asig) { alert('Error: esta clase no tiene asignatura asociada'); return; }
    const criterios = Calc.criteriosDeClase(claseId);
    const prompt = promptIa(asig.nombre, criterios);
    const mbody = UI.openModal({
      titulo: 'Importar rúbrica creada con IA',
      cuerpo: `
        <div class="aviso">
          Pide la rúbrica a un chat (ChatGPT, Claude, Gemini…): copia las <b>instrucciones</b> de
          abajo, pégalas allí, rellena los huecos <code>___</code> y trae de vuelta su respuesta.
        </div>
        <label class="campo"><span>1 · Instrucciones para la IA (rellena los huecos)</span>
          <textarea id="ia-prompt" rows="9" readonly></textarea></label>
        <div class="acciones" style="margin:-6px 0 12px">
          <button type="button" class="btn btn-mini btn-primario" id="btn-copiar-prompt">Copiar instrucciones</button>
          <button type="button" class="btn btn-mini" id="btn-descargar-prompt">Descargar .txt</button>
          ${criterios.length ? '' : '<small style="align-self:center;color:var(--ko)">No hay criterios en esta asignatura: impórtalos antes desde Currículo.</small>'}
        </div>
        <label class="campo"><span>2 · Respuesta de la IA (pégala aquí)</span>
          <textarea id="ia-json" rows="9" placeholder='{ "tipo": "rubrica-evalcrit", ... }'></textarea></label>
        <label class="campo"><span>Periodo</span>
          <select id="ia-periodo">${PERIODOS.map(p => `<option ${p === periodoIni ? 'selected' : ''}>${p}</option>`).join('')}</select></label>
        <div class="aviso" style="margin:0">
          Se creará una rúbrica en <b>${Utils.esc(asig.nombre)}</b> con tantos ítems y niveles como traiga el texto.
          Si algún código de criterio no existe, no se importará nada y te lo diremos.
        </div>`,
      textoGuardar: 'Importar rúbrica',
      alGuardar(body) {
        const texto = body.querySelector('#ia-json').value.trim();
        if (!texto) { alert('Pega antes la respuesta de la IA.'); return false; }
        let datos;
        try { datos = JSON.parse(texto); }
        catch (e) { alert('El texto pegado no es un JSON válido. Copia la respuesta COMPLETA de la IA, desde la primera llave { hasta la última }.'); return false; }
        try {
          const r = Storage.importarRubrica(datos, claseId, body.querySelector('#ia-periodo').value);
          UI.toast(`Rúbrica importada: ${r.titulo} (${r.items} ítems)`);
        } catch (e) { alert(e.message); return false; }
      }
    });
    mbody.querySelector('#ia-prompt').value = prompt;
    mbody.querySelector('#btn-copiar-prompt').onclick = () => {
      const ta = mbody.querySelector('#ia-prompt');
      copiarAlPortapapeles(prompt).then(ok => {
        if (ok) { UI.toast('Instrucciones copiadas: pégalas en el chat'); return; }
        // Reserva sin permiso de portapapeles: seleccionamos el texto para Ctrl+C.
        ta.removeAttribute('readonly');
        ta.focus();
        ta.select();
        let copiado = false;
        try { copiado = document.execCommand('copy'); } catch (e) { copiado = false; }
        ta.setAttribute('readonly', '');
        UI.toast(copiado ? 'Instrucciones copiadas' : 'Ya está seleccionado: pulsa Ctrl+C (o mantén pulsado y Copiar)');
      });
    };
    mbody.querySelector('#btn-descargar-prompt').onclick = () => {
      const blob = new Blob([prompt], { type: 'text/plain;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'instrucciones-rubrica.txt';
      document.body.appendChild(a);
      a.click();
      a.remove();
    };
  }

  // Vista «Corregir» (sección propia, Fase 2b): la cola de pendientes de la
  // clase. Reutiliza el selector de clase de `render` y las filas de
  // `filasCorregirHtml` (con el badge de estado a la derecha). Al corregir
  // un instrumento, «Volver» regresa a esta cola.
  function renderCorregir(el) {
    const db = Storage.db;
    if (!claseSel || !Calc.clase(claseSel)) claseSel = db.clases.length ? db.clases[0].id : null;

    if (!db.clases.length) {
      el.innerHTML = `<section class="card"><div class="vacio-grande">
        <strong>No hay clases todavía</strong>
        Crea una asignatura y una clase para empezar a evaluar.
        <div class="acciones" style="justify-content:center;margin-top:12px">
          <button class="btn btn-primario" id="btn-ir-evaluacion">Ir a Evaluación</button>
        </div>
      </div></section>`;
      const btnEval = el.querySelector('#btn-ir-evaluacion');
      // «Evaluación» es una sección del menú (agrupa la cuadrícula), no una
      // vista: se abre por su sección, con la pestaña de la cuadrícula.
      if (btnEval) btnEval.onclick = () => App.irSeccion('evaluacion');
      return;
    }

    const lista = Calc.instrumentosPorCorregir(claseSel);
    const pendientes = lista.reduce((s, i) => s + Calc.progresoInstrumento(i).pendientes, 0);
    // La cola separa lo que falta de lo terminado: los instrumentos completos
    // (y los sin alumnado) van en un desplegable cerrado, al final.
    const porHacer = [];
    const hechos = [];
    lista.forEach(i => {
      (Calc.progresoInstrumento(i).pendientes > 0 ? porHacer : hechos).push(i);
    });
    let cuerpo = '';
    if (!lista.length) {
      cuerpo = '<div class="aviso">Esta clase todavía no tiene instrumentos. Créalos en «Instrumentos».</div>';
    } else {
      cuerpo = porHacer.length ? filasCorregirHtml(porHacer)
        : '<div class="aviso">Nada pendiente: todo está corregido.</div>';
      if (hechos.length) {
        cuerpo += `
        <details class="completos-corrige">
          <summary>Instrumentos completos · ${hechos.length}</summary>
          ${filasCorregirHtml(hechos)}
        </details>`;
      }
    }
    el.innerHTML = `
      <section class="card">
        <div class="card-head">
          <h2>Corregir${pendientes ? ` <small class="sub">${pendientes} pendiente${pendientes === 1 ? '' : 's'}</small>` : ''}</h2>
          <select id="sel-clase" style="max-width:280px">${UI.selectHtml(db.clases.map(c => ({
            id: c.id,
            nombre: `${Calc.asignaturaDeClase(c.id)?.nombre || '?'} · ${(Calc.byId(db.grupos, c.grupoId) || {}).nombre || '?'}`
          })), claseSel, 'id', 'nombre')}</select>
        </div>
        <p class="hint">Instrumentos de esta clase, con lo que queda por corregir. Toca uno para corregirlo.</p>
        ${cuerpo}
      </section>`;

    el.querySelector('#sel-clase').onchange = e => { claseSel = e.target.value; renderCorregir(el); };
    el.querySelectorAll('.fila-corrige').forEach(b => {
      b.onclick = () => renderCorreccion(el, b.dataset.inst, () => renderCorregir(el));
    });
  }

  function render(el) {
    const db = Storage.db;
    if (!claseSel || !Calc.clase(claseSel)) claseSel = db.clases.length ? db.clases[0].id : null;

    if (!db.clases.length) {
      el.innerHTML = `<section class="card"><div class="vacio-grande">
        <strong>No hay clases todavía</strong>
        Crea una asignatura y una clase para empezar a evaluar.
        <div class="acciones" style="justify-content:center;margin-top:12px">
          <button class="btn btn-primario" id="btn-ir-clases">Ir a Asignaturas y clases</button>
        </div>
      </div></section>`;
      const btnClas = el.querySelector('#btn-ir-clases');
      if (btnClas) btnClas.onclick = () => App.ir('clases');
      return;
    }

    const lista = instrumentosDe();
    const visibles = perSel === 'Todos' ? lista : lista.filter(i => i.periodo === perSel);
    const periodosMostrados = perSel === 'Todos' ? PERIODOS : [perSel];

    const secciones = periodosMostrados.map(p => {
      const delPeriodo = visibles.filter(i => i.periodo === p);
      const uds = Calc.unidadesDe(delPeriodo);
      const grupos = uds.map(u => ({ u, insts: Calc.instrumentosDeUnidad(delPeriodo, u) }));
      const sinUnidad = delPeriodo.filter(i => !i.unidad);
      if (sinUnidad.length) grupos.push({ u: '', insts: sinUnidad });

      const titulo = perSel === 'Todos'
        ? `<h3 class="per-titulo">${p} <small>${delPeriodo.length} instrumento${delPeriodo.length === 1 ? '' : 's'}</small></h3>`
        : '';
      const cuerpo = grupos.length
        ? grupos.map(g => bloqueUnidad(p, g.u, g.insts)).join('')
        : `<div class="aviso">Sin instrumentos en ${p}.</div>`;
      return titulo + cuerpo;
    }).join('');

    const selPer = `<select id="sel-per" title="Ver un trimestre concreto" style="max-width:190px">
      <option value="Todos" ${perSel === 'Todos' ? 'selected' : ''}>Todos los trimestres</option>
      ${PERIODOS.map(p => `<option value="${p}" ${perSel === p ? 'selected' : ''}>${p}</option>`).join('')}
    </select>`;

    el.innerHTML = `
      <section class="card">
        <div class="card-head">
          <h2>Instrumentos de evaluación</h2>
          <select id="sel-clase" style="max-width:280px">${UI.selectHtml(db.clases.map(c => ({
            id: c.id,
            nombre: `${Calc.asignaturaDeClase(c.id)?.nombre || '?'} · ${(Calc.byId(db.grupos, c.grupoId) || {}).nombre || '?'}`
          })), claseSel, 'id', 'nombre')}</select>
          ${lista.length ? selPer : ''}
          <div class="acciones">
            <button class="btn btn-primario" id="add-inst">Nuevo instrumento</button>
            <button class="btn" id="btn-banco" title="Reutilizar un instrumento guardado (otra clase o el curso siguiente)">Añadir desde el banco${(db.bancoInstrumentos || []).length ? ' (' + db.bancoInstrumentos.length + ')' : ''}</button>
          </div>
        </div>
        ${lista.length ? secciones : '<div class="aviso">Sin instrumentos en esta clase.</div>'}
      </section>`;

    el.querySelector('#sel-clase').onchange = e => { claseSel = e.target.value; perSel = 'Todos'; udsAbiertas.clear(); render(el); };
    if (el.querySelector('#sel-per')) {
      el.querySelector('#sel-per').onchange = e => { perSel = e.target.value; render(el); };
    }
    el.querySelector('#add-inst').onclick = () => modalInstrumento(null);
    el.querySelector('#btn-banco').onclick = () => modalBanco(el);

    el.querySelectorAll('[data-ud-clave]').forEach(b => {
      b.onclick = () => {
        const clave = b.dataset.udClave;
        if (udsAbiertas.has(clave)) udsAbiertas.delete(clave); else udsAbiertas.add(clave);
        render(el);
      };
    });

    el.querySelectorAll('tr[data-inst]').forEach(tr => {
      const inst = Calc.instrumento(tr.dataset.inst);
      tr.querySelector('.corregir').onclick = () => renderCorreccion(el, inst.id);
      tr.querySelector('.mas-acciones').onclick = () => accionesInstrumento(el, inst);
    });
  }

  // API pública de la vista: las demás vistas solo deben usar esto (D-29).
  // `toggleNoRealiza` es la única puerta de la exclusión: la Cuadrícula la usa
  // desde su menú contextual de celda (M-09).
  return { render, renderCorregir, renderCorreccion, toggleNoRealiza, modalInstrumento, modalCalificar, filasCorregirHtml, filaApartado, cabeceraRubrica, plantillaColumnas, columnasNivel, promptIa, datalistUnidades, modalBanco };
})();
