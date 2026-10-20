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

  // --- Paneles de Inicio (puros, sin DOM: comprobables en el arnés) ---------
  // Estado por clase: qué está montado y qué queda por corregir. Toca la fila
  // para abrir Calificaciones de esa clase.
  function panelesEstadoHtml() {
    const db = Storage.db;
    if (!db.clases.length) return '';
    const filas = db.clases.map(c => {
      const asig = Calc.asignaturaDeClase(c.id);
      const gru = Calc.byId(db.grupos, c.grupoId);
      const insts = Calc.instrumentosDeClase(c.id);
      const pend = insts.reduce((s, i) => s + Calc.progresoInstrumento(i).pendientes, 0);
      const marca = !insts.length ? '<span class="badge na">sin instrumentos</span>'
        : pend ? `<span class="badge warn">${pend} por corregir</span>`
        : '<span class="badge ok">al día</span>';
      return `<tr class="fila-inicio" data-clase="${Utils.esc(c.id)}" title="Abrir Calificaciones de esta clase">
        <td><b>${Utils.esc(asig ? asig.nombre : '¿?')}</b> · ${Utils.esc(gru ? gru.nombre : '¿?')}</td>
        <td class="num">${Calc.alumnosDeClase(c.id).length}</td>
        <td class="num">${insts.length}</td>
        <td>${marca}</td></tr>`;
    }).join('');
    return `
      <section class="card">
        <div class="card-head"><h2>Estado por clase</h2>
          <small style="color:var(--tinta-suave)">Toca una fila para abrir Calificaciones</small></div>
        <table class="tabla">
          <thead><tr><th>Asignatura · grupo</th><th class="num">Alumnos</th><th class="num">Instrumentos</th><th>Corrección</th></tr></thead>
          <tbody>${filas}</tbody>
        </table>
      </section>`;
  }

  // Asignaturas en uso por el curso: la de cada clase y la de cada nivel ACI
  // (los ACI pueden apuntar a la asignatura de otro curso).
  function asignaturasEnUso(db) {
    const ids = [];
    db.clases.forEach(c => {
      if (c.asignaturaId && !ids.includes(c.asignaturaId)) ids.push(c.asignaturaId);
      Calc.nivelesAciDeClase(c.id).forEach(n => {
        const id = n.asignaturaId || c.asignaturaId;
        if (id && !ids.includes(id)) ids.push(id);
      });
    });
    return ids;
  }

  // Cobertura del currículo: errores de montaje que rompen la calificación.
  function panelesCoberturaHtml() {
    const db = Storage.db;
    const ids = asignaturasEnUso(db);
    if (!ids.length) return '';
    const incidencias = [];
    ids.forEach(id => {
      const asig = Calc.asignatura(id);
      const nombre = asig ? asig.nombre : '¿?';
      const crits = db.criterios.filter(c => c.asignaturaId === id);
      if (!crits.length) { incidencias.push(['ko', nombre, 'sin criterios definidos']); return; }
      const suma = crits.reduce((s, c) => s + (Number(c.peso) || 0), 0);
      if (Math.abs(suma - 100) > 0.01) incidencias.push(['warn', nombre, `los criterios suman ${Utils.fmt(suma)}% (deben ser 100%)`]);
      const sinClave = crits.filter(c => !(c.claveIds || []).length).length;
      if (sinClave) incidencias.push(['warn', nombre, `${sinClave} criterio${sinClave === 1 ? '' : 's'} sin competencias clave asignadas`]);
    });
    const cuerpo = incidencias.length
      ? `<ul class="flujo" style="margin:0;padding-left:18px;color:var(--tinta-suave)">${incidencias.map(([nivel, nombre, txt]) =>
          `<li><span class="badge ${nivel}">${nivel === 'ko' ? 'Falta' : 'Revisar'}</span> <b>${Utils.esc(nombre)}</b> — ${Utils.esc(txt)}</li>`).join('')}</ul>`
      : '<p style="margin:0"><span class="badge ok">Todo en orden</span> Criterios, pesos y competencias clave completos en las asignaturas en uso.</p>';
    return `
      <section class="card">
        <div class="card-head"><h2>Cobertura del currículo</h2>
          <button class="btn btn-mini" id="btn-ir-curriculo">Abrir Currículo</button></div>
        ${cuerpo}
      </section>`;
  }

  // Niveles ACI por asignatura, con el alumnado que hay en cada nivel.
  function panelesAciHtml() {
    const db = Storage.db;
    const filas = [];
    db.clases.forEach(c => {
      const niveles = Calc.nivelesAciDeClase(c.id);
      if (!niveles.length) return;
      const asig = Calc.asignaturaDeClase(c.id);
      const gru = Calc.byId(db.grupos, c.grupoId);
      const alumnos = Calc.alumnosDeClase(c.id);
      const chips = niveles.map(n => {
        const nAl = alumnos.filter(a => Calc.nivelDeAlumno(c.id, a.id) === n.codigo).length;
        return `<span class="badge ${nAl ? 'info' : 'na'}">${Utils.esc(n.etiqueta || n.codigo)} · ${nAl} alumno${nAl === 1 ? '' : 's'}</span>`;
      }).join(' ');
      filas.push(`<tr><td><b>${Utils.esc(asig ? asig.nombre : '¿?')}</b> · ${Utils.esc(gru ? gru.nombre : '¿?')}</td><td>${chips}</td></tr>`);
    });
    if (!filas.length) return '';
    return `
      <section class="card">
        <div class="card-head"><h2>Niveles ACI por asignatura</h2>
          <button class="btn btn-mini" id="btn-ir-clases">Abrir Asignaturas y clases</button></div>
        <table class="tabla">
          <thead><tr><th>Asignatura · grupo</th><th>Niveles (alumnado)</th></tr></thead>
          <tbody>${filas.join('')}</tbody>
        </table>
      </section>`;
  }

  // Configuración (⚙): las acciones de administración poco frecuentes —
  // copias de seguridad y borrado total. Es un modal y vive en la cabecera
  // global, así que está disponible desde cualquier vista.
  function modalAjustes() {
    const db = Storage.db;
    const ultima = db.meta && db.meta.ultimaExportacion
      ? Utils.fechaLegible(new Date(db.meta.ultimaExportacion)) + ' a las ' + new Date(db.meta.ultimaExportacion).toTimeString().slice(0, 5)
      : 'nunca';
    const body = UI.openModal({
      titulo: 'Configuración',
      cuerpo: `
        <p class="hint">Acciones poco frecuentes. Tus datos viven solo en este navegador.</p>
        <div class="bloque-copias">
          <b>Copias de seguridad</b>
          <p>Última copia: <b>${ultima}</b>. El backup guarda <b>todo</b> (grupos, alumnos, clases, currículos, instrumentos y notas).</p>
          <div class="acciones">
            <button class="btn btn-primario btn-mini" id="btn-exportar-ajustes">Exportar backup</button>
            <button class="btn btn-mini" id="btn-importar-ajustes">Importar backup</button>
          </div>
        </div>
        <div class="zona-peligro">
          <b>Zona peligrosa</b>
          <p>Elimina <b>todos</b> los grupos, alumnos, clases, currículos, instrumentos y calificaciones guardados en este navegador.</p>
          <button class="btn btn-peligro" id="btn-reiniciar">Restablecer y vaciar todos los datos</button>
        </div>
        <div class="bloque-acerca">
          <b>Acerca de</b>
          <p><b>Evalora</b> · Evaluación por criterios · LOMLOE (Cantabria).</p>
          <p>Califica con criterios ponderados, adaptaciones curriculares (ACI) e informes de análisis. Funciona <b>sin conexión</b>: tus datos no salen de este dispositivo.</p>
          <p class="acerca-firma">Jorge Bourgon Salinero · © ${new Date().getFullYear()} · Todos los derechos reservados</p>
        </div>`
    });
    body.querySelector('#btn-exportar-ajustes').onclick = () =>
      Storage.exportar()
        .then(ok => { if (ok) { UI.toast('Backup exportado'); modalAjustes(); } })
        .catch(e => alert('Error al exportar: ' + e.message));
    body.querySelector('#btn-importar-ajustes').onclick = () =>
      document.getElementById('input-importar').click();
    body.querySelector('#btn-reiniciar').onclick = () => {
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

  function renderInicio(el) {
    const db = Storage.db;
    el.innerHTML = `
      <section class="card">
        <div class="card-head">
          <h1>Bienvenido a EvalCrit</h1>
          <label class="campo" style="margin:0"><span>Curso escolar</span>
            <select id="sel-curso" style="max-width:150px">${opcionesCurso(db.cursoEscolar)}</select></label>
        </div>
        <p style="color:var(--tinta-suave)">Califica con criterios ponderados según la LOMLOE. Los datos se guardan en este navegador:
          <b>exporta tu backup al USB con frecuencia</b>.</p>
        <div class="aviso" style="background:#eff6ff;border-color:#bfdbfe;color:#1e40af">
          <b>Copias de seguridad</b> · <span id="info-backup">…</span><br>
          <small>Con Chrome/Edge en Windows puedes guardar directamente en la carpeta <code>backups/</code> del proyecto; en Android irán a Descargas.</small>
          <div id="aviso-copia" class="no-print"></div>
          <div class="acciones no-print" style="margin-top:8px">
            ${Storage.puedeCarpeta() ? '<button class="btn btn-mini" id="btn-carpeta">Elegir carpeta de backups…</button>' : ''}
          </div>
          ${Storage.copiaPrevia() ? '<div class="no-print" style="margin-top:8px"><button class="btn btn-mini" id="btn-restaurar-previa">↩ Recuperar los datos anteriores a la última importación</button></div>' : ''}
        </div>
        ${Storage.vacio() ? `
          <div class="aviso">Tu aplicación está vacía. Puedes cargar datos de ejemplo para probarla.</div>
          <button class="btn btn-primario" id="btn-demo">Cargar datos de ejemplo</button>` : ''}
      </section>
      ${panelesEstadoHtml()}
      ${panelesCoberturaHtml()}
      ${panelesAciHtml()}
      <section class="card">
        <h2 class="subtitulo" style="margin:0 0 8px">Flujo recomendado</h2>
        <ol class="flujo" style="color:var(--tinta-suave);margin:0;padding-left:20px">
          <li>Crea <b>grupos</b> e inscribe <b>alumnos</b>.</li>
          <li>Crea <b>asignaturas</b> y sus <b>clases</b> (asignatura · grupo). Si vas a trabajar con adaptaciones, crea en la clase sus <b>niveles ACI</b>.</li>
          <li>Define en <b>Currículo</b> las competencias específicas, los criterios y sus ponderaciones (suman 100%).</li>
          <li>Crea <b>instrumentos</b>: control, rúbrica, proyecto u otro, mapeando cada apartado a criterios. Si ya tienes una rúbrica hecha (por ejemplo, con una IA), impórtala con «Importar rúbrica».</li>
          <li><b>Corrige</b> desde «Calificaciones» (botón «Corregir») o desde el propio instrumento.</li>
          <li>Revisa el <b>Informe</b>: hallazgos, criterios con dificultades, distribución de notas y alumnos en riesgo. Imprime o exporta a PDF el informe que necesites.</li>
          <li>Exporta el <b>backup</b> al terminar cada sesión.</li>
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

    // Paneles de estado: cada fila de clase abre Calificaciones de esa clase.
    el.querySelectorAll('.fila-inicio').forEach(tr => {
      tr.onclick = () => ir('cuadricula', { claseId: tr.dataset.clase });
    });
    const btnCur = el.querySelector('#btn-ir-curriculo');
    if (btnCur) btnCur.onclick = () => ir('curriculo');
    const btnCl = el.querySelector('#btn-ir-clases');
    if (btnCl) btnCl.onclick = () => ir('clases');
  }

  function ir(id, opciones) {
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
    vista.render(document.getElementById('app'), opciones);
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
    document.getElementById('btn-ajustes').onclick = () => modalAjustes();

    // La importación se lanza desde «Configuración → Importar backup», pero el
    // selector de archivos sigue en la cabecera para que viva en todo momento.
    const input = document.getElementById('input-importar');
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
          UI.closeModal();
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
    refrescar() { ir(actual); },
    // Paneles de Inicio expuestos para poder comprobarlos sin navegador.
    panelesInicio: { estado: panelesEstadoHtml, cobertura: panelesCoberturaHtml, aci: panelesAciHtml },
    // Configuración expuesta por el mismo motivo (la cabecera no existe en el arnés).
    abrirAjustes: modalAjustes
  };
})();

document.addEventListener('DOMContentLoaded', App.arrancar);
