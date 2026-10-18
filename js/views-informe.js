'use strict';

// Pestaña «Informe» de la Cuadrícula (D-59): análisis de criterios, hallazgos
// accionables y distribución de notas. Módulo autocontenido: solo lee datos a
// través de Calc, no escribe en Storage. Para eliminar la funcionalidad basta
// con quitar esta entrada de index.html.
const InformeView = (function () {
  // Estado del módulo. Se restablece al cambiar de clase.
  let claseSel = null;
  let nivelSel = '';
  let alcance = { periodo: '', unidad: '', instrumentoId: '' };
  let subVista = 'hallazgos'; // 'hallazgos' | 'criterios' | 'distribucion' | 'alumnos'
  let contenedor = null;

  // El selector de la Cuadrícula envía '__todas__' para «Todos los niveles»
  // (se acepta también 'TODAS' por compatibilidad con enlaces o datos viejos).
  function esTodas(nv) { return nv === '__todas__' || nv === 'TODAS'; }

  // ---------------------------------------------------------------- alcance
  // Selector en cascada: trimestre → unidad didáctica → instrumento.
  function htmlAlcance(claseId) {
    const f = {};
    if (alcance.periodo) f.periodo = alcance.periodo;
    if (alcance.unidad) f.unidad = alcance.unidad;
    const instsBase = Calc.instrumentosAlcance(claseId, f);
    const uds = Calc.unidadesDe(instsBase);
    const instsUd = alcance.unidad
      ? instsBase.filter(i => i.unidad === alcance.unidad)
      : instsBase;

    return `
      <div class="no-print" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">
        <select id="alc-periodo" title="Analizar todo el curso o un trimestre" style="max-width:160px">
          <option value="">Todo el curso</option>
          ${['T1', 'T2', 'T3'].map(p =>
            `<option value="${p}" ${alcance.periodo === p ? 'selected' : ''}>${p}</option>`).join('')}
        </select>
        ${uds.length > 0 ? `
        <select id="alc-unidad" title="Filtrar por unidad didáctica" style="max-width:200px">
          <option value="">Todas las unidades</option>
          ${uds.map(u =>
            `<option value="${Utils.esc(u)}" ${alcance.unidad === u ? 'selected' : ''}>${Utils.esc(u || '(sin unidad)')}</option>`).join('')}
        </select>` : ''}
        ${instsUd.length > 0 ? `
        <select id="alc-instrumento" title="Analizar un solo instrumento" style="max-width:230px">
          <option value="">Todos los instrumentos</option>
          ${instsUd.map(i =>
            `<option value="${i.id}" ${alcance.instrumentoId === i.id ? 'selected' : ''}>${Utils.esc(i.titulo)}</option>`).join('')}
        </select>` : ''}
      </div>`;
  }

  // ------------------------------------------------------------- subvistas
  function htmlSubVista() {
    const vistas = [
      { id: 'hallazgos', nombre: 'Hallazgos' },
      { id: 'criterios', nombre: 'Criterios' },
      { id: 'distribucion', nombre: 'Distribución' },
      { id: 'alumnos', nombre: 'Alumnos' }
    ];
    return `
      <div class="chips no-print" style="margin-bottom:14px">
        ${vistas.map(v =>
          `<label class="chip ${subVista === v.id ? 'on' : ''}" data-subvista="${v.id}">${v.nombre}</label>`).join('')}
        <button class="btn" id="btn-informe-pdf" title="Pasar a PDF todas las subvistas del informe"
                style="margin-left:auto">Imprimir / PDF</button>
      </div>`;
  }

  // Instrumentos del alcance activo (trimestre → UD → instrumento).
  function instsAlcance() {
    const f = {};
    if (alcance.periodo) f.periodo = alcance.periodo;
    if (alcance.unidad) f.unidad = alcance.unidad;
    if (alcance.instrumentoId) f.instrumentoId = alcance.instrumentoId;
    return Calc.instrumentosAlcance(claseSel, f);
  }

  // ------------------------------------------------------------ hallazgos
  // Cada nivel (base + cada ACI) se analiza por separado y cada hallazgo lleva
  // su etiqueta de nivel. Se presentan en dos tablas —criterios y preguntas—
  // con barra de porcentaje y filtro de severidad, más legible que tarjetas de
  // texto.
  let filtroSev = 'todos'; // 'todos' | 'critico' | 'atencion'

  function htmlHallazgos(claseId, insts) {
    const nivelesAci = Calc.nivelesAciDeClase(claseId);
    const niveles = [
      { etiqueta: 'Base', criterios: Calc.criteriosDeClase(claseId) }
    ].concat(nivelesAci.map(nv => ({
      etiqueta: nv.etiqueta || nv.codigo,
      criterios: Calc.criteriosDeNivel(claseId, nv.codigo)
    })));



    const critsPorNivel = [];
    for (const nv of niveles) {
      Calc.hallazgos(claseId, insts, nv.criterios).forEach(h => {
        if (h.tipo === 'criterio') {
          h.nivelEtiqueta = nv.etiqueta;
          critsPorNivel.push(h);
        }
      });
    }
    const pregGlobal = Calc.hallazgos(claseId, insts, []).filter(h => h.tipo === 'pregunta');
    pregGlobal.forEach(h => { if (!h.nivelEtiqueta) h.nivelEtiqueta = '—'; });
    const todosH = critsPorNivel.concat(pregGlobal);
    if (!todosH.length) {
      return '<div class="aviso">No se han detectado problemas significativos en este alcance.</div>';
    }
    const nCrit = todosH.filter(h => h.nivel === 'critico').length;
    const nAten = todosH.filter(h => h.nivel === 'atencion').length;
    const visibles = filtroSev === 'todos' ? todosH : todosH.filter(h => h.nivel === filtroSev);

    // Cabecera: resumen de severidad + chips de filtro.
    const resumen = `
      <div class="no-print" style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin-bottom:14px">
        <span style="font-size:13px"><b style="color:var(--ko)">●</b> ${nCrit} crítico${nCrit === 1 ? '' : 's'}</span>
        <span style="font-size:13px"><b style="color:var(--aviso)">●</b> ${nAten} de atención</span>
        <span class="chips" style="margin:0">
          ${[['todos', 'Todos'], ['critico', 'Críticos'], ['atencion', 'Atención']].map(v =>
            `<label class="chip ${filtroSev === v[0] ? 'on' : ''}" data-filtrosev="${v[0]}">${v[1]}</label>`).join('')}
        </span>
      </div>`;

    // Barra horizontal: longitud = porcentaje, color = severidad.
    const barra = h => `
      <div style="display:flex;align-items:center;gap:8px">
        <div style="flex:1;min-width:70px;height:12px;background:var(--na-suave);
                    border-radius:6px;overflow:hidden">
          <div style="width:${h.pct}%;height:100%;
                      background:${h.nivel === 'critico' ? 'var(--ko)' : 'var(--aviso)'}"></div>
        </div>
        <b style="min-width:36px;text-align:right;font-size:13px">${h.pct}%</b>
      </div>`;

    const badgeNivel = h =>
      `<span class="badge info" style="font-size:11px;white-space:nowrap">${Utils.esc(h.nivelEtiqueta)}</span>`;

    const tabla = (cab, filas) => `
      <table class="tabla">
        <thead><tr>${cab.map(c => `<th>${c}</th>`).join('')}</tr></thead>
        <tbody>${filas.join('')}</tbody>
      </table>`;

    const tit = (nom, n) =>
      `<h3 style="margin:16px 0 8px;font-size:14px">${nom}
         <small style="color:var(--tinta-suave);font-weight:400">(${n})</small></h3>`;

    const crits = visibles.filter(h => h.tipo === 'criterio');
    const htmlCrits = crits.length ? tit('Criterios con dificultades', crits.length)
      + tabla(['Nivel', 'Criterio', 'Alumnado por debajo del 50%'], crits.map(h => {
        const c = Calc.criterio(h.criterioId);
        return `<tr>
          <td>${badgeNivel(h)}</td>
          <td><b>${Utils.esc(h.codigo)}</b>
              <span style="color:var(--tinta-suave)">${c ? Utils.esc(c.descripcion) : ''}</span></td>
          <td style="min-width:170px">${barra(h)}</td>
        </tr>`;
      })) : '';

    const pregs = visibles.filter(h => h.tipo === 'pregunta');
    const htmlPregs = pregs.length ? tit('Preguntas con fallos', pregs.length)
      + tabla(['Pregunta', 'Instrumento', 'Alumnado con fallo'], pregs.map(h => `
        <tr>
          <td>${Utils.esc(h.pregunta)}</td>
          <td style="color:var(--tinta-suave)">${Utils.esc(h.titulo)}</td>
          <td style="min-width:170px">${barra(h)}</td>
        </tr>`)) : '';

    if (!visibles.length) {
      return resumen + '<div class="aviso">Ningún hallazgo de esta severidad en este alcance.</div>';
    }
    return resumen + htmlCrits + htmlPregs;
  }

  // -------------------------------------------------------------- criterios
  // Una tabla por nivel (Base y cada ACI): cada grupo se analiza con SUS
  // criterios y su propia media, porque el currículo de cada ACI es distinto
  // y mezclarlos deja las celdas del otro currículo en blanco.
  // Dos modos: Absoluto (logro vs 50%) y Relativo (vs media del grupo).
  let modoCriterios = 'absoluto'; // 'absoluto' | 'relativo'

  // Datos de un nivel: sus criterios como columnas y solo su alumnado como
  // filas. La media se calcula con ese alumnado (la media de la clase mezclaría
  // currículos distintos). Devuelve null si el nivel no tiene nada que ver.
  function datosNivel(claseId, insts, codigo, etiqueta) {
    const alumnos = Calc.alumnosDeClase(claseId)
      .filter(a => Calc.nivelDeAlumno(claseId, a.id) === codigo);
    if (!alumnos.length) return null;
    const ids = new Set(alumnos.map(a => a.id));
    const columnas = Calc.tablaCriteriosInforme(claseId, insts,
      Calc.criteriosDeNivel(claseId, codigo))
      .map(f => {
        const filas = f.filas.filter(fl => ids.has(fl.alumno.id));
        const vals = filas.map(fl => fl.logro).filter(v => v != null);
        const media = vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
        return { criterio: f.criterio, media, filas };
      })
      .filter(f => f.filas.length);
    if (!columnas.length) return null;
    return { etiqueta, alumnos, columnas };
  }

  function htmlCriterios(claseId, insts) {
    const niveles = [{ codigo: '', etiqueta: 'Base' }]
      .concat(Calc.nivelesAciDeClase(claseId)
        .map(nv => ({ codigo: nv.codigo, etiqueta: nv.etiqueta || nv.codigo })));
    const seleccion = esTodas(nivelSel)
      ? niveles
      : niveles.filter(nv => nv.codigo === Calc.nivelNorm(nivelSel));

    const tablas = seleccion
      .map(nv => datosNivel(claseId, insts, nv.codigo, nv.etiqueta))
      .filter(Boolean);

    if (!tablas.length) {
      return '<div class="aviso">Este nivel no tiene criterios de evaluación o no hay datos en este alcance.</div>';
    }

    const toggle = `
      <div class="chips no-print" style="margin-bottom:12px">
        <label class="chip ${modoCriterios === 'absoluto' ? 'on' : ''}" data-modocrit="absoluto">Absoluto (vs 50%)</label>
        <label class="chip ${modoCriterios === 'relativo' ? 'on' : ''}" data-modocrit="relativo">Relativo (vs media)</label>
      </div>`;

    const thCriterio = f => `
      <th style="writing-mode:vertical-rl;text-orientation:mixed;
                 transform:rotate(180deg);height:130px;padding:6px 4px;
                 font-size:12px;white-space:nowrap;max-width:40px;overflow:hidden"
          title="${Utils.esc(f.criterio.descripcion)}">
        ${Utils.esc(f.criterio.codigo)}
      </th>`;

    // Celda para una fila concreta dentro de un criterio. `f.media` es la media
    // del grupo (no de la clase).
    const celda = (f, fl) => {
      if (fl.logro == null) return '<td class="num"><span class="badge na">—</span></td>';
      if (modoCriterios === 'absoluto') {
        const pct = Math.round(fl.logro * 100);
        const cls = fl.logro >= 0.5 ? 'ok' : fl.logro >= 0.4 ? 'warn' : 'ko';
        return `<td class="num"><span class="badge ${cls}">${pct}%</span></td>`;
      }
      if (f.media == null) return '<td class="num"><span class="badge na">—</span></td>';
      const dif = Math.round((fl.logro - f.media) * 100);
      const cls = dif >= 0 ? 'ok' : 'ko';
      return `<td class="num"><span class="badge ${cls}">${dif >= 0 ? '+' : ''}${dif}%</span></td>`;
    };

    const tablaHtml = (g, i) => {
      // Fila de media del grupo.
      const filaMedia = `
        <tr style="font-weight:700;border-top:2px solid #ccc">
          <td>Media del grupo</td>
          ${g.columnas.map(f => {
            if (f.media == null) return '<td class="num">—</td>';
            const pct = Math.round(f.media * 100);
            if (modoCriterios === 'absoluto') {
              const cls = f.media >= 0.5 ? 'ok' : f.media >= 0.4 ? 'warn' : 'ko';
              return `<td class="num"><span class="badge ${cls}">${pct}%</span></td>`;
            }
            // En modo relativo la media es la referencia: se muestra en tono suave.
            return `<td class="num"><span style="color:var(--tinta-suave)">${pct}%</span></td>`;
          }).join('')}
        </tr>`;

      // La descripción de cada criterio no se lista al pie (ocupa mucho): se
      // ve al pasar el ratón sobre su cabecera (atributo `title` del th).

      // Con varias tablas a la vista hace falta un título por tabla.
      const titulo = tablas.length > 1
        ? `<h3 style="margin:18px 0 8px;font-size:14px">${Utils.esc(g.etiqueta)}</h3>`
        : '';

      return `
        ${titulo}
        <div class="scroll-x">
          <table class="tabla tabla-cuadricula">
            <thead><tr><th>Alumno</th>${g.columnas.map(thCriterio).join('')}</tr></thead>
            <tbody>
              ${g.alumnos.map(a => `
                <tr>
                  <td>${Utils.esc(a.apellidos)}, ${Utils.esc(a.nombre)}</td>
                  ${g.columnas.map(f => {
                    const fl = f.filas.find(x => x.alumno.id === a.id);
                    return fl ? celda(f, fl) : '<td class="num">—</td>';
                  }).join('')}
                </tr>`).join('')}
              ${filaMedia}
            </tbody>
          </table>
        </div>`;
    };

    return toggle + tablas.map(tablaHtml).join('');
  }

  // ----------------------------------------------------------- distribución
  // Una barra por nota (sin agrupar), con línea punteada en el 5 (corte del
  // aprobado). Eje X = nota (0–10), altura proporcional a la nota.
  // `nivelFiltro`: undefined = todo el grupo; '' = base; otro = ese nivel ACI.
  function htmlDistribucion(claseId, insts, nivelFiltro) {
    const dist = Calc.distribucionNotas(claseId, insts, nivelFiltro);
    const filtrado = nivelFiltro !== undefined;
    const mediaTxt = filtrado
      ? `Media del alumnado de <b>${Utils.esc(Calc.etiquetaNivel(claseId, nivelFiltro))}</b>`
      : 'Media de todo el grupo';
    const avisoTxt = filtrado
      ? `No hay notas del alumnado de <b>${Utils.esc(Calc.etiquetaNivel(claseId, nivelFiltro))}</b> en este alcance.`
      : 'No hay notas de todo el grupo en este alcance.';
    if (!dist.notas.length) return `<div class="aviso">${avisoTxt}</div>`;
    const media = Math.round(dist.media * 10) / 10;
    const notas = dist.notas.slice().sort((a, b) => a - b);
    const ALTO = 180; // px máximos de barra

    return `
      <p style="margin-bottom:${filtrado ? 4 : 14}px"><strong>${mediaTxt}:</strong> ${media} / 10</p>
      ${filtrado ? '<p class="no-print" style="margin-bottom:14px;font-size:12px;color:var(--tinta-suave)">Nivel filtrado con el selector superior de la cuadrícula.</p>' : ''}
      <div style="position:relative;height:${ALTO + 28}px;
                  border-bottom:2px solid #ccc;margin-bottom:4px">
        ${notas.map(n => {
          const h = Math.max(4, Math.round((n / 10) * ALTO));
          const x = (n / 10 * 100).toFixed(2);
          const color = n >= 5 ? 'var(--acento, #4a90d9)' : '#dc3545';
          return `
            <div style="position:absolute;bottom:0;left:${x}%;
                        transform:translateX(-50%);
                        width:10px;height:${h}px;
                        background:${color};border-radius:3px 3px 0 0"
                 title="${Math.round(n * 10) / 10}"></div>`;
        }).join('')}
        <div style="position:absolute;top:0;bottom:0;left:50%;
                    border-left:2px dashed #888"></div>
        <span style="position:absolute;bottom:-20px;left:50%;transform:translateX(-50%);
                     font-size:11px;color:#888">5 (aprobado)</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--tinta-suave)">
        <span>0</span><span>2</span><span>4</span><span>6</span><span>8</span><span>10</span>
      </div>
      <p style="margin-top:14px;font-size:13px;color:var(--tinta-suave)">
        Cada barra es un alumno · ${notas.filter(n => n >= 5).length} de ${notas.length} aprueban (${Math.round(notas.filter(n => n >= 5).length / notas.length * 100)}%)
      </p>`;
  }

  // --------------------------------------------------------------- alumnos
  // Resumen accionable («¿con quién hablo mañana?»): cada alumno con SU
  // nivel, SU nota en el alcance y los criterios que van por debajo del 50%
  // (el mismo umbral que los hallazgos). Ordenado por riesgo: más criterios
  // primero y, a igualdad, nota más baja. `nivelFiltro` actúa como en
  // Distribución: undefined = todos los niveles.
  const UMB_RIESGO = 0.5;

  function htmlAlumnos(claseId, insts, nivelFiltro) {
    let alumnos = Calc.alumnosDeClase(claseId);
    if (nivelFiltro !== undefined && nivelFiltro !== null) {
      const nv = Calc.nivelNorm(nivelFiltro);
      alumnos = alumnos.filter(a => Calc.nivelDeAlumno(claseId, a.id) === nv);
    }
    if (!alumnos.length) return '<div class="aviso">No hay alumnado en esta clase.</div>';

    const filas = alumnos.map(a => {
      const criterios = Calc.criteriosDeAlumno(claseId, a.id);
      const bajo = criterios
        .map(c => ({ criterio: c, logro: Calc.logroCriterioEnInsts(c.id, claseId, a.id, insts) }))
        .filter(x => x.logro != null && x.logro < UMB_RIESGO);
      return {
        alumno: a,
        nivel: Calc.etiquetaNivel(claseId, Calc.nivelDeAlumno(claseId, a.id)),
        nota: Calc.notaEnInsts(claseId, a.id, insts),
        bajo
      };
    });

    const enRiesgo = filas.filter(f => f.bajo.length)
      .sort((x, y) => y.bajo.length - x.bajo.length
        || (x.nota == null ? 99 : x.nota) - (y.nota == null ? 99 : y.nota));
    const tranquilos = filas.length - enRiesgo.length;

    const resumen = `
      <p style="margin-bottom:12px"><strong>${enRiesgo.length} de ${filas.length}</strong>
        alumnos con criterios por debajo del 50% en este alcance.</p>`;

    if (!enRiesgo.length) {
      return resumen + '<div class="aviso">Ningún alumno tiene criterios por debajo del 50% en este alcance.</div>';
    }

    return resumen + `
      <div class="scroll-x">
        <table class="tabla">
          <thead><tr>
            <th>Alumno</th><th>Nivel</th><th class="num">Nota</th>
            <th class="num">Criterios bajo 50%</th><th>Criterios con dificultad</th>
          </tr></thead>
          <tbody>
            ${enRiesgo.map(f => `
              <tr>
                <td>${Utils.esc(f.alumno.apellidos)}, ${Utils.esc(f.alumno.nombre)}</td>
                <td><span class="badge info" style="font-size:11px;white-space:nowrap">${Utils.esc(f.nivel || 'Base')}</span></td>
                <td class="num">${Calc.badgeHtml(f.nota)}</td>
                <td class="num"><span class="badge ${f.bajo.length >= 2 ? 'ko' : 'warn'}">${f.bajo.length}</span></td>
                <td>${f.bajo.map(x =>
                  `<span class="badge ${x.logro < 0.3 ? 'ko' : 'warn'}" style="font-size:11px;margin-right:4px"
                         title="${Utils.esc(x.criterio.descripcion)}">${Utils.esc(x.criterio.codigo)} ${Math.round(x.logro * 100)}%</span>`).join('')}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <p style="color:var(--tinta-suave);font-size:13px;margin-top:10px">
        ${tranquilos} alumno(s) sin criterios por debajo del 50%. Cada alumno se valora con los criterios de SU nivel.
      </p>`;
  }

  // Informe de análisis para PDF: todas las subvistas compuestas —hallazgos,
  // criterios, distribución y alumnos— con cabecera de clase y alcance. Devuelve
  // un string puro (comprobable sin navegador); el botón «Imprimir / PDF» se lo
  // pasa al contenedor de impresión de la Cuadrícula (opciones.imprimir).
  function informeHtml() {
    if (!claseSel) return '';
    const insts = instsAlcance();
    const gru = Calc.byId(Storage.db.grupos, (Calc.clase(claseSel) || {}).grupoId);
    const asig = Calc.asignaturaDeClase(claseSel);
    const alcanceTxt = [
      alcance.periodo ? 'Trimestre ' + alcance.periodo : 'Todo el curso',
      alcance.unidad,
      alcance.instrumentoId ? (Calc.instrumento(alcance.instrumentoId) || {}).titulo : ''
    ].filter(Boolean).map(t => Utils.esc(t));
    const nivelTxt = esTodas(nivelSel) ? 'Todos los niveles' : (Calc.etiquetaNivel(claseSel, nivelSel) || 'Base');
    const bloque = (titulo, cuerpo) => `
      <section class="informe-seccion">
        <h2 class="informe-titulo">${titulo}</h2>
        ${cuerpo}
      </section>`;
    return `<div class="informe-cab">
        <strong>Informe de análisis · ${Utils.esc(asig ? asig.nombre : '¿?')}</strong>
        <span>${Utils.esc(gru ? gru.nombre : '¿?')} · nivel: ${Utils.esc(nivelTxt)} · ${alcanceTxt.join(' · ')} · impreso el ${Utils.hoy().split('-').reverse().join('/')}</span>
      </div>
      ${bloque('Hallazgos', htmlHallazgos(claseSel, insts))}
      ${bloque('Criterios', htmlCriterios(claseSel, insts))}
      ${bloque('Distribución', htmlDistribucion(claseSel, insts, esTodas(nivelSel) ? undefined : nivelSel))}
      ${bloque('Alumnos en riesgo', htmlAlumnos(claseSel, insts, esTodas(nivelSel) ? undefined : nivelSel))}`;
  }

  // ---------------------------------------------------------------- render
  function render(el, opciones) {
    // Al cambiar de clase se restablece el alcance.
    if (opciones.claseSel !== claseSel) {
      claseSel = opciones.claseSel;
      alcance = { periodo: '', unidad: '', instrumentoId: '' };
    }
    nivelSel = opciones.nivelSel || '';
    contenedor = el;

    if (!claseSel || !Calc.clase(claseSel)) {
      el.innerHTML = '<div class="aviso">Selecciona una clase para ver el informe.</div>';
      return;
    }

    const insts = instsAlcance();
    const todas = esTodas(nivelSel);

    // Criterios decide sus tablas según el nivel; Distribución filtra el
    // alumnado por el mismo nivel; Hallazgos analiza todos los niveles y los
    // etiqueta; Alumnos ordena por riesgo.
    el.innerHTML = `
      ${htmlAlcance(claseSel)}
      ${htmlSubVista()}
      <div id="informe-cuerpo">
        ${subVista === 'hallazgos' ? htmlHallazgos(claseSel, insts)
          : subVista === 'criterios' ? htmlCriterios(claseSel, insts)
          : subVista === 'distribucion' ? htmlDistribucion(claseSel, insts, todas ? undefined : nivelSel)
          : htmlAlumnos(claseSel, insts, todas ? undefined : nivelSel)}
      </div>`;

    // --- eventos ---
    const sp = el.querySelector('#alc-periodo');
    if (sp) sp.onchange = e => {
      alcance.periodo = e.target.value;
      alcance.unidad = '';
      alcance.instrumentoId = '';
      render(el, opciones);
    };
    const su = el.querySelector('#alc-unidad');
    if (su) su.onchange = e => {
      alcance.unidad = e.target.value;
      alcance.instrumentoId = '';
      render(el, opciones);
    };
    const si = el.querySelector('#alc-instrumento');
    if (si) si.onchange = e => {
      alcance.instrumentoId = e.target.value;
      render(el, opciones);
    };
    el.querySelectorAll('[data-subvista]').forEach(ch => {
      ch.onclick = () => { subVista = ch.dataset.subvista; render(el, opciones); };
    });
    el.querySelectorAll('[data-modocrit]').forEach(ch => {
      ch.onclick = () => { modoCriterios = ch.dataset.modocrit; render(el, opciones); };
    });
    el.querySelectorAll('[data-filtrosev]').forEach(ch => {
      ch.onclick = () => { filtroSev = ch.dataset.filtrosev; render(el, opciones); };
    });
    // La Cuadrícula inyecta la función de impresión (opciones.imprimir); sin
    // ella (arnés de pruebas) el botón no hace nada.
    const btnPdf = el.querySelector('#btn-informe-pdf');
    if (btnPdf && opciones.imprimir) {
      btnPdf.onclick = () => opciones.imprimir(informeHtml());
    }
  }

  return { render, informeHtml };
})();
