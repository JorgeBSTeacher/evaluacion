const ClasesView = (() => {
  const ORDEN_CURSOS = ['1º', '2º', '3º', '4º', '5º', '6º'];

  // Las plantillas oficiales embebidas (una por área y ciclo) son la única
  // fuente de currículo. La asignatura se ancla a un curso concreto.
  function plantillasOficiales() {
    return (typeof PLANTILLAS_CURRICULO !== 'undefined' && Array.isArray(PLANTILLAS_CURRICULO))
      ? PLANTILLAS_CURRICULO : [];
  }

  function areasOficiales() {
    return [...new Set(plantillasOficiales().map(p => (p.asignatura || {}).nombre).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'es'));
  }

  function cursosDeArea(area) {
    const set = new Set();
    plantillasOficiales()
      .filter(p => (p.asignatura || {}).nombre === area)
      .forEach(p => ((p.asignatura || {}).cursos || []).forEach(c => set.add(String(c))));
    return [...set].sort((a, b) => {
      const ia = ORDEN_CURSOS.indexOf(a), ib = ORDEN_CURSOS.indexOf(b);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
  }

  function plantillaDe(area, curso) {
    return plantillasOficiales().find(p =>
      (p.asignatura || {}).nombre === area &&
      ((p.asignatura || {}).cursos || []).map(String).includes(String(curso)));
  }

  // Área del decreto de una asignatura. Es lo que permite ofrecer, en los
  // niveles ACI, solo currículos de la MISMA área que la clase: una clase de
  // Matemáticas no debe poder apuntar a un currículo de Lengua.
  //
  // El campo `asignatura.area` solo lo llevan las asignaturas creadas desde el
  // alta oficial (641585d); las anteriores lo tienen vacío, así que NO se puede
  // usar como única fuente. Se deduce EN EL MOMENTO del prefijo de los códigos
  // de criterio («MAT 1.1» → «Matemáticas»), que es el dato vivo: si el
  // currículo cambia o se recupera después, el área se recalcula sola. No se
  // escribe nada, así que no hay migración ni botón de rescate.
  //
  // Los prefijos salen de tools/extract-decreto.py (AREAS) y las 19 plantillas
  // los cumplen sin colisión.
  const AREA_POR_PREFIJO = {
    CMNSC: 'Conocimiento del Medio Natural, Social y Cultural',
    EART: 'Educación Artística',
    EFIS: 'Educación Física',
    EVCE: 'Educación en Valores Cívicos y Éticos',
    LCL: 'Lengua Castellana y Literatura',
    LEXT: 'Lengua Extranjera',
    MAT: 'Matemáticas'
  };

  function areaDeAsignatura(asig) {
    if (!asig) return '';
    // El campo guardado manda cuando existe (asignaturas creadas desde 641585d).
    if (asig.area) return asig.area;
    const criterios = Storage.db.criterios.filter(c => c.asignaturaId === asig.id);
    for (const c of criterios) {
      const pref = String(c.codigo || '').trim().split(/[\s.]+/)[0].toUpperCase();
      if (AREA_POR_PREFIJO[pref]) return AREA_POR_PREFIJO[pref];
    }
    // Sin currículo no hay prefijo: es una asignatura hecha a mano, sin área.
    return '';
  }

  // Abreviatura del área para los desplegables, donde el nombre completo
  // («Conocimiento del Medio Natural, Social y Cultural 5º») no cabe: el
  // desplegable de la ACI está clavado a 280px y el nombre se corta. Se usan
  // las MISMAS siglas que los códigos de criterio del decreto (no unas
  // inventadas), para que «MAT 4º» en el desplegable case con «MAT 1.1» en el
  // criterio y el docente no tenga que traducir. Si el área no está en la
  // tabla, se devuelve el nombre completo: mejor largo que abreviado a ciegas.
  //
  // Solo para MOSTRAR. Nunca se escribe en `asignatura.nombre`: esa es la
  // etiqueta del boletín, y el informe debe llevar el nombre como en el decreto.
  const ABREVIATURA_POR_AREA = Object.keys(AREA_POR_PREFIJO).reduce((acc, pref) => {
    acc[AREA_POR_PREFIJO[pref]] = pref;
    return acc;
  }, {});

  function abreviaturaArea(area) {
    const a = String(area || '').trim();
    if (!a) return '';
    return ABREVIATURA_POR_AREA[a] || a;
  }

  // Nombre corto de una asignatura para un desplegable: «MAT 4º» si su área se
  // conoce (currículo oficial), y su nombre visible entero si es una asignatura
  // hecha a mano, sin área. Las manuales no compiten en el mismo desplegable
  // que las oficiales, así que el nombre largo solo aparece cuando es lo único
  // que identifica a la asignatura.
  function nombreCortoAsignatura(a) {
    if (!a) return '';
    const area = areaDeAsignatura(a);
    if (!area) return String(a.nombre || '');
    const curso = String(a.curso || '').trim();
    // Si el nombre visible NO es «área + curso», no es un nombre canónico: es
    // una VARIANTE (Inglés, Francés, Música, Plástica) o un nombre editado a
    // mano. Abreviarla la haría indistinguible de su pariente —«LEXT 3º» para
    // Inglés y para Francés—, así que se deja tal cual: ya es corta y es lo
    // único que las diferencia.
    const canonico = area + (curso ? ' ' + curso : '');
    if (String(a.nombre || '').trim() !== canonico) return String(a.nombre || '');
    return abreviaturaArea(area) + (curso ? ' ' + curso : '');
  }

  // Lista con «y» antes del último elemento: «1º, 2º y 3º». Sirve para
  // decir qué currículos faltan, sin inventar un helper en Utils.
  function listaEnCastellano(items) {
    const arr = Array.from(items).map(String).filter(Boolean);
    if (!arr.length) return '';
    if (arr.length === 1) return arr[0];
    if (arr.length === 2) return arr[0] + ' y ' + arr[1];
    return arr.slice(0, -1).join(', ') + ' y ' + arr[arr.length - 1];
  }

  // Solo dos áreas del decreto se desdoblan en la práctica, y el currículo es el
  // mismo en las dos: Lengua Extranjera (Inglés o Francés) y Educación Artística
  // (Plástica o Música). Son ETIQUETAS del nombre visible, no áreas distintas.
  const VARIANTES = {
    'Lengua Extranjera': ['Inglés', 'Francés'],
    'Educación Artística': ['Plástica', 'Música']
  };

  // Alta de asignatura. Sin argumentos deja elegir entre recuperar el currículo
  // oficial de un curso o crearla en blanco. Si recibe una asignatura existente
  // (creada a mano), solo ofrece recuperar el currículo sobre ella.
  function modalAsignatura(asigExistente) {
    const recuperar = asigExistente || null;
    const areas = areasOficiales();
    const hayOficiales = areas.length > 0;
    const cuerpo = `
      ${recuperar ? '' : `<label class="campo"><span>Origen del currículo</span>
        <select id="f-modo">
          ${hayOficiales ? '<option value="oficial">Currículo oficial (plantillas del decreto)</option>' : ''}
          <option value="blanco"${hayOficiales ? '' : ' selected'}>En blanco (añadiré los criterios a mano)</option>
        </select></label>`}
      <div id="bloque-oficial">
        <label class="campo"><span>Área / asignatura</span>
          <select id="f-area">${areas.map(a => `<option>${Utils.esc(a)}</option>`).join('')}</select></label>
        <label class="campo" id="campo-variante"><span>Variante</span>
          <select id="f-variante"></select></label>
        <label class="campo"><span>Curso</span>
          <select id="f-curso"></select></label>
        <div class="aviso" id="f-resumen"></div>
        <div class="aviso">
          La asignatura se llamará <b>como en el Decreto 66/2022</b>. Si necesitas otro
          nombre (por ejemplo porque das Plástica y Música por separado), cámbialo después
          en <b>Editar asignatura</b>: el currículo y las notas no se tocan.
        </div>
      </div>
      <div id="bloque-blanco">
        <label class="campo"><span>Nombre</span>
          <input type="text" id="f-nombre" placeholder="Ej. Taller de ajedrez"></label>
        <label class="campo"><span>Etapa</span>
          <select id="f-etapa"><option>Primaria</option><option>Infantil</option></select></label>
      </div>`;

    const mbody = UI.openModal({
      titulo: recuperar ? 'Recuperar currículo oficial' : 'Nueva asignatura / área',
      textoGuardar: 'Guardar',
      cuerpo,
      alGuardar(body) {
        const modo = recuperar ? 'oficial' : ((body.querySelector('#f-modo') || {}).value || 'blanco');
        if (modo === 'oficial') {
          const area = body.querySelector('#f-area').value;
          const curso = body.querySelector('#f-curso').value;
          const variante = body.querySelector('#f-variante');
          const etiqueta = variante && variante.value ? variante.value : '';
          const pl = plantillaDe(area, curso);
          if (!pl) { alert(`No hay currículo oficial para «${area}» en ${curso}.`); return false; }
          try {
            const r = Storage.importarCurriculo(pl, {
              cursos: [curso],
              etiqueta,
              asignaturaId: recuperar ? recuperar.id : null
            });
            UI.toast('Currículo cargado: ' + r.asignaturas.join(', '));
          } catch (e) {
            alert(e.message);
            return false;
          }
          return;
        }
        const nombre = body.querySelector('#f-nombre').value.trim();
        if (!nombre) { alert('Escribe un nombre para la asignatura.'); return false; }
        Storage.guardarAsignatura({ nombre, etapa: body.querySelector('#f-etapa').value });
      }
    });

    const selModo = mbody.querySelector('#f-modo');
    const selArea = mbody.querySelector('#f-area');
    const selVariante = mbody.querySelector('#f-variante');
    const campoVariante = mbody.querySelector('#campo-variante');
    const selCurso = mbody.querySelector('#f-curso');
    const bloqueOficial = mbody.querySelector('#bloque-oficial');
    const bloqueBlanco = mbody.querySelector('#bloque-blanco');
    const resumen = mbody.querySelector('#f-resumen');

    function pintaResumen() {
      const pl = plantillaDe(selArea.value, selCurso.value);
      const nombreVisible = nombreElegido();
      resumen.innerHTML = pl
        ? `Se creará <b>${Utils.esc(nombreVisible)}</b> con `
          + `${(pl.competenciasEspecificas || []).length} competencias y ${(pl.criterios || []).length} criterios`
          + `${pl.asignatura.ciclo ? ' (' + Utils.esc(pl.asignatura.ciclo) + ')' : ''}.`
        : 'No hay currículo oficial para esa combinación.';
    }
    // Nombre visible de la asignatura que se va a crear: «área + curso», o
    // «variante + curso» en las áreas que se desdoblan.
    function nombreElegido() {
      const base = (selVariante && selVariante.value) ? selVariante.value : selArea.value;
      return selCurso.value ? `${base} ${selCurso.value}` : base;
    }
    function pintaVariante() {
      const variantes = VARIANTES[selArea.value] || [];
      campoVariante.style.display = variantes.length ? '' : 'none';
      selVariante.innerHTML = variantes.map(v => `<option>${Utils.esc(v)}</option>`).join('');
    }
    function pintaCursos() {
      selCurso.innerHTML = cursosDeArea(selArea.value).map(c => `<option>${Utils.esc(c)}</option>`).join('');
      pintaResumen();
    }
    function pintaModo() {
      const oficial = !selModo || selModo.value === 'oficial';
      bloqueOficial.style.display = oficial ? '' : 'none';
      bloqueBlanco.style.display = oficial ? 'none' : '';
    }
    function alCambiarArea() {
      pintaVariante();
      pintaCursos();
    }
    if (selArea) selArea.onchange = alCambiarArea;
    if (selVariante) selVariante.onchange = pintaResumen;
    if (selCurso) selCurso.onchange = pintaResumen;
    if (recuperar) {
      bloqueBlanco.style.display = 'none';
      const area = areas.find(a => (recuperar.area || recuperar.nombre).toLowerCase().indexOf(a.toLowerCase()) === 0);
      if (area) selArea.value = area;
      pintaVariante();
      pintaCursos();
      if (recuperar.curso && Array.from(selCurso.options).some(o => o.value === recuperar.curso)) {
        selCurso.value = recuperar.curso;
      }
      // Si la asignatura ya lleva la etiqueta en el nombre («Inglés 3º»),
      // preselecciona su variante para no renombrarla sin querer.
      const varianteActual = selVariante && Array.from(selVariante.options)
        .find(o => new RegExp('^' + o.value + '\\b', 'i').test(String(recuperar.nombre || '')));
      if (varianteActual) selVariante.value = varianteActual.value;
      pintaResumen();
    } else if (selModo) {
      selModo.onchange = pintaModo;
      pintaModo();
      pintaVariante();
      // El desplegable de curso se rellena al elegir área, pero si el docente
      // abre el modal y va directo a Guardar sin tocar nada, quedaría vacío y
      // el alta oficial fallaría con «No hay currículo» sin motivo. Se puebla
      // ya con el área preseleccionada.
      pintaCursos();
    }
  }

  // Edición de una asignatura ya creada: nombre, nivel (curso) y etapa. Son
  // ETIQUETAS: el currículo va ligado al id de la asignatura, así que desde
  // aquí no se toca NUNCA ni el currículo ni las notas. La regla del docente:
  // «si es Lengua, es Lengua» — se corrige una errata («Legua» → «Lengua»),
  // no se cambia la sustancia.
  function modalAsignaturaEditar(a) {
    UI.openModal({
      titulo: 'Editar asignatura',
      cuerpo: `
        <datalist id="lista-cursos">${ORDEN_CURSOS.map(c => `<option value="${c}"></option>`).join('')}</datalist>
        <label class="campo"><span>Nombre</span>
          <input type="text" id="f-nombre" value="${Utils.esc(a.nombre)}" placeholder="Ej. Matemáticas 6º"></label>
        <label class="campo"><span>Nivel (curso)</span>
          <input type="text" id="f-curso" list="lista-cursos" value="${Utils.esc(a.curso || '')}" placeholder="Ej. 6º"></label>
        <label class="campo"><span>Etapa</span>
          <select id="f-etapa">
            <option ${a.etapa === 'Primaria' ? 'selected' : ''}>Primaria</option>
            <option ${a.etapa === 'Infantil' ? 'selected' : ''}>Infantil</option>
          </select></label>
        <div class="aviso">Cambiar el nombre o el nivel solo cambia cómo se <b>muestra</b> la asignatura. Su <b>currículo</b> y sus <b>notas</b> no se tocan.</div>`,
      alGuardar(body) {
        const guardada = Storage.guardarAsignatura({
          nombre: body.querySelector('#f-nombre').value,
          curso: body.querySelector('#f-curso').value,
          etapa: body.querySelector('#f-etapa').value
        }, a.id);
        if (!guardada) { alert('Escribe un nombre para la asignatura.'); return false; }
      }
    });
  }

  function modalClase() {
    const db = Storage.db;
    if (!db.asignaturas.length || !db.grupos.length) {
      UI.toast('Necesitas al menos una asignatura y un grupo');
      return;
    }
    UI.openModal({
      titulo: 'Nueva clase',
      cuerpo: `
        <label class="campo"><span>Asignatura</span>
          <select id="f-asig">${UI.selectHtml(db.asignaturas, null, 'id', 'nombre')}</select></label>
        <label class="campo"><span>Grupo</span>
          <select id="f-grupo">${UI.selectHtml(db.grupos, null, 'id', 'nombre')}</select></label>`,
      alGuardar(body) {
        const asignaturaId = body.querySelector('#f-asig').value;
        const grupoId = body.querySelector('#f-grupo').value;
        if (db.clases.some(c => c.asignaturaId === asignaturaId && c.grupoId === grupoId)) {
          alert('Esa clase ya existe');
          return false;
        }
        db.clases.push({ id: Utils.uid(), asignaturaId, grupoId });
        Storage.save();
      }
    });
  }

  function modalAci(clase) {
    const db = Storage.db;
    const alumnos = Calc.alumnosDeClase(clase.id);
    let mbody = null;

    const nivelesActuales = () => Array.from(document.querySelectorAll('.nivel-aci-fila')).map(f => ({
      codigo: (f.querySelector('.nv-cod') || {}).value || '',
      etiqueta: (f.querySelector('.nv-etq') || {}).value || '',
      asignaturaId: (f.querySelector('.nv-asig') || {}).value || ''
    }));

    // Curso de la clase y cursos ESTRICTAMENTE INFERIORES. Un nivel ACI apunta
    // a un currículo de OTRO curso: el alumnado con adaptación trabaja por
    // debajo del curso de referencia. La ampliación NO se modela así: «ampliar
    // no es dar más, es dar más profundo» — quien profundiza sigue evaluándose
    // con los criterios de SU curso, con evidencias más exigentes, así que no
    // necesita un nivel de currículo.
    //
    // `null` = no se filtra por curso. Pasa si el curso está vacío (asignaturas
    // hechas a mano) o no está en ORDEN_CURSOS (Infantil, otras etapas): sin un
    // orden conocido, «inferior» no significa nada y se ofrece todo el área.
    function cursosInferioresDeClase() {
      const asigClase = Calc.asignaturaDeClase(clase.id);
      const i = ORDEN_CURSOS.indexOf(String((asigClase && asigClase.curso) || '').trim());
      return i < 0 ? null : ORDEN_CURSOS.slice(0, i);
    }

    const cursoDe = a => String((a && a.curso) || '').trim();
    const indiceDeCurso = a => ORDEN_CURSOS.indexOf(cursoDe(a));

    // Currículos de la MISMA área que la clase (D-62). El área se deduce del
    // currículo de la propia clase, no del campo guardado, para que funcione
    // también con las asignaturas anteriores al campo.
    function delArea() {
      const areaClase = areaDeAsignatura(Calc.asignaturaDeClase(clase.id));
      if (!areaClase) return null; // sin área: no se puede filtrar
      return db.asignaturas.filter(a => areaDeAsignatura(a) === areaClase);
    }

    // Currículos que se ofrecen en cada nivel ACI: misma área (D-62) y curso
    // inferior al de la clase (D-65). El más cercano primero: desde 4º se ve
    // 3º, 2º y 1º, en ese orden.
    //
    // SALVAGUARDA: si el filtro deja la lista VACÍA, la ACI NO se bloquea. Pero
    // el rescate se hace DENTRO del área: si no hay cursos inferiores se
    // ofrecen todos los del área, nunca los de otra. «Prefiero una lista larga
    // que un callejón sin salida», sin romper lo que D-62 garantiza.
    function otrasDelArea() {
      const mismas = delArea();
      if (!mismas) return null;
      const inferiores = cursosInferioresDeClase();
      if (!inferiores) return mismas; // curso desconocido: no se filtra
      const deCursoInferior = mismas
        .filter(a => inferiores.includes(cursoDe(a)))
        .sort((a, b) => indiceDeCurso(b) - indiceDeCurso(a));
      return deCursoInferior.length ? deCursoInferior : mismas;
    }

    // Opciones del desplegable de currículo de un nivel ACI. El texto visible es
    // el nombre CORTO («MAT 4º») cuando el área se conoce; para las asignaturas
    // hechas a mano, sin área, se deja el nombre entero (es lo único que las
    // identifica). El `value` sigue siendo el id: solo cambia lo que se lee.
    const opcionesDe = lista => asignaturaId => '<option value="">— asignatura —</option>'
      + lista.map(a => `<option value="${Utils.esc(a.id)}"${a.id === asignaturaId ? ' selected' : ''}>${Utils.esc(nombreCortoAsignatura(a))}</option>`).join('');

    function opcionesAsignatura(asignaturaId) {
      const mismas = otrasDelArea();
      let lista = (mismas && mismas.length) ? mismas : db.asignaturas;
      // RETROCOMPATIBILIDAD: un nivel ya guardado que apunte a un currículo que
      // el filtro deja fuera (creado antes de esta regla, o de un curso que no
      // es inferior) debe seguir apareciendo seleccionado. Si no, al reabrir el
      // modal el desplegable caería a «— asignatura —» y, al guardar, ese nivel
      // se perdería sin avisar. Se añade a la lista y punto: sin migración, sin
      // botón y sin pedir permiso.
      if (asignaturaId && !lista.some(a => a.id === asignaturaId)) {
        const actual = Calc.asignatura(asignaturaId);
        if (actual) lista = lista.concat([actual]);
      }
      return opcionesDe(lista)(asignaturaId);
    }

    // Aviso en gris: la clase tiene área y curso conocidos, pero NO existe
    // ningún currículo de un curso inferior al que apuntar un nivel. Es el caso
    // normal al empezar, cuando solo se ha creado el currículo del curso de la
    // clase. Se dice cuáles faltan y se explica que, mientras tanto, el
    // desplegable ofrece todo el área (la salvaguarda).
    function avisoSinCurriculo() {
      const mismas = delArea();
      if (!mismas) return ''; // sin área no hay nada que reclamar
      const inferiores = cursosInferioresDeClase();
      if (!inferiores || !inferiores.length) return ''; // curso desconocido, o ya es 1º
      const hayInferior = mismas.some(a => inferiores.includes(cursoDe(a)));
      if (hayInferior) return ''; // hay a qué apuntar: nada que avisar
      const area = areaDeAsignatura(Calc.asignaturaDeClase(clase.id));
      return `<div class="aviso" id="aviso-curriculo-area">Faltan los currículos de <b>${Utils.esc(area)}</b> de ${Utils.esc(listaEnCastellano(inferiores))}. Genéralos en «Currículos y asignaturas» y podrás apuntar el nivel; mientras tanto se ofrecen todos los del área.</div>`;
    }

    function filaNivel(n) {
      const div = document.createElement('div');
      div.className = 'nivel-aci-fila fila-campos';
      div.innerHTML = `
        <label class="campo"><span>Código</span><input type="text" class="nv-cod" value="${Utils.esc(n.codigo || '')}" placeholder="B" style="max-width:80px"></label>
        <label class="campo"><span>Etiqueta</span><input type="text" class="nv-etq" value="${Utils.esc(n.etiqueta || '')}" placeholder="4º"></label>
        <label class="campo"><span>Currículo (asignatura)</span><select class="nv-asig">${opcionesAsignatura(n.asignaturaId)}</select></label>
        <button type="button" class="icon-btn quitar-nivel-aci">×</button>`;
      div.querySelector('.quitar-nivel-aci').onclick = () => { div.remove(); pintarAsignacion(); };
      div.querySelector('.nv-cod').addEventListener('input', pintarAsignacion);
      return div;
    }

    function pintarAsignacion() {
      const cont = mbody.querySelector('#lista-asignacion');
      const niveles = nivelesActuales().filter(x => String(x.codigo).trim());
      if (!niveles.length) {
        cont.innerHTML = '<div class="aviso">Aún no hay niveles definidos. Pulsa «Añadir nivel», escribe su <b>código</b> (p. ej. «B») y elige su currículo; entonces podrás asignar alumnado aquí.</div>';
        return;
      }
      const previos = {};
      cont.querySelectorAll('.alu-nivel').forEach(s => { previos[s.dataset.alu] = s.value; });
      cont.innerHTML = alumnos.map(a => {
        const actual = Calc.nivelNorm((a.id in previos) ? previos[a.id] : ((clase.adaptaciones || {})[a.id] || ''));
        const ops = ['<option value="">Base</option>']
          .concat(niveles.map(n => `<option value="${Utils.esc(Calc.nivelNorm(n.codigo))}" ${actual === Calc.nivelNorm(n.codigo) ? 'selected' : ''}>${Utils.esc(n.etiqueta || n.codigo)}</option>`))
          .join('');
        return `<div class="fila-campos">
          <span style="flex:1">${Utils.esc(a.apellidos)}, ${Utils.esc(a.nombre)}</span>
          <select class="alu-nivel" data-alu="${a.id}">${ops}</select></div>`;
      }).join('') || '<div class="vacio">El grupo de esta clase no tiene alumnado.</div>';
    }

    mbody = UI.openModal({
      titulo: 'Niveles ACI · ' + (Calc.asignaturaDeClase(clase.id) || {}).nombre + ' · ' + ((Calc.byId(db.grupos, clase.grupoId) || {}).nombre || ''),
      cuerpo: `
        <div class="aviso">Un <b>nivel ACI</b> agrupa al alumnado que trabaja un currículo de otro curso (p. ej. 4º o 2º). Cada nivel apunta a la asignatura que se usará para corregirlo. Los exámenes de cada nivel se crean en «Instrumentos» eligiendo el nivel y una misma <b>unidad</b>.</div>
        ${avisoSinCurriculo()}
        <label class="campo"><span>Niveles ACI</span><div id="lista-niveles-aci"></div></label>
        <button class="btn btn-mini" type="button" id="add-nivel-aci">Añadir nivel</button>
        <label class="campo" style="margin-top:14px"><span>Asignación de alumnado</span><div id="lista-asignacion"></div></label>`,
      textoGuardar: 'Guardar niveles ACI',
      alGuardar(body) {
        const niveles = nivelesActuales().map(n => ({
          codigo: String(n.codigo).trim().toUpperCase(),
          etiqueta: String(n.etiqueta).trim(),
          asignaturaId: n.asignaturaId
        })).filter(n => n.codigo);
        const codigos = niveles.map(n => n.codigo);
        if (new Set(codigos).size !== codigos.length) { alert('Hay códigos de nivel repetidos'); return false; }
        if (codigos.includes('BASE')) { alert('El código BASE está reservado para el nivel base'); return false; }
        for (const n of niveles) {
          if (!n.asignaturaId) { alert(`El nivel ${n.codigo} necesita una asignatura (currículo)`); return false; }
        }
        clase.nivelesAci = niveles;
        const adap = {};
        body.querySelectorAll('.alu-nivel').forEach(sel => {
          const v = Calc.nivelNorm(sel.value);
          if (v) adap[sel.dataset.alu] = v;
        });
        clase.adaptaciones = adap;
        Storage.save();
      }
    });

    mbody.querySelector('#add-nivel-aci').onclick = () => {
      const cont = mbody.querySelector('#lista-niveles-aci');
      cont.appendChild(filaNivel({}));
      pintarAsignacion();
      const cod = cont.querySelector('.nivel-aci-fila:last-child .nv-cod');
      if (cod) cod.focus();
    };
    (clase.nivelesAci || []).forEach(n => mbody.querySelector('#lista-niveles-aci').appendChild(filaNivel(n)));
    pintarAsignacion();
  }

  function render(el) {
    const db = Storage.db;
    const hayOficiales = areasOficiales().length > 0;
    el.innerHTML = `
      <div class="grid-2">
        <section class="card">
          <div class="card-head">
            <h2>Currículos y asignaturas</h2>
            <div class="acciones"><button class="btn btn-primario" id="add-asig">Nueva asignatura</button></div>
          </div>
          <div class="aviso" style="margin:0 0 10px">Cada fila es un <b>currículo de un área en un curso</b>: «Matemáticas 3º» y «Matemáticas 6º» son dos filas distintas. Es lo que después eligen las clases y los niveles ACI.</div>
          <ul class="lista" id="lista-asig">
            ${db.asignaturas.map(a => {
              const conCurriculo = db.criterios.some(c => c.asignaturaId === a.id);
              const det = [a.etapa, a.curso, conCurriculo ? '' : 'sin currículo'].filter(Boolean).join(' · ');
              return `
              <li data-id="${a.id}">
                <span>${Utils.esc(a.nombre)}</span><small>${Utils.esc(det)}</small>
                <button class="btn btn-mini editar-asig" data-id="${a.id}">Editar</button>
                ${conCurriculo || !hayOficiales ? '' : `<button class="btn btn-mini recuperar-asig" data-id="${a.id}" title="Cargar el currículo oficial de este curso">Recuperar</button>`}
                <button class="icon-btn borrar-asig" data-id="${a.id}" title="Eliminar">×</button>
              </li>`;
            }).join('') || '<li class="vacio">Sin asignaturas. Crea la primera.</li>'}
          </ul>
        </section>
        <section class="card">
          <div class="card-head">
            <h2>Clases <small class="sub" style="margin:0">asignatura · grupo</small></h2>
            <div class="acciones"><button class="btn btn-primario" id="add-clase">Nueva clase</button></div>
          </div>
          <table class="tabla">
            <thead><tr><th>Asignatura</th><th>Grupo</th><th>Alumnos</th><th></th></tr></thead>
            <tbody>
              ${db.clases.map(c => {
                const asig = Calc.asignatura(c.asignaturaId) || { nombre: '?' };
                const gru = Calc.byId(db.grupos, c.grupoId) || { nombre: '?' };
                const nAlu = db.alumnos.filter(a => a.grupoId === c.grupoId).length;
                const nAci = (c.nivelesAci || []).length;
                return `<tr>
                  <td>${Utils.esc(asig.nombre)}</td>
                  <td>${Utils.esc(gru.nombre)}</td>
                  <td>${nAlu}${nAci ? ` · <span class="badge info">ACI ${nAci}</span>` : ''}</td>
                  <td><div class="acciones"><button class="btn btn-mini aci-clase" data-id="${c.id}" title="Niveles ACI (adaptaciones)">ACI</button><button class="icon-btn borrar-clase" data-id="${c.id}" title="Eliminar">×</button></div></td>
                </tr>`;
              }).join('') || '<tr><td colspan="4" class="vacio">Crea una clase combinando asignatura y grupo.</td></tr>'}
            </tbody>
          </table>
        </section>
      </div>`;

    el.querySelector('#add-asig').onclick = () => modalAsignatura();
    el.querySelector('#add-clase').onclick = () => modalClase();

    el.querySelectorAll('.editar-asig').forEach(b => {
      b.onclick = e => {
        e.stopPropagation();
        try { modalAsignaturaEditar(Calc.asignatura(b.dataset.id)); }
        catch (err) { console.error(err); alert('Error al editar la asignatura: ' + err.message); }
      };
    });

    el.querySelectorAll('.recuperar-asig').forEach(b => {
      b.onclick = e => {
        e.stopPropagation();
        try { modalAsignatura(Calc.asignatura(b.dataset.id)); }
        catch (err) { console.error(err); alert('Error al recuperar el currículo: ' + err.message); }
      };
    });

    el.querySelectorAll('.aci-clase').forEach(b => {
      b.onclick = () => {
        try { modalAci(Calc.clase(b.dataset.id)); }
        catch (e) { console.error(e); alert('Error al abrir niveles ACI: ' + e.message); }
      };
    });

    el.querySelectorAll('.borrar-asig').forEach(b => {
      b.onclick = e => {
        e.stopPropagation();
        const id = b.dataset.id;
        const nCrit = db.criterios.filter(x => x.asignaturaId === id).length;
        const nClas = db.clases.filter(x => x.asignaturaId === id).length;
        if (confirm(`¿Eliminar la asignatura y TODO su currículo? (${nCrit} criterios, ${nClas} clases)`)) {
          Storage.borrarAsignatura(id);
          render(el);
        }
      };
    });

    el.querySelectorAll('.borrar-clase').forEach(b => {
      b.onclick = () => {
        const id = b.dataset.id;
        if (!confirm('¿Eliminar esta clase? Sus instrumentos y notas también se eliminarán.')) return;
        Storage.borrarClase(id);
        render(el);
      };
    });
  }

  // Orden canónico de los cursos, para que las vistas que agrupan o comparan
  // por curso usen la MISMA tabla que el filtro de los niveles ACI (D-65).
  function ordenCursos() {
    return ORDEN_CURSOS.slice();
  }

  return { render, areaDeAsignatura, abreviaturaArea, nombreCortoAsignatura, ordenCursos };
})();
