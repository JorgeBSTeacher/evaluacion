const AlumnosView = (() => {
  let grupoSel = null;

  const nombreGrupo = () => {
    const g = Calc.byId(Storage.db.grupos, grupoSel);
    return g ? g.nombre : '';
  };

  const alumnosDe = gid => Storage.db.alumnos
    .filter(a => a.grupoId === gid)
    .sort((x, y) => (x.apellidos + x.nombre).localeCompare(y.apellidos + y.nombre, 'es'));

  function modalGrupo(g) {
    UI.openModal({
      titulo: g ? 'Editar grupo' : 'Nuevo grupo',
      cuerpo: `
        <label class="campo"><span>Nombre del grupo</span>
          <input type="text" id="f-nombre" value="${Utils.esc(g ? g.nombre : '')}" placeholder="Ej. 3ºA"></label>
        <label class="campo"><span>Etapa</span>
          <select id="f-etapa">
            <option ${g && g.etapa === 'Primaria' ? 'selected' : ''}>Primaria</option>
            <option ${g && g.etapa === 'Infantil' ? 'selected' : ''}>Infantil</option>
          </select></label>`,
      alGuardar(body) {
        const guardado = Storage.guardarGrupo({
          nombre: body.querySelector('#f-nombre').value,
          etapa: body.querySelector('#f-etapa').value
        }, g ? g.id : null);
        if (!guardado) return false;
        if (!g) grupoSel = guardado.id;
      }
    });
  }

  // Ficha del alumno (fase 1): el modal de siempre ampliado con el bloque
  // «Historial» — anotaciones propias (alta con fecha, hoy por defecto, y
  // texto libre, guardadas en `alumno.notas`) y las observaciones de los
  // instrumentos donde el alumno tiene registro, SOLO LECTURA y con enlace
  // al instrumento, leídas del almacén real (`db.observaciones`) sin
  // duplicarlas. Material interno del docente: nunca en cálculos ni informes.
  function listaHistorialHtml(alumnoId) {
    const entradas = Storage.historialAlumno(alumnoId);
    if (!entradas.length) return '<li class="historial-vacio">Sin anotaciones todavía.</li>';
    const fechaLegible = f => {
      const d = new Date(f);
      return isNaN(d.getTime()) ? f : Utils.fechaLegible(d);
    };
    return entradas.map(e => `
      <li class="historial-entrada">
        <span class="badge ${e.tipo === 'ficha' ? 'na' : 'info'}">${e.tipo === 'ficha' ? 'ficha' : 'instrumento'}</span>
        <span class="historial-fecha">${Utils.esc(fechaLegible(e.fecha))}</span>
        <span class="historial-texto">${Utils.esc(e.texto)}${e.instrumentoId
          ? ` <button type="button" class="btn btn-mini nota-inst" data-inst="${Utils.esc(e.instrumentoId)}">${Utils.esc(e.instrumentoTitulo || 'instrumento')}</button>`
          : ''}</span>
      </li>`).join('');
  }

  function modalAlumno(a) {
    const grupos = Storage.db.grupos;
    const grupoId = a ? a.grupoId : grupoSel;
    // El grupo solo se puede cambiar si hay más de uno; con un único grupo no
    // tiene sentido pedirlo.
    const varios = grupos.length > 1;
    const body = UI.openModal({
      titulo: a ? 'Ficha del alumno' : 'Nuevo alumno en ' + nombreGrupo(),
      cuerpo: `
        <label class="campo"><span>Nombre</span><input type="text" id="f-nombre" placeholder="Nombre" value="${Utils.esc(a ? a.nombre : '')}"></label>
        <label class="campo"><span>Apellidos</span><input type="text" id="f-apellidos" placeholder="Apellidos" value="${Utils.esc(a ? a.apellidos : '')}"></label>
        ${varios ? `<label class="campo"><span>Grupo</span><select id="f-grupo">${UI.selectHtml(grupos, grupoId, 'id', 'nombre')}</select></label>` : ''}
        ${a ? `<div class="historial-alumno" id="historial-alumno">
          <b>Historial</b>
          <div class="historial-nueva">
            <input type="date" id="f-nota-fecha" value="${Utils.hoy()}" title="Fecha de la anotación">
            <input type="text" id="f-nota-texto" placeholder="Anotación (texto libre)">
            <button type="button" class="btn btn-mini btn-primario" id="btn-nota-add">Añadir</button>
          </div>
          <ul class="historial-lista" id="historial-lista">${listaHistorialHtml(a.id)}</ul>
          <p class="hint">Solo lectura de las observaciones de los instrumentos: se escriben desde el
            instrumento. Las anotaciones de la ficha nunca salen en informes ni cálculos.</p>
        </div>` : ''}`,
      alGuardar(body2) {
        const sel = body2.querySelector('#f-grupo');
        const guardado = Storage.guardarAlumno({
          nombre: body2.querySelector('#f-nombre').value,
          apellidos: body2.querySelector('#f-apellidos').value,
          grupoId: sel ? sel.value : grupoId
        }, a ? a.id : null);
        return guardado !== null;
      }
    });
    if (!a) return;
    // Alta de anotación: fecha (editable) + texto obligatorio. El historial
    // se repinta dentro del modal (la lista queda ordenada por fecha) y los
    // enlaces se RE-CABLEAN: los nodos nuevos del repintado no heredan el
    // onclick de los antiguos.
    const cableaEnlacesInstrumento = () => {
      body.querySelectorAll('.nota-inst').forEach(b => {
        b.onclick = () => {
          const instId = b.dataset.inst;
          if (!instId || typeof InstrumentosView === 'undefined' || !InstrumentosView.renderCorreccion) return;
          App.ir('cuadricula'); // cierra la ficha y repinta la vista
          const el = document.getElementById('app');
          if (el) InstrumentosView.renderCorreccion(el, instId, () => App.refrescar(), a.id);
        };
      });
    };
    cableaEnlacesInstrumento();
    // Enlace al instrumento: cierra la ficha y abre la corrección del
    // instrumento (donde se editan la nota y la observación), con el alumno
    // seleccionado; «Volver» regresa a la vista que estaba.
    const btnAdd = body.querySelector('#btn-nota-add');
    if (btnAdd) btnAdd.onclick = () => {
      const campoFecha = body.querySelector('#f-nota-fecha');
      const campoTexto = body.querySelector('#f-nota-texto');
      const texto = String(campoTexto.value || '').trim();
      if (!texto) { UI.toast('Escribe el texto de la anotación', 'error'); return; }
      Storage.guardarNotaAlumno(a.id, campoFecha.value, texto);
      campoTexto.value = '';
      const lista = body.querySelector('#historial-lista');
      if (lista) lista.innerHTML = listaHistorialHtml(a.id);
      cableaEnlacesInstrumento();
    };
  }

  function modalAlumnosVarios() {
    UI.openModal({
      titulo: 'Añadir varios alumnos a ' + nombreGrupo(),
      cuerpo: `
        <label class="campo"><span>Un alumno por línea</span>
          <textarea id="f-lista" rows="10" placeholder="García Pérez, José Luis&#10;Martínez Ruiz, Ana"></textarea></label>
        <div class="aviso">Escribe <b>Apellidos, Nombre</b> (con coma). Si una línea no lleva coma, se toma entera como <b>nombre</b>. Se ignoran las líneas vacías y los alumnos que ya estén en el grupo.</div>`,
      textoGuardar: 'Añadir',
      alGuardar(body) {
        const r = Storage.guardarAlumnosDesdeTexto(grupoSel, body.querySelector('#f-lista').value);
        if (!r.creados) {
          alert(r.duplicados
            ? 'No se añadió ninguno: los ' + r.duplicados + ' ya estaban en el grupo.'
            : 'No se encontró ningún alumno en la lista.');
          return false;
        }
        UI.toast((r.creados === 1 ? 'Añadido 1 alumno' : 'Añadidos ' + r.creados + ' alumnos') +
          (r.duplicados ? ' (' + r.duplicados + ' ya estaban)' : ''));
        return true;
      }
    });
  }

  // Marca neutra junto al nombre en el listado: el alumno tiene anotaciones
  // en su ficha. Sin color de alarma (material interno del docente).
  const iconoNotas = '<span class="icono-nota-alumno" title="Tiene anotaciones en su ficha">✎</span>';
  const conNotas = a => Array.isArray(a.notas) && a.notas.length ? iconoNotas : '';

  function render(el) {
    const db = Storage.db;
    el.innerHTML = `
      <div class="grid-2">
        <section class="card">
          <div class="card-head">
            <h2>Grupos</h2>
            <button class="btn btn-primario" id="add-grupo">Nuevo grupo</button>
          </div>
          <ul class="lista" id="lista-grupos">
            ${db.grupos.map(g => `
              <li data-id="${g.id}" tabindex="0" class="${g.id === grupoSel ? 'activo' : ''}">
                <span>${Utils.esc(g.nombre)}</span><small>${Utils.esc(g.etapa)}</small>
                <button class="btn btn-mini editar-grupo" data-id="${g.id}">Editar</button>
                <button class="icon-btn borrar-grupo" data-id="${g.id}" title="Eliminar grupo">×</button>
              </li>`).join('') || '<li class="vacio">Sin grupos todavía. Crea el primero.</li>'}
          </ul>
        </section>
        <section class="card">
          <div class="card-head">
            <h2>Alumnos${grupoSel ? ' · ' + Utils.esc(nombreGrupo()) : ''}</h2>
            <div class="acciones">
              <span id="slot-privacidad"></span>
              <button class="btn" id="add-varios" ${grupoSel ? '' : 'disabled'}>Añadir varios</button>
              <button class="btn btn-primario" id="add-alumno" ${grupoSel ? '' : 'disabled'}>Nuevo alumno</button>
            </div>
          </div>
          <table class="tabla">
            <thead><tr><th>Apellidos</th><th>Nombre</th><th></th></tr></thead>
            <tbody>
              ${grupoSel ? alumnosDe(grupoSel).map(a => App.esAnonimo()
                // M-12: con el modo privacidad activo la fila muestra solo las
                // iniciales (mismo formato «N. P. S.» que en la Cuadrícula, el
                // Informe y la corrección): una sola celda a lo ancho de las
                // dos columnas del nombre.
                ? `<tr>
                  <td colspan="2">${Utils.esc(App.nombreVisible(a))}${conNotas(a)}</td>
                  <td>
                    <div class="acciones">
                      <button class="btn btn-mini editar-alumno" data-id="${a.id}">Ficha</button>
                      <button class="icon-btn borrar-alumno" data-id="${a.id}" title="Eliminar">×</button>
                    </div></td>
                </tr>`
                : `<tr>
                  <td>${Utils.esc(a.apellidos)}</td>
                  <td>${Utils.esc(a.nombre)}${conNotas(a)}</td>
                  <td>
                    <div class="acciones">
                      <button class="btn btn-mini editar-alumno" data-id="${a.id}">Ficha</button>
                      <button class="icon-btn borrar-alumno" data-id="${a.id}" title="Eliminar">×</button>
                    </div></td>
                </tr>`).join('') || '<tr><td colspan="3" class="vacio">Este grupo no tiene alumnos aún.</td></tr>'
                : '<tr><td colspan="3" class="vacio">Selecciona un grupo para ver sus alumnos.</td></tr>'}
            </tbody>
          </table>
        </section>
      </div>`;

    el.querySelector('#add-grupo').onclick = () => modalGrupo(null);
    el.querySelector('#add-alumno').onclick = () => modalAlumno(null);
    el.querySelector('#add-varios').onclick = () => modalAlumnosVarios();
    // M-12: el ojo de privacidad también en el listado de alumnos de un grupo
    // (petición del docente): mismo componente (botón ojo, clic para ocultar,
    // mantener pulsado 1 s para revelar) y mismo estado global que en la
    // Cuadrícula, el Informe y la corrección. El hueco del HTML encaja el
    // botón que crea el componente.
    const slotPriv = el.querySelector('#slot-privacidad');
    if (slotPriv && typeof slotPriv.insertBefore === 'function') {
      slotPriv.parentNode.insertBefore(App.crearBotonPrivacidad(() => render(el)), slotPriv);
      slotPriv.remove();
    }
    el.querySelectorAll('#lista-grupos li[data-id]').forEach(li => {
      li.addEventListener('click', e => {
        if (e.target.closest('.borrar-grupo') || e.target.closest('.editar-grupo')) return;
        grupoSel = li.dataset.id;
        render(el);
      });
      // Fase 5 (teclado): el li es alcanzable con Tab y Enter/Espacio hacen lo
      // mismo que el clic: elegir el grupo. Si el foco está en un botón interno
      // (Editar, eliminar), ese botón gestiona su propio Enter.
      li.onkeydown = e => {
        if ((e.key !== 'Enter' && e.key !== ' ') || e.target !== li) return;
        e.preventDefault();
        grupoSel = li.dataset.id;
        render(el);
      };
    });
    el.querySelectorAll('.editar-grupo').forEach(b => {
      b.onclick = e => {
        e.stopPropagation();
        modalGrupo(Calc.byId(db.grupos, b.dataset.id));
      };
    });
    el.querySelectorAll('.editar-alumno').forEach(b => {
      b.onclick = () => modalAlumno(Calc.byId(db.alumnos, b.dataset.id));
    });
    el.querySelectorAll('.borrar-grupo').forEach(b => {
      b.onclick = e => {
        e.stopPropagation();
        const id = b.dataset.id;
        const nAlu = db.alumnos.filter(a => a.grupoId === id).length;
        const extra = nAlu ? ` También se eliminarán ${nAlu} alumno(s).` : '';
        if (confirm('¿Eliminar este grupo?' + extra)) {
          Storage.borrarGrupo(id);
          if (grupoSel === id) grupoSel = null;
          render(el);
        }
      };
    });
    el.querySelectorAll('.borrar-alumno').forEach(b => {
      b.onclick = () => {
        if (confirm('¿Eliminar este alumno y todas sus notas?')) {
          Storage.borrarAlumno(b.dataset.id);
          render(el);
        }
      };
    });
  }

  return { render };
})();
