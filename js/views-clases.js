const ClasesView = (() => {
  function modalAsignatura() {
    UI.openModal({
      titulo: 'Nueva asignatura / área',
      cuerpo: `
        <label class="campo"><span>Nombre</span>
          <input type="text" id="f-nombre" placeholder="Ej. Matemáticas"></label>
        <label class="campo"><span>Etapa</span>
          <select id="f-etapa"><option>Primaria</option><option>Infantil</option></select></label>`,
      alGuardar(body) {
        const nombre = body.querySelector('#f-nombre').value.trim();
        if (!nombre) return false;
        Storage.db.asignaturas.push({ id: Utils.uid(), nombre, etapa: body.querySelector('#f-etapa').value });
        Storage.save();
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

  function render(el) {
    const db = Storage.db;
    el.innerHTML = `
      <div class="grid-2">
        <section class="card">
          <div class="card-head">
            <h2>Asignaturas</h2>
            <button class="btn btn-primario" id="add-asig">Nueva asignatura</button>
          </div>
          <ul class="lista" id="lista-asig">
            ${db.asignaturas.map(a => `
              <li data-id="${a.id}">
                <span>${Utils.esc(a.nombre)}</span><small>${Utils.esc(a.etapa)}</small>
                <button class="icon-btn borrar-asig" data-id="${a.id}" title="Eliminar">×</button>
              </li>`).join('') || '<li class="vacio">Sin asignaturas. Crea la primera.</li>'}
          </ul>
        </section>
        <section class="card">
          <div class="card-head">
            <h2>Clases <small class="sub" style="margin:0">asignatura · grupo</small></h2>
            <button class="btn btn-primario" id="add-clase">Nueva clase</button>
          </div>
          <table class="tabla">
            <thead><tr><th>Asignatura</th><th>Grupo</th><th>Alumnos</th><th></th></tr></thead>
            <tbody>
              ${db.clases.map(c => {
                const asig = Calc.asignatura(c.asignaturaId) || { nombre: '?' };
                const gru = Calc.byId(db.grupos, c.grupoId) || { nombre: '?' };
                const nAlu = db.alumnos.filter(a => a.grupoId === c.grupoId).length;
                return `<tr>
                  <td>${Utils.esc(asig.nombre)}</td>
                  <td>${Utils.esc(gru.nombre)}</td>
                  <td>${nAlu}</td>
                  <td style="width:36px"><button class="icon-btn borrar-clase" data-id="${c.id}" title="Eliminar">×</button></td>
                </tr>`;
              }).join('') || '<tr><td colspan="4" class="vacio">Crea una clase combinando asignatura y grupo.</td></tr>'}
            </tbody>
          </table>
        </section>
      </div>`;

    el.querySelector('#add-asig').onclick = () => modalAsignatura();
    el.querySelector('#add-clase').onclick = () => modalClase();

    el.querySelectorAll('.borrar-asig').forEach(b => {
      b.onclick = e => {
        e.stopPropagation();
        const id = b.dataset.id;
        const nCrit = db.criterios.filter(x => x.asignaturaId === id).length;
        const nClas = db.clases.filter(x => x.asignaturaId === id).length;
        if (confirm(`¿Eliminar la asignatura y TODO su currículo? (${nCrit} criterios, ${nClas} clases)`)) {
          const instIds = db.instrumentos.filter(i => nClas && db.clases.some(c => c.id === i.claseId && c.asignaturaId === id)).map(i => i.id);
          instIds.forEach(i => delete db.registros[i]);
          db.instrumentos = db.instrumentos.filter(i => !instIds.includes(i.id));
          db.criterios = db.criterios.filter(x => x.asignaturaId !== id);
          db.competenciasEspecificas = db.competenciasEspecificas.filter(x => x.asignaturaId !== id);
          db.clases = db.clases.filter(x => x.asignaturaId !== id);
          db.asignaturas = db.asignaturas.filter(x => x.id !== id);
          Storage.save();
          render(el);
        }
      };
    });

    el.querySelectorAll('.borrar-clase').forEach(b => {
      b.onclick = () => {
        const id = b.dataset.id;
        if (!confirm('¿Eliminar esta clase? Sus instrumentos y notas también se eliminarán.')) return;
        delete db.registros[id];
        db.instrumentos = db.instrumentos.filter(i => i.claseId !== id);
        db.clases = db.clases.filter(c => c.id !== id);
        Storage.save();
        render(el);
      };
    });
  }

  return { render };
})();
