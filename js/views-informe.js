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
  function htmlHallazgos(claseId, insts, criterios) {
    const hall = Calc.hallazgos(claseId, insts, criterios);
    if (!hall.length) {
      return '<div class="aviso">No se han detectado problemas significativos en este alcance.</div>';
    }
    return hall.map(h => `
      <div style="border-left:4px solid ${h.nivel === 'critico' ? '#dc3545' : '#ffc107'};
                  padding:10px 14px;margin-bottom:8px;
                  background:${h.nivel === 'critico' ? '#fff5f5' : '#fffde7'};
                  border-radius:0 4px 4px 0">
        <span style="font-size:12px;font-weight:700;text-transform:uppercase;
                     color:${h.nivel === 'critico' ? '#dc3545' : '#856404'}">
          ${h.nivel === 'critico' ? 'Crítico' : 'Atención'}
        </span>
        <span style="margin-left:10px">${Utils.esc(h.texto)}</span>
      </div>`).join('');
  }

  // -------------------------------------------------------------- criterios
  // Tabla 2×2: logro absoluto (≥50%) × relativo (≥ media de la clase).
  function htmlCriterios(claseId, insts, criterios) {
    const tabla = Calc.tablaCriteriosInforme(claseId, insts, criterios);
    if (!tabla.length) {
      return '<div class="aviso">No hay criterios para analizar en este alcance.</div>';
    }
    return tabla.map(f => {
      const mediaPct = f.media == null ? '—' : Math.round(f.media * 100) + '%';
      // Semáforo: verde ≥50%, amarillo 40–49%, rojo <40%.
      const colorLogro = l => l == null ? '' : l >= 0.5 ? 'ok' : l >= 0.4 ? 'info' : 'ko';
      const colorRel = (logro, media) => {
        if (logro == null || media == null) return '';
        return logro >= media ? 'ok' : 'ko';
      };
      return `
        <div style="margin-bottom:22px">
          <h3 style="margin:0 0 8px;font-size:15px">
            ${Utils.esc(f.criterio.codigo)}
            <small style="color:var(--tinta-suave);font-weight:400">
              ${Utils.esc(f.criterio.descripcion)} · media clase: ${mediaPct}
            </small>
          </h3>
          <table class="tabla">
            <thead><tr><th>Alumno</th><th>Logro</th><th>Absoluto (≥50%)</th><th>Relativo (≥ media)</th></tr></thead>
            <tbody>
              ${f.filas.map(fl => {
                const pctLogro = fl.logro == null ? null : Math.round(fl.logro * 100);
                const dif = (fl.logro == null || f.media == null) ? null
                  : Math.round((fl.logro - f.media) * 100);
                return `
                <tr>
                  <td>${Utils.esc(fl.alumno.apellidos)}, ${Utils.esc(fl.alumno.nombre)}</td>
                  <td><span class="badge ${colorLogro(fl.logro)}">${pctLogro == null ? '—' : pctLogro + '%'}</span></td>
                  <td>${dif == null ? '—' : `<span class="badge ${colorRel(fl.logro, f.media)}">${dif >= 0 ? '+' : ''}${dif}% sobre la media</span>`}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>`;
    }).join('');
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

    // En modo «Todos los niveles» el análisis de criterios no es significativo
    // (cada nivel tiene su propio currículo); se muestra un aviso.
    const modoTodas = nivelSel === 'TODAS';
    const avisoTodas = '<div class="aviso">Elige un nivel concreto (o Base) en el selector superior para ver el análisis de criterios y hallazgos.</div>';

    el.innerHTML = `
      ${htmlAlcance(claseSel)}
      ${htmlSubVista()}
      <div id="informe-cuerpo">
        ${modoTodas && subVista !== 'distribucion' ? avisoTodas
          : subVista === 'hallazgos' ? htmlHallazgos(claseSel, insts, criterios)
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
  }

  return { render };
})();
