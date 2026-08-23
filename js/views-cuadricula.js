const CuadriculaView = (() => {
  let claseSel = null;
  let periodo = 'T1';
  let tab = 'notas';

  function tablaNotas(alumnos, insts) {
    if (!alumnos.length) {
      return '<div class="aviso">El grupo de esta clase no tiene alumnos. Añádelos en «Alumnos y grupos».</div>';
    }
    return `
      ${insts.length ? '' : '<div class="aviso">Aún no hay instrumentos en esta clase. Pulsa «Añadir calificación» para crear el primero.</div>'}
      <table class="tabla">
        <thead><tr><th>Alumno</th>${insts.map(i => `<th class="celda-nota" data-edit="${i.id}" title="Toca para editar el instrumento" style="max-width:120px">${Utils.esc(i.titulo)}<br><small>${Utils.esc(i.tipo)} · ${Utils.esc(i.periodo)}</small></th>`).join('')}<th>Evaluación</th></tr></thead>
        <tbody>
          ${alumnos.map(a => `<tr>
            <td>${Utils.esc(a.apellidos)}, ${Utils.esc(a.nombre)}</td>
            ${insts.map(i => {
              const n = Calc.notaInstrumento(i, a.id);
              return `<td class="celda-nota num" data-inst="${i.id}">${n == null ? '<span class="badge na">—</span>' : Calc.badgeHtml(n)}</td>`;
            }).join('')}
            <td class="num">${Calc.badgeHtml(Calc.notaEvaluacion(claseSel, a.id, periodo))}</td>
          </tr>`).join('')}
        </tbody>
      </table>
      <p class="no-print" style="color:var(--tinta-suave);font-size:13px">La columna «Evaluación» aplica las ponderaciones de los criterios${periodo === 'Final' ? ' sobre todo el curso' : ' en ' + periodo}. Toca una nota para corregir y una cabecera para editar.</p>`;
  }

  function tablaCriterios(alumnos) {
    const criterios = Calc.criteriosDeClase(claseSel);
    if (!alumnos.length) return '<div class="aviso">El grupo de esta clase no tiene alumnos todavía.</div>';
    if (!criterios.length) return '<div class="vacio-grande">Esta asignatura no tiene criterios definidos.</div>';
    return `
      <table class="tabla">
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
      <p class="no-print" style="color:var(--tinta-suave);font-size:13px">% de logro acumulado por criterio${periodo === 'Final' ? ' (todo el curso)' : ' en ' + periodo}. «—» = sin evidencias todavía.</p>`;
  }

  function tablaCompetencias(alumnos) {
    const esps = Calc.competenciasEspecificasDeClase(claseSel);
    if (!alumnos.length) return '<div class="aviso">El grupo de esta clase no tiene alumnos todavía.</div>';
    if (!esps.length) return '<div class="vacio-grande">Esta asignatura no tiene competencias específicas definidas.</div>';
    return `
      <table class="tabla">
        <thead><tr><th>Alumno</th>${esps.map(e =>
          `<th title="${Utils.esc(e.descripcion)}">${Utils.esc(e.codigo)}</th>`
        ).join('')}</tr></thead>
        <tbody>
          ${alumnos.map(a => `<tr>
            <td>${Utils.esc(a.apellidos)}, ${Utils.esc(a.nombre)}</td>
            ${esps.map(e => {
              const n = Calc.notaCompetencia(claseSel, a.id, e.id, periodo);
              return `<td class="num">${Calc.badgeHtml(n)}</td>`;
            }).join('')}
          </tr>`).join('')}
        </tbody>
      </table>
      <p class="no-print" style="color:var(--tinta-suave);font-size:13px">Nota por competencia específica (0–10), agregando los criterios vinculados.</p>`;
  }

  function render(el) {
    const db = Storage.db;
    if (!claseSel || !Calc.clase(claseSel)) claseSel = db.clases.length ? db.clases[0].id : null;

    if (!db.clases.length) {
      el.innerHTML = `<section class="card"><div class="vacio-grande">
        <strong>No hay clases todavía</strong>
        Crea grupos, alumnos y clases para ver aquí la cuadrícula de calificación.
      </div></section>`;
      return;
    }

    const alumnos = Calc.alumnosDeClase(claseSel);
    const insts = Calc.instrumentosDeClase(claseSel).sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));

    el.innerHTML = `
      <section class="card">
        <div class="card-head">
          <h2>Cuadrícula de calificación</h2>
          ${(() => {
            const cl = Calc.clase(claseSel);
            const gru = Calc.byId(db.grupos, cl.grupoId);
            return `<span style="color:var(--tinta-suave);font-size:13px">
              Grupo vinculado: <b>${Utils.esc(gru ? gru.nombre : '¿?')}</b> · ${alumnos.length} alumno(s)</span>`;
          })()}
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
            <select id="sel-clase" style="max-width:260px">${UI.selectHtml(db.clases.map(c => ({
              id: c.id,
              nombre: `${Calc.asignaturaDeClase(c.id)?.nombre || '?'} · ${(Calc.byId(db.grupos, c.grupoId) || {}).nombre || '?'}`
            })), claseSel, 'id', 'nombre')}</select>
            <select id="sel-periodo" style="max-width:130px">
              ${['T1', 'T2', 'T3', 'Final'].map(p => `<option ${p === periodo ? 'selected' : ''}>${p}</option>`).join('')}
            </select>
            <button class="btn btn-primario no-print" id="add-inst">Añadir calificación</button>
            <button class="btn no-print" id="btn-imprimir">Imprimir / PDF</button>
          </div>
        </div>
        <div class="chips no-print" id="tabs" style="margin-bottom:14px">
          <label class="chip ${tab === 'notas' ? 'on' : ''}" data-tab="notas">Instrumentos</label>
          <label class="chip ${tab === 'criterios' ? 'on' : ''}" data-tab="criterios">Criterios</label>
          <label class="chip ${tab === 'competencias' ? 'on' : ''}" data-tab="competencias">Competencias</label>
        </div>
        <div class="scroll-x" id="contenido">
          ${tab === 'notas' ? tablaNotas(alumnos, insts)
            : tab === 'criterios' ? tablaCriterios(alumnos)
            : tablaCompetencias(alumnos)}
        </div>
      </section>`;

    el.querySelector('#sel-clase').onchange = e => { claseSel = e.target.value; render(el); };
    el.querySelector('#sel-periodo').onchange = e => { periodo = e.target.value; render(el); };
    el.querySelector('#add-inst').onclick = () => {
      try {
        InstrumentosView.modalInstrumento(null, claseSel);
      } catch (e) {
        console.error(e);
        alert('Error al abrir el formulario: ' + e.message);
      }
    };
    el.querySelector('#btn-imprimir').onclick = () => window.print();

    el.querySelectorAll('#tabs .chip').forEach(ch => {
      ch.onclick = () => { tab = ch.dataset.tab; render(el); };
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
