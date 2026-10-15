const CuadriculaView = (() => {
  let claseSel = null;
  let periodo = 'T1';
  let tab = 'notas';
  let nivelSel = '';
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
    return `
      ${insts.length ? '' : '<div class="aviso">Aún no hay instrumentos en esta clase para este nivel. Créalos en «Instrumentos».</div>'}
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

  function tablaCriterios(alumnos, modoTodas, claseSel, periodo) {
    let criterios = Calc.criteriosDeNivel(claseSel, nivelSel);
    if (modoTodas) {
      const vistos = new Set();
      criterios = [];
      // nivel base
      (Calc.criteriosDeNivel(claseSel, '') || []).forEach(c => {
        if (!vistos.has(c.id)) { vistos.add(c.id); criterios.push(c); }
      });
      // niveles ACI
      (Calc.nivelesAciDeClase(claseSel) || []).forEach(n => {
        (Calc.criteriosDeNivel(claseSel, n.codigo) || []).forEach(c => {
          if (!vistos.has(c.id)) { vistos.add(c.id); criterios.push(c); }
        });
      });
    }
    if (!alumnos.length) return '<div class="aviso">El grupo de esta clase no tiene alumnado en este nivel.</div>';
    if (!criterios.length) return '<div class="vacio-grande">Este nivel no tiene criterios definidos.</div>';
    return `
      <table class="tabla tabla-cuadricula">
        <thead><tr><th>Alumno</th>${criterios.map(c =>
          `<th title="${Utils.esc(c.descripcion)}">${Utils.esc(c.codigo)}<br><small>${Utils.fmt(c.peso)}%</small></th>`
        ).join('')}</tr></thead>
        <tbody>
          ${alumnos.map(a => {
            const esAci = modoTodas ? !!Calc.nivelDeAlumno(claseSel, a.id) : false;
            return `<tr>
              <td>${Utils.esc(a.apellidos)}, ${Utils.esc(a.nombre)}</td>
              ${criterios.map(c => {
                const l = Calc.logroCriterio(c.id, claseSel, a.id, periodo);
                const n = (l == null ? null : l * 10);
                const ast = esAci && n != null ? '<span class="aci-ast">*</span>' : '';
                return `<td class="num">${n == null ? '<span class="badge na">—</span>' : '<span class="badge ' + Calc.clasif(n) + '">' + Utils.fmt(n) + ast + '</span>'}</td>`;
              }).join('')}
            </tr>`;
          }).join('')}
        </tbody>
      </table>
      <p class="no-print" style="color:var(--tinta-suave);font-size:13px">% de logro acumulado por criterio del nivel${periodo === 'Final' ? ' (todo el curso)' : ' en ' + periodo}. «—» = sin evidencias todavía. ${modoTodas ? 'Los asteriscos (*) señalan alumnos con adaptación curricular (ACI).' : ''}</p>`;
  }

  function tablaCompetencias(alumnos, modoTodas) {
    let esps = Calc.competenciasEspecificasDeNivel(claseSel, nivelSel);
    let claves = Calc.clavesDeNivel(claseSel, nivelSel);
    if (modoTodas) {
      const vistosEsp = new Set(), vistosCla = new Set();
      esps = []; claves = [];
      (Calc.competenciasEspecificasDeNivel(claseSel, '') || []).forEach(x => { if (!vistosEsp.has(x.id)) { vistosEsp.add(x.id); esps.push(x); }});
      (Calc.clavesDeNivel(claseSel, '') || []).forEach(x => { if (!vistosCla.has(x.id)) { vistosCla.add(x.id); claves.push(x); }});
      (Calc.nivelesAciDeClase(claseSel) || []).forEach(n => {
        (Calc.competenciasEspecificasDeNivel(claseSel, n.codigo) || []).forEach(x => { if (!vistosEsp.has(x.id)) { vistosEsp.add(x.id); esps.push(x); }});
        (Calc.clavesDeNivel(claseSel, n.codigo) || []).forEach(x => { if (!vistosCla.has(x.id)) { vistosCla.add(x.id); claves.push(x); }});
      });
    }
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
            ${alumnos.map(a => {
              const esAci = modoTodas ? !!Calc.nivelDeAlumno(claseSel, a.id) : false;
              return `<tr>
                <td>${Utils.esc(a.apellidos)}, ${Utils.esc(a.nombre)}</td>
                ${lista.map(x => {
                  const n = fnNota(a, x);
                  const ast = esAci && n != null ? '<span class="aci-ast">*</span>' : '';
                  return `<td class="num">${n == null ? '<span class="badge na">—</span>' : `<span class="badge ${Calc.clasif(n)}">${Utils.fmt(n)}${ast}</span>`}</td>`;
                }).join('')}
              </tr>`;
            }).join('')}
          </tbody>
        </table>
        <p class="no-print" style="color:var(--tinta-suave);font-size:13px">${notaPie}${modoTodas ? ' Los asteriscos (*) señalan alumnos con adaptación curricular (ACI).' : ''}</p>`;
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
    // Las unidades se ven en el orden en que se despliegan en la propia tabla:
    // el plegado de las barras es el único filtro que se ofrece (D-45).
    const insts = instsNivel;

    const selNivel = nivelesAci.length ? `
      <select id="sel-nivel" style="max-width:220px">
        <option value="${TODAS}" ${modoTodas ? 'selected' : ''}>Todos los niveles (grupo completo)</option>
        <option value="" ${nivelSel === '' ? 'selected' : ''}>Base (sin adaptación)</option>
        ${nivelesAci.map(n => `<option value="${Utils.esc(n.codigo)}" ${nivelSel === n.codigo ? 'selected' : ''}>${Utils.esc(n.etiqueta || n.codigo)}</option>`).join('')}
      </select>` : '';

    const buscaAlumno = alumnos.length > 6 ? '<input type="text" id="busca-alumno" class="no-print" placeholder="Buscar alumn@" style="max-width:170px">' : '';

    // Instrumentos que todavía tienen alumnado sin nota: es lo que ofrece
    // «Corregir», y también lo que da sentido a imprimir la cuadrícula entera.
    const porCorregir = insts.filter(i => Calc.progresoInstrumento(i).pendientes > 0).length;
    const btnCorregir = porCorregir
      ? `<button class="btn btn-primario no-print" id="btn-corregir">Corregir · ${porCorregir} pendiente${porCorregir === 1 ? '' : 's'}</button>`
      : '<button class="btn no-print" id="btn-corregir">Corregir</button>';

    // El mismo grupo/asignatura se usa en pantalla y en la cabecera impresa.
    const cl = Calc.clase(claseSel);
    const gru = Calc.byId(db.grupos, cl.grupoId);

    // Cabecera que solo sale impresa: el informe se lee solo, sin la vista.
    const asigImp = (Calc.asignaturaDeClase(claseSel) || {}).nombre || '';
    const grupoImp = gru ? gru.nombre : '';
    const nivelImp = modoTodas ? 'todos los niveles' : nivelSel ? 'nivel ' + Calc.etiquetaNivel(claseSel, nivelSel) : 'base';
    const tituloImp = tab === 'notas' ? 'Instrumentos' : tab === 'criterios' ? 'Criterios' : 'Competencias específicas y clave';
    const cabeceraImp = `<div class="solo-impresion cabecera-impresion">
      <strong>Cuadrícula de alumnado · ${tituloImp}</strong>
      <span>${Utils.esc(asigImp)} · ${Utils.esc(grupoImp)} · ${periodo} · ${nivelImp} · impreso el ${Utils.hoy().split('-').reverse().join('/')}</span>
    </div>`;

    el.innerHTML = `
      <section class="card">
        ${cabeceraImp}
        <div class="card-head no-print">
          <h2>Cuadrícula de calificación</h2>
          ${(() => {
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
          ${btnCorregir}
        </div>` : ''}
        <div class="scroll-x" id="contenido">
          ${tab === 'notas' ? tablaNotas(alumnos, insts, modoTodas)
            : tab === 'criterios' ? tablaCriterios(alumnos, modoTodas, claseSel, periodo)
            : tablaCompetencias(alumnos, modoTodas)}
        </div>
      </section>`;

    el.querySelector('#sel-clase').onchange = e => { claseSel = e.target.value; nivelSel = ''; render(el); };
    el.querySelector('#sel-periodo').onchange = e => { periodo = e.target.value; render(el); };
    if (el.querySelector('#sel-nivel')) {
      el.querySelector('#sel-nivel').onchange = e => { nivelSel = e.target.value; render(el); };
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

    // El botón solo existe en la pestaña «Instrumentos».
    const btnCorregirEl = el.querySelector('#btn-corregir');
    if (btnCorregirEl) {
      btnCorregirEl.onclick = () => {
        // Corregir desde aquí no debe arrastrar a otra vista: al salir del
        // corrector se vuelve a la cuadrícula.
        InstrumentosView.modalCalificar(claseSel,
          id => InstrumentosView.renderCorreccion(el, id, () => render(el)));
      };
    }

    // Al imprimir salen TODAS las columnas desplegadas: una unidad plegada deja
    // su celda de relleno y CSS no puede recuperarla, así que se abren en JS.
    el.querySelector('#btn-imprimir').onclick = () => {
      if (tab === 'notas') {
        udsAbiertas.clear();
        Calc.unidadesDe(insts).forEach(u => udsAbiertas.add(u));
        render(el);
      }
      window.print();
    };

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
      td.onclick = () => InstrumentosView.renderCorreccion(el, td.dataset.inst, () => render(el));
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
