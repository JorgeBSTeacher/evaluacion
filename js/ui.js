// Diálogo accesible: al abrir se lleva el foco dentro, Tab/Shift+Tab quedan
// atrapados en el modal (no se escapan a la página de detrás), Escape equivale a
// «Cancelar» y al cerrar el foco vuelve a quien lo abrió. Sin dependencias: el
// único estado es `elementoFocoPrevio`, para devolver el foco al disparador.
let elementoFocoPrevio = null;

// Elementos que pueden recibir foco dentro del modal, en orden de documento.
// Se evitan selectores compuestos (`:not(...)`, `*`, comas) para que la misma
// función valga en el navegador y en el DOM mínimo del arnés.
// `querySelectorAll` NO devuelve un Array: en el navegador es un `NodeList`, que
// no tiene `.filter`. Hay que convertirlo antes — el arnés sí devuelve un Array,
// así que sin el `Array.from` esto pasaba las comprobaciones y reventaba en el
// navegador con «querySelectorAll(...).filter is not a function».
function focablesEn(raiz) {
  const tags = ['a', 'button', 'input', 'select', 'textarea', 'summary'];
  const sel = tags.join(',') + ',[tabindex]';
  const lista = Array.from(raiz.querySelectorAll(sel)).filter(el => {
    if (el.getAttribute('tabindex') === '-1') return false;
    if (el.hasAttribute('disabled')) return false;
    if (el.tagName === 'INPUT' && el.getAttribute('type') === 'hidden') return false;
    return true;
  });
  return lista;
}

// Mueve el foco dentro del modal; si no hay focables (modal solo informativo),
// enfoca el propio contenedor para que Tab no salte a la página de detrás.
function enfocarModal(raiz) {
  const lista = focablesEn(raiz);
  const primeroAuto = raiz.querySelector('[autofocus]');
  const destino = primeroAuto || lista[0] || raiz.querySelector('.modal');
  if (destino && typeof destino.focus === 'function') destino.focus();
}

const UI = {
  openModal({ titulo, cuerpo, textoGuardar, alGuardar, peligro }) {
    const root = document.getElementById('modal-root');
    elementoFocoPrevio = (document.activeElement && document.activeElement.focus) ? document.activeElement : null;
    const idTitulo = 'modal-titulo';
    root.innerHTML = `
      <div class="velo">
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="${idTitulo}" tabindex="-1">
          <div class="modal-head">
            <h3 id="${idTitulo}">${Utils.esc(titulo)}</h3>
            <button class="icon-btn cerrar" title="Cerrar" aria-label="Cerrar">×</button>
          </div>
          <div class="modal-body"></div>
          <div class="modal-foot">
            ${alGuardar ? '<button class="btn cancelar">Cancelar</button><button class="btn btn-primario guardar">' + Utils.esc(textoGuardar || 'Guardar') + '</button>' : '<button class="btn cancelar">Cerrar</button>'}
          </div>
        </div>
      </div>`;
    const body = root.querySelector('.modal-body');
    body.innerHTML = cuerpo;
    const cerrar = () => { UI.closeModal(); };
    root.querySelector('.cerrar').onclick = cerrar;
    root.querySelector('.cancelar').onclick = cerrar;
    if (alGuardar) {
      const btn = root.querySelector('.guardar');
      if (peligro) btn.classList.add('btn-peligro');
      btn.onclick = () => {
        if (alGuardar(body, cerrar) !== false) {
          cerrar();
          if (typeof App !== 'undefined' && App.refrescar) App.refrescar();
        }
      };
    }
    // Trampa de foco y Escape. El listener vive en `root`, que se vacía al
    // cerrar, así que no se acumula entre modales. Escape cierra por el mismo
    // camino que «Cancelar»: nunca ejecuta `alGuardar`.
    root.onkeydown = ev => {
      if (ev.key === 'Escape') { ev.preventDefault(); cerrar(); return; }
      if (ev.key !== 'Tab') return;
      const lista = focablesEn(root);
      if (!lista.length) { ev.preventDefault(); const m = root.querySelector('.modal'); if (m) m.focus(); return; }
      const primero = lista[0];
      const ultimo = lista[lista.length - 1];
      if (ev.shiftKey && document.activeElement === primero) { ev.preventDefault(); ultimo.focus(); }
      else if (!ev.shiftKey && document.activeElement === ultimo) { ev.preventDefault(); primero.focus(); }
    };
    enfocarModal(root);
    return body;
  },

  closeModal() {
    document.getElementById('modal-root').innerHTML = '';
    document.getElementById('modal-root').onkeydown = null;
    // Devolver el foco al disparador, si sigue vivo (un repintado pudo
    // sustituirlo). `isConnected` evita enfocar un nodo huérfano.
    const previo = elementoFocoPrevio;
    elementoFocoPrevio = null;
    if (previo && typeof previo.focus === 'function' && previo.isConnected !== false) previo.focus();
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
