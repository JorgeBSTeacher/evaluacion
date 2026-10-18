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
  let subVista = 'hallazgos'; // 'hallazgos' | 'criterios' | 'distribucion'
  let contenedor = null;

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
      { id: 'distribucion', nombre: 'Distribución' }
    ];
    return `
      <div class="chips no-print" style="margin-bottom:14px">
        ${vistas.map(v =>
          `<label class="chip ${subVista === v.id ? 'on' : ''}" data-subvista="${v.id}">${v.nombre}</label>`).join('')}
      </div>`;
  }

  // ------------------------------------------------------------ hallazgos
  // Se analiza cada nivel (base + cada ACI) por separado para etiquetar cada
  // hallazgo con su nivel, y se separan en dos secciones: criterios y preguntas.
  function htmlHallazgos(claseId, insts) {
    const nivelesAci = Calc.nivelesAciDeClase(claseId);
    const niveles = [
      { etiqueta: 'Base', criterios: Calc.criteriosDeClase(claseId) }
    ].concat(nivelesAci.map(nv => ({
      etiqueta: nv.etiqueta || nv.codigo,
      criterios: Calc.criteriosDeNivel(claseId, nv.codigo)
    })));

    // Recoger hallazgos de todos los niveles con su etiqueta.
    const todos = [];
    for (const nv of niveles) {
      Calc.hallazgos(claseId, insts, nv.criterios).forEach(h => {
        h.nivelEtiqueta = nv.etiqueta;
        todos.push(h);
      });
    }

    if (!todos.length) {
      return '<div class="aviso">No se han detectado problemas significativos en este alcance.</div>';
    }

    // Tarjeta individual con badge de nivel.
    const tarjeta = h => `
      <div style="border-left:4px solid ${h.nivel === 'critico' ? '#dc3545' : '#ffc107'};
                  padding:10px 14px;margin-bottom:8px;
                  background:${h.nivel === 'critico' ? '#fff5f5' : '#fffde7'};
                  border-radius:0 4px 4px 0">
        <span style="font-size:12px;font-weight:700;text-transform:uppercase;
                     color:${h.nivel === 'critico' ? '#dc3545' : '#856404'}">
          ${h.nivel === 'critico' ? 'Crítico' : 'Atención'}
        </span>
        <span class="badge info" style="margin-left:8px;font-size:11px">${Utils.esc(h.nivelEtiqueta)}</span>
        <span style="margin-left:10px">${Utils.esc(h.texto)}</span>
      </div>`;

    const seccion = (titulo, items) => items.length
      ? `<h3 style="margin:18px 0 8px;font-size:14px">${titulo} <small style="color:var(--tinta-suave);font-weight:400">(${items.length})</small></h3>
         ${items.map(tarjeta).join('')}`
      : '';

    const porCriterio = todos.filter(h => h.tipo === 'criterio');
    const porPregunta = todos.filter(h => h.tipo === 'pregunta');

    return seccion('Criterios con dificultades', porCriterio)
         + seccion('Preguntas con fallos', porPregunta);
  }

  // -------------------------------------------------------------- criterios
  // Matriz alumnos × criterios. Dos modos: Absoluto (logro vs 50%) y Relativo
  // (diferencia contra la media de la clase). Cabeceras con texto vertical.
  let modoCriterios = 'absoluto'; // 'absoluto' | 'relativo'

  function htmlCriterios(claseId, insts, criterios) {
    const tabla = Calc.tablaCriteriosInforme(claseId, insts, criterios);
    if (!tabla.length) {
      return '<div class="aviso">No hay criterios para analizar en este alcance.</div>';
    }

    // Datos por alumno (filas) y por criterio (columnas).
    const alumnos = tabla.length ? tabla[0].filas.map(fl => fl.alumno) : [];
    const mediaCriterio = tabla.map(f => f.media);
    const logroDe = (fila, col) => fila[col] == null ? null : fila[col].logro;

    const toggle = `
      <div class="chips no-print" style="margin-bottom:12px">
        <label class="chip ${modoCriterios === 'absoluto' ? 'on' : ''}" data-modocrit="absoluto">Absoluto (vs 50%)</label>
        <label class="chip ${modoCriterios === 'relativo' ? 'on' : ''}" data-modocrit="relativo">Relativo (vs media)</label>
      </div>`;

    // Cabecera: código en vertical + descripción corta debajo.
    const thCriterio = f => `
      <th style="writing-mode:vertical-rl;text-orientation:mixed;
                 transform:rotate(180deg);height:130px;padding:6px 4px;
                 font-size:12px;white-space:nowrap;max-width:40px;overflow:hidden"
          title="${Utils.esc(f.criterio.descripcion)}">
        ${Utils.esc(f.criterio.codigo)}
      </th>`;

    // Celda según modo.
    const celda = (fl, col) => {
      const logro = fl[col] == null ? null : fl[col].logro;
      const media = mediaCriterio[col];
      if (logro == null) return '<td class="num"><span class="badge na">—</span></td>';
      if (modoCriterios === 'absoluto') {
        const pct = Math.round(logro * 100);
        const cls = logro >= 0.5 ? 'ok' : logro >= 0.4 ? 'info' : 'ko';
        return `<td class="num"><span class="badge ${cls}">${pct}%</span></td>`;
      }
      // Relativo
      if (media == null) return '<td class="num"><span class="badge na">—</span></td>';
      const dif = Math.round((logro - media) * 100);
      const cls = dif >= 0 ? 'ok' : 'ko';
      return `<td class="num"><span class="badge ${cls}">${dif >= 0 ? '+' : ''}${dif}%</span></td>`;
    };

    // Fila de media al pie.
    const filaMedia = `
      <tr style="font-weight:700;border-top:2px solid #ccc">
        <td>Media clase</td>
        ${mediaCriterio.map(m => {
          if (m == null) return '<td class="num">—</td>';
          if (modoCriterios === 'absoluto') {
            const pct = Math.round(m * 100);
            const cls = m >= 0.5 ? 'ok' : m >= 0.4 ? 'info' : 'ko';
            return `<td class="num"><span class="badge ${cls}">${pct}%</span></td>`;
          }
          return '<td class="num">—</td>'; // la media contra sí misma es 0
        }).join('')}
      </tr>`;

    // Leyenda de la descripción de cada criterio debajo de la tabla.
    const leyenda = `
      <p style="color:var(--tinta-suave);font-size:12px;margin-top:10px;line-height:1.6">
        ${tabla.map(f => `<b>${Utils.esc(f.criterio.codigo)}</b> ${Utils.esc(f.criterio.descripcion)}`).join(' · ')}
      </p>`;

    return `
      ${toggle}
      <div class="scroll-x">
        <table class="tabla tabla-cuadricula">
          <thead><tr><th>Alumno</th>${tabla.map(thCriterio).join('')}</tr></thead>
          <tbody>
            ${alumnos.map((a, i) => `
              <tr>
                <td>${Utils.esc(a.apellidos)}, ${Utils.esc(a.nombre)}</td>
                ${tabla.map((f, col) => celda(f.filas[i], col)).join('')}
              </tr>`).join('')}
            ${filaMedia}
          </tbody>
        </table>
      </div>
      ${leyenda}`;
  }

  // ----------------------------------------------------------- distribución
  // Una barra por nota (sin agrupar), con línea punteada en el 5 (corte del
  // aprobado). Eje X = nota (0–10), altura proporcional a la nota.
  function htmlDistribucion(claseId, insts) {
    const dist = Calc.distribucionNotas(claseId, insts);
    if (!dist.notas.length) {
      return '<div class="aviso">No hay notas para analizar en este alcance.</div>';
    }
    const media = Math.round(dist.media * 10) / 10;
    const notas = dist.notas.slice().sort((a, b) => a - b);
    const ALTO = 180; // px máximos de barra

    return `
      <p style="margin-bottom:14px"><strong>Media de la clase:</strong> ${media} / 10</p>
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

    const f = {};
    if (alcance.periodo) f.periodo = alcance.periodo;
    if (alcance.unidad) f.unidad = alcance.unidad;
    if (alcance.instrumentoId) f.instrumentoId = alcance.instrumentoId;
    const insts = Calc.instrumentosAlcance(claseSel, f);

    const criterios = nivelSel && nivelSel !== 'TODAS'
      ? Calc.criteriosDeNivel(claseSel, nivelSel)
      : Calc.criteriosDeClase(claseSel);

    // En modo «Todos los niveles» la vista de Criterios no es significativa
    // (cada nivel tiene su propio currículo). Hallazgos y Distribución sí
    // funcionan: los hallazgos analizan cada nivel por separado.
    const modoTodas = nivelSel === 'TODAS';
    const avisoTodas = '<div class="aviso">Elige un nivel concreto (o Base) en el selector superior para ver la matriz de criterios.</div>';

    el.innerHTML = `
      ${htmlAlcance(claseSel)}
      ${htmlSubVista()}
      <div id="informe-cuerpo">
        ${modoTodas && subVista === 'criterios' ? avisoTodas
          : subVista === 'hallazgos' ? htmlHallazgos(claseSel, insts)
          : subVista === 'criterios' ? htmlCriterios(claseSel, insts, criterios)
          : htmlDistribucion(claseSel, insts)}
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
  }

  return { render };
})();
