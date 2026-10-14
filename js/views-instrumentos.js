const InstrumentosView = (() => {
  let claseSel = null;
  const TIPOS = ['Control', 'Rúbrica', 'Proyecto', 'Otro'];
  const PERIODOS = ['T1', 'T2', 'T3'];

  function instrumentosDe() {
    return Storage.db.instrumentos
      .filter(i => i.claseId === claseSel)
      .sort((a, b) => (String(a.unidad || '').localeCompare(String(b.unidad || ''), 'es'))
        || (a.fecha || '').localeCompare(b.fecha || ''));
  }

  function apartadosHtml(inst, asignaturaId, esRubrica) {
    return (inst ? inst.apartados : []).map(ap => filaApartado(ap, asignaturaId, esRubrica)).join('');
  }

  function filaApartado(ap, asignaturaId, esRubrica, modoGlobal) {
    const peso = ap.peso != null ? ap.peso : (esRubrica ? 1 : ap.maxPts);
    return `
      <div class="apartado-fila" data-id="${ap.id}">
        <span class="num-ap"></span>
        <input type="text" class="ap-desc" placeholder="Pregunta, parte o fase" value="${Utils.esc(ap.descripcion)}">
        ${esRubrica
          ? `<input type="number" class="ap-peso" min="0.01" step="0.5" value="${peso}" title="Peso de esta fila en la rúbrica">`
          : `<input type="number" class="ap-max" min="0.5" step="0.5" value="${ap.maxPts}" title="Puntos máximos">`}
        ${esRubrica ? '<small style="color:var(--tinta-suave)">peso</small>' : ''}
        ${modoGlobal
          ? '<small style="color:var(--tinta-suave)">aplica criterios globales</small>'
          : `<button type="button" class="btn btn-mini toggle-crit" title="Elegir criterios evaluados">Criterios</button>`}
        <button type="button" class="btn btn-mini quitar-ap">Quitar</button>
        ${modoGlobal ? '' : `<div class="zona-crit" style="display:none">${UI.chipsCriterios(asignaturaId, ap.criterioIds)}</div>`}
      </div>`;
  }

  function modalInstrumento(inst, claseIdFijo) {
    const db = Storage.db;
    if (!inst && !claseIdFijo && !claseSel) { alert('Primero selecciona una clase'); return; }
    const claseId = inst ? inst.claseId : (claseIdFijo || claseSel);
    const asig = Calc.asignaturaDeClase(claseId);
    if (!asig) { alert('Error: esta clase no tiene asignatura asociada'); return; }
    const esNueva = !inst;
    const tipoIni = inst ? inst.tipo : 'Control';
    const nivelesAci = Calc.nivelesAciDeClase(claseId);
    const nivelIni = inst ? (inst.nivel || '') : '';
    const opcionesNivel = '<option value="">Común (todo el alumnado)</option><option value="BASE"' + (nivelIni === 'BASE' ? ' selected' : '') + '>Base (sin adaptación)</option>'
      + nivelesAci.map(n => `<option value="${Utils.esc(n.codigo)}" ${nivelIni === n.codigo ? 'selected' : ''}>${Utils.esc(n.etiqueta || n.codigo)}</option>`).join('');
    UI.openModal({
      titulo: esNueva ? 'Nuevo instrumento' : 'Editar instrumento',
      cuerpo: `
        <div class="fila-campos">
          <label class="campo"><span>Tipo</span>
            <select id="f-tipo">${TIPOS.map(t => `<option ${t === tipoIni ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
          <label class="campo"><span>Periodo</span>
            <select id="f-periodo">${PERIODOS.map(p => `<option ${inst && inst.periodo === p ? 'selected' : ''}>${p}</option>`).join('')}</select></label>
          <label class="campo"><span>Fecha</span>
            <input type="date" id="f-fecha" value="${inst ? inst.fecha : Utils.hoy()}"></label>
        </div>
        <label class="campo"><span>Título</span>
          <input type="text" id="f-titulo" value="${Utils.esc(inst ? inst.titulo : '')}" placeholder="Ej. Control de unidades 1-3"></label>
        <div class="fila-campos">
          <label class="campo"><span>Unidad (agrupa exámenes del mismo tema)</span>
            <input type="text" id="f-unidad" value="${Utils.esc(inst ? (inst.unidad || '') : '')}" placeholder="Ej. UD5"></label>
          ${nivelesAci.length ? `<label class="campo"><span>Nivel ACI</span>
            <select id="f-nivel">${opcionesNivel}</select></label>` : '<input type="hidden" id="f-nivel" value="">'}
        </div>
        <div class="fila-campos" id="fila-critmodo" style="margin-bottom:10px">
          <label class="campo"><span>Criterios</span>
            <select id="f-critmodo">
              <option value="desglosado" ${(inst && inst.criteriosModo) === 'desglosado' ? 'selected' : (!inst ? 'selected' : '')}>Desglosado (por apartado/parte)</option>
              <option value="global" ${(inst && inst.criteriosModo) === 'global' ? 'selected' : ''}>Global al instrumento</option>
            </select>
          </label>
        </div>
        <label class="campo"><span>Saberes básicos (informativo)</span>
          <textarea id="f-saberes" rows="2" placeholder="Opcional">${Utils.esc(inst ? inst.saberes : '')}</textarea></label>

        <div id="bloque-niveles" style="display:none">
          <label class="campo"><span>Niveles de la rúbrica (% y descriptor)</span><div id="lista-niveles"></div></label>
          <button class="btn btn-mini" type="button" id="add-nivel">Añadir nivel</button>
        </div>

        <div id="bloque-criterios-global" style="display:none">
          <label class="campo"><span>Criterios de evaluación que se trabajan</span>
            <div id="chips-criterios-global"></div>
          </label>
        </div>

        <label class="campo"><span>Apartados y criterios que evalúan</span>
          <small id="hint-asig-crit" style="display:block;color:var(--tinta-suave)"></small>
          <div id="lista-apartados"></div>
        </label>
        <button class="btn btn-mini" type="button" id="add-ap">Añadir apartado</button>`,
      textoGuardar: esNueva ? 'Crear' : 'Guardar cambios',
      alGuardar(body) {
        const titulo = body.querySelector('#f-titulo').value.trim();
        const tipo = body.querySelector('#f-tipo').value;
        const periodo = body.querySelector('#f-periodo').value;
        const fecha = body.querySelector('#f-fecha').value || Utils.hoy();
        const saberes = body.querySelector('#f-saberes').value.trim();
        const unidad = body.querySelector('#f-unidad').value.trim();
        const nivel = (body.querySelector('#f-nivel') || {}).value || '';
        const esRubrica = tipo === 'Rúbrica';
        const niveles = Array.from(body.querySelectorAll('.nivel-fila')).map(f => ({
          pct: parseFloat(f.querySelector('.nv-pct').value),
          descriptor: f.querySelector('.nv-desc').value.trim()
        })).filter(n => !isNaN(n.pct));
        if (esRubrica && niveles.length < 2) { alert('La rúbrica necesita al menos dos niveles'); return false; }

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
          apartados.push({
            id: fila.dataset.id && fila.dataset.id !== 'nuevo' ? fila.dataset.id : Utils.uid(),
            orden, descripcion: desc, maxPts, criterioIds,
            peso: (isNaN(peso) || peso <= 0) ? 1 : peso
          });
        }
        if (!apartados.length) { alert('Añade al menos un apartado'); return false; }
        const criterioIdsGlobal = UI.valoresChips(body.querySelector('[data-campo="criterios-global"]') || body);
        if (esModoGlobal && !criterioIdsGlobal.length) { alert('Selecciona al menos un criterio global en el bloque superior'); return false; }

        if (esNueva) {
          Storage.db.instrumentos.push({ id: Utils.uid(), claseId, tipo, titulo, fecha, periodo, saberes, unidad, nivel, niveles, apartados, criteriosModo, criterioIdsGlobal });
        } else {
          Object.assign(inst, { tipo, titulo, fecha, periodo, saberes, unidad, nivel, niveles, apartados, criteriosModo, criterioIdsGlobal });
        }
        Storage.save();
      }
    });

    const body = document.querySelector('.modal-body');
    const selTipo = body.querySelector('#f-tipo');
    const listaAp = body.querySelector('#lista-apartados');
    const listaNv = body.querySelector('#lista-niveles');
    const chipsGlobal = body.querySelector('#chips-criterios-global');
    chipsGlobal.innerHTML = UI.chipsCriterios(asig.id, inst ? (inst.criterioIdsGlobal || []) : []);
    UI.wireChips(chipsGlobal);

    function refrescaNumeros() {
      body.querySelectorAll('.num-ap').forEach((n, i) => { n.textContent = i + 1 + '.'; });
    }

    function addFilaNivel(n) {
      const div = document.createElement('div');
      div.className = 'nivel-fila';
      div.innerHTML = `
        <input type="number" class="nv-pct" min="0" max="100" step="5" value="${n ? n.pct : ''}" placeholder="%">
        <input type="text" class="nv-desc" value="${n ? Utils.esc(n.descriptor) : ''}" placeholder="Descriptor del nivel">
        <button class="icon-btn quitar-nv" type="button">×</button>`;
      div.querySelector('.quitar-nv').onclick = () => div.remove();
      listaNv.appendChild(div);
    }

    function actualizaEtiquetaCrit(fila) {
      const zona = fila.querySelector('.zona-crit');
      if (!zona) return;
      const n = zona.querySelectorAll('input:checked').length;
      fila.querySelector('.toggle-crit').textContent = 'Criterios (' + n + ')';
    }

    function addFilaApartado(ap, nivel) {
      const esRubrica = selTipo.value === 'Rúbrica';
      const modoGlobal = !esRubrica && (body.querySelector('#f-critmodo') || {}).value === 'global';
      const asigCrit = Calc.asignaturaDeNivel(claseId, nivel || (body.querySelector('#f-nivel') || {}).value || '');
      const div = document.createElement('div');
      div.innerHTML = filaApartado(ap || { id: 'nuevo', descripcion: '', maxPts: '', criterioIds: [] }, asigCrit ? asigCrit.id : asig.id, esRubrica, modoGlobal).trim();
      const fila = div.firstElementChild;
      fila.querySelector('.quitar-ap').onclick = () => { fila.remove(); refrescaNumeros(); };
      if (fila.querySelector('.toggle-crit')) {
        fila.querySelector('.toggle-crit').onclick = () => {
          const zona = fila.querySelector('.zona-crit');
          zona.style.display = zona.style.display === 'none' ? '' : 'none';
        };
      }
      UI.wireChips(fila);
      fila.querySelectorAll('.chip input').forEach(inp =>
        inp.addEventListener('change', () => actualizaEtiquetaCrit(fila)));
      actualizaEtiquetaCrit(fila);
      listaAp.appendChild(fila);
      refrescaNumeros();
    }

    function refrescaTipo() {
      const esRubrica = selTipo.value === 'Rúbrica';
      const critmodo = (body.querySelector('#f-critmodo') || {}).value || 'desglosado';
      body.querySelector('#bloque-niveles').style.display = esRubrica ? '' : 'none';
      body.querySelector('#bloque-criterios-global').style.display = (critmodo === 'global' && !esRubrica) ? '' : 'none';
      body.querySelector('#fila-critmodo').style.display = esRubrica ? 'none' : '';
      const actuales = Array.from(listaAp.querySelectorAll('.apartado-fila')).map((fila, i) => ({
        id: fila.dataset.id,
        descripcion: fila.querySelector('.ap-desc').value,
        criterioIds: UI.valoresChips(fila.querySelector('.zona-crit')),
        maxPts: esRubrica ? 100 : parseFloat((fila.querySelector('.ap-max') || {}).value),
        peso: fila.querySelector('.ap-peso') ? parseFloat(fila.querySelector('.ap-peso').value) : null
      }));
      listaAp.innerHTML = '';
      actuales.forEach(a => addFilaApartado(a));
    }

    function refrescaNivel() {
      const selNivel = body.querySelector('#f-nivel');
      const nivel = selNivel ? selNivel.value : '';
      const asigCrit = Calc.asignaturaDeNivel(claseId, nivel);
      const hint = body.querySelector('#hint-asig-crit');
      if (hint) hint.textContent = 'Criterios del currículo de ' + (asigCrit ? asigCrit.nombre : '') +
        (nivel && nivel !== 'BASE' ? ' (nivel ' + Calc.etiquetaNivel(claseId, nivel) + ')' : '');
      const esRubrica = selTipo.value === 'Rúbrica';
      const actuales = Array.from(listaAp.querySelectorAll('.apartado-fila')).map((fila, i) => ({
        id: fila.dataset.id,
        descripcion: fila.querySelector('.ap-desc').value,
        criterioIds: UI.valoresChips(fila.querySelector('.zona-crit')),
        maxPts: esRubrica ? 100 : parseFloat((fila.querySelector('.ap-max') || {}).value),
        peso: fila.querySelector('.ap-peso') ? parseFloat(fila.querySelector('.ap-peso').value) : null
      }));
      listaAp.innerHTML = '';
      actuales.forEach(a => addFilaApartado(a, nivel));
      chipsGlobal.innerHTML = UI.chipsCriterios(asigCrit ? asigCrit.id : asig.id, inst ? (inst.criterioIdsGlobal || []) : []);
      UI.wireChips(chipsGlobal);
    }
    selTipo.onchange = refrescaTipo;
    if (body.querySelector('#f-critmodo')) body.querySelector('#f-critmodo').onchange = refrescaTipo;
    const selNivelEl = body.querySelector('#f-nivel');
    if (selNivelEl) selNivelEl.onchange = refrescaNivel;
    body.querySelector('#add-ap').onclick = () => addFilaApartado(null);
    body.querySelector('#add-nivel').onclick = () => addFilaNivel(null);

    if (esNueva) {
      [100, 75, 50, 25].forEach(p => addFilaNivel({ pct: p, descriptor: '' }));
      addFilaApartado(null);
    } else {
      (inst.niveles && inst.niveles.length ? inst.niveles.slice().sort((a, b) => b.pct - a.pct) : []).forEach(addFilaNivel);
      inst.apartados.forEach(a => addFilaApartado(a, inst.nivel));
    }
    refrescaNivel();
  }

  function borrarInstrumento(el, inst) {
    if (!confirm(`¿Eliminar "${inst.titulo}" y todas sus notas?`)) return;
    delete Storage.db.registros[inst.id];
    Storage.db.instrumentos = Storage.db.instrumentos.filter(i => i.id !== inst.id);
    Storage.save();
    render(el);
  }

  function renderCorreccion(el, instId) {
    const inst = Calc.instrumento(instId);
    if (!inst) { render(el); return; }
    const alumnos = Calc.alumnosDeInstrumento(inst);
    const esRubrica = inst.tipo === 'Rúbrica';
    const niveles = (inst.niveles || []).slice().sort((a, b) => b.pct - a.pct);

    el.innerHTML = `
      <section class="card no-print">
        <div class="card-head">
          <h2>${Utils.esc(inst.titulo)}</h2>
          <button class="btn" id="volver">Volver</button>
        </div>
        <div class="chips" style="margin-bottom:10px">
          <span class="badge info">${Utils.esc(inst.tipo)}</span>
          <span class="badge info">${Utils.esc(inst.periodo)}</span>
          ${inst.unidad ? `<span class="badge info">${Utils.esc(inst.unidad)}</span>` : ''}
          ${inst.nivel ? `<span class="badge info">Nivel ${Utils.esc(Calc.etiquetaNivel(inst.claseId, inst.nivel))}</span>` : ''}
          <span class="badge na">${inst.apartados.length} ${inst.tipo === 'Proyecto' ? 'partes/fases' : 'apartados'}</span>
          ${esRubrica ? '<small style="align-self:center;color:var(--tinta-suave)">Toca un nivel para puntuar; tócalo otra vez para vaciar.</small>' : ''}
        </div>
        <div class="barra-correccion no-print" id="barra-nav">
          <button class="btn btn-mini" id="btn-anterior">← Anterior</button>
          <span id="nav-info"></span>
          <button class="btn btn-mini btn-primario" id="btn-siguiente">Guardar y siguiente →</button>
        </div>
        <div class="scroll-x">
          <table class="tabla" id="tabla-corrige">
            <thead><tr><th>Alumno</th>${inst.apartados.map(ap =>
              `<th title="${Utils.esc(ap.descripcion)}">${Utils.esc(ap.descripcion)}<br><small>${esRubrica ? '%' : 'sobre ' + Utils.fmt(ap.maxPts)}</small></th>`
            ).join('')}<th>Nota</th></tr></thead>
            <tbody>
              ${alumnos.map(a => {
                const reg = (Storage.db.registros[inst.id] || {})[a.id] || {};
                return `<tr data-alumno="${a.id}">
                  <td>${Utils.esc(a.apellidos)}, ${Utils.esc(a.nombre)}</td>
                  ${inst.apartados.map(ap => `
                    <td data-apartado="${ap.id}">
                      ${esRubrica
                        ? `<div class="segmentos">${niveles.map(nv => {
                            const on = Number(reg[ap.id]) === nv.pct ? 'on' : '';
                            return `<button type="button" class="${on}" data-val="${nv.pct}" title="${Utils.esc(nv.descriptor)}">${nv.pct}</button>`;
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
      </section>
      <p class="no-print" style="color:var(--tinta-suave);font-size:13px">
        La nota mostrada es la del instrumento (informativa). Las ponderaciones por criterio se aplican en la Cuadrícula.
      </p>`;

    el.querySelector('#volver').onclick = () => render(el);

    const tabla = el.querySelector('#tabla-corrige');

    function notaFila(tr) {
      const alumnoId = tr.dataset.alumno;
      const n = Calc.notaInstrumento(inst, alumnoId);
      tr.querySelector('.celda-nota-final').innerHTML = Calc.badgeHtml(n);
    }

    const persistir = Utils.debounce(() => Storage.save(), 400);

    tabla.querySelectorAll('tbody tr[data-alumno]').forEach(tr => {
      const alumnoId = tr.dataset.alumno;

      tr.querySelectorAll('.inp-nota').forEach(inp => {
        inp.addEventListener('input', () => {
          const apartadoId = inp.closest('td').dataset.apartado;
          const v = inp.value.trim();
          if (!Storage.db.registros[inst.id]) Storage.db.registros[inst.id] = {};
          if (!Storage.db.registros[inst.id][alumnoId]) Storage.db.registros[inst.id][alumnoId] = {};
          const regAlu = Storage.db.registros[inst.id][alumnoId];
          if (v === '') delete regAlu[apartadoId];
          else {
            const num = parseFloat(v.replace(',', '.'));
            if (isNaN(num) || num < 0) return;
            regAlu[apartadoId] = num;
          }
          persistir();
          notaFila(tr);
        });
        inp.addEventListener('change', () => {
          if (inp.value.trim() !== '') {
            const num = parseFloat(inp.value.replace(',', '.'));
            if (!isNaN(num) && num >= 0) {
              const max = parseFloat(inp.max);
              if (!isNaN(max) && num > max) inp.value = max;
            }
          }
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
          }
          Storage.save();
          notaFila(tr);
        };
      });

      notaFila(tr);
    });

    const filas = [...tabla.querySelectorAll('tbody tr[data-alumno]')];
    const navInfo = el.querySelector('#nav-info');
    let idx = 0;

    function pintaNav() {
      if (!filas.length) return;
      const a = alumnos[idx];
      navInfo.innerHTML = `Alumno <b>${idx + 1}</b> de <b>${filas.length}</b> · ${Utils.esc(a.apellidos)}, ${Utils.esc(a.nombre)}`;
    }

    function irA(i, opciones) {
      const op = opciones || {};
      if (!filas.length) return;
      idx = Math.max(0, Math.min(filas.length - 1, i));
      filas.forEach((tr, k) => tr.classList.toggle('fila-actual', k === idx));
      if (op.scroll !== false) filas[idx].scrollIntoView({ block: 'center', behavior: 'smooth' });
      const primer = filas[idx].querySelector('.inp-nota');
      if (primer && op.foco !== false) primer.focus({ preventScroll: true });
      pintaNav();
    }

    if (filas.length) {
      el.querySelector('#btn-anterior').onclick = () => { Storage.save(); irA(idx - 1); };
      el.querySelector('#btn-siguiente').onclick = () => {
        Storage.save();
        if (idx >= filas.length - 1) UI.toast('Era el último alumno; notas guardadas');
        irA(idx + 1);
      };
      filas.forEach((tr, k) => tr.addEventListener('click', () => irA(k, { scroll: false, foco: false })));
      irA(0, { scroll: false, foco: false });
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
        const titulos = elegidos.map(codigo => {
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
            apartados: (inst.apartados || []).map(ap => ({
              id: Utils.uid(),
              orden: ap.orden,
              descripcion: ap.descripcion,
              maxPts: ap.maxPts,
              criterioIds: (ap.criterioIds || []).slice(),
              peso: ap.peso
            }))
          };
          Storage.db.instrumentos.push(copia);
          return copia.titulo;
        });
        Storage.save();
        UI.toast('Creado(s): ' + titulos.join(', '));
      }
    });
    UI.wireChips(mbody);
  }

  function render(el) {
    const db = Storage.db;
    if (!claseSel || !Calc.clase(claseSel)) claseSel = db.clases.length ? db.clases[0].id : null;

    if (!db.clases.length) {
      el.innerHTML = `<section class="card"><div class="vacio-grande">
        <strong>No hay clases todavía</strong>
        Crea una asignatura y una clase para empezar a evaluar.
      </div></section>`;
      return;
    }

    el.innerHTML = `
      <section class="card">
        <div class="card-head">
          <h2>Instrumentos de evaluación</h2>
          <select id="sel-clase" style="max-width:280px">${UI.selectHtml(db.clases.map(c => ({
            id: c.id,
            nombre: `${Calc.asignaturaDeClase(c.id)?.nombre || '?'} · ${(Calc.byId(db.grupos, c.grupoId) || {}).nombre || '?'}`
          })), claseSel, 'id', 'nombre')}</select>
          <button class="btn btn-primario" id="add-inst">Nuevo instrumento</button>
        </div>
        <table class="tabla">
          <thead><tr><th>Título</th><th>Tipo</th><th>Nivel · Unidad</th><th>Periodo</th><th>Fecha</th><th>Apartados</th><th>Media</th><th></th></tr></thead>
          <tbody>
            ${instrumentosDe().map(i => {
              const notas = Calc.alumnosDeInstrumento(i)
                .map(a => Calc.notaInstrumento(i, a.id))
                .filter(n => n != null);
              const media = notas.length ? notas.reduce((x, y) => x + y, 0) / notas.length : null;
              const nivelTxt = i.nivel ? Calc.etiquetaNivel(i.claseId, i.nivel) : '';
              return `<tr data-inst="${i.id}">
                <td><b>${Utils.esc(i.titulo)}</b></td>
                <td><span class="badge info">${Utils.esc(i.tipo)}</span></td>
                <td>${nivelTxt ? `<span class="badge info">${Utils.esc(nivelTxt)}</span> ` : ''}${i.unidad ? `<span class="badge na">${Utils.esc(i.unidad)}</span>` : ''}${!nivelTxt && !i.unidad ? '<span style="color:var(--tinta-suave)">—</span>' : ''}</td>
                <td>${Utils.esc(i.periodo)}</td>
                <td>${Utils.esc(i.fecha)}</td>
                <td>${i.apartados.length} ${i.tipo === 'Proyecto' ? 'partes/fases' : 'apartados'}</td>
                <td>${Calc.badgeHtml(media)}</td>
                <td style="white-space:nowrap">
                  <button class="btn btn-mini btn-primario corregir">Corregir</button>
                  <button class="btn btn-mini editar">Editar</button>
                  <button class="btn btn-mini duplicar" title="Crear examen paralelo para un nivel ACI">Duplicar</button>
                  <button class="icon-btn borrar-inst" title="Eliminar">×</button>
                </td>
              </tr>`;
            }).join('') || '<tr><td colspan="8" class="vacio">Sin instrumentos en esta clase.</td></tr>'}
          </tbody>
        </table>
      </section>`;

    el.querySelector('#sel-clase').onchange = e => { claseSel = e.target.value; render(el); };
    el.querySelector('#add-inst').onclick = () => modalInstrumento(null);

    el.querySelectorAll('tr[data-inst]').forEach(tr => {
      const inst = Calc.instrumento(tr.dataset.inst);
      tr.querySelector('.corregir').onclick = () => renderCorreccion(el, inst.id);
      tr.querySelector('.editar').onclick = () => modalInstrumento(inst);
      tr.querySelector('.duplicar').onclick = () => duplicarInstrumento(inst);
      tr.querySelector('.borrar-inst').onclick = () => borrarInstrumento(el, inst);
    });
  }

  return { render, renderCorreccion, modalInstrumento };
})();
