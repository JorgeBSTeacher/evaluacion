// tools/arnes.js — arnés mínimo compartido: carga la app real (js/*.js) en un
// contexto `vm` con DOM y localStorage simulados, sin navegador ni dependencias.
// Lo usan tools/checks.js (batería de comprobaciones) y tools/datos-prueba.js
// (generador de un curso de prueba). Devuelve siempre un objeto `app` nuevo con
// los módulos ya montados: cada llamada es una "pestaña" independiente.
'use strict';
const vm = require('vm');
const fs = require('fs');
const path = require('path');

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

function cargarApp() {
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
  s.document = {
    getElementById: () => makeEl(),
    createElement: () => makeEl(),
    addEventListener() {},
    querySelector: () => makeEl(),
    body: makeEl()
  };
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
  const code = ARCHIVOS.map(f => fs.readFileSync(path.join(raiz, f), 'utf8')).join('\n')
    + '\nthis.__app = { Utils, Storage, Calc, PLANTILLAS_CURRICULO, CurriculoView, InstrumentosView, CuadriculaView, ClasesView, InformeView, App };';
  vm.runInContext(code, s, { filename: 'app.bundle.js' });
  return s.__app;
}

module.exports = { raiz, ARCHIVOS, makeEl, cargarApp };
