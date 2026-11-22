const App = (() => {
  const VISTAS = [
    { id: 'inicio', label: 'Inicio', render: renderInicio },
    { id: 'alumnos', label: 'Alumnos y grupos', render: el => AlumnosView.render(el) },
    { id: 'clases', label: 'Asignaturas y clases', render: el => ClasesView.render(el) },
    { id: 'curriculo', label: 'Currículo', render: el => CurriculoView.render(el) },
    { id: 'instrumentos', label: 'Instrumentos', render: el => InstrumentosView.render(el) },
    // Sección «Corregir»: la cola de pendientes de la clase, no el listado de
    // instrumentos (que pasa a ser subpestaña de Evaluación).
    { id: 'corregir', label: 'Corregir', render: el => InstrumentosView.renderCorregir(el) },
    // La cuadrícula acepta opciones (pestaña, clase, periodo): hay que
    // reenviárselas o se perderían (p. ej. el tab de la sección Evaluación).
    { id: 'cuadricula', label: 'Calificaciones', render: (el, opciones) => CuadriculaView.render(el, opciones) },
    // Informes (Fase 4a): vista propia y autónoma, ya no la pestaña «Informe»
    // de la cuadrícula. Sin opciones: la vista guarda su propio contexto.
    { id: 'informes', label: 'Informes', render: el => InformeView.render(el, {}) }
  ];
  // Secciones del menú principal (Fase 2 de la remodelación de la navegación):
  // Inicio · Corregir · Evaluación · Informes · Ajustes. Corregir tiene su
  // propia vista (cola de pendientes) y Evaluación agrupa las vistas de
  // preparación y revisión como subpestañas.
  const SECCIONES = [
    { id: 'inicio', label: 'Inicio', vista: 'inicio' },
    { id: 'corregir', label: 'Corregir', vista: 'corregir' },
    // Evaluación abre la pestaña principal de la cuadrícula: si se está en
    // Informes, pulsar Evaluación debe volver a las notas.
    { id: 'evaluacion', label: 'Evaluación', vista: 'cuadricula', tab: 'notas' },
    // Informes abre su vista propia (Fase 4a), ya no la pestaña Informe de la
    // cuadrícula.
    { id: 'informes', label: 'Informes', vista: 'informes' },
    { id: 'ajustes', label: 'Ajustes', modal: true }
  ];
  // Subpestañas de Evaluación: preparar y revisar la evaluación sin recordar
  // dónde está cada cosa. El orden es el de trabajo: cuadrícula, instrumentos,
  // alumnado, clases y currículo.
  const SUBEVAL = [
    { id: 'cuadricula', label: 'Cuadrícula' },
    { id: 'instrumentos', label: 'Instrumentos' },
    { id: 'alumnos', label: 'Alumnos' },
    { id: 'clases', label: 'Clases' },
    { id: 'curriculo', label: 'Currículo' }
  ];
  const SECCION_DE_VISTA = {
    inicio: 'inicio',
    corregir: 'corregir',
    instrumentos: 'evaluacion',
    cuadricula: 'evaluacion',
    informes: 'informes',
    alumnos: 'evaluacion',
    clases: 'evaluacion',
    curriculo: 'evaluacion'
  };
  let actual = 'inicio';

  // M-12: modo privacidad (nombres → iniciales) para proyectar o imprimir.
  // Estado SOLO de sesión: no se guarda en `db` ni viaja en el backup; al
  // recargar la página se vuelven a mostrar los nombres.
  let anonimo = false;

  // M-12: cómo se pinta un alumno. Con el modo privacidad activo devuelve las
  // iniciales («G. J.»: inicial del primer apellido + inicial del nombre); si
  // no, «Apellidos, Nombre» como siempre. La corrección (renderCorreccion) SÍ
  // pasa por aquí: tiene su propio ojo para ocultar/mostrar.
  function nombreVisible(a) {
    if (!a) return '';
    if (!anonimo) return `${a.apellidos}, ${a.nombre}`;
    // Iniciales «N. P. S.»: nombre, primer apellido y segundo apellido, en
    // ese orden (petición del docente). Sin segundo apellido queda «N. P.».
    const ap = String(a.apellidos || '').trim().split(/\s+/).filter(Boolean);
    const nom = String(a.nombre || '').trim();
    const inicial = x => x ? x.charAt(0).toUpperCase() + '.' : '';
    return [inicial(nom), inicial(ap[0]), inicial(ap[1])].filter(Boolean).join(' ');
  }

  // M-12: botón de privacidad con icono de ojo (sustituye a los botones de
  // texto «Ocultar/Mostrar nombres»). Un clic oculta los nombres; para volver
  // a mostrarlos hay que MANTENER PULSADO ≥1 s: se proyecta en clase y un
  // toque accidental no debe revelar el listado. Las vistas repintan vía
  // `onCambio` tras cada cambio (el botón se recrea con el nuevo estado).
  const MS_REVELAR = 1000;
  const ICONO_OJO =
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
  const ICONO_OJO_TACHADO =
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>' +
    '<line x1="1" y1="1" x2="23" y2="23"/></svg>';

  function crearBotonPrivacidad(onCambio) {
    const btn = document.createElement('button');
    btn.className = 'icon-btn btn-privacidad';

    // Ojo abierto = nombres visibles; tachado = ocultos. Los atributos (aria,
    // title) se ajustan con el estado para que el botón hable solo.
    const pintaEstado = () => {
      const oculto = anonimo;
      btn.innerHTML = oculto ? ICONO_OJO_TACHADO : ICONO_OJO;
      const texto = oculto
        ? 'Mantén pulsado para mostrar los nombres'
        : 'Ocultar los nombres al proyectar';
      if (typeof btn.setAttribute === 'function') {
        btn.setAttribute('type', 'button');
        btn.setAttribute('aria-pressed', String(oculto));
        btn.setAttribute('aria-label', texto);
        btn.setAttribute('title', texto);
      } else {
        btn.type = 'button';
        btn.title = texto;
      }
    };
    pintaEstado();

    let tempRevelar = null;

    // Pulso de aviso: anillo breve que acompaña al toast cuando se intenta
    // revelar con un clic simple (solo se consigue manteniendo pulsado).
    function pulso() {
      btn.classList.add('pulso-privacidad');
      setTimeout(() => btn.classList.remove('pulso-privacidad'), 600);
    }

    function avisoMantener() {
      UI.toast('Mantén pulsado el ojo para mostrar los nombres.');
      pulso();
    }

    function cambiar(ocultar) {
      anonimo = ocultar;
      if (typeof onCambio === 'function') onCambio();
    }

    // Clic simple: oculta si los nombres están visibles; si están ocultos NO
    // revela (eso exige mantener pulsado ≥1 s) y lo hace saber.
    btn.addEventListener('click', () => {
      // Si la pulsación larga ya reveló, la vista se repintó y este botón
      // quedó huérfano: ignora el clic sintético que le llega al soltar.
      if (!btn.isConnected) return;
      if (!anonimo) { cambiar(true); return; }
      avisoMantener();
    });

    // Mantener pulsado (ratón/táctil) ≥1 s revela. Si los nombres ya son
    // visibles no hay nada que armar: el clic nativo los oculta.
    btn.addEventListener('pointerdown', () => {
      if (!anonimo) return;
      clearTimeout(tempRevelar);
      tempRevelar = setTimeout(() => { tempRevelar = null; cambiar(false); }, MS_REVELAR);
    });
    const suelta = () => { clearTimeout(tempRevelar); tempRevelar = null; };
    btn.addEventListener('pointerup', suelta);
    btn.addEventListener('pointerleave', suelta);
    btn.addEventListener('pointercancel', suelta);

    // Teclado: Enter/Espacio mantenidos ≥1 s también revelan. Con los nombres
    // visibles no se intercepta nada: el clic nativo del botón ya los oculta.
    btn.addEventListener('keydown', e => {
      if (!anonimo) return;
      if (e.key !== 'Enter' && e.key !== ' ') return;
      if (e.repeat) return; // al mantener, el teclado repite keydown: no rearmar
      if (typeof e.preventDefault === 'function') e.preventDefault(); // sin clic nativo: lo gestionamos aquí
      clearTimeout(tempRevelar);
      tempRevelar = setTimeout(() => { tempRevelar = null; cambiar(false); }, MS_REVELAR);
    });
    btn.addEventListener('keyup', e => {
      if (!anonimo) return;
      if (e.key !== 'Enter' && e.key !== ' ') return;
      // Pulsación corta: no revela; mismo aviso que el clic simple.
      if (tempRevelar) { suelta(); avisoMantener(); }
    });

    return btn;
  }

  // Mensaje de aviso según el estado de la copia de seguridad (R-01).
  // `conDestacado`: cuando el aviso destacado ya muestra el texto (nunca
  // exportado o cambios sin copiar), el discreto no lo repite: solo aporta
  // los botones (carpeta y copia previa).
  function avisoCopiaHtml(est, conDestacado) {
    if (!est.hayDatos) return '';
    if (conDestacado && (est.nivel === 'nunca' || est.nivel === 'pendiente')) return '';
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

  // Aviso de copia destacado (Fase 3): solo cuando hay algo que perder. El
  // aviso discreto del bloque «Copias de seguridad» sigue pintándose siempre.
  function avisoCopiaDestacadoHtml() {
    const est = Storage.estadoCopia();
    const texto = est.nivel === 'nunca'
      ? '<b>Todavía no has hecho ninguna copia de seguridad.</b> Tus notas solo están en este navegador: expórtalas al USB.'
      : '<b>Hay cambios desde tu última copia.</b> Exporta el backup al USB para no perderlos.';
    return `<section id="aviso-backup" class="aviso aviso-pendiente no-print">
      <div>⚠ ${texto}</div>
      <div class="acciones" style="margin-top:8px">
        <button class="btn btn-primario btn-mini" id="btn-backup-aviso">Hacer backup</button>
      </div>
    </section>`;
  }

  // --- Paneles de Inicio (puros, sin DOM: comprobables en el arnés) ---------
  // Pendientes: el conteo unificado de correcciones (alumno × instrumento) y
  // el atajo a la cola de Corregir. Es el primer panel tras la cabecera.
  function panelPendientesHtml() {
    const insts = Storage.db.instrumentos || [];
    let pendientes = 0;
    let conPendientes = 0;
    insts.forEach(i => {
      const p = Calc.progresoInstrumento(i).pendientes;
      if (p > 0) { pendientes += p; conPendientes++; }
    });
    const texto = pendientes
      ? `<b class="num-grande">${pendientes}</b> ${pendientes === 1 ? 'corrección pendiente' : 'correcciones pendientes'} en ${conPendientes} ${conPendientes === 1 ? 'instrumento' : 'instrumentos'}`
      : 'Todo corregido';
    return `<section id="panel-pendientes" class="card inicio-pendientes no-print ${pendientes ? '' : 'todo-ok'}">
      <div class="card-head"><h2>Pendientes</h2>
        <button class="btn btn-primario" id="btn-corregir-pendientes" ${pendientes ? '' : 'disabled'}>Corregir pendientes</button></div>
      <p style="margin:0;color:var(--tinta-suave)">${texto}</p>
    </section>`;
  }

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
      return `<tr class="fila-inicio" data-clase="${Utils.esc(c.id)}" tabindex="0" title="Abrir Calificaciones de esta clase">
        <td><b>${Utils.esc(asig ? asig.nombre : '¿?')}</b> · ${Utils.esc(gru ? gru.nombre : '¿?')}</td>
        <td class="num">${Calc.alumnosDeClase(c.id).length}</td>
        <td class="num">${insts.length}</td>
        <td>${marca}</td></tr>`;
    }).join('');
    return `
      <section class="card">
        <div class="card-head"><h2>Estado por clase</h2>
          <small style="color:var(--tinta-suave)">Toca una fila para abrir Calificaciones</small></div>
        <div class="scroll-x">
          <table class="tabla">
            <thead><tr><th>Asignatura · grupo</th><th class="num">Alumnos</th><th class="num">Instrumentos</th><th>Corrección</th></tr></thead>
            <tbody>${filas}</tbody>
          </table>
        </div>
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
        <div class="scroll-x">
          <table class="tabla">
            <thead><tr><th>Asignatura · grupo</th><th>Niveles (alumnado)</th></tr></thead>
            <tbody>${filas.join('')}</tbody>
          </table>
        </div>
      </section>`;
  }

  // Configuración (⚙): las acciones de administración poco frecuentes —
  // copias de seguridad y borrado total. Es un modal y vive en la cabecera
  // --- Identidad visual (Configuración → Tema y menús) ----------------------
  const ISOTIPO_D = "M7037 6268 c-4 -166 -7 -449 -7 -630 l0 -328 -72 0 c-173 0 -374 -52 -563 -144 -167 -82 -283 -165 -415 -296 -155 -153 -278 -349 -344 -546 l-23 -68 -172 -57 c-94 -31 -171 -54 -171 -50 0 18 44 187 67 256 145 445 503 843 946 1050 109 51 269 106 379 130 l78 17 20 66 c10 37 33 112 50 167 16 55 30 104 30 109 0 19 -232 -21 -402 -70 -788 -227 -1393 -918 -1515 -1730 l-17 -113 -220 -71 c-368 -118 -416 -135 -416 -142 0 -5 287 -8 639 -8 l638 0 7 -97 c18 -261 102 -509 249 -731 178 -269 433 -470 748 -588 l75 -28 52 -165 c28 -90 50 -167 47 -169 -7 -7 -144 29 -263 70 -498 170 -897 556 -1095 1058 -41 104 -97 303 -97 344 0 9 -1 16 -3 16 -1 0 -80 22 -176 50 -96 27 -177 48 -179 46 -2 -3 4 -53 13 -113 74 -478 291 -895 644 -1236 327 -316 725 -514 1169 -584 l112 -17 46 -146 c25 -80 69 -215 97 -300 l52 -155 3 617 2 617 55 5 c30 3 81 9 113 12 156 16 404 101 558 192 241 141 442 347 568 582 25 47 46 88 46 93 0 4 -155 7 -343 7 -339 0 -344 0 -363 -22 -46 -51 -173 -142 -257 -183 -127 -61 -242 -88 -387 -88 -475 0 -862 369 -906 864 -14 161 39 376 132 531 167 278 456 441 779 440 194 -1 362 -55 521 -168 124 -87 259 -260 313 -401 l21 -53 -540 0 -540 0 0 -290 0 -290 830 0 c784 0 830 -1 830 -17 0 -10 -7 -43 -15 -73 -8 -30 -15 -58 -15 -61 0 -4 81 19 181 51 l181 58 -7 -35 c-3 -19 -19 -78 -34 -131 -144 -499 -492 -916 -946 -1138 -117 -56 -309 -124 -411 -145 l-60 -12 -61 -179 c-72 -209 -86 -191 121 -153 590 109 1113 468 1441 990 159 253 281 590 311 861 l6 61 319 104 c175 57 319 106 319 109 0 3 -287 6 -637 5 l-638 0 -7 98 c-29 412 -228 800 -536 1048 -149 120 -267 190 -427 250 l-100 38 -51 163 c-28 90 -50 165 -48 167 6 7 162 -33 259 -66 55 -19 137 -52 183 -73 489 -229 871 -699 983 -1210 12 -58 25 -108 29 -112 3 -5 75 -28 160 -53 85 -25 164 -48 174 -51 18 -6 19 -2 12 62 -20 196 -93 446 -190 649 -116 242 -225 395 -420 591 -339 340 -724 536 -1196 609 -58 9 -108 19 -111 23 -8 8 -189 574 -189 590 0 6 -4 13 -8 16 -5 3 -12 -130 -15 -296z";
  const TONOS_TEMA = [
    ['azul pizarra', '#3b4d63'], ['azul petróleo', '#1f5c6b'], ['azul océano', '#1d4e6b'],
    ['azul lavanda apagado', '#4a4e7c'], ['azul acero', '#3d5a73'], ['azul medianoche', '#2c3e57'],
    ['verde bosque', '#2f5d46'], ['burdeos', '#5c2e3d'], ['marrón caoba', '#4a352c'],
    ['grafito', '#3a3f44'], ['verde oliva', '#4d5a3a'], ['teja', '#6b3a2e'],
    ['verde azulado', '#1f5f5f'], ['púrpura oscuro', '#4a3a6b'], ['granate', '#6b2d4f'],
    ['pizarra verdosa', '#3d5a52'], ['esmeralda oscuro', '#1f5c46'], ['azul grisáceo', '#4a5a72'],
    ['taupe', '#5a5248'], ['verde militar', '#4a5a3d'], ['lila oscuro', '#5a4a6b'],
    ['verde menta', '#3a6b5e']
  ].map(([nombre, hex]) => ({ nombre, hex }));

  const NAV_MODOS = [
    { id: 'topbar', nombre: 'Barra superior (la actual)' },
    { id: 'fab', nombre: 'Menú de vistas flotante' },
    { id: 'dock', nombre: 'Dock inferior' },
    { id: 'drawer', nombre: 'Barra lateral plegable' }
  ];

  // Isotipo inscrito en un círculo blanco: el círculo cubre el viewBox y el
  // isotipo va ligeramente reducido para que siempre se lea sobre blanco.
  function isotipoSvg(color) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="425 110 558 552">` +
      `<circle cx="704" cy="386" r="279" fill="#ffffff"/>` +
      `<g transform="translate(0,768) scale(0.1,-0.1) translate(7040,3820) scale(0.88) translate(-7040,-3820)" fill="${color}" stroke="none">` +
      `<path d="${ISOTIPO_D}"/></g></svg>`;
  }

  // Mezcla un color con blanco (para el --acento-suave del tema).
  function tinte(hex, fraccion) {
    const n = parseInt(String(hex).slice(1), 16);
    const f = fraccion == null ? 0.88 : fraccion;
    const mez = v => Math.round(v + (255 - v) * f);
    const a2 = x => x.toString(16).padStart(2, '0');
    return '#' + a2(mez((n >> 16) & 255)) + a2(mez((n >> 8) & 255)) + a2(mez(n & 255));
  }

  // Aplica el tema: color de marca (cabecera), acento de énfasis (botones, chips,
  // resaltados, foco), su tinte suave y el favicon en caliente.
  function aplicaTema() {
    const t = (Storage.db && Storage.db.tema) || { color: '#1f5c6b', nav: 'topbar' };
    const raiz = document.documentElement;
    const valores = {
      '--marca': t.color,
      '--acento': t.color,
      '--acento-suave': tinte(t.color, 0.88)
    };
    Object.keys(valores).forEach(k => {
      if (raiz.style && typeof raiz.style.setProperty === 'function') raiz.style.setProperty(k, valores[k]);
      else if (raiz.style) raiz.style[k] = valores[k];
    });
    const link = document.getElementById('favicon-isotipo');
    if (link) link.href = 'data:image/svg+xml,' + encodeURIComponent(isotipoSvg(t.color));
  }

  // global, así que está disponible desde cualquier vista.
  // `seccion` permite abrir directamente una pestaña (p. ej. F2 → 'tema').
  function modalAjustes(seccion) {
    const db = Storage.db;
    const ultima = db.meta && db.meta.ultimaExportacion
      ? Utils.fechaLegible(new Date(db.meta.ultimaExportacion)) + ' a las ' + new Date(db.meta.ultimaExportacion).toTimeString().slice(0, 5)
      : 'nunca';
    // Perfil docente (D-74): con defensa por si un estado antiguo llegó sin
    // la clave o corrupta (informeHtml también se guarda por su lado).
    if (!db.perfil || typeof db.perfil !== 'object') db.perfil = { nombre: '', centro: '', logo: '' };
    const perfil = db.perfil;
    // Ajustes de calificación (D-74b): defensa equivalente para la clave de
    // configuración por si un backup antiguo llegó sin ella.
    if (!db.configuracion || typeof db.configuracion !== 'object') db.configuracion = { sinNotaEsCero: false };
    const config = db.configuracion;
    const tema = db.tema || { color: '#1f5c6b', nav: 'topbar' };
    const pistaLogo = `Sube un PNG o JPG de hasta ${Math.round(Storage.LOGO_MAX / 1024)} KB: un logo grande no cabe en el navegador.`;
    const body = UI.openModal({
      titulo: 'Configuración',
      cuerpo: `
        <p class="hint">Acciones poco frecuentes. Tus datos viven solo en este navegador.</p>
        <nav class="tabs-ajustes no-print" id="tabs-ajustes">
          <button type="button" class="chip on" data-ajuste="perfil">Perfil</button>
          <button type="button" class="chip" data-ajuste="calificacion">Calificación</button>
          <button type="button" class="chip" data-ajuste="copias">Copias y seguridad</button>
          <button type="button" class="chip" data-ajuste="tema">Tema y menús</button>
          <button type="button" class="chip" data-ajuste="acerca">Acerca de</button>
        </nav>
        <div class="ajuste-seccion activa" data-seccion="perfil">
        <div class="bloque-perfil">
          <b>Perfil docente</b>
          <p>Nombre, centro y logo que saldrán en la cabecera de los informes impresos.</p>
          <label class="campo"><span>Nombre del profesor</span>
            <input type="text" id="perfil-nombre" maxlength="80" value="${Utils.esc(perfil.nombre)}" placeholder="p. ej. María López"></label>
          <label class="campo"><span>Nombre del centro</span>
            <input type="text" id="perfil-centro" maxlength="120" value="${Utils.esc(perfil.centro)}" placeholder="p. ej. CEIP Gerardo Diego"></label>
          <div class="campo perfil-logo-campo">
            <span>Logo del centro</span>
            <div class="perfil-logo-fila">
              <input type="file" id="perfil-logo" accept="image/*">
              <button class="btn btn-mini" id="btn-quitar-logo" type="button">Quitar logo</button>
            </div>
            <img class="perfil-logo-mini" id="perfil-logo-mini" alt="Vista previa del logo" ${Storage.logoPintable(perfil.logo) ? `src="${Utils.esc(perfil.logo)}"` : 'hidden'}>
            <p class="hint perfil-logo-aviso" id="perfil-logo-aviso">${pistaLogo}</p>
          </div>
        </div>
        </div>
        <div class="ajuste-seccion" data-seccion="calificacion">
        <div class="bloque-ajustes">
          <b>Ajustes de calificación</b>
          <p>Cómo se calcula la media de una unidad didáctica (UD) en la cuadrícula cuando hay instrumentos sin nota.</p>
          <label class="campo campo--toggle"><input type="checkbox" id="ajuste-sin-nota" ${config.sinNotaEsCero ? 'checked' : ''}><span>Un instrumento sin nota cuenta como 0 en la media de la UD</span></label>
          <p class="hint">Desactivado (recomendado): la media solo promedia los instrumentos evaluados, igual que la columna «Media» de Instrumentos. Activo: un instrumento sin nota baja la media igual que un 0.</p>
        </div>
        </div>
        <div class="ajuste-seccion" data-seccion="copias">
        <div class="bloque-copias">
          <b>Copias de seguridad</b>
          <p>Última copia: <b>${ultima}</b>. El backup guarda <b>todo</b> (grupos, alumnos, clases, currículos, instrumentos y notas).</p>
          ${Storage.puedeCarpeta() ? `
          <div class="campo">
            <span>Carpeta de backups</span>
            <div class="acciones">
              <button class="btn btn-mini" id="btn-carpeta-ajustes">Elegir carpeta…</button>
              <span class="hint" id="carpeta-estado">…</span>
            </div>
            <p class="hint">Con carpeta elegida, «Guardar» sobrescribe <code>evalcrit.json</code> en ella. «Exportar backup» crea uno nuevo con fecha.</p>
          </div>` : '<p class="hint">Tu navegador no permite elegir carpeta de guardado: las copias irán a Descargas.</p>'}
          <div class="acciones">
            <button class="btn btn-primario btn-mini" id="btn-exportar-ajustes">Exportar backup</button>
            <button class="btn btn-mini" id="btn-importar-ajustes">Importar backup</button>
          </div>
        </div>
        <div class="bloque-copias">
          <b>Fin de curso</b>
          <p>Cierra el curso escolar <b>asignatura a asignatura</b>: cada asignatura real ofrece
            <b>«Promocionar a N+1º»</b> (el grupo y el alumnado viajan al nivel siguiente, sin
            instrumentos, notas ni currículo del nivel cerrado; el grupo se renombra si su nombre
            lleva el curso) o <b>«Terminar»</b> (se elimina con su cascada; si su grupo quedaría
            sin ninguna asignatura, se ofrece eliminarlo con su alumnado). La decisión es tuya:
            no hay paridad automática.</p>
          <p class="hint">Todo queda antes en el fichero de archivo del paso 1. El banco de
            instrumentos, el perfil, el tema y los ajustes nunca se tocan.</p>
          <div class="acciones">
            <button class="btn btn-primario btn-mini" id="btn-fin-curso">Abrir asistente de fin de curso</button>
          </div>
        </div>
        <div class="zona-peligro">
          <b>Zona peligrosa</b>
          <p>Elimina <b>todos</b> los grupos, alumnos, clases, currículos, instrumentos y calificaciones guardados en este navegador.</p>
          <button class="btn btn-peligro" id="btn-reiniciar">Restablecer y vaciar todos los datos</button>
        </div>
        </div>
        <div class="ajuste-seccion" data-seccion="tema">
          <div class="bloque-tema">
            <b>Tema y menús</b>
            <p>Color del tema y organización de los menús principales.</p>
            <div class="campo"><span>Color del tema</span>
              <div class="tonos" id="tonos-tema">
                ${TONOS_TEMA.map(t => `<button type="button" class="tono${t.hex === (tema.color || '') ? ' on' : ''}" style="background:${t.hex}" data-color="${t.hex}" title="${t.nombre} ${t.hex}" aria-label="${t.nombre}"></button>`).join('')}
              </div>
              <p class="hint">Azul petróleo por defecto. Cambia la cabecera, el isotipo y el favorito.</p>
            </div>
            <div class="campo"><span>Organización de los menús</span>
              <select id="nav-modo">
                ${NAV_MODOS.map(m => `<option value="${m.id}"${(tema.nav || 'topbar') === m.id ? ' selected' : ''}>${m.nombre}</option>`).join('')}
              </select>
              <p class="hint">Cómo se reparten las vistas de la cabecera.</p>
            </div>
          </div>
        </div>
        <div class="ajuste-seccion" data-seccion="acerca">
        <div class="bloque-acerca">
          <b>Acerca de</b>
          <p><b>Evaluación por criterios</b> (Evalora) · LOMLOE (Cantabria).</p>
          <p>Califica con criterios ponderados, adaptaciones curriculares (ACI) e informes de análisis. Funciona <b>sin conexión</b>: tus datos no salen de este dispositivo.</p>
          <p><b>Evalora</b>: e-VALORA — evaluar y valorar.</p>
          <p class="acerca-firma">Jorge Bourgon Salinero · © ${new Date().getFullYear()} · Licencia EUPL-1.2</p>
        </div>
        </div>`
    });
    // Pestañas de Configuración (submenú, no un cajón de sastre).
    const tabsAjustes = body.querySelector('#tabs-ajustes');
    if (tabsAjustes) {
      tabsAjustes.onclick = e => {
        const b = e.target.closest('[data-ajuste]');
        if (!b) return;
        tabsAjustes.querySelectorAll('.chip').forEach(ch => ch.classList.toggle('on', ch === b));
        body.querySelectorAll('.ajuste-seccion').forEach(sec =>
          sec.classList.toggle('activa', sec.dataset.seccion === b.dataset.ajuste));
      };
    }
    // Tema y menús: color (isotipo y favorito incluidos) y organización.
    const tonos = body.querySelector('#tonos-tema');
    if (tonos) tonos.onclick = e => {
      const b = e.target.closest('[data-color]');
      if (!b) return;
      if (!db.tema || typeof db.tema !== 'object') db.tema = { color: '#1f5c6b', nav: 'topbar' };
      db.tema.color = b.dataset.color;
      Storage.save();
      tonos.querySelectorAll('.tono').forEach(t => t.classList.toggle('on', t === b));
      aplicaTema();
    };
    const navModo = body.querySelector('#nav-modo');
    if (navModo) navModo.onchange = () => {
      if (!db.tema || typeof db.tema !== 'object') db.tema = { color: '#1f5c6b', nav: 'topbar' };
      db.tema.nav = navModo.value;
      Storage.save();
      aplicaTema();
      pintaNav();
    };
    // Abrir directamente en una pestaña concreta (F2 → Tema y menús).
    if (seccion && tabsAjustes) {
      const chip = tabsAjustes.querySelector(`[data-ajuste="${seccion}"]`);
      if (chip) chip.click();
    }
    // Perfil docente (D-74): autoguardado al teclear, como en el resto de la
    // app —el modal de Configuración no tiene botón «Guardar»—.
    const campoNombre = body.querySelector('#perfil-nombre');
    const campoCentro = body.querySelector('#perfil-centro');
    if (campoNombre) campoNombre.oninput = () => { perfil.nombre = campoNombre.value; Storage.save(); };
    if (campoCentro) campoCentro.oninput = () => { perfil.centro = campoCentro.value; Storage.save(); };
    // Ajustes de calificación (D-74b): autoguardado del toggle al cambiar.
    const chkSinNota = body.querySelector('#ajuste-sin-nota');
    if (chkSinNota) chkSinNota.onchange = () => {
      if (!db.configuracion || typeof db.configuracion !== 'object') db.configuracion = { sinNotaEsCero: false };
      db.configuracion.sinNotaEsCero = !!chkSinNota.checked;
      Storage.save();
      // Cerrar el modal y refrescar: si el modal queda abierto tapa la vista y el
      // cambio de media no se aprecia. App.refrescar() recalcula con el ajuste.
      UI.closeModal();
      if (typeof App !== 'undefined' && App.refrescar) App.refrescar();
    };
    const inputLogo = body.querySelector('#perfil-logo');
    const avisoLogo = body.querySelector('#perfil-logo-aviso');
    const miniLogo = body.querySelector('#perfil-logo-mini');
    const btnQuitarLogo = body.querySelector('#btn-quitar-logo');
    const pistaAviso = texto => { if (avisoLogo) avisoLogo.textContent = texto; };
    const pintarLogo = () => {
      const hay = Storage.logoPintable(perfil.logo);
      if (miniLogo) {
        if (hay) { miniLogo.src = perfil.logo; miniLogo.hidden = false; }
        else { miniLogo.removeAttribute('src'); miniLogo.hidden = true; }
      }
      // Sin logo no se ofrece «Quitar»: no hay nada que quitar.
      if (btnQuitarLogo) btnQuitarLogo.style.display = hay ? '' : 'none';
    };
    pintarLogo();
    if (inputLogo) {
      inputLogo.onchange = () => {
        const archivo = inputLogo.files && inputLogo.files[0];
        const motivo = Storage.logoRechazo(archivo);
        if (motivo) {
          pistaAviso(motivo);
          UI.toast(motivo, 'error');
          inputLogo.value = ''; // para poder volver a elegir el mismo fichero
          return;
        }
        const lector = new FileReader();
        lector.onload = () => {
          perfil.logo = lector.result;
          Storage.save();
          pistaAviso(pistaLogo);
          pintarLogo();
        };
        lector.onerror = () => {
          pistaAviso('No se ha podido leer la imagen: prueba con otra.');
          UI.toast('No se ha podido leer la imagen', 'error');
        };
        lector.readAsDataURL(archivo);
      };
    }
    if (btnQuitarLogo) {
      btnQuitarLogo.onclick = () => {
        perfil.logo = '';
        Storage.save();
        pistaAviso(pistaLogo);
        pintarLogo();
        UI.toast('Logo quitado de los informes');
      };
    }
    // La licencia viaja con el entregable: el fichero único puede copiarse sin
    // el LICENSE, así que el texto completo va dentro del «Acerca de», plegado.
    const bloqueAcerca = body.querySelector('.bloque-acerca');
    if (bloqueAcerca) {
      const detalles = document.createElement('details');
      detalles.className = 'acerca-licencia';
      const resumen = document.createElement('summary');
      resumen.textContent = 'Texto de la licencia (EUPL-1.2)';
      const texto = document.createElement('pre');
      texto.textContent = LICENCIA_EUPL;
      detalles.appendChild(resumen);
      detalles.appendChild(texto);
      bloqueAcerca.appendChild(detalles);
    }
    const btnExpAjustes = body.querySelector('#btn-exportar-ajustes');
    btnExpAjustes.onclick = () => {
      btnExpAjustes.disabled = true; // ocupado: sin doble clic durante la copia
      Storage.exportar()
        .then(ok => { if (ok) { UI.toast('Backup exportado'); pintaEstadoCopia(); modalAjustes(); } })
        .catch(e => alert('Error al exportar: ' + e.message))
        .finally(() => { btnExpAjustes.disabled = false; });
    };
    body.querySelector('#btn-importar-ajustes').onclick = () =>
      document.getElementById('input-importar').click();
    // Carpeta de backups: con carpeta elegida, «Guardar» sobrescribe
    // `evalcrit.json` en ella; «Exportar backup» crea uno nuevo con fecha.
    const btnCarpetaAjustes = body.querySelector('#btn-carpeta-ajustes');
    const carpetaEstado = body.querySelector('#carpeta-estado');
    const pintaCarpeta = dir => {
      if (carpetaEstado) carpetaEstado.textContent = dir ? `Carpeta: «${dir.name}»` : 'Sin carpeta: la copia irá a Descargas.';
      if (btnCarpetaAjustes) btnCarpetaAjustes.textContent = dir ? 'Cambiar carpeta…' : 'Elegir carpeta…';
    };
    if (btnCarpetaAjustes) btnCarpetaAjustes.onclick = async () => {
      const h = await Storage.elegirCarpetaBackup();
      if (h) { pintaCarpeta(h); pintaEstadoCopia(); }
    };
    Storage.idbLeer('dir').then(pintaCarpeta).catch(() => {});
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
    // Fin de curso (D-60): el asistente vive en su propio modal, con copia
    // obligatoria y acciones asignatura a asignatura (ver modalFinDeCurso).
    const btnFinCurso = body.querySelector('#btn-fin-curso');
    if (btnFinCurso) btnFinCurso.onclick = () => modalFinDeCurso();
  }

  // --- Fin de curso (D-60 «mapa completo») -----------------------------------
  // Estado SOLO de sesión: los ficheros de archivo ya generados (para avisar
  // de que repetir nombre sobrescribe), las asignaturas promocionadas en
  // este asistente (para que una recién promovida no vuelva a ofrecerse) y
  // los recuentos del toast de cierre. No viaja en el backup.
  const ficherosArchivoSesion = [];
  const promocionadasSesion = [];
  // Recuentos del cierre (toast «Curso cerrado: …»).
  let terminadasSesion = 0;
  let gruposEliminadosSesion = 0;

  // Número de nivel de un curso de Primaria (1..6), o 0 si no es reconocible
  // (vacío, asignatura hecha a mano, Infantil). En el asistente «mapa
  // completo» NO decide la acción (la decisión es del docente): solo sirve
  // para numerar el botón «Promocionar a N+1º» (1º..5º) y detectar las
  // asignaturas sin curso, que se listan sin acción.
  function paridadDeCurso(curso) {
    const m = /^([1-6])º/.exec(String(curso == null ? '' : curso).trim());
    return m ? Number(m[1]) : 0;
  }

  // Nombre del fichero de archivo para un curso escolar: una barra no puede
  // ir en un nombre de fichero, así que «2025/2026» → «EVALUACIÓN_2025-2026.json».
  function nombreFicheroArchivo(cursoEscolar) {
    return `EVALUACIÓN_${String(cursoEscolar || '').replace(/\//g, '-').trim()}.json`;
  }

  // Curso escolar siguiente: «2025/2026» → «2026/2027» (por defecto, +1).
  function cursoEscolarSiguiente(v) {
    const m = /^(\d{4})\/(\d{4})$/.exec(String(v || '').trim());
    return m ? `${Number(m[1]) + 1}/${Number(m[2]) + 1}` : String(v || '');
  }

  // Validación del curso escolar tecleado en el asistente: formato AAAA/AAAA
  // y el segundo año es el primero + 1. Devuelve '' si es válido o el motivo
  // en castellano; un valor inválido no se aplica nunca (el curso actual se
  // conserva y las acciones siguen con él).
  function validarCursoEscolar(v) {
    const s = String(v == null ? '' : v).trim();
    if (!s) return 'Escribe el curso escolar (p. ej. 2026/2027).';
    const m = /^(\d{4})\/(\d{4})$/.exec(s);
    if (!m) return 'Formato esperado: AAAA/AAAA (p. ej. 2026/2027).';
    const a = Number(m[1]);
    if (Number(m[2]) !== a + 1) return `El segundo año debe ser el primero + 1: «${a}/${a + 1}».`;
    return '';
  }

  // Curso escolar de Inicio: un botón con el curso actual abre un modal
  // pequeño de edición (el desplegable de años llegaba a 2030 a base de
  // scrolling). La validación es LA MISMA que en el asistente de fin de
  // curso: un valor inválido avisa junto al campo y no se aplica; uno
  // válido se guarda por Storage y repinta Inicio (App.refrescar).
  function modalCursoEscolar() {
    const db = Storage.db;
    UI.openModal({
      titulo: 'Curso escolar',
      cuerpo: `
        <label class="campo"><span>Curso escolar</span>
          <input type="text" id="curso-escolar" value="${Utils.esc(db.cursoEscolar)}" placeholder="AAAA/AAAA (p. ej. 2026/2027)"></label>
        <p class="hint">Formato AAAA/AAAA: el segundo año es el primero + 1.</p>
        <div class="hint" id="curso-escolar-error" style="color:#991b1b"></div>`,
      textoGuardar: 'Guardar',
      alGuardar(body) {
        const campo = body.querySelector('#curso-escolar');
        const motivo = validarCursoEscolar(campo.value);
        const errorEl = body.querySelector('#curso-escolar-error');
        if (motivo) {
          if (errorEl) errorEl.textContent = 'Curso escolar no aplicado: ' + motivo;
          return false; // el modal queda abierto con el aviso
        }
        const v = String(campo.value || '').trim();
        if (v !== db.cursoEscolar) {
          db.cursoEscolar = v;
          Storage.save();
          UI.toast('Curso escolar: ' + v);
        }
        // Al no devolver false, UI.openModal cierra y refresca la vista.
      }
    });
  }

  // Resumen de una asignatura para las filas del asistente: clases que la
  // usan e instrumentos (con sus notas) que arrastra.
  function resumenDeAsignatura(asignaturaId) {
    const clases = Storage.db.clases.filter(c => c.asignaturaId === asignaturaId);
    const claseIds = new Set(clases.map(c => c.id));
    const nInst = Storage.db.instrumentos.filter(i => claseIds.has(i.claseId)).length;
    const nCrit = Storage.db.criterios.filter(c => c.asignaturaId === asignaturaId).length;
    return { clases: clases.length, instrumentos: nInst, criterios: nCrit };
  }

  function modalFinDeCurso() {
    const db = Storage.db;
    if (!db.asignaturas.length) { UI.toast('No hay asignaturas que cerrar'); return; }
    // El curso escolar que se cierra se captura AL ABRIR: el fichero de
    // archivo definitivo del paso 1 lleva siempre este valor, aunque el
    // campo de curso nuevo se haya editado o aplicado después.
    const cursoCierre = String(db.cursoEscolar || '');
    const cuerpo = UI.openModal({ titulo: 'Fin de curso', cuerpo: '' });
    let copiaHecha = !!Storage.copiaEnSesion;
    // Asignaturas promovidas en ESTE asistente (solo sesión): salen de la
    // lista de pendientes con su badge, para no promover dos veces seguidas
    // la misma. No viaja en el backup.
    // Lo tecleado en el campo del curso escolar (solo sesión): sobrevive a
    // los repintados.
    let cursoSel = null;

    // Fila del paso 2: la asignatura y sus DOS verbos. «Promocionar a N+1º»
    // se ofrece en cualquier curso con siguiente (1º..5º); en 6º solo cabe
    // «Terminar». Una recién promovida este año sale con badge y sin botones:
    // ofrecerle «Terminar» a continuación sería borrar lo recién promovido.
    function filaAccion(a) {
      const r = resumenDeAsignatura(a.id);
      const piezas = [r.clases + (r.clases === 1 ? ' clase' : ' clases'),
        r.instrumentos + (r.instrumentos === 1 ? ' instrumento' : ' instrumentos')];
      const ficha = `<span style="flex:1"><b>${Utils.esc(a.nombre)}</b> · <small>${Utils.esc(piezas.join(' · '))}</small></span>`;
      if (promocionadasSesion.includes(a.id)) {
        return `<div class="fila-campos">
          ${ficha}
          <span class="badge ok">promocionada este curso</span>
        </div>`;
      }
      const n = paridadDeCurso(ClasesView.cursoDeAsignatura(a));
      const btnPromo = (n >= 1 && n <= 5)
        ? `<button class="btn btn-mini btn-primario fdc-promo" data-id="${Utils.esc(a.id)}">Promocionar a ${n + 1}º</button>` : '';
      return `<div class="fila-campos">
        ${ficha}
        <div class="acciones">${btnPromo}<button class="btn btn-mini btn-peligro fdc-terminar" data-id="${Utils.esc(a.id)}">Terminar</button></div>
      </div>`;
    }

    // El campo del curso escolar es visible en AMBOS pasos (paso 1 y paso de
    // acciones): nunca puede desaparecer, y así el docente lo ve desde que
    // abre el asistente. Su VALOR también sobrevive a los repintados
    // (cursoSel, solo sesión): los checkboxes repintan el asistente al
    // cambiar y sin esto se perdería lo tecleado.
    function valorCursoCampo() {
      if (cursoSel != null) return cursoSel;
      // Sin edición a mano: el siguiente al cierre, o el ya aplicado si
      // alguna acción puso el curso nuevo.
      return db.cursoEscolar !== cursoCierre ? db.cursoEscolar : cursoEscolarSiguiente(cursoCierre);
    }

    function campoCursoHtml() {
      return `
        <label class="campo"><span>Curso escolar nuevo</span>
          <input type="text" id="fdc-curso" value="${Utils.esc(valorCursoCampo())}" placeholder="AAAA/AAAA (p. ej. 2026/2027)"></label>
        <p class="hint">Formato AAAA/AAAA: el segundo año es el primero + 1. Se aplica al completar tu primera acción. El fichero de archivo lleva siempre el curso que se cierra (<b>${Utils.esc(cursoCierre)}</b>).</p>
        <div class="hint" id="fdc-curso-error" style="color:#991b1b"></div>`;
    }

    function paso2Html() {
      const orden = (typeof ClasesView !== 'undefined' && ClasesView.ordenCursos) ? ClasesView.ordenCursos() : [];
      const porIndice = a => {
        const i = orden.indexOf(ClasesView.cursoDeAsignatura(a));
        return i < 0 ? 99 : i;
      };
      // Solo las REALES (con alguna clase con alumnado) entran en la lista,
      // ordenadas por curso y SIN grupos por paridad: cada una decide su
      // verbo (promocionar o terminar). Las asignaturas sin clases con
      // alumnado son soporte de currículo ACI y se eliminan junto con la
      // real que las usa (nunca se ofertan).
      const reales = db.asignaturas.filter(a => Storage.esAsignaturaReal(a))
        .sort((x, y) => porIndice(x) - porIndice(y));
      const conCurso = reales.filter(a => paridadDeCurso(ClasesView.cursoDeAsignatura(a)) !== 0);
      const sinCurso = reales.filter(a => paridadDeCurso(ClasesView.cursoDeAsignatura(a)) === 0);
      return `
        <p style="margin:0 0 8px"><b>¿Comenzar nuevo curso?</b></p>
        <div class="aviso" style="background:#eff6ff;border-color:#bfdbfe;color:#1e40af">
          El archivo definitivo del curso que se cierra ya se exportó en el paso 1
          (completo, importable para consultarlo). Decide asignatura a asignatura:
          <b>promocionar</b> sigue al nivel siguiente con el grupo y el alumnado, sin
          instrumentos, notas ni currículo; <b>terminar</b> la elimina (solo queda en
          el archivo del paso 1).</div>
        ${campoCursoHtml()}
        <p style="margin:12px 0 4px"><b>Asignaturas</b> (por curso)</p>
        <div id="fdc-lista">${conCurso.map(filaAccion).join('') || '<p class="hint" style="margin:0">Ninguna asignatura con curso.</p>'}</div>
        <p class="hint">Promocionar renombra el grupo si su nombre lleva el curso («3ºA» → «4ºA»), y solo
          si ninguna otra asignatura lo usa. Terminar elimina la asignatura con su cascada; si su grupo
          quedara sin ninguna asignatura, la confirmación ofrece eliminarlo con su alumnado.</p>
        ${sinCurso.length ? `<p style="margin:12px 0 4px"><b>Sin curso definido</b></p>
        <div>${sinCurso.map(a => `<div class="fila-campos"><span style="flex:1"><b>${Utils.esc(a.nombre)}</b></span>
          <span class="badge na">sin acción: ponle curso en «Asignaturas y clases»</span></div>`).join('')}</div>` : ''}
        ${ficherosArchivoSesion.length ? '<p class="hint">Ya se generó un fichero de archivo en esta sesión: si repites nombre, el fichero anterior se sobrescribe.</p>' : ''}`;
    }

    // Aplica el curso escolar nuevo (campo editable) tras cada acción
    // completada. El valor por defecto es +1; uno inválido (formato o
    // continuidad) NO se aplica: se avisa junto al campo y el curso actual
    // se conserva.
    function aplicarCursoNuevo() {
      const campo = cuerpo.querySelector('#fdc-curso');
      if (!campo) return;
      const motivo = validarCursoEscolar(campo.value);
      pintaErrorCurso(motivo);
      if (motivo) return; // valor inválido: no se aplica, el curso actual se conserva
      const v = String(campo.value || '').trim();
      if (v && v !== db.cursoEscolar) { db.cursoEscolar = v; Storage.save(); }
    }

    // Mensaje de validación junto al campo (vacío cuando va bien).
    function pintaErrorCurso(motivo) {
      const el = cuerpo.querySelector('#fdc-curso-error');
      if (el) el.textContent = motivo ? 'Curso escolar no aplicado: ' + motivo : '';
    }

    // Pendientes de tratar: asignaturas REALES con curso reconocido que no
    // hayan sido ya promovidas en esta sesión. Las sin curso se arreglan a
    // mano y no cuentan; una recién promovida sale de la lista (badge).
    function pendientes() {
      return db.asignaturas.filter(a =>
        Storage.esAsignaturaReal(a)
        && paridadDeCurso(ClasesView.cursoDeAsignatura(a)) !== 0
        && !promocionadasSesion.includes(a.id));
    }

    // Tras CADA acción del asistente: el modal se repinta con el estado nuevo
    // Y el fondo también (Inicio o la vista abierta, con el aviso de copia y
    // el indicador), sin que el docente tenga que recargar (F5). Si ya no
    // queda nada por tratar, el asistente se cierra solo y se lleva al
    // docente a Inicio repintado, con el resumen de lo hecho en un toast.
    function trasAccion(mensaje) {
      aplicarCursoNuevo();
      cursoSel = null; // el campo pasa a mostrar el curso ya aplicado
      repinta();
      if (!pendientes().length) {
        UI.toast(`Curso cerrado: ${promocionadasSesion.length} promovida(s), `
          + `${terminadasSesion} terminada(s), ${gruposEliminadosSesion} grupo(s) eliminado(s)`);
        UI.closeModal();
        App.ir('inicio');
        return;
      }
      if (mensaje) UI.toast(mensaje);
      // El fondo (Inicio o la vista abierta) y el indicador de copia se
      // actualizan al instante, sin F5 y SIN cerrar el asistente
      // (refrescar() iría por ir(), que cierra los modales).
      if (typeof App !== 'undefined' && App.repintarVista) App.repintarVista();
    }

    function repinta() {
      cuerpo.innerHTML = copiaHecha ? paso2Html() : `
        <p class="hint">Paso 1 de 2 · Exportar el archivo DEFINITIVO del curso</p>
        <div class="aviso">Esta copia ES el archivo del curso que se cierra: se exporta
          <b>${Utils.esc(nombreFicheroArchivo(cursoCierre))}</b>, un snapshot <b>completo</b> (todo el estado, importable
          con «Importar backup» para consultarlo después). Lo que elimines después de aquí solo existirá en este fichero,
          así que hazlo antes de tocar nada. Las acciones quedan bloqueadas hasta que se haya hecho en esta sesión.</div>
        ${campoCursoHtml()}
        <div class="acciones">
          <button class="btn btn-primario" id="fdc-copia">Exportar archivo del curso</button>
        </div>`;
      cablea();
    }

    function cablea() {
      // La validación del campo del año va en los dos pasos; lo tecleado se
      // guarda para sobrevivir a los repintados.
      const campoCurso = cuerpo.querySelector('#fdc-curso');
      if (campoCurso) {
        campoCurso.oninput = () => { cursoSel = campoCurso.value; };
        campoCurso.onblur = () => pintaErrorCurso(validarCursoEscolar(campoCurso.value));
      }
      if (!copiaHecha) {
        const btn = cuerpo.querySelector('#fdc-copia');
        if (btn) btn.onclick = async () => {
          btn.disabled = true; // ocupado: sin doble clic durante la exportación
          try {
            // El nombre lo fija el asistente con el curso de cierre capturado
            // al abrir: el valor del campo en vivo no lo cambia.
            const nombre = nombreFicheroArchivo(cursoCierre);
            const ok = await Storage.exportar(nombre);
            if (ok) {
              ficherosArchivoSesion.push(nombre);
              copiaHecha = true;
              repinta();
              // El fondo (aviso de copia de Inicio, indicador de la cabecera)
              // se actualiza al instante, sin F5 y sin cerrar el asistente.
              if (typeof App !== 'undefined' && App.repintarVista) App.repintarVista();
            }
          } catch (e) {
            alert('Error al exportar: ' + e.message);
          } finally {
            btn.disabled = false;
          }
        };
        return;
      }
      // Los DOS verbos, cada uno con su confirmación en capa 2.
      cuerpo.querySelectorAll('.fdc-promo').forEach(b => {
        b.onclick = () => {
          const a = Calc.asignatura(b.dataset.id);
          if (!a) return;
          const n = paridadDeCurso(ClasesView.cursoDeAsignatura(a));
          if (n < 1 || n > 5) return; // sin nivel siguiente, no hay promoción
          abrirConfirmacionPromocion(a, (n + 1) + 'º');
        };
      });
      cuerpo.querySelectorAll('.fdc-terminar').forEach(b => {
        b.onclick = () => {
          const a = Calc.asignatura(b.dataset.id);
          if (!a) return;
          abrirConfirmacionTerminar(a);
        };
      });
    }

    // Confirmación de PROMOCIONAR (capa 2): explica en claro qué viaja (el
    // grupo, con su renombrado si lo preve Storage.renombresDeGrupo, y el
    // alumnado), qué se elimina (instrumentos, notas, currículo del nivel
    // que se cierra y las soportes ACI exclusivas) y que todo queda en el
    // archivo del paso 1. Nada cambia hasta que el docente confirma.
    function abrirConfirmacionPromocion(a, destino) {
      const cursoActual = ClasesView.cursoDeAsignatura(a);
      const soportes = Storage.soportesAciDe([a.id]);
      const renombres = Storage.renombresDeGrupo(a.id, cursoActual, destino);
      UI.openModal({
        titulo: 'Promocionar asignatura',
        cuerpo: `
          <p><b>${Utils.esc(a.nombre)}</b> pasa a <b>${Utils.esc(destino)}</b>:</p>
          <p>· El grupo y el alumnado <b>viajan con ella</b> (no se tocan).
            ${renombres.length
              ? `Su grupo <b>${Utils.esc(renombres.map(r => '«' + r.antes + '»').join(', '))}</b> pasa a
              llamarse <b>${Utils.esc(renombres.map(r => '«' + r.despues + '»').join(', '))}</b>.`
              : ''}</p>
          <p>· Se <b>ELIMINAN</b> sus instrumentos y sus notas, y su currículo del nivel
            ${Utils.esc(cursoActual)}: queda «sin currículo», y el de ${Utils.esc(destino)} lo recupera
            después con «Recuperar currículo oficial».</p>
          ${soportes.length
            ? `<p>· Con ella se eliminan también sus <b>currículos ACI de soporte</b> (sin clases con
              alumnado): <b>${Utils.esc(soportes.map(s => '«' + s.nombre + '»').join(', '))}</b>.</p>`
            : ''}
          <p class="hint">Todo queda en el archivo definitivo del paso 1
            (${Utils.esc(nombreFicheroArchivo(cursoCierre))}).</p>`,
        textoGuardar: 'Sí, promocionar',
        peligro: true,
        alGuardar() {
          const resp = Storage.promocionarAsignatura(a.id, destino);
          if (!resp) return false;
          soportes.forEach(s => Storage.borrarAsignatura(s.id));
          promocionadasSesion.push(a.id);
          trasAccion(`«${a.nombre}» promociona a ${destino}`);
          // La capa 1 se repinta; el modal de confirmación se cierra solo
          // (alGuardar no devuelve false).
        }
      }, 2);
    }

    // Confirmación de TERMINAR (capa 2): la cascada completa (clases,
    // instrumentos, notas y currículo — todo queda en el archivo del paso 1),
    // las soportes ACI exclusivas que se van con ella y, si algún grupo
    // quedaría HUÉRFANO (ninguna asignatura viva lo referencia), una casilla
    // «También eliminar el grupo con su alumnado» MARCADA POR DEFECTO, con
    // el recuento. Desmarcada, el grupo se queda (caso de línea única que
    // lo reutilizará con otra asignatura). Si otra asignatura lo usa, ni
    // casilla: no se ofrece.
    function abrirConfirmacionTerminar(a) {
      const soportes = Storage.soportesAciDe([a.id]);
      const idsQueSeVan = [a.id].concat(soportes.map(s => s.id));
      const huerfanos = Storage.gruposHuerfanosDe(idsQueSeVan);
      UI.openModal({
        titulo: 'Terminar asignatura',
        cuerpo: `
          <p>Se <b>ELIMINA</b> <b>${Utils.esc(a.nombre)}</b> con sus clases, sus instrumentos y sus
            notas, y su currículo: todo queda en el archivo definitivo del paso 1
            (${Utils.esc(nombreFicheroArchivo(cursoCierre))}).</p>
          ${soportes.length
            ? `<p>Con ella se eliminan también sus <b>currículos ACI de soporte</b> (sin clases con
              alumnado): <b>${Utils.esc(soportes.map(s => '«' + s.nombre + '»').join(', '))}</b>.</p>`
            : ''}
          ${huerfanos.map(h => `
            <label class="campo campo--toggle"><input type="checkbox" class="fdc-baja-grupo" data-grupo="${Utils.esc(h.id)}" checked>
              <span>También eliminar el grupo <b>${Utils.esc(h.nombre)}</b> con su alumnado
              (${h.alumnos} alumno${h.alumnos === 1 ? '' : 's'})</span></label>
            <p class="hint">Sin ninguna asignatura que lo use, el grupo quedaría huérfano. Desmarca la
              casilla para conservarlo (p. ej. si lo reutilizarás con otra asignatura).</p>`).join('')}
          ${huerfanos.length
            ? ''
            : '<p class="hint">Su grupo y su alumnado se quedan en la app (otra asignatura lo sigue usando).</p>'}`,
        textoGuardar: 'Sí, terminar',
        peligro: true,
        alGuardar(body2) {
          const bajarGrupos = Array.from(body2.querySelectorAll('.fdc-baja-grupo:checked')).map(c => c.dataset.grupo);
          Storage.borrarAsignatura(a.id);
          soportes.forEach(s => Storage.borrarAsignatura(s.id));
          bajarGrupos.forEach(gid => {
            const resp = Storage.borrarGrupo(gid);
            if (resp) gruposEliminadosSesion++;
          });
          terminadasSesion++;
          trasAccion(`«${a.nombre}» terminada`);
        }
      }, 2);
    }

    repinta();
  }

  function renderInicio(el) {
    const db = Storage.db;
    const meta = db.meta || {};
    // El aviso de copia destaca solo si hay datos que perder: cambios sin copiar
    // o ninguna exportación hecha. Con la app vacía no asusta al estrenarla.
    const copiaPendiente = !Storage.vacio() && (!meta.ultimaExportacion || meta.cambiosSinCopia);
    // El bloque «Montaje» de Inicio se retiró (Evaluación ya agrupa esas
    // vistas): la guía plegable es solo el «Flujo recomendado», abierta con la
    // app vacía y plegada en cuanto hay datos.
    const guiaAbierta = Storage.vacio();
    el.innerHTML = `
      <section class="card">
        <div class="card-head">
          <h1>Bienvenido a Evalora</h1>
          <button class="btn btn-mini" id="btn-curso-escolar" title="Cambiar el curso escolar">Curso escolar: <b>${Utils.esc(db.cursoEscolar)}</b></button>
        </div>
        <p style="color:var(--tinta-suave)">Califica con criterios ponderados según la LOMLOE. Los datos se guardan en este navegador:
          <b>exporta tu backup al USB con frecuencia</b>.</p>
        <div class="aviso" style="background:#eff6ff;border-color:#bfdbfe;color:#1e40af">
          <b>Copias de seguridad</b> · <span id="info-backup">…</span><br>
          <small>Con Chrome/Edge en Windows puedes guardar directamente en la carpeta <code>backups/</code> del proyecto; en Android irán a Descargas.</small>
          <div id="aviso-copia" class="no-print"></div>
          <div class="acciones no-print" style="margin-top:8px">
            ${Storage.puedeCarpeta() ? '<button class="btn btn-mini" id="btn-carpeta">' + (Storage.db && Storage.db._dir ? 'Cambiar carpeta…' : 'Elegir carpeta de backups…') + '</button>' : ''}
          </div>
          ${Storage.copiaPrevia() ? '<div class="no-print" style="margin-top:8px"><button class="btn btn-mini" id="btn-restaurar-previa">↩ Recuperar los datos anteriores a la última importación</button></div>' : ''}
        </div>
        ${Storage.vacio() ? `
          <div class="aviso">Tu aplicación está vacía. Puedes cargar datos de ejemplo para probarla.</div>
          <button class="btn btn-primario" id="btn-demo">Cargar datos de ejemplo</button>` : ''}
      </section>
      ${copiaPendiente ? avisoCopiaDestacadoHtml() : ''}
      ${panelPendientesHtml()}
      <section class="card no-print">
        <h2 class="subtitulo" style="margin:0 0 8px">Accesos rápidos</h2>
        <div class="acciones">
          <button class="btn" data-ir="informes">Ver informes</button>
          <button class="btn" data-ir="instrumentos">Crear instrumento</button>
          <button class="btn" id="btn-backup-rapido">Hacer backup</button>
        </div>
      </section>
      ${panelesEstadoHtml()}
      ${panelesCoberturaHtml()}
      ${panelesAciHtml()}
      <details class="guia-inicio" ${guiaAbierta ? 'open' : ''}>
        <summary><span class="guia-titulo">Flujo recomendado</span></summary>
        <section class="card">
          <ol class="flujo" style="color:var(--tinta-suave);margin:0;padding-left:20px">
            <li>Crea <b>grupos</b> e inscribe <b>alumnos</b>.</li>
            <li>Crea <b>asignaturas</b> y sus <b>clases</b> (asignatura · grupo). Si vas a trabajar con adaptaciones, crea en la clase sus <b>niveles ACI</b>.</li>
            <li>Define en <b>Currículo</b> las competencias específicas, los criterios y sus ponderaciones (suman 100%).</li>
            <li>Crea <b>instrumentos</b>: control, rúbrica, proyecto u otro, mapeando cada apartado a criterios. Si ya tienes una rúbrica hecha (por ejemplo, con una IA), impórtala con «Importar rúbrica».</li>
            <li><b>Corrige</b> desde la sección «Corregir» (o desde la Cuadrícula).</li>
            <li>Revisa los <b>informes</b> (Atención, Criterios, Alumnos en riesgo). Imprime o exporta a PDF el informe que necesites.</li>
            <li>Exporta el <b>backup</b> al terminar cada sesión.</li>
          </ol>
        </section>
      </details>`;

    const curso = el.querySelector('#btn-curso-escolar');
    if (curso) curso.onclick = () => modalCursoEscolar();

    const info = el.querySelector('#info-backup');
    const avisoCopia = el.querySelector('#aviso-copia');
    let dirActual = null;
    const pintaInfo = dir => {
      if (dir) dirActual = dir;
      const ultima = db.meta && db.meta.ultimaExportacion ? Utils.fechaLegible(new Date(db.meta.ultimaExportacion)) + ' a las ' + new Date(db.meta.ultimaExportacion).toTimeString().slice(0, 5) : 'nunca';
      info.innerHTML = `última copia <b>${ultima}</b>${dirActual ? ` · destino: carpeta «${Utils.esc(dirActual.name)}»` : ''}`;
      if (avisoCopia) avisoCopia.innerHTML = avisoCopiaHtml(Storage.estadoCopia(), copiaPendiente);
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

    // Pendientes y copia (Fase 3): acciones del panel y de los accesos rápidos.
    const btnCorregirPend = el.querySelector('#btn-corregir-pendientes');
    if (btnCorregirPend) btnCorregirPend.onclick = () => ir('corregir');
    const hacerBackup = ev => {
      const btn = ev && ev.currentTarget ? ev.currentTarget : null;
      if (btn) btn.disabled = true; // ocupado: sin doble clic durante la copia
      Storage.exportar()
        .then(ok => { if (ok) { UI.toast('Backup exportado'); pintaEstadoCopia(); App.ir('inicio'); } })
        .catch(e => alert('Error al exportar: ' + e.message))
        .finally(() => { if (btn) btn.disabled = false; });
    };
    const btnBackupAviso = el.querySelector('#btn-backup-aviso');
    if (btnBackupAviso) btnBackupAviso.onclick = hacerBackup;
    const btnBackupRapido = el.querySelector('#btn-backup-rapido');
    if (btnBackupRapido) btnBackupRapido.onclick = hacerBackup;

    // Paneles de estado: cada fila de clase abre Calificaciones de esa clase.
    el.querySelectorAll('.fila-inicio').forEach(tr => {
      tr.onclick = () => ir('cuadricula', { claseId: tr.dataset.clase });
      // Fase 5 (teclado): la fila es alcanzable con Tab (tabindex en el HTML)
      // y Enter/Espacio hacen lo mismo que el clic.
      tr.onkeydown = e => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        ir('cuadricula', { claseId: tr.dataset.clase });
      };
    });
    const btnCur = el.querySelector('#btn-ir-curriculo');
    if (btnCur) btnCur.onclick = () => ir('curriculo');
    const btnCl = el.querySelector('#btn-ir-clases');
    if (btnCl) btnCl.onclick = () => ir('clases');
    // Accesos rápidos de Inicio. «Ver informes» abre la vista propia de
    // Informes (Fase 4a).
    el.querySelectorAll('[data-ir]').forEach(b => {
      b.onclick = () => ir(b.dataset.ir);
    });
  }

  // Indicador de copia de la cabecera (M-02): estado permanente del backup,
  // junto al botón «Copia de seguridad». Sin datos no se muestra: con la app
  // vacía no hay nada que copiar ni que perder. No se llama desde Storage
  // (solo lectura del estado); la repintan la navegación (pintaNav) y las
  // acciones que sellan la copia (guardar, exportar, importar).
  function pintaEstadoCopia() {
    const el = document.getElementById('estado-copia');
    if (!el) return; // La cabecera no existe en el arnés de pruebas.
    const est = Storage.estadoCopia();
    if (!est.hayDatos) {
      el.hidden = true;
      el.textContent = '';
      return;
    }
    const NIVELES = {
      ok: ['ok', 'Copia al día'],
      pendiente: ['pendiente', 'Cambios sin copia'],
      antigua: ['antigua', `Copia antigua · ${est.dias} días`],
      nunca: ['nunca', 'Sin copia de seguridad']
    };
    const [cls, texto] = NIVELES[est.nivel] || NIVELES.ok;
    el.hidden = false;
    el.className = 'estado-copia ' + cls;
    el.textContent = texto;
    // `title` y `aria-label` con el mismo texto. En el arnés sin DOM los
    // elementos son falsos (sin setAttribute): se asignan como propiedad y,
    // si el elemento admite atributos, también reflejados.
    el.title = texto;
    if (typeof el.setAttribute === 'function') {
      el.setAttribute('title', texto);
      el.setAttribute('aria-label', texto);
    }
  }

  // M-18: la primera fila de cabecera de las tablas que se desplazan con la
  // página (Cuadrícula e Informe) es sticky, pero la cabecera de color (también
  // sticky) la tapaba al desplazarse: la fila se metía debajo y desaparecía.
  // Se mide la altura REAL de la cabecera (offsetHeight; incluye la fila del
  // subnav cuando se ve) y se publica en --sticky-top para que el `top` de esas
  // cabeceras la deje ver. La corrección (.scroll-correccion) tiene scroll
  // propio y su thead sigue pegado a top: 0 dentro del contenedor.
  // En el arnés sin DOM no hay layout que medir: se ignora sin fallo.
  function mideStickyTop() {
    const raiz = document.documentElement;
    if (!raiz || !raiz.style || typeof raiz.style.setProperty !== 'function') return;
    const cab = document.querySelector('.topbar');
    if (!cab || typeof cab.offsetHeight !== 'number' || !isFinite(cab.offsetHeight)) return;
    raiz.style.setProperty('--sticky-top', cab.offsetHeight + 'px');
    // Cuadrícula: la cabecera tiene DOS filas (la barra de la unidad + los
    // instrumentos). La segunda se ancla DEBAJO de la primera, cuya altura
    // hay que medir para que no se pisen al hacer sticky.
    const fila1 = document.querySelector('.tabla-cuadricula thead tr:first-child');
    if (fila1 && typeof fila1.offsetHeight === 'number' && isFinite(fila1.offsetHeight) && fila1.offsetHeight > 0) {
      raiz.style.setProperty('--fila1-h', fila1.offsetHeight + 'px');
    } else {
      raiz.style.removeProperty('--fila1-h');
    }
    // M-18: las ventanas de scroll de tabla (Cuadrícula e Informe) ocupan el
    // espacio que queda bajo la cabecera, para que el thead se pega a su borde
    // superior y siempre se vea.
    document.querySelectorAll('.scroll-tabla').forEach(v => {
      if (typeof v.getBoundingClientRect !== 'function') return;
      const arriba = v.getBoundingClientRect().top;
      if (typeof arriba !== 'number' || !isFinite(arriba) || arriba <= 0) return;
      v.style.maxHeight = Math.max(240, window.innerHeight - arriba - 12) + 'px';
    });
  }

  // M-19: el panel de la barra lateral solo abre y cierra la HAMBURGUESA de la
  // franja (ni Escape ni un clic fuera lo cierran, petición del docente). El
  // estado vive aquí y se conserva al repintar la nav: al navegar, si estaba
  // abierto sigue abierto.
  let drawerAbierto = false;

  // Navegación según la organización elegida en Configuración → Tema y menús.
  // El modo básico se retiró (Evaluación ya agrupa las vistas de
  // preparación): una preferencia antigua con `nav === 'basic'` cae en la
  // barra superior, sin migrar el estado.
  function modoNav() {
    const modoBruto = (Storage.db && Storage.db.tema && Storage.db.tema.nav) || 'topbar';
    return modoBruto === 'basic' ? 'topbar' : modoBruto;
  }

  function pintaNav() {
    // El indicador de copia (M-02) vive en la cabecera y no depende del modo
    // de navegación: se repinta al entrar en cada vista.
    pintaEstadoCopia();
    const modo = modoNav();
    document.querySelectorAll('.nav-fab,.nav-menu,.nav-dock,.nav-dock-sub,.nav-drawer,.nav-drawer-toggle,.franja-drawer')
      .forEach(e => e.remove());
    const nav = document.getElementById('nav');
    nav.style.display = '';
    nav.innerHTML = '';
    document.body.classList.toggle('modo-fab', modo === 'fab');
    document.body.classList.toggle('modo-dock', modo === 'dock');
    document.body.classList.toggle('modo-drawer', modo === 'drawer');

    const secciones = SECCIONES;
    const pintaBoton = (s, contenedor) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = s.label;
      b.setAttribute('data-seccion', s.id);
      if (seccionActual() === s.id) { b.classList.add('activo'); b.setAttribute('aria-current', 'page'); }
      b.onclick = () => irSeccion(s.id);
      contenedor.appendChild(b);
      return b;
    };
    const pinta = contenedor => {
      secciones.forEach(s => pintaBoton(s, contenedor));
    };
    // Menús con jerarquía (panel lateral y menú del FAB): bajo la entrada
    // Evaluación se listan sus subpestañas, sangradas (nivel 3), cuando se
    // está dentro de Evaluación.
    const pintaConSubeval = contenedor => {
      secciones.forEach(s => {
        pintaBoton(s, contenedor);
        if (s.id === 'evaluacion' && seccionActual() === 'evaluacion') pintaSubevalAnidada(contenedor);
      });
    };

    if (modo === 'topbar') { pinta(nav); pintaSubnav(); return; }
    nav.style.display = 'none';

    if (modo === 'fab') {
      const fab = document.createElement('button');
      fab.type = 'button'; fab.className = 'nav-fab'; fab.textContent = 'Vistas';
      fab.setAttribute('aria-expanded', 'false');
      const menu = document.createElement('div');
      menu.className = 'nav-menu'; menu.hidden = true;
      pintaConSubeval(menu);
      document.body.appendChild(fab); document.body.appendChild(menu);
      fab.onclick = () => {
        menu.hidden = !menu.hidden;
        fab.setAttribute('aria-expanded', String(!menu.hidden));
      };
      // Prueba del docente: SIEMPRE que se elige una entrada, el menú se cierra
      // antes de actuar. Casi todas las entradas navegan (ir() repinta la nav y
      // el menú desaparece), pero «Ajustes» abre Configuración sin pasar por
      // ir(): sin esta envoltura el menú quedaba abierto tras el modal. Cada
      // entrada oculta el menú y refleja el estado en aria-expanded, y luego
      // ejecuta su acción de siempre.
      menu.querySelectorAll('button').forEach(b => {
        const actua = b.onclick;
        b.onclick = ev => {
          menu.hidden = true;
          fab.setAttribute('aria-expanded', 'false');
          if (typeof actua === 'function') actua.call(b, ev);
        };
      });
    } else if (modo === 'dock') {
      const dock = document.createElement('div');
      dock.className = 'nav-dock';
      pinta(dock);
      document.body.appendChild(dock);
      pintaSubnavDock();
    } else if (modo === 'drawer') {
      // El estado (abierto/cerrado) refleja en una clase para que el CSS
      // aparte el hueco del contenido.
      document.body.classList.toggle('drawer-abierto', drawerAbierto);
      // M-19: una franja estrecha fija en el margen izquierdo lleva la
      // hamburguesa; el menú se despliega SOLO al tocarla y solo se colapsa al
      // volver a tocarla (ni Escape ni un clic fuera lo cierran, petición del
      // docente). El panel es una capa pegada a la franja (no desplaza el
      // contenido: main aparta el hueco de la franja con un margen) y su
      // estado se conserva al repintar la nav: al navegar, si estaba abierto
      // sigue abierto.
      const franja = document.createElement('aside');
      franja.className = 'franja-drawer';
      const t = document.createElement('button');
      t.type = 'button'; t.className = 'nav-drawer-toggle'; t.textContent = '☰';
      t.setAttribute('title', 'Mostrar u ocultar la barra lateral');
      t.setAttribute('aria-label', 'Mostrar u ocultar la barra lateral');
      t.setAttribute('aria-expanded', String(drawerAbierto));
      t.onclick = () => {
        drawerAbierto = !drawerAbierto;
        // El panel desplegado NO tapa el contenido: main se aparta el hueco
        // (la franja + el panel). La clase refleja el estado para el CSS.
        document.body.classList.toggle('drawer-abierto', drawerAbierto);
        pintaNav(); // repinta: el panel aparece o desaparece con el estado
      };
      franja.appendChild(t);
      document.body.appendChild(franja);
      const d = document.createElement('aside');
      d.className = 'nav-drawer';
      d.hidden = !drawerAbierto;
      pintaConSubeval(d);
      document.body.insertBefore(d, document.getElementById('app'));
    }
    pintaSubnav();
  }

  // Subpestañas de Evaluación integradas en cada modo de navegación:
  //  - topbar: la fila #subnav de la cabecera (segunda fila, junto a #nav).
  //  - fab y drawer: anidadas y sangradas dentro de su menú, bajo la entrada
  //    Evaluación (las pinta pintaConSubeval).
  //  - dock: una segunda barra pegada al dock (pintaSubnavDock).
  // En fab, dock y drawer la cabecera NO lleva fila: cada componente pinta lo
  // suyo. Como toda ruta de pintaNav acaba aquí, siempre se remide
  // --sticky-top (crear o quitar la fila cambia la altura de la cabecera, M-18).
  function pintaSubnav() {
    let subnav = document.getElementById('subnav');
    if (modoNav() === 'topbar' && seccionActual() === 'evaluacion') {
      if (!subnav) {
        subnav = document.createElement('div');
        subnav.id = 'subnav';
        subnav.className = 'subnav';
        const nav = document.getElementById('nav');
        if (nav && nav.parentNode) nav.parentNode.insertBefore(subnav, nav.nextSibling);
        else document.body.appendChild(subnav);
      }
      subnav.innerHTML = '';
      SUBEVAL.forEach(sub => {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = sub.label;
        b.setAttribute('data-subeval', sub.id);
        if (actual === sub.id) { b.classList.add('activo'); b.setAttribute('aria-current', 'page'); }
        b.onclick = () => ir(sub.id);
        subnav.appendChild(b);
      });
    } else if (subnav) {
      subnav.remove();
    }
    mideStickyTop();
  }

  // Subpestañas de Evaluación anidadas en un menú (panel lateral o menú del
  // FAB): van sangradas bajo la entrada Evaluación, con estilo de nivel 3, y
  // solo se pintan estando dentro de Evaluación (la llamada lo comprueba).
  function pintaSubevalAnidada(contenedor) {
    SUBEVAL.forEach(sub => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'subeval';
      b.textContent = sub.label;
      b.setAttribute('data-subeval', sub.id);
      if (actual === sub.id) { b.classList.add('activo'); b.setAttribute('aria-current', 'page'); }
      b.onclick = () => ir(sub.id);
      contenedor.appendChild(b);
    });
  }

  // Subpestañas de Evaluación en el modo dock: una segunda barra pegada al
  // dock, con la misma estética (fondo blanco, borde y sombra). Solo existe
  // estando dentro de Evaluación y se elimina y recrea en cada repintado
  // junto al propio dock.
  function pintaSubnavDock() {
    if (seccionActual() !== 'evaluacion') return;
    const sub = document.createElement('div');
    sub.className = 'nav-dock-sub';
    SUBEVAL.forEach(subDef => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = subDef.label;
      b.setAttribute('data-subeval', subDef.id);
      if (actual === subDef.id) { b.classList.add('activo'); b.setAttribute('aria-current', 'page'); }
      b.onclick = () => ir(subDef.id);
      sub.appendChild(b);
    });
    document.body.appendChild(sub);
  }

  // Sección activa según la vista (Fase 4a: Informes es una vista propia, así
  // que el mapeo completo vive en SECCION_DE_VISTA).
  function seccionActual() {
    return SECCION_DE_VISTA[actual] || 'inicio';
  }

  // Navega a una sección del menú: Ajustes abre Configuración; el resto, su vista
  // (con la pestaña indicada, si la tiene).
  function irSeccion(s) {
    const sec = SECCIONES.find(x => x.id === s);
    if (!sec) return;
    if (sec.modal) { modalAjustes(); return; }
    ir(sec.vista, sec.tab ? { tab: sec.tab } : undefined);
  }

  function ir(id, opciones) {
    // Alias de la ruta antigua de Informes: la pestaña «Informe» de la
    // Cuadrícula desapareció (Fase 4a); su ruta lleva a la vista propia.
    if (id === 'cuadricula' && opciones && opciones.tab === 'informe') {
      return ir('informes');
    }
    // Alias de la vista retirada «Montaje»: Evaluación agrupa esas vistas y su
    // entrada principal es la Cuadrícula.
    if (id === 'montaje') {
      return ir('cuadricula');
    }
    actual = id;
    const vista = VISTAS.find(v => v.id === id);
    UI.closeModal();
    vista.render(document.getElementById('app'), opciones);
    // La nav se pinta DESPUÉS de renderizar: así la sección activa conoce ya el
    // estado que la vista ha fijado (p. ej. el contexto de la vista de Informes).
    pintaNav();
    window.scrollTo(0, 0);
    history.replaceState(null, '', '#' + id);
  }

  // Botón de pantalla completa en la cabecera (petición del docente: en la
  // tableta no encontraba cómo poner la app a pantalla completa). Usa la
  // Fullscreen API estándar con tolerancia a navegadores sin ella (prefijo
  // webkit y, si no hay API, un aviso sin romper nada). El icono alterna con
  // fullscreenchange; en el arnés document.addEventListener es no-op y el
  // clic repinta el icono por sí mismo.
  function montaPantallaCompleta() {
    // Solo en la cabecera real: el arnés mínimo devuelve un elemento falso
    // sin insertBefore y el DOM de pruebas no pinta .topbar.
    const acciones = document.querySelector('.topbar .actions');
    const ajustes = document.getElementById('btn-ajustes');
    if (!acciones || !ajustes || typeof acciones.insertBefore !== 'function') return;
    const ICONO_EXPANDIR =
      '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" ' +
      'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>';
    const ICONO_CONTRAER =
      '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" ' +
      'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>';
    const enPantallaCompleta = () =>
      !!(document.fullscreenElement || document.webkitFullscreenElement);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'icon-btn btn-pantalla-completa';
    const pinta = () => {
      const dentro = enPantallaCompleta();
      btn.innerHTML = dentro ? ICONO_CONTRAER : ICONO_EXPANDIR;
      const texto = dentro ? 'Salir de pantalla completa' : 'Pantalla completa';
      if (typeof btn.setAttribute === 'function') {
        btn.setAttribute('aria-label', texto);
        btn.setAttribute('title', texto);
      } else btn.title = texto;
    };
    pinta();
    btn.onclick = () => {
      const raiz = document.documentElement;
      const dentro = enPantallaCompleta();
      // Segundo parámetro de call(): el dueño del método (document para salir,
      // el propio elemento raíz para entrar).
      const accion = dentro
        ? (document.exitFullscreen || document.webkitExitFullscreen)
        : (raiz.requestFullscreen || raiz.webkitRequestFullscreen);
      if (typeof accion !== 'function') {
        UI.toast('Tu navegador no permite la pantalla completa.');
        return;
      }
      try {
        const r = accion.call(dentro ? document : raiz);
        if (r && typeof r.catch === 'function') r.catch(() => {});
      } catch (e) { /* sin API o permiso denegado: no rompe nada */ }
      pinta();
    };
    if (typeof document.addEventListener === 'function') {
      ['fullscreenchange', 'webkitfullscreenchange'].forEach(ev =>
        document.addEventListener(ev, pinta));
    }
    acciones.insertBefore(btn, ajustes);
  }

  function arrancar() {
    Storage.load();
    aplicaTema();
    // M-18: al redimensionar cambia el ajuste de la nav y del subnav y con
    // ello la altura de la cabecera: se vuelve a medir. Guardia para el arnés,
    // cuyo `window` simulado no tiene addEventListener.
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('resize', mideStickyTop);
    }
    // F2: abre Configuración en «Tema y menús» (atajo de desarrollo).
    document.addEventListener('keydown', ev => {
      if (ev.key !== 'F2') return;
      ev.preventDefault();
      modalAjustes('tema');
    });
    if (Storage.reparadosCriterios) {
      Storage.save();
      UI.toast(Storage.reparadosCriterios === 1
        ? 'Se han corregido los criterios de 1 instrumento para que coincidan con su nivel.'
        : 'Se han corregido los criterios de ' + Storage.reparadosCriterios + ' instrumentos para que coincidan con su nivel.');
    }
    const btnGuardar = document.getElementById('btn-guardar');
    btnGuardar.onclick = () => {
      btnGuardar.disabled = true; // ocupado: sin doble clic durante la copia
      Storage.guardar()
        .then(ok => {
          pintaEstadoCopia();
          // Sin esto, un fallo silencioso (permiso denegado, cancelado) se lee
          // como «el botón no hace nada».
          if (!ok) UI.toast('No se ha guardado la copia. Prueba de nuevo o usa Configuración → Copias de seguridad.', 'error');
        })
        .catch(e => alert('Error al guardar: ' + e.message))
        .finally(() => { btnGuardar.disabled = false; });
    };
    document.getElementById('btn-ajustes').onclick = () => modalAjustes();
    montaPantallaCompleta();

    // El isotipo de la cabecera lleva a Inicio (petición del docente): es un
    // <span> con role="link" (index.html), así que también responde a teclado.
    const logo = document.getElementById('logo-inicio');
    if (logo) {
      logo.onclick = () => ir('inicio');
      logo.onkeydown = ev => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          ir('inicio');
        }
      };
    }

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
          // Tras importar, el indicador de copia refleja el estado nuevo
          // (p. ej. «Sin copia de seguridad» si el backup traía datos y
          // ninguna exportación).
          pintaEstadoCopia();
        })
        .catch(() => alert('El archivo no es un backup válido de Evalora'));
    };

    // Red de seguridad (R-01): vuelca el estado al ocultar o cerrar la pestaña
    // por si alguna escritura anterior no llegó a completarse. Los datos nunca
    // se pierden (el autoguardado continuo ya los tiene en localStorage); esto
    // solo garantiza el vuelco final. beforeunload ademas pide confirmacion
    // cuando hay cambios sin copia de seguridad (D-53, cambiosSinCopia).
    const volcadoSeguro = () => { if (Storage.db) Storage.volcar(); };
    window.addEventListener('beforeunload', (e) => {
      volcadoSeguro();
      const haySinCopia = Storage.db && Storage.db.meta && Storage.db.meta.cambiosSinCopia;
      if (haySinCopia) {
        // El navegador muestra su dialogo generico (texto y botones no se pueden
        // personalizar por seguridad). Previene el cierre para que salga.
        e.preventDefault();
        e.returnValue = '';
      }
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') volcadoSeguro();
    });

    const hash = location.hash.slice(1);
    // El hash antiguo «#montaje» (vista retirada) cae en la Cuadrícula.
    ir(hash === 'montaje' ? 'cuadricula' : (VISTAS.some(v => v.id === hash) ? hash : 'inicio'));
  }

  return {
    ir,
    arrancar,
    refrescar() { ir(actual); },
    // Repinta la vista actual SIN cerrar los modales abiertos: lo usa el
    // asistente de fin de curso (D-60) para refrescar el fondo (Inicio y el
    // indicador de copia) tras cada acción, sin F5 y sin cerrar el asistente.
    repintarVista() {
      VISTAS.find(v => v.id === actual).render(document.getElementById('app'));
      pintaNav();
    },
    // Secciones del menú principal (Fase 1) y utilidades para recorrerlas.
    irSeccion,
    seccionActual,
    refrescarNav: pintaNav,
    // M-12: modo privacidad — consulta, helper de nombre y conmutación.
    esAnonimo() { return anonimo; },
    nombreVisible,
    toggleAnonimo() { anonimo = !anonimo; return anonimo; },
    // M-12: componente del conmutador de privacidad (botón de ojo); lo usan
    // la Cuadrícula y el Informe para que ambos se comporten igual.
    crearBotonPrivacidad,
    // Paneles de Inicio expuestos para poder comprobarlos sin navegador.
    panelesInicio: { estado: panelesEstadoHtml, cobertura: panelesCoberturaHtml, aci: panelesAciHtml, pendientes: panelPendientesHtml },
    // Configuración expuesta por el mismo motivo (la cabecera no existe en el arnés).
    abrirAjustes: modalAjustes,
    // Fin de curso (D-60): asistente y helpers puros de paridad/nombre de
    // fichero, comprobables sin navegador.
    abrirFinDeCurso: modalFinDeCurso,
    finCurso: { paridadDeCurso, nombreFicheroArchivo, cursoEscolarSiguiente, validarCursoEscolar },
    // Indicador de copia de la cabecera (M-02): comprobable sin navegador.
    pintaEstadoCopia
  };
})();

document.addEventListener('DOMContentLoaded', App.arrancar);
