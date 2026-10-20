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

  function modalAlumno(a) {
    const grupos = Storage.db.grupos;
    const grupoId = a ? a.grupoId : grupoSel;
    // El grupo solo se puede cambiar si hay más de uno; con un único grupo no
    // tiene sentido pedirlo.
    const varios = grupos.length > 1;
    UI.openModal({
      titulo: a ? 'Editar alumno' : 'Nuevo alumno en ' + nombreGrupo(),
      cuerpo: `
        <label class="campo"><span>Nombre</span><input type="text" id="f-nombre" placeholder="Nombre" value="${Utils.esc(a ? a.nombre : '')}"></label>
        <label class="campo"><span>Apellidos</span><input type="text" id="f-apellidos" placeholder="Apellidos" value="${Utils.esc(a ? a.apellidos : '')}"></label>
        ${varios ? `<label class="campo"><span>Grupo</span><select id="f-grupo">${UI.selectHtml(grupos, grupoId, 'id', 'nombre')}</select></label>` : ''}`,
      alGuardar(body) {
        const sel = body.querySelector('#f-grupo');
        const guardado = Storage.guardarAlumno({
          nombre: body.querySelector('#f-nombre').value,
          apellidos: body.querySelector('#f-apellidos').value,
          grupoId: sel ? sel.value : grupoId
        }, a ? a.id : null);
        return guardado !== null;
      }
    });
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
              <li data-id="${g.id}" class="${g.id === grupoSel ? 'activo' : ''}">
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
              <button class="btn" id="add-varios" ${grupoSel ? '' : 'disabled'}>Añadir varios</button>
              <button class="btn btn-primario" id="add-alumno" ${grupoSel ? '' : 'disabled'}>Nuevo alumno</button>
            </div>
          </div>
          <table class="tabla">
            <thead><tr><th>Apellidos</th><th>Nombre</th><th></th></tr></thead>
            <tbody>
              ${grupoSel ? alumnosDe(grupoSel).map(a => `
                <tr>
                  <td>${Utils.esc(a.apellidos)}</td>
                  <td>${Utils.esc(a.nombre)}</td>
                  <td>
                    <div class="acciones">
                      <button class="btn btn-mini editar-alumno" data-id="${a.id}">Editar</button>
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
    el.querySelectorAll('#lista-grupos li[data-id]').forEach(li => {
      li.addEventListener('click', e => {
        if (e.target.closest('.borrar-grupo') || e.target.closest('.editar-grupo')) return;
        grupoSel = li.dataset.id;
        render(el);
      });
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
