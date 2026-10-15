const CuadriculaView = (() => {
  let claseSel = null;
  let periodo = 'T1';
  let tab = 'notas';
  let nivelSel = '';
  let udSel = '__todas__';
  const TODAS = '__todas__';
  // Unidades cuyas columnas están DESPLEGADAS en la pestaña Instrumentos.
  // El conjunto vacío significa «todas plegadas al entrar» (igual que en la vista
  // Instrumentos), de modo que el gesto que aprende el claustro es el mismo.
  const udsAbiertas = new Set();

  function tablaNotas(alumnos, insts, modoTodas) {
    if (!alumnos.length) {
      return '<div class="aviso">El grupo de esta clase no tiene alumnado en este nivel. Revísalo en «Alumnos y grupos» o en los niveles ACI de la clase.</div>';
    }
    const grupos = [];
    insts.forEach(i => {
      const ud = i.unidad || '';
      let g = grupos.find(x => x.ud === ud);
      if (!g) { g = { ud, insts: [] }; grupos.push(g); }
      g.insts.push(i);
    });
    // La barra de unidad (con su plegado) solo tiene sentido si hay algo que
    // agrupar: varias unidades, o una sola con nombre. Si todo va sin unidad no
    // hay barra, y sin barra no se pliega nada (las columnas se ven siempre).
    const conBarra = grupos.length > 1 || (grupos.length === 1 && grupos[0].ud !== '');
    grupos.forEach(g => { g.plegada = conBarra && !udsAbiertas.has(g.ud); });
    // Una unidad plegada NO borra sus celdas: deja UNA celda por fila que se
    // estira con colspan sobre sus columnas. Si se ocultan de verdad, la fila se
    // queda corta y todo lo que va detrás (cabeceras y la nota final) se desplaza
    // de su columna. Con la celda de relleno la tabla siempre cuadra.
    const cabeceraInst = i => `<th class="celda-nota" data-ud="${Utils.esc(i.unidad || '')}" data-edit="${i.id}" title="Toca para editar el instrumento" style="max-width:130px">${Utils.esc(i.titulo)}<br><small>${Utils.esc(i.tipo)} · ${Utils.esc(i.periodo)}${i.unidad ? ' · ' + Utils.esc(i.unidad) : ''}</small></th>`;
    const barraUd = g => `<th class="ud-grupo plegable" colspan="${g.insts.length}" data-toggle-ud="${Utils.esc(g.ud)}" title="${g.insts.length} instrumento${g.insts.length === 1 ? '' : 's'} · toca para ${g.plegada ? 'ver' : 'ocultar'} sus columnas">` +
      `<span class="ud-flecha">${g.plegada ? '▸' : '▾'}</span>${g.ud ? Utils.esc(g.ud) : 'Sin unidad'}` +
      `<small>${g.plegada ? `(${g.insts.length})` : `${g.insts.length} instrumento${g.insts.length === 1 ? '' : 's'}`}</small></th>`;
    const cabecerasGrupo = g => g.plegada
      ? `<th class="celda-plegada" colspan="${g.insts.length}"></th>`
      : g.insts.map(cabeceraInst).join('');
    const celdasGrupo = (a, g) => g.plegada
      ? `<td class="celda-plegada" colspan="${g.insts.length}"></td>`
      : g.insts.map(i => {
        const ud = `data-ud="${Utils.esc(i.unidad || '')}"`;
        if (modoTodas && !Calc.instrumentoParaAlumno(i, claseSel, a.id)) {
          return `<td class="celda-nota num" ${ud} style="color:var(--tinta-suave);opacity:.35" title="No aplica a este alumno">—</td>`;
        }
        const n = Calc.notaInstrumento(i, a.id);
        return `<td class="celda-nota num" ${ud} data-inst="${i.id}">${n == null ? '<span class="badge na">—</span>' : Calc.badgeHtml(n)}</td>`;
      }).join('');
    const thead = conBarra
      ? `<tr class="fila-ud"><th rowspan="2">Alumno</th>${grupos.map(barraUd).join('')}<th rowspan="2">Evaluación</th></tr>
         <tr>${grupos.map(cabecerasGrupo).join('')}</tr>`
      : `<tr><th>Alumno</th>${insts.map(cabeceraInst).join('')}<th>Evaluación</th></tr>`;
    const sinUd = udSel !== TODAS ? ` de la unidad «${Utils.esc(udSel)}»` : '';
    return `
      ${insts.length ? '' : `<div class="aviso">Aún no hay instrumentos en esta clase para este nivel${sinUd}. Pulsa «Añadir calificación» para crear el primero.</div>`}
      <table class="tabla tabla-cuadricula">
        <thead>${thead}</thead>
        <tbody>
          ${alumnos.map(a => `<tr>
            <td>${Utils.esc(a.apellidos)}, ${Utils.esc(a.nombre)}</td>
            ${grupos.map(g => celdasGrupo(a, g)).join('')}
            <td class="num">${Calc.badgeHtml(Calc.notaEvaluacion(claseSel, a.id, periodo))}</td>
          </tr>`).join('')}
        </tbody>
      </table>
      <p class="no-print" style="color:var(--tinta-suave);font-size:13px">${modoTodas
        ? 'Vista de todo el grupo: cada alumno se evalúa con los criterios de su nivel y la columna «Evaluación» armoniza su nota. «—» en gris = el examen no aplica a ese alumno.'
        : 'La columna «Evaluación» aplica las ponderaciones de los criterios del nivel mostrado' + (periodo === 'Final' ? ' sobre todo el curso' : ' en ' + periodo) + '. Toca una nota para corregir y una cabecera para editar.'}</p>`;
  }

  function tablaCriterios(alumnos) {
    const criterios = Calc.criteriosDeNivel(claseSel, nivelSel);
    if (!alumnos.length) return '<div class="aviso">El grupo de esta clase no tiene alumnado en este nivel.</div>';
    if (!criterios.length) return '<div class="vacio-grande">Este nivel no tiene criterios definidos.</div>';
    return `
      <table class="tabla tabla-cuadricula">
        <thead><tr><th>Alumno</th>${criterios.map(c =>
          `<th title="${Utils.esc(c.descripcion)}">${Utils.esc(c.codigo)}<br><small>${Utils.fmt(c.peso)}%</small></th>`
        ).join('')}</tr></thead>
        <tbody>
          ${alumnos.map(a => `<tr>
            <td>${Utils.esc(a.apellidos)}, ${Utils.esc(a.nombre)}</td>
            ${criterios.map(c => {
              const l = Calc.logroCriterio(c.id, claseSel, a.id, periodo);
              return `<td class="num">${l == null ? '<span class="badge na">—</span>' : '<span class="badge ' + Calc.clasif(l * 10) + '">' + Utils.pct(l * 100) + '</span>'}</td>`;
            }).join('')}
          </tr>`).join('')}
        </tbody>
      </table>
      <p class="no-print" style="color:var(--tinta-suave);font-size:13px">% de logro acumulado por criterio del nivel${periodo === 'Final' ? ' (todo el curso)' : ' en ' + periodo}. «—» = sin evidencias todavía.</p>`;
  }

  function tablaCompetencias(alumnos) {
    const esps = Calc.competenciasEspecificasDeNivel(claseSel, nivelSel);
    const claves = Calc.clavesDeNivel(claseSel, nivelSel);
    if (!alumnos.length) return '<div class="aviso">El grupo de esta clase no tiene alumnado en este nivel.</div>';

    const tabla = (lista, titulo, fnNota, notaPie) => {
      if (!lista.length) return '';
      return `
        <h3 style="font-size:15px;margin:4px 0 8px">${titulo}</h3>
        <table class="tabla tabla-cuadricula">
          <thead><tr><th>Alumno</th>${lista.map(x =>
            `<th title="${Utils.esc(x.descripcion || x.nombre || '')}">${Utils.esc(x.codigo)}</th>`
          ).join('')}</tr></thead>
          <tbody>
            ${alumnos.map(a => `<tr>
              <td>${Utils.esc(a.apellidos)}, ${Utils.esc(a.nombre)}</td>
              ${lista.map(x => {
                const n = fnNota(a, x);
                return `<td class="num">${Calc.badgeHtml(n)}</td>`;
              }).join('')}
            </tr>`).join('')}
          </tbody>
        </table>
        <p class="no-print" style="color:var(--tinta-suave);font-size:13px">${notaPie}</p>`;
    };

    const hayClaves = criteriosConClaves();
    return `
      ${tabla(esps, 'Competencias específicas',
        (a, e) => Calc.notaCompetencia(claseSel, a.id, e.id, periodo),
        'Nota por competencia específica (0–10), agregando los criterios vinculados con su peso.')}
      ${claves.length ? tabla(claves, 'Competencias clave (perfil de salida)',
        (a, k) => Calc.notaClave(claseSel, a.id, k.id, periodo),
        'Nota por competencia clave (0–10), agregando con su peso todos los criterios que la llevan asignada.') : `
        <h3 style="font-size:15px;margin:14px 0 8px">Competencias clave (perfil de salida)</h3>
        <div class="aviso">${hayClaves ? 'Ninguna clave aparece aún en esta tabla.' : 'Los criterios de esta asignatura no tienen competencias clave asignadas. Asígnalas editando cada criterio en «Currículo»; las plantillas oficiales las traen automáticamente.'}</div>`}`;
  }

  function criteriosConClaves() {
    return Calc.criteriosDeNivel(claseSel, nivelSel).some(c => (c.claveIds || []).length > 0);
  }

  // `opciones.tab` permite fijar la pestaña activa (uso interno y pruebas) y
  // `opciones.unidadesAbiertas` las unidades que deben verse desplegadas.
  function render(el, opciones) {
    if (opciones && opciones.tab) tab = opciones.tab;
    if (opciones && opciones.unidadesAbiertas) {
      udsAbiertas.clear();
      opciones.unidadesAbiertas.forEach(u => udsAbiertas.add(u));
    }
    const db = Storage.db;
    if (!claseSel || !Calc.clase(claseSel)) claseSel = db.clases.length ? db.clases[0].id : null;

    if (!db.clases.length) {
      el.innerHTML = `<section class="card"><div class="vacio-grande">
        <strong>No hay clases todavía</strong>
        Crea grupos, alumnos y clases para ver aquí la cuadrícula de calificación.
      </div></section>`;
      return;
    }

    const nivelesAci = Calc.nivelesAciDeClase(claseSel);
    if (nivelSel && nivelSel !== TODAS && !nivelesAci.some(n => n.codigo === nivelSel)) nivelSel = '';

    const alumnosTodos = Calc.alumnosDeClase(claseSel);
    const modoTodas = nivelSel === TODAS;
    const alumnos = modoTodas ? alumnosTodos : alumnosTodos.filter(a => Calc.nivelDeAlumno(claseSel, a.id) === nivelSel);
    const instsNivel = Calc.instrumentosDeClase(claseSel)
      .filter(i => modoTodas || Calc.instrumentoParaNivel(i, nivelSel))
      .sort((a, b) => (String(a.unidad || '').localeCompare(String(b.unidad || ''), 'es'))
        || (a.fecha || '').localeCompare(b.fecha || ''));
    const uds = Calc.unidadesDe(instsNivel);
    if (udSel !== TODAS && !uds.includes(udSel)) udSel = TODAS;
    const insts = Calc.instrumentosDeUnidad(instsNivel, udSel === TODAS ? null : udSel);

    const selNivel = nivelesAci.length ? `
      <select id="sel-nivel" style="max-width:220px">
        <option value="${TODAS}" ${modoTodas ? 'selected' : ''}>Todos los niveles (grupo completo)</option>
        <option value="" ${nivelSel === '' ? 'selected' : ''}>Base (sin adaptación)</option>
        ${nivelesAci.map(n => `<option value="${Utils.esc(n.codigo)}" ${nivelSel === n.codigo ? 'selected' : ''}>${Utils.esc(n.etiqueta || n.codigo)}</option>`).join('')}
      </select>` : '';

    const selUd = uds.length ? `
      <select id="sel-ud" title="Filtrar por unidad didáctica" style="max-width:170px">
        <option value="${TODAS}" ${udSel === TODAS ? 'selected' : ''}>Todas las unidades</option>
        ${uds.map(u => `<option value="${Utils.esc(u)}" ${udSel === u ? 'selected' : ''}>${Utils.esc(u)}</option>`).join('')}
      </select>` : '';

    const buscaAlumno = alumnos.length > 6 ? '<input type="text" id="busca-alumno" class="no-print" placeholder="Buscar alumn@" style="max-width:170px">' : '';

    el.innerHTML = `
      <section class="card">
        <div class="card-head">
          <h2>Cuadrícula de calificación</h2>
          ${(() => {
            const cl = Calc.clase(claseSel);
            const gru = Calc.byId(db.grupos, cl.grupoId);
            const lblNivel = modoTodas
              ? ' · <b>todos los niveles</b>'
              : nivelSel ? ` · nivel <b>${Utils.esc(Calc.etiquetaNivel(claseSel, nivelSel))}</b>` : '';
            return `<span style="color:var(--tinta-suave);font-size:13px">
              Grupo vinculado: <b>${Utils.esc(gru ? gru.nombre : '¿?')}</b> · ${alumnos.length} de ${alumnosTodos.length} alumno(s)${lblNivel}</span>`;
          })()}
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
            <select id="sel-clase" style="max-width:260px">${UI.selectHtml(db.clases.map(c => ({
              id: c.id,
              nombre: `${Calc.asignaturaDeClase(c.id)?.nombre || '?'} · ${(Calc.byId(db.grupos, c.grupoId) || {}).nombre || '?'}`
            })), claseSel, 'id', 'nombre')}</select>
            ${selNivel}
            ${buscaAlumno}
            <select id="sel-periodo" style="max-width:130px">
              ${['T1', 'T2', 'T3', 'Final'].map(p => `<option ${p === periodo ? 'selected' : ''}>${p}</option>`).join('')}
            </select>
            <button class="btn no-print" id="btn-imprimir">Imprimir / PDF</button>
          </div>
        </div>
        <div class="chips no-print" id="tabs" style="margin-bottom:14px">
          <label class="chip ${tab === 'notas' ? 'on' : ''}" data-tab="notas">Instrumentos</label>
          <label class="chip ${tab === 'criterios' ? 'on' : ''}" data-tab="criterios">Criterios</label>
          <label class="chip ${tab === 'competencias' ? 'on' : ''}" data-tab="competencias">Competencias específicas y clave</label>
        </div>
        ${tab === 'notas' ? `<div class="barra-tab no-print">
          ${selUd}
          <button class="btn btn-primario no-print" id="add-inst">Añadir calificación</button>
        </div>` : ''}
        <div class="scroll-x" id="contenido">
          ${tab === 'notas' ? tablaNotas(alumnos, insts, modoTodas)
            : modoTodas ? '<div class="aviso">En la vista «Todos los niveles» solo se muestran los instrumentos y la nota armonizada de cada alumno. Elige un nivel concreto para ver criterios y competencias.</div>'
            : tab === 'criterios' ? tablaCriterios(alumnos)
            : tablaCompetencias(alumnos)}
        </div>
      </section>`;

    el.querySelector('#sel-clase').onchange = e => { claseSel = e.target.value; nivelSel = ''; render(el); };
    el.querySelector('#sel-periodo').onchange = e => { periodo = e.target.value; render(el); };
    if (el.querySelector('#sel-nivel')) {
      el.querySelector('#sel-nivel').onchange = e => { nivelSel = e.target.value; render(el); };
    }
    if (el.querySelector('#sel-ud')) {
      el.querySelector('#sel-ud').onchange = e => {
        udSel = e.target.value;
        // Si el docente filtra por una unidad, es porque quiere verla: la dejamos
        // desplegada para no obligarle a un clic de más.
        if (udSel !== TODAS) udsAbiertas.add(udSel);
        render(el);
      };
    }
    const busca = el.querySelector('#busca-alumno');
    if (busca) {
      const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      busca.oninput = () => {
        const q = norm(busca.value.trim());
        el.querySelectorAll('#contenido tbody tr').forEach(tr => {
          const cel = tr.querySelector('td');
          tr.style.display = !q || (cel && norm(cel.textContent).includes(q)) ? '' : 'none';
        });
      };
    }
    if (el.querySelector('#add-inst')) {
      el.querySelector('#add-inst').onclick = () => {
        try {
          InstrumentosView.modalInstrumento(null, claseSel);
        } catch (e) {
          console.error(e);
          alert('Error al abrir el formulario: ' + e.message);
        }
      };
    }
    el.querySelector('#btn-imprimir').onclick = () => window.print();

    el.querySelectorAll('#tabs .chip').forEach(ch => {
      ch.onclick = () => { tab = ch.dataset.tab; render(el); };
    });

    // Plegar o desplegar las columnas de una unidad didáctica.
    el.querySelectorAll('[data-toggle-ud]').forEach(th => {
      th.onclick = () => {
        const clave = th.dataset.toggleUd || '';
        if (udsAbiertas.has(clave)) udsAbiertas.delete(clave); else udsAbiertas.add(clave);
        render(el);
      };
    });

    el.querySelectorAll('.celda-nota[data-inst]').forEach(td => {
      td.onclick = () => InstrumentosView.renderCorreccion(el, td.dataset.inst);
    });
    el.querySelectorAll('th[data-edit]').forEach(th => {
      th.onclick = () => {
        try {
          InstrumentosView.modalInstrumento(Calc.instrumento(th.dataset.edit));
        } catch (e) {
          console.error(e);
          alert('Error al editar: ' + e.message);
        }
      };
    });
  }

  return { render };
})();
