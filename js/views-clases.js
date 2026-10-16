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

  function modalAci(clase) {
    const db = Storage.db;
    const alumnos = Calc.alumnosDeClase(clase.id);
    let mbody = null;

    const nivelesActuales = () => Array.from(document.querySelectorAll('.nivel-aci-fila')).map(f => ({
      codigo: (f.querySelector('.nv-cod') || {}).value || '',
      etiqueta: (f.querySelector('.nv-etq') || {}).value || '',
      asignaturaId: (f.querySelector('.nv-asig') || {}).value || ''
    }));

    const opcionesAsig = asignaturaId => '<option value="">— asignatura —</option>'
      + UI.selectHtml(db.asignaturas, asignaturaId, 'id', 'nombre');

    function filaNivel(n) {
      const div = document.createElement('div');
      div.className = 'nivel-aci-fila fila-campos';
      div.innerHTML = `
        <label class="campo"><span>Código</span><input type="text" class="nv-cod" value="${Utils.esc(n.codigo || '')}" placeholder="B" style="max-width:80px"></label>
        <label class="campo"><span>Etiqueta</span><input type="text" class="nv-etq" value="${Utils.esc(n.etiqueta || '')}" placeholder="4º"></label>
        <label class="campo"><span>Currículo (asignatura)</span><select class="nv-asig">${opcionesAsig(n.asignaturaId)}</select></label>
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
                const nAci = (c.nivelesAci || []).length;
                return `<tr>
                  <td>${Utils.esc(asig.nombre)}</td>
                  <td>${Utils.esc(gru.nombre)}</td>
                  <td>${nAlu}${nAci ? ` · <span class="badge info">ACI ${nAci}</span>` : ''}</td>
                  <td style="white-space:nowrap"><button class="btn btn-mini aci-clase" data-id="${c.id}" title="Niveles ACI (adaptaciones)">ACI</button> <button class="icon-btn borrar-clase" data-id="${c.id}" title="Eliminar">×</button></td>
                </tr>`;
              }).join('') || '<tr><td colspan="4" class="vacio">Crea una clase combinando asignatura y grupo.</td></tr>'}
            </tbody>
          </table>
        </section>
      </div>`;

    el.querySelector('#add-asig').onclick = () => modalAsignatura();
    el.querySelector('#add-clase').onclick = () => modalClase();

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
