// tools/arnes.js — arnés mínimo compartido: carga la app real (js/*.js) en un
// contexto `vm` con DOM y localStorage simulados, sin navegador ni dependencias.
// Lo usan tools/checks.js (batería de comprobaciones) y tools/datos-prueba.js
// (generador de un curso de prueba). Devuelve siempre un objeto `app` nuevo con
// los módulos ya montados: cada llamada es una "pestaña" independiente.
'use strict';
const vm = require('vm');
const fs = require('fs');
const path = require('path');
const { crearDocumento } = require('./dom');

const raiz = path.join(__dirname, '..');

// Orden de carga = el de index.html. Si se añade un script a la app, va aquí.
const ARCHIVOS = [
  'js/utils.js',
  'js/storage.js',
  'js/plantillas.js',
  'js/calc.js',
  'js/ui.js',
  'js/views-alumnos.js',
  'js/views-clases.js',
  'js/views-curriculo.js',
  'js/views-instrumentos.js',
  'js/views-informe.js',
  'js/views-cuadricula.js',
  'js/app.js'
];

// Elemento falso para el arnés sin navegador. `over` permite sustituir algún
// método (p. ej. querySelectorAll para devolver chips con los que interactuar).
function makeEl(over) {
  const el = {
    _html: '',
    classList: { add() {}, remove() {}, toggle() {} },
    addEventListener() {},
    appendChild() {},
    remove() {},
    querySelector() { return makeEl(); },
    querySelectorAll() { return []; },
    set innerHTML(v) { this._html = v; },
    get innerHTML() { return this._html; }
  };
  return Object.assign(el, over || {});
}

// Carga la app en un contexto `vm`. Por defecto usa el DOM mínimo de siempre
// (`makeEl`), suficiente para las funciones que devuelven HTML. Con
// `{ dom: true }` monta el DOM de tools/dom.js: los modales reales se pueden
// abrir, rellenar y guardar, y los `alert` quedan capturados en `app.alertas`.
function cargarApp(opciones) {
  const conDom = !!(opciones && opciones.dom);
  const s = {};
  s.global = s;
  s.window = s;
  s.console = console;
  s.setTimeout = fn => { try { fn(); } catch (e) { /* noop */ } };
  s.clearTimeout = () => {};
  const store = {};
  s.localStorage = {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; }
  };
  if (conDom) {
    // Los contenedores fijos de index.html: sin ellos, el `App.refrescar()` que
    // dispara un guardado se cae (y no por un fallo de la app).
    s.document = crearDocumento({ ids: [
      'nav', 'app', 'estado-guardado', 'btn-guardar', 'btn-exportar', 'btn-importar',
      'input-importar', 'informe-impresion', 'modal-root', 'toast-root'
    ] });
    s.__alertas = [];
    s.alert = m => s.__alertas.push(String(m));
    s.confirm = () => true;
    s.scrollTo = () => {};
    s.history = { replaceState() {} };
  } else {
    s.document = {
      getElementById: () => makeEl(),
      createElement: () => makeEl(),
      addEventListener() {},
      querySelector: () => makeEl(),
      body: makeEl()
    };
  }
  // La UI real es la de js/ui.js: su `const UI` tapa esta propiedad del global.
  // Se deja solo como red si algún día se cargara la app sin ui.js.
  s.UI = {
    toast() {}, closeModal() {},
    openModal: () => makeEl(),
    selectHtml() { return ''; },
    valoresChips() { return []; },
    wireChips() {},
    chipsCriterios() { return ''; }
  };
  s.FileReader = function () {
    this.readAsText = f => {
      this.result = f._text;
      if (this.onload) this.onload();
    };
  };
  vm.createContext(s);
  let code = ARCHIVOS.map(f => fs.readFileSync(path.join(raiz, f), 'utf8')).join('\n')
    + '\nthis.__app = { Utils, Storage, Calc, PLANTILLAS_CURRICULO, CurriculoView, InstrumentosView, CuadriculaView, ClasesView, InformeView, App };';
  if (conDom) code += '\nthis.__dom = { document, alertas: this.__alertas };';
  vm.runInContext(code, s, { filename: 'app.bundle.js' });
  const app = s.__app;
  if (conDom) {
    app.document = s.__dom.document;
    app.alertas = s.__dom.alertas;
  }
  return app;
}

module.exports = { raiz, ARCHIVOS, makeEl, cargarApp };
