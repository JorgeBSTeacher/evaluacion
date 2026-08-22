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
        const nombre = body.querySelector('#f-nombre').value.trim();
        if (!nombre) return false;
        if (g) { g.nombre = nombre; g.etapa = body.querySelector('#f-etapa').value; }
        else {
          const nuevo = { id: Utils.uid(), nombre, etapa: body.querySelector('#f-etapa').value };
          Storage.db.grupos.push(nuevo);
          grupoSel = nuevo.id;
        }
        Storage.save();
      }
    });
  }

  function modalAlumno() {
    UI.openModal({
      titulo: 'Nuevo alumno en ' + nombreGrupo(),
      cuerpo: `
        <label class="campo"><span>Nombre</span><input type="text" id="f-nombre" placeholder="Nombre"></label>
        <label class="campo"><span>Apellidos</span><input type="text" id="f-apellidos" placeholder="Apellidos"></label>`,
      alGuardar(body) {
        const nombre = body.querySelector('#f-nombre').value.trim();
        const apellidos = body.querySelector('#f-apellidos').value.trim();
        if (!nombre && !apellidos) return false;
        Storage.db.alumnos.push({ id: Utils.uid(), nombre, apellidos, grupoId: grupoSel });
        Storage.save();
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
                <button class="icon-btn borrar-grupo" data-id="${g.id}" title="Eliminar grupo">×</button>
              </li>`).join('') || '<li class="vacio">Sin grupos todavía. Crea el primero.</li>'}
          </ul>
        </section>
        <section class="card">
          <div class="card-head">
            <h2>Alumnos${grupoSel ? ' · ' + Utils.esc(nombreGrupo()) : ''}</h2>
            <button class="btn btn-primario" id="add-alumno" ${grupoSel ? '' : 'disabled'}>Nuevo alumno</button>
          </div>
          <table class="tabla">
            <thead><tr><th>Apellidos</th><th>Nombre</th><th></th></tr></thead>
            <tbody>
              ${grupoSel ? alumnosDe(grupoSel).map(a => `
                <tr>
                  <td>${Utils.esc(a.apellidos)}</td>
                  <td>${Utils.esc(a.nombre)}</td>
                  <td style="width:36px"><button class="icon-btn borrar-alumno" data-id="${a.id}" title="Eliminar">×</button></td>
                </tr>`).join('') || '<tr><td colspan="3" class="vacio">Este grupo no tiene alumnos aún.</td></tr>'
                : '<tr><td colspan="3" class="vacio">Selecciona un grupo para ver sus alumnos.</td></tr>'}
            </tbody>
          </table>
        </section>
      </div>`;

    el.querySelector('#add-grupo').onclick = () => modalGrupo(null);
    el.querySelector('#add-alumno').onclick = () => modalAlumno();
    el.querySelectorAll('#lista-grupos li[data-id]').forEach(li => {
      li.addEventListener('click', e => {
        if (e.target.closest('.borrar-grupo')) return;
        grupoSel = li.dataset.id;
        render(el);
      });
    });
    el.querySelectorAll('.borrar-grupo').forEach(b => {
      b.onclick = e => {
        e.stopPropagation();
        const id = b.dataset.id;
        const nAlu = db.alumnos.filter(a => a.grupoId === id).length;
        const extra = nAlu ? ` También se eliminarán ${nAlu} alumno(s).` : '';
        if (confirm('¿Eliminar este grupo?' + extra)) {
          db.alumnos = db.alumnos.filter(a => a.grupoId !== id);
          db.clases = db.clases.filter(c => c.grupoId !== id);
          db.grupos = db.grupos.filter(g => g.id !== id);
          if (grupoSel === id) grupoSel = null;
          Storage.save();
          render(el);
        }
      };
    });
    el.querySelectorAll('.borrar-alumno').forEach(b => {
      b.onclick = () => {
        if (confirm('¿Eliminar este alumno y todas sus notas?')) {
          const id = b.dataset.id;
          db.alumnos = db.alumnos.filter(a => a.id !== id);
          for (const instId of Object.keys(db.registros)) delete db.registros[instId][id];
          Storage.save();
          render(el);
        }
      };
    });
  }

  return { render };
})();
