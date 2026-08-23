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
    const claves = Calc.clavesDeClase(claseSel);
    if (!alumnos.length) return '<div class="aviso">El grupo de esta clase no tiene alumnos todavía.</div>';

    const tabla = (lista, titulo, fnNota, notaPie) => {
      if (!lista.length) return '';
      return `
        <h3 style="font-size:15px;margin:4px 0 8px">${titulo}</h3>
        <table class="tabla">
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
    return Calc.criteriosDeClase(claseSel).some(c => (c.claveIds || []).length > 0);
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
