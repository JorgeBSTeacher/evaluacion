// tools/dom.js — DOM mínimo para manejar los modales reales de la app desde Node,
// sin navegador y sin dependencias. No pretende ser un navegador: cubre lo que
// usan los modales (árbol de nodos, innerHTML, selectores, inputs, onclick y
// addEventListener) para que las pruebas ejerciten el MISMO código que el
// docente, incluidos los `querySelector` y los atributos `data-*` (que es donde
// se coló el fallo de v0.5.6: un `data-campo` mal escrito).
'use strict';

// Etiquetas sin cierre (el navegador nunca les pone hijos).
const VACIAS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr']);

// Etiquetas que el navegador cierra solas al abrir otra igual: sin esto,
// `<option>a<option>b` quedaría anidado y el `.value` del <select> mentiría.
const AUTOCIERRA = {
  option: ['option'],
  li: ['li'],
  tr: ['tr'],
  td: ['td', 'th'],
  th: ['td', 'th'],
  p: ['p']
};

const ENTIDADES = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", nbsp: '\u00a0' };

function decodifica(s) {
  return String(s).replace(/&(?:#(\d+)|(amp|lt|gt|quot|#39|nbsp));/g, (m, num, nom) =>
    num ? String.fromCharCode(Number(num)) : ENTIDADES[nom]);
}

function escapaTexto(s) {
  return String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

function escapaAtributo(s) {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function crearTexto(t) {
  const n = { nodeType: 3, data: String(t), parentNode: null };
  Object.defineProperty(n, 'textContent', { get() { return this.data; } });
  return n;
}

// --- Nodos -----------------------------------------------------------------

function crearNodo(tag) {
  const el = {
    nodeType: 1,
    tagName: String(tag || 'div').toUpperCase(),
    parentNode: null,
    childNodes: [],
    _attrs: Object.create(null),
    _dataset: Object.create(null),
    _oyentes: Object.create(null),
    _html: '',
    _sucio: false,
    _valor: undefined,
    _marcado: undefined,
    _elegido: undefined,
    style: {},
    onclick: null,
    onchange: null,
    oninput: null
  };

  // Mete un hijo sin marcar el árbol como modificado: así `innerHTML` recién
  // asignado se devuelve tal cual (los checks antiguos comparan ese texto).
  el._meter = n => {
    n.parentNode = el;
    el.childNodes.push(n);
    return n;
  };

  Object.defineProperty(el, 'children', {
    get() { return this.childNodes.filter(n => n.nodeType === 1); }
  });
  Object.defineProperty(el, 'firstElementChild', {
    get() { return this.children[0] || null; }
  });
  Object.defineProperty(el, 'lastElementChild', {
    get() { const c = this.children; return c[c.length - 1] || null; }
  });
  Object.defineProperty(el, 'id', {
    get() { return this._attrs.id || ''; },
    set(v) { this._attrs.id = String(v); }
  });
  Object.defineProperty(el, 'className', {
    get() { return this._attrs.class || ''; },
    set(v) { this._attrs.class = String(v); }
  });
  Object.defineProperty(el, 'dataset', { get() { return this._dataset; } });

  el.classList = {
    add(...cs) {
      const s = new Set(el.className.split(/\s+/).filter(Boolean));
      cs.forEach(c => s.add(c));
      el.className = [...s].join(' ');
    },
    remove(...cs) {
      const s = new Set(el.className.split(/\s+/).filter(Boolean));
      cs.forEach(c => s.delete(c));
      el.className = [...s].join(' ');
    },
    contains(c) { return el.className.split(/\s+/).includes(c); },
    toggle(c, fuerza) {
      const on = fuerza === undefined ? !this.contains(c) : !!fuerza;
      if (on) this.add(c); else this.remove(c);
      return on;
    }
  };

  Object.defineProperty(el, 'innerHTML', {
    get() { return this._sucio ? serializa(this) : this._html; },
    set(v) {
      // Desconecta los hijos que se van: en el navegador un nodo quitado del
      // árbol tiene `parentNode === null` (y por tanto `isConnected === false`).
      // Sin esto, el arnés diría que un nodo ya sustituido sigue vivo.
      el.childNodes.forEach(hijo => { hijo.parentNode = null; });
      this.childNodes = [];
      this._html = String(v == null ? '' : v);
      this._sucio = false;
      parsea(this._html).forEach(n => this._meter(n));
    }
  });

  Object.defineProperty(el, 'textContent', {
    get() {
      if (this.nodeType === 3) return this.data;
      return this.childNodes.map(n => n.textContent).join('');
    },
    set(v) {
      el.childNodes.forEach(hijo => { hijo.parentNode = null; });
      this.childNodes = [];
      const t = String(v == null ? '' : v);
      if (t) this._meter(crearTexto(t));
      this._html = escapaTexto(t);
      this._sucio = false;
    }
  });

  Object.defineProperty(el, 'value', {
    get() {
      if (this.tagName === 'SELECT') {
        const ops = Array.from(this.querySelectorAll('option'));
        const elegido = ops.find(o => o.selected) || ops[0];
        return elegido ? elegido.value : '';
      }
      if (this.tagName === 'OPTION') {
        return this._valor !== undefined ? this._valor
          : ('value' in this._attrs ? this._attrs.value : this.textContent.trim());
      }
      if (this._valor !== undefined) return this._valor;
      return 'value' in this._attrs ? decodifica(this._attrs.value) : '';
    },
    set(v) {
      if (this.tagName === 'SELECT') {
        this.querySelectorAll('option').forEach(o => {
          o._elegido = o.value === String(v);
        });
        return;
      }
      this._valor = String(v);
    }
  });

  Object.defineProperty(el, 'checked', {
    get() { return this._marcado !== undefined ? this._marcado : ('checked' in this._attrs); },
    set(v) { this._marcado = !!v; }
  });

  Object.defineProperty(el, 'selected', {
    get() { return this._elegido !== undefined ? this._elegido : ('selected' in this._attrs); },
    set(v) { this._elegido = !!v; }
  });

  Object.defineProperty(el, 'disabled', {
    get() { return 'disabled' in this._attrs; },
    set(v) { if (v) this._attrs.disabled = ''; else delete this._attrs.disabled; }
  });

  el.appendChild = n => { el._sucio = true; return el._meter(n); };
  el.removeChild = n => {
    const i = el.childNodes.indexOf(n);
    if (i >= 0) {
      // Como en el navegador: al desenganchar, el hijo deja de conocer a su
      // padre. Sin esto, `isConnected` seguiría diciendo que sí (la raíz se
      // alcanza subiendo por `parentNode`) y un nodo ya retirado parecería vivo.
      n.parentNode = null;
      el.childNodes.splice(i, 1);
    }
    el._sucio = true;
    return n;
  };
  el.remove = () => { if (el.parentNode) el.parentNode.removeChild(el); };
  el.insertAdjacentHTML = (pos, html) => {
    if (pos !== 'beforeend') throw new Error('dom.js: insertAdjacentHTML solo soporta beforeend');
    parsea(html).forEach(n => el.appendChild(n));
  };
  el.addEventListener = (tipo, fn) => {
    (el._oyentes[tipo] = el._oyentes[tipo] || []).push(fn);
  };
  // Solo para las pruebas: dispara lo que el navegador dispararía al teclear,
  // marcar o cambiar (los manejadores esperan un evento con `target`).
  // `extra` permite pasar campos como `key` o `shiftKey` (para Tab/Escape).
  // El evento BURBUJEA hacia los padres (como el navegador), para que un
  // manejador en el contenedor (p. ej. el trap de foco del modal) reciba el
  // keydown disparado sobre un hijo. Devuelve true si algún manejador llamó a
  // `preventDefault`.
  el._dispara = (tipo, extra) => {
    let cancelado = false;
    const ev = {
      type: tipo, target: el, currentTarget: el,
      stopPropagation() { ev._parado = true; },
      preventDefault() { cancelado = true; }
    };
    if (extra) Object.assign(ev, extra);
    let n = el;
    while (n && n.nodeType === 1 && !ev._parado) {
      ev.currentTarget = n;
      (n._oyentes[tipo] || []).forEach(fn => fn(ev));
      const propio = n['on' + tipo];
      if (typeof propio === 'function') propio(ev);
      n = n.parentNode;
    }
    return cancelado;
  };
  el.click = () => el._dispara('click');
  // `focus` registra el elemento activo en el documento para que las pruebas
  // puedan comprobar el trap de foco de los modales y el retorno del foco. El
  // documento simulado no enlaza `body.parentNode`, así que se considera
  // "conectado" todo nodo que cuelgue del cuerpo.
  const documentoDe = nodo => {
    let n = nodo;
    while (n.parentNode) n = n.parentNode;
    return n; // el <body> simulado (o el #document, si algún día se enlaza)
  };
  el.focus = () => {
    const raiz = documentoDe(el);
    const doc = raiz.nodeType === 9 ? raiz : raiz._doc;
    if (doc) doc.activeElement = el;
  };
  el.blur = () => {
    const raiz = documentoDe(el);
    const doc = raiz.nodeType === 9 ? raiz : raiz._doc;
    if (doc && doc.activeElement === el) doc.activeElement = null;
  };
  Object.defineProperty(el, 'isConnected', {
    get() {
      const raiz = documentoDe(el);
      return rootConnected(raiz);
    }
  });
  el.select = () => {};
  // No-op: el desplazamiento solo tiene sentido en un navegador real (no hay
  // layout que medir aquí). Sin esto, una vista que llame a `scrollIntoView`
  // reventaría en el arnés con un TypeError aunque el navegador sí lo soporte.
  el.scrollIntoView = () => {};
  el.setAttribute = (n, v) => {
    el._attrs[String(n).toLowerCase()] = String(v);
    if (String(n).toLowerCase() === 'value') el._valor = String(v);
  };
  el.getAttribute = n => {
    const k = String(n).toLowerCase();
    return k in el._attrs ? el._attrs[k] : null;
  };
  el.removeAttribute = n => { delete el._attrs[String(n).toLowerCase()]; };
  el.hasAttribute = n => String(n).toLowerCase() in el._attrs;
  el.closest = sel => {
    const comps = compuestos(sel);
    if (comps.length !== 1) throw new Error('dom.js: closest solo admite selectores simples: ' + sel);
    let n = el;
    while (n && n.nodeType === 1) {
      if (coincide(n, comps[0])) return n;
      n = n.parentNode;
    }
    return null;
  };
  el.querySelectorAll = sel => consulta(el, sel);
  el.querySelector = sel => consulta(el, sel)[0] || null;

  return el;
}

// --- Parser ----------------------------------------------------------------

function atributos(el, texto) {
  const re = /([^\s"'>/=]+)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s"'>]+))?/g;
  let m;
  while ((m = re.exec(texto))) {
    const nombre = m[1].toLowerCase();
    let valor = m[2] === undefined ? '' : m[2];
    if (/^["']/.test(valor)) valor = valor.slice(1, -1);
    valor = decodifica(valor);
    el._attrs[nombre] = valor;
    if (nombre.startsWith('data-')) {
      el._dataset[nombre.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = valor;
    }
    if (nombre === 'checked') el._marcado = true;
    if (nombre === 'selected') el._elegido = true;
    if (nombre === 'value') el._valor = valor;
  }
}

function parsea(html) {
  const raiz = crearNodo('#fragmento');
  const pila = [raiz];
  const arriba = () => pila[pila.length - 1];
  const texto = t => {
    if (t) arriba()._meter(crearTexto(decodifica(t)));
  };
  const s = String(html == null ? '' : html);
  let i = 0;

  while (i < s.length) {
    const lt = s.indexOf('<', i);
    if (lt < 0) { texto(s.slice(i)); break; }
    if (lt > i) texto(s.slice(i, lt));

    if (s.startsWith('<!--', lt)) {
      const fin = s.indexOf('-->', lt + 4);
      i = fin < 0 ? s.length : fin + 3;
      continue;
    }
    if (s.startsWith('<!', lt) || s.startsWith('<?', lt)) {
      const fin = s.indexOf('>', lt);
      i = fin < 0 ? s.length : fin + 1;
      continue;
    }

    const cierre = /^<\/([a-zA-Z][\w:-]*)\s*>/.exec(s.slice(lt));
    if (cierre) {
      const tag = cierre[1].toLowerCase();
      for (let k = pila.length - 1; k > 0; k--) {
        if (pila[k].tagName === tag.toUpperCase()) { pila.length = k; break; }
      }
      i = lt + cierre[0].length;
      continue;
    }

    const apertura = /^<([a-zA-Z][\w:-]*)((?:\s+[^\s"'>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'>]+))?)*)\s*\/?>/
      .exec(s.slice(lt));
    if (!apertura) { texto('<'); i = lt + 1; continue; }

    const tag = apertura[1].toLowerCase();
    const seCierra = /\/>$/.test(apertura[0]);
    const cierres = AUTOCIERRA[tag];
    if (cierres) {
      while (pila.length > 1 && cierres.includes(pila[pila.length - 1].tagName.toLowerCase())) pila.pop();
    }
    const el = crearNodo(tag);
    atributos(el, apertura[2]);
    arriba()._meter(el);
    if (!VACIAS.has(tag) && !seCierra) pila.push(el);
    i = lt + apertura[0].length;
  }

  return raiz.childNodes;
}

function serializa(n) {
  if (n.nodeType === 3) return escapaTexto(n.data);
  const tag = n.tagName.toLowerCase();
  const attrs = Object.keys(n._attrs)
    .map(k => ' ' + k + '="' + escapaAtributo(n._attrs[k]) + '"').join('');
  if (VACIAS.has(tag)) return '<' + tag + attrs + '>';
  return '<' + tag + attrs + '>' + n.childNodes.map(serializa).join('') + '</' + tag + '>';
}

// --- Selectores ------------------------------------------------------------

// Subconjunto suficiente para la app: `tag`, `.clase`, `#id`, `[attr]`,
// `[attr=valor]`, `:checked`, `:first-child`, `:last-child` y descendencia
// (`.chip input`). Nada de `>`, `+`, `,` ni comodines: si hiciera falta, que
// falle en voz alta en vez de devolver resultados a medias.
function compuestos(sel) {
  return String(sel).trim().split(/\s+/).map(parte => {
    const c = { tag: null, id: null, clases: [], attrs: [], pseudos: [] };
    const re = /([a-zA-Z][\w-]*|\*)|#([\w-]+)|\.([\w-]+)|\[\s*([\w-]+)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\]\s]+)))?\s*\]|:([\w-]+)/g;
    let m, ultimo = 0;
    while ((m = re.exec(parte))) {
      if (m.index !== ultimo) throw new Error('dom.js: selector no soportado: ' + sel);
      ultimo = m.index + m[0].length;
      if (m[1]) c.tag = m[1].toLowerCase();
      else if (m[2]) c.id = m[2];
      else if (m[3]) c.clases.push(m[3]);
      else if (m[4]) c.attrs.push([m[4].toLowerCase(),
        m[5] !== undefined ? m[5] : m[6] !== undefined ? m[6] : m[7] !== undefined ? m[7] : null]);
      else if (m[8]) c.pseudos.push(m[8]);
    }
    if (ultimo !== parte.length) throw new Error('dom.js: selector no soportado: ' + sel);
    return c;
  });
}

function hermanos(el) {
  return el.parentNode ? el.parentNode.childNodes.filter(n => n.nodeType === 1) : [el];
}

function coincide(el, c) {
  if (!el || el.nodeType !== 1) return false;
  if (c.tag && c.tag !== '*' && el.tagName.toLowerCase() !== c.tag) return false;
  if (c.id && el._attrs.id !== c.id) return false;
  if (c.clases.length) {
    const clases = (el._attrs.class || '').split(/\s+/);
    if (c.clases.some(k => !clases.includes(k))) return false;
  }
  for (const [n, v] of c.attrs) {
    if (!(n in el._attrs)) return false;
    if (v !== null && el._attrs[n] !== v) return false;
  }
  for (const p of c.pseudos) {
    if (p === 'checked') { if (el.checked !== true) return false; }
    else if (p === 'first-child') { if (hermanos(el)[0] !== el) return false; }
    else if (p === 'last-child') { const h = hermanos(el); if (h[h.length - 1] !== el) return false; }
    else throw new Error('dom.js: pseudoclase no soportada: :' + p);
  }
  return true;
}

function casa(el, comps, idx) {
  if (!coincide(el, comps[idx])) return false;
  if (idx === 0) return true;
  let p = el.parentNode;
  while (p && p.nodeType === 1) {
    if (casa(p, comps, idx - 1)) return true;
    p = p.parentNode;
  }
  return false;
}

function consulta(raiz, sel) {
  const lista = String(sel).split(',').map(s => compuestos(s));
  const fuera = [];
  (function recorre(n) {
    n.childNodes.forEach(hijo => {
      if (hijo.nodeType !== 1) return;
      if (lista.some(comps => casa(hijo, comps, comps.length - 1))) fuera.push(hijo);
      recorre(hijo);
    });
  })(raiz);
  // El navegador devuelve un `NodeList`, que tiene `forEach`, `length` e índice
  // numérico, pero NO los métodos de Array (`filter`, `map`, `find`...). Se
  // devuelve un objeto con esa misma forma para que un uso ilegal falle aquí y
  // no en el navegador: antes esto era un Array y `querySelectorAll(s).filter()`
  // pasaba las comprobaciones pero reventaba en Opera con «filter is not a
  // function», dejando el modal abierto a medias.
  const nodeList = {
    length: fuera.length,
    forEach: cb => fuera.forEach(cb),
    item: i => fuera[i] || null,
    [Symbol.iterator]: () => fuera[Symbol.iterator]()
  };
  fuera.forEach((nodo, i) => { nodeList[i] = nodo; });
  return nodeList;
}

// --- Documento -------------------------------------------------------------

// `ids` crea los contenedores que en index.html existen siempre (el modal y los
// avisos). Los demás `getElementById` buscan en el árbol, como el navegador.
function crearDocumento(opciones) {
  const cuerpo = crearNodo('body');
  const registro = Object.create(null);

  const doc = {
    nodeType: 9,
    body: cuerpo,
    documentElement: crearNodo('html'),
    activeElement: null,
    createElement: tag => crearNodo(tag),
    createTextNode: t => crearTexto(t),
    addEventListener() {},
    querySelector: sel => consulta(cuerpo, sel)[0] || null,
    querySelectorAll: sel => consulta(cuerpo, sel),
    getElementById(id) {
      if (registro[id]) return registro[id];
      return consulta(cuerpo, '#' + id)[0] || null;
    }
  };

  (opciones && opciones.ids || ['modal-root', 'toast-root']).forEach(id => {
    const el = crearNodo('div');
    el.id = id;
    cuerpo.appendChild(el);
    registro[id] = el;
  });

  // Enlace del cuerpo a su documento: lo usan `focus`/`isConnected` para saber
  // cuál es el "documento" de un nodo (en el navegador real basta con subir por
  // `parentNode` hasta nodeType 9; aquí el cuerpo no está enlazado).
  cuerpo._doc = doc;

  return doc;
}

// Un nodo está "conectado" si su raíz es el documento o el cuerpo simulado.
function rootConnected(raiz) {
  return !!raiz && (raiz.nodeType === 9 || raiz.tagName === 'BODY');
}

module.exports = { crearNodo, crearDocumento, crearTexto, parsea, serializa, consulta };
