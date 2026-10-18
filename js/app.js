const App = (() => {
  const VISTAS = [
    { id: 'inicio', label: 'Inicio', render: renderInicio },
    { id: 'alumnos', label: 'Alumnos y grupos', render: el => AlumnosView.render(el) },
    { id: 'clases', label: 'Asignaturas y clases', render: el => ClasesView.render(el) },
    { id: 'curriculo', label: 'Currículo', render: el => CurriculoView.render(el), riesgo: true },
    { id: 'instrumentos', label: 'Instrumentos', render: el => InstrumentosView.render(el) },
    { id: 'cuadricula', label: 'Calificaciones', render: el => CuadriculaView.render(el) }
  ];
  let actual = 'inicio';

  function opcionesCurso(valorActual) {
    const m = /^(\d{4})\//.exec(String(valorActual || ''));
    const base = m ? parseInt(m[1], 10) : new Date().getMonth() >= 6 ? new Date().getFullYear() : new Date().getFullYear() - 1;
    const lista = [];
    for (let y = base - 2; y <= base + 4; y++) lista.push(`${y}/${y + 1}`);
    if (!lista.includes(valorActual)) lista.push(valorActual);
    lista.sort();
    return lista.map(v => `<option ${v === valorActual ? 'selected' : ''}>${Utils.esc(v)}</option>`).join('');
  }

  // Mensaje de aviso según el estado de la copia de seguridad (R-01).
  function avisoCopiaHtml(est) {
    if (!est.hayDatos) return '';
    if (est.nivel === 'nunca') {
      return '<div class="aviso" style="margin:8px 0 0;background:#fef2f2;border-color:#fecaca;color:#991b1b"><b>Todavía no has hecho ninguna copia de seguridad.</b> Tus notas solo están en este navegador: expórtalas al USB.</div>';
    }
    if (est.nivel === 'pendiente') {
      return '<div class="aviso" style="margin:8px 0 0"><b>Hay cambios desde tu última copia.</b> Exporta el backup al USB para no perderlos.</div>';
    }
    if (est.nivel === 'antigua') {
      return `<div class="aviso" style="margin:8px 0 0">Tu última copia es de hace ${est.dias} días. Conviene exportarla otra vez.</div>`;
    }
    return '';
  }

  function renderInicio(el) {
    const db = Storage.db;
    const stats = [
      ['Grupos', db.grupos.length],
      ['Alumnos', db.alumnos.length],
      ['Asignaturas', db.asignaturas.length],
      ['Clases', db.clases.length],
      ['Criterios', db.criterios.length],
      ['Instrumentos', db.instrumentos.length]
    ];
    el.innerHTML = `
      <section class="card">
        <div class="card-head">
          <h1>Bienvenido a EvalCrit</h1>
          <label class="campo" style="margin:0"><span>Curso escolar</span>
            <select id="sel-curso" style="max-width:150px">${opcionesCurso(db.cursoEscolar)}</select></label>
        </div>
        <p style="color:var(--tinta-suave)">Califica con criterios ponderados según la LOMLOE. Los datos se guardan en este navegador:
          <b>exporta tu backup al USB con frecuencia</b>.</p>
        <div class="resumen-stats">
          ${stats.map(([k, v]) => `<div class="stat"><b>${v}</b><span>${k}</span></div>`).join('')}
        </div>
        <div class="aviso" style="background:#eff6ff;border-color:#bfdbfe;color:#1e40af">
          <b>Copias de seguridad</b> · <span id="info-backup">…</span><br>
          <small>Con Chrome/Edge en Windows puedes guardar directamente en la carpeta <code>backups/</code> del proyecto; en Android irán a Descargas.</small>
          <div id="aviso-copia" class="no-print"></div>
          <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap" class="no-print">
            <button class="btn btn-primario btn-mini" id="btn-guardar-ini">Guardar (evalcrit.json)</button>
            <button class="btn btn-mini" id="btn-exportar-ini">Exportar backup ahora</button>
            ${Storage.puedeCarpeta() ? '<button class="btn btn-mini" id="btn-carpeta">Elegir carpeta de backups…</button>' : ''}
          </div>
          ${Storage.copiaPrevia() ? '<div class="no-print" style="margin-top:8px"><button class="btn btn-mini" id="btn-restaurar-previa">↩ Recuperar los datos anteriores a la última importación</button></div>' : ''}
        </div>
        ${Storage.vacio() ? `
          <div class="aviso">Tu aplicación está vacía. Puedes cargar datos de ejemplo para probarla.</div>
          <button class="btn btn-primario" id="btn-demo">Cargar datos de ejemplo</button>` : `
          <div style="margin-top:14px">
            <button class="btn btn-peligro" id="btn-reiniciar">Restablecer y vaciar todos los datos</button>
          </div>`}
        <h2 style="font-size:15px;margin:18px 0 8px">Flujo recomendado</h2>
        <ol style="color:var(--tinta-suave);line-height:1.9;margin:0;padding-left:20px">
          <li>Crea <b>grupos</b> e inscribe <b>alumnos</b>.</li>
          <li>Crea <b>asignaturas</b> y sus <b>clases</b> (asignatura · grupo).</li>
          <li>Define en <b>Currículo</b> las competencias específicas, los criterios y sus ponderaciones (suman 100%).</li>
          <li>Crea <b>instrumentos</b>: control, rúbrica, proyecto u otro, mapeando cada apartado a criterios.</li>
          <li>Corrige y consulta resultados por instrumento, criterio y competencia en la <b>Cuadrícula</b>.</li>
          <li>Exporta el backup al terminar cada sesión.</li>
        </ol>
      </section>`;

    const curso = el.querySelector('#sel-curso');
    if (curso) {
      curso.addEventListener('change', () => {
        db.cursoEscolar = curso.value;
        Storage.save();
        UI.toast('Curso escolar: ' + db.cursoEscolar);
      });
    }

    const info = el.querySelector('#info-backup');
    const avisoCopia = el.querySelector('#aviso-copia');
    let dirActual = null;
    const pintaInfo = dir => {
      if (dir) dirActual = dir;
      const ultima = db.meta && db.meta.ultimaExportacion ? Utils.fechaLegible(new Date(db.meta.ultimaExportacion)) + ' a las ' + new Date(db.meta.ultimaExportacion).toTimeString().slice(0, 5) : 'nunca';
      info.innerHTML = `última copia <b>${ultima}</b>${dirActual ? ` · destino: carpeta «${Utils.esc(dirActual.name)}»` : ''}`;
      if (avisoCopia) avisoCopia.innerHTML = avisoCopiaHtml(Storage.estadoCopia());
    };
    pintaInfo(null);
    Storage.idbLeer('dir').then(pintaInfo).catch(() => {});

    const btnExpIni = el.querySelector('#btn-exportar-ini');
    btnExpIni.onclick = () => Storage.exportar()
      .then(ok => { if (ok) pintaInfo(); })
      .catch(e => alert('Error al exportar: ' + e.message));
    const btnGuardarIni = el.querySelector('#btn-guardar-ini');
    btnGuardarIni.onclick = () => Storage.guardar()
      .then(ok => { if (ok) pintaInfo(); })
      .catch(e => alert('Error al guardar: ' + e.message));
    const btnCarpeta = el.querySelector('#btn-carpeta');
    if (btnCarpeta) {
      btnCarpeta.onclick = async () => {
        const h = await Storage.elegirCarpetaBackup();
        if (h) { pintaInfo(h); }
      };
    }
    const btnPrevia = el.querySelector('#btn-restaurar-previa');
    if (btnPrevia) btnPrevia.onclick = () => {
      const o = Storage.copiaPrevia();
      if (!o) return;
      const fecha = Utils.fechaLegible(new Date(o.fecha));
      if (!confirm('Se reemplazarán los datos ACTUALES por los que tenías antes de importar (del ' + fecha + '). ¿Continuar?')) return;
      if (Storage.restaurarCopiaPrevia()) {
        UI.toast('Datos anteriores restaurados');
        App.ir('inicio');
      } else {
        alert('No se pudieron restaurar los datos anteriores.');
      }
    };
    const demo = el.querySelector('#btn-demo');
    if (demo) demo.onclick = () => {
      Storage.demoSeed();
      UI.toast('Datos de ejemplo cargados');
      App.ir('inicio');
    };
    const reiniciar = el.querySelector('#btn-reiniciar');
    if (reiniciar) reiniciar.onclick = () => {
      UI.openModal({
        titulo: 'Restablecer aplicación',
        cuerpo: `<p>Se eliminarán <b>todos</b> los grupos, alumnos, clases, currículos, instrumentos y calificaciones guardados en este navegador.</p>
          <div class="aviso">Si quieres conservar algo, exporta tu backup antes de continuar.</div>`,
        textoGuardar: 'Sí, vaciar todo',
        peligro: true,
        alGuardar() {
          Storage.reiniciar();
          UI.toast('Datos eliminados');
        }
      });
    };
  }

  function ir(id) {
    actual = id;
    const vista = VISTAS.find(v => v.id === id);
    const nav = document.getElementById('nav');
    nav.innerHTML = '';
    for (const v of VISTAS) {
      const b = document.createElement('button');
      b.textContent = v.label;
      if (v.id === actual) b.classList.add('activo');
      if (v.riesgo && v.id !== actual) b.classList.add('peligro-activo');
      b.onclick = () => ir(v.id);
      nav.appendChild(b);
    }
    UI.closeModal();
    vista.render(document.getElementById('app'));
    window.scrollTo(0, 0);
    history.replaceState(null, '', '#' + id);
  }

  function arrancar() {
    Storage.load();
    if (Storage.reparadosCriterios) {
      Storage.save();
      UI.toast(Storage.reparadosCriterios === 1
        ? 'Se han corregido los criterios de 1 instrumento para que coincidan con su nivel.'
        : 'Se han corregido los criterios de ' + Storage.reparadosCriterios + ' instrumentos para que coincidan con su nivel.');
    }
    document.getElementById('btn-guardar').onclick = () => Storage.guardar().catch(e => alert('Error al guardar: ' + e.message));
    document.getElementById('btn-exportar').onclick = () => Storage.exportar().catch(e => alert('Error al exportar: ' + e.message));

    const input = document.getElementById('input-importar');
    document.getElementById('btn-importar').onclick = () => input.click();
    input.onchange = () => {
      const archivo = input.files[0];
      input.value = '';
      if (!archivo) return;
      if (!confirm('Importar reemplazará TODOS los datos actuales. ¿Continuar?')) return;
      Storage.importar(archivo)
        .then(copiada => {
          UI.toast(copiada
            ? 'Backup importado. Guardé una copia de tus datos anteriores por si quieres deshacerlo.'
            : 'Backup importado');
          ir(actual);
        })
        .catch(() => alert('El archivo no es un backup válido de EvalCrit'));
    };

    // Red de seguridad (R-01): vuelca el estado al ocultar o cerrar la pestaña
    // por si alguna escritura anterior no llegó a completarse.
    const volcadoSeguro = () => { if (Storage.db) Storage.volcar(); };
    window.addEventListener('beforeunload', volcadoSeguro);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') volcadoSeguro();
    });

    const hash = location.hash.slice(1);
    ir(VISTAS.some(v => v.id === hash) ? hash : 'inicio');
  }

  return {
    ir,
    arrancar,
    refrescar() { ir(actual); }
  };
})();

document.addEventListener('DOMContentLoaded', App.arrancar);
