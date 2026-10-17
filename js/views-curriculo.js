const CurriculoView = (() => {
  let asigSel = null;

  const criteriosDe = () => Storage.db.criterios
    .filter(c => c.asignaturaId === asigSel)
    .sort((a, b) => String(a.codigo).localeCompare(String(b.codigo), 'es'));

  const espDe = () => Storage.db.competenciasEspecificas
    .filter(c => c.asignaturaId === asigSel)
    .sort((a, b) => String(a.codigo).localeCompare(String(b.codigo), 'es'));

  function modalCriterio(c) {
    const esp = espDe();
    const claves = Storage.db.competenciasClave;
    UI.openModal({
      titulo: c ? 'Editar criterio' : 'Nuevo criterio',
      cuerpo: `
        <div class="fila-campos">
          <label class="campo"><span>Código</span>
            <input type="text" id="f-cod" value="${Utils.esc(c ? c.codigo : '')}" placeholder="Ej. MAT 1.1"></label>
          <label class="campo"><span>Peso %</span>
            <input type="number" id="f-peso" min="0" max="100" step="0.5" value="${c ? c.peso : ''}" placeholder="50"></label>
        </div>
        <label class="campo"><span>Descripción del criterio</span>
          <textarea id="f-desc" rows="2" placeholder="Qué se evalúa">${Utils.esc(c ? c.descripcion : '')}</textarea></label>
        <label class="campo"><span>Competencias específicas (obligatorio al menos una)</span>
          ${esp.length ? `<div class="chips" data-campo="esp">` + esp.map(e => {
            const on = c && c.espIds.includes(e.id);
            return `<label class="chip ${on ? 'on' : ''}"><input type="checkbox" value="${e.id}" ${on ? 'checked' : ''}>${Utils.esc(e.codigo)}</label>`;
          }).join('') + '</div>' : '<div class="aviso">Crea primero una competencia específica.</div>'}
        </label>
        <label class="campo"><span>Competencias clave del perfil de salida (opcional)</span>
          <div class="chips" data-campo="clave">
            ${claves.map(k => {
              const on = c && c.claveIds.includes(k.id);
              return `<label class="chip ${on ? 'on' : ''}"><input type="checkbox" value="${k.id}" ${on ? 'checked' : ''}>${Utils.esc(k.codigo)}</label>`;
            }).join('')}
          </div></label>`,
      textoGuardar: 'Guardar criterio',
      alGuardar(body) {
        const codigo = body.querySelector('#f-cod').value.trim();
        const descripcion = body.querySelector('#f-desc').value.trim();
        const peso = parseFloat(body.querySelector('#f-peso').value);
        if (!codigo || !descripcion || isNaN(peso)) return false;
        const espIds = UI.valoresChips(body.querySelector('[data-campo=esp]'));
        if (!espIds.length) {
          alert('Asigna al menos una competencia específica');
          return false;
        }
        const claveIds = UI.valoresChips(body.querySelector('[data-campo=clave]'));
        if (c) {
          Object.assign(c, { codigo, descripcion, peso, espIds, claveIds });
        } else {
          Storage.db.criterios.push({ id: Utils.uid(), asignaturaId: asigSel, codigo, descripcion, peso, espIds, claveIds });
        }
        Storage.save();
      }
    });
    UI.wireChips(document.querySelector('.modal-body'));
  }

  function modalEsp() {
    UI.openModal({
      titulo: 'Nueva competencia específica',
      cuerpo: `
        <div class="fila-campos">
          <label class="campo"><span>Código</span><input type="text" id="f-cod" placeholder="Ej. CE1"></label>
        </div>
        <label class="campo"><span>Descripción</span>
          <textarea id="f-desc" rows="2" placeholder="Descripción de la competencia específica"></textarea></label>`,
      textoGuardar: 'Añadir',
      alGuardar(body) {
        const codigo = body.querySelector('#f-cod').value.trim();
        const descripcion = body.querySelector('#f-desc').value.trim();
        if (!codigo || !descripcion) return false;
        Storage.db.competenciasEspecificas.push({ id: Utils.uid(), asignaturaId: asigSel, codigo, descripcion });
        Storage.save();
      }
    });
  }

  function render(el) {
    const db = Storage.db;
    if (!asigSel || !Calc.asignatura(asigSel)) {
      const conCurriculo = db.asignaturas.find(a => db.criterios.some(c => c.asignaturaId === a.id));
      asigSel = (conCurriculo || db.asignaturas[0] || {}).id || null;
    }

    if (!db.asignaturas.length) {
      el.innerHTML = `<section class="card"><div class="vacio-grande">
        <strong>Aún no hay asignaturas</strong>
        Crea una asignatura en «Asignaturas y clases» y recupera su currículo oficial, o edítalo a mano.
      </div></section>`;
      return;
    }

    const sumaPesos = criteriosDe().reduce((s, c) => s + (Number(c.peso) || 0), 0);
    const asig = Calc.asignatura(asigSel) || {};
    el.innerHTML = `
      <section class="card">
        <div class="card-head">
          <h2>Currículo</h2>
          <div style="display:flex;gap:8px;align-items:center">
            <select id="sel-asig" style="max-width:280px">${UI.selectHtml(db.asignaturas, asigSel, 'id', 'nombre')}</select>
          </div>
        </div>
        <div class="aviso">
          ${asig.fuente
            ? '<b>Legislación:</b> ' + Utils.esc(asig.fuente)
            : '<b>Fuente no registrada.</b> Las plantillas oficiales de Cantabria proceden del Decreto 66/2022, de 7 de julio (BOC nº 135, 13-07-2022), Anexo II-A.'}
        </div>
        <div class="aviso ${Math.round(sumaPesos) === 100 ? '' : ''}" style="${Math.round(sumaPesos) === 100 ? 'background:#f0fdf4;border-color:#bbf7d0;color:#166534' : ''}">
          Suma de ponderaciones: <b>${Utils.fmt(sumaPesos)}%</b>${Math.round(sumaPesos) === 100 ? ' · correcta' : ' · debería sumar 100%'}
        </div>
        <div class="grid-2">
          <div>
            <div class="card-head"><h2 style="font-size:15px">Competencias específicas</h2>
              <button class="btn btn-mini btn-primario" id="add-esp">Añadir</button></div>
            <ul class="lista">
              ${espDe().map(e => `
                <li style="cursor:default">
                  <span>${Utils.esc(e.codigo)}</span>
                  <small style="flex:1;text-align:left">${Utils.esc(e.descripcion)}</small>
                </li>`).join('') || '<li class="vacio">Sin competencias específicas.</li>'}
            </ul>
          </div>
          <div>
            <div class="card-head"><h2 style="font-size:15px">Criterios y ponderaciones</h2>
              <button class="btn btn-mini btn-primario" id="add-crit">Nuevo criterio</button></div>
            <table class="tabla">
              <thead><tr><th>Código</th><th>Descripción</th><th>Peso</th><th>Comp.</th><th></th></tr></thead>
              <tbody>
                ${criteriosDe().map(c => `
                  <tr data-id="${c.id}">
                    <td><b>${Utils.esc(c.codigo)}</b></td>
                    <td>${Utils.esc(c.descripcion)}</td>
                    <td class="num">${Utils.fmt(c.peso)}%</td>
                    <td>${c.espIds.map(id => { const e = Calc.byId(db.competenciasEspecificas, id); return e ? `<span class="badge info">${Utils.esc(e.codigo)}</span>` : ''; }).join(' ')}</td>
                    <td style="white-space:nowrap">
                      <button class="btn btn-mini editar-crit">Editar</button>
                      <button class="icon-btn borrar-crit" title="Eliminar">×</button>
                    </td>
                  </tr>`).join('') || '<tr><td colspan="5" class="vacio">Sin criterios. Añade el primero para poder calificar.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      </section>`;

    el.querySelector('#sel-asig').onchange = e => { asigSel = e.target.value; render(el); };
    el.querySelector('#add-esp').onclick = () => modalEsp();
    el.querySelector('#add-crit').onclick = () => modalCriterio(null);

    el.querySelectorAll('.editar-crit').forEach(b => {
      b.onclick = () => {
        const tr = b.closest('tr');
        modalCriterio(Calc.criterio(tr.dataset.id));
      };
    });
    el.querySelectorAll('.borrar-crit').forEach(b => {
      b.onclick = () => {
        const tr = b.closest('tr');
        const c = Calc.criterio(tr.dataset.id);
        if (!confirm(`¿Eliminar el criterio ${c.codigo}?`)) return;
        db.criterios = db.criterios.filter(x => x.id !== c.id);
        for (const inst of db.instrumentos) {
          inst.apartados.forEach(ap => ap.criterioIds = ap.criterioIds.filter(x => x !== c.id));
        }
        Storage.save();
        render(el);
      };
    });
  }

  return { render };
})();
