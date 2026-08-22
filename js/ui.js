const UI = {
  openModal({ titulo, cuerpo, textoGuardar, alGuardar, peligro }) {
    const root = document.getElementById('modal-root');
    root.innerHTML = `
      <div class="velo">
        <div class="modal">
          <div class="modal-head">
            <h3>${Utils.esc(titulo)}</h3>
            <button class="icon-btn cerrar" title="Cerrar">×</button>
          </div>
          <div class="modal-body"></div>
          <div class="modal-foot">
            ${alGuardar ? '<button class="btn cancelar">Cancelar</button><button class="btn btn-primario guardar">' + Utils.esc(textoGuardar || 'Guardar') + '</button>' : '<button class="btn cancelar">Cerrar</button>'}
          </div>
        </div>
      </div>`;
    const velo = root.querySelector('.velo');
    const body = root.querySelector('.modal-body');
    body.innerHTML = cuerpo;
    const cerrar = () => { root.innerHTML = ''; };
    root.querySelector('.cerrar').onclick = cerrar;
    root.querySelector('.cancelar').onclick = cerrar;
    if (alGuardar) {
      const btn = root.querySelector('.guardar');
      if (peligro) btn.classList.add('btn-peligro');
      btn.onclick = () => {
        if (alGuardar(body, cerrar) !== false) cerrar();
      };
    }
    return body;
  },

  closeModal() {
    document.getElementById('modal-root').innerHTML = '';
  },

  toast(msg) {
    const root = document.getElementById('toast-root');
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    root.appendChild(t);
    setTimeout(() => t.remove(), 2600);
  },

  chipsCriterios(asignaturaId, seleccionados) {
    const lista = Storage.db.criterios
      .filter(c => c.asignaturaId === asignaturaId)
      .sort((a, b) => String(a.codigo).localeCompare(String(b.codigo), 'es'));
    if (!lista.length) return '<div class="aviso">Primero crea criterios en la sección Currículo.</div>';
    return `<div class="chips" data-campo="criterios">` + lista.map(c => {
      const on = (seleccionados || []).includes(c.id);
      return `<label class="chip ${on ? 'on' : ''}"><input type="checkbox" value="${c.id}" ${on ? 'checked' : ''}>${Utils.esc(c.codigo)} · ${Utils.esc(c.descripcion)}</label>`;
    }).join('') + '</div>';
  },

  wireChips(container) {
    container.querySelectorAll('.chip input').forEach(inp => {
      inp.addEventListener('change', () => {
        inp.closest('.chip').classList.toggle('on', inp.checked);
      });
    });
  },

  valoresChips(container) {
    return Array.from(container.querySelectorAll('input:checked')).map(i => i.value);
  },

  selectHtml(lista, valorActual, campoId, campoNombre) {
    return lista.map(x =>
      `<option value="${x[campoId]}" ${x[campoId] === valorActual ? 'selected' : ''}>${Utils.esc(x[campoNombre])}</option>`
    ).join('');
  }
};
