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
  // Temporizadores fieles al navegador: `setTimeout` NO ejecuta el callback al
  // momento, solo lo agenda. Un aviso o una marca que se apagan «más tarde»
  // (toast a los 2,6 s, indicador a los 400 ms) siguen vivos al volver de la
  // función, como en el navegador real; la prueba decide cuándo avanzan con
  // `app.timers.run()` / `app.timers.runAll()`. El id es un número, como en el
  // navegador, para que `clearTimeout` (debounce) funcione de verdad.
  let idTimer = 0;
  const pendientes = new Map();
  s.setTimeout = (fn, ms) => { const id = ++idTimer; pendientes.set(id, { fn, ms: ms || 0 }); return id; };
  s.clearTimeout = id => { pendientes.delete(id); };
  const store = {};
  // `fallar` simula lo que hace el navegador cuando `localStorage` está lleno
  // (cuota) o bloqueado (algunos `file://`): `setItem` LANZA. Es la única forma
  // honesta de probar el aviso de «no se pudo guardar», que si no salta casi
  // nunca a mano. La app real no lo necesita; es una palanca de prueba.
  const almacen = {
    fallar: false,
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => {
      if (almacen.fallar) { const e = new Error('QuotaExceededError'); e.name = 'QuotaExceededError'; throw e; }
      store[k] = String(v);
    },
    removeItem: k => { delete store[k]; }
  };
  s.localStorage = almacen;
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
    + '\nthis.__app = { Utils, Storage, Calc, PLANTILLAS_CURRICULO, CurriculoView, InstrumentosView, CuadriculaView, ClasesView, InformeView, App, UI };';
  if (conDom) code += '\nthis.__dom = { document, alertas: this.__alertas };';
  vm.runInContext(code, s, { filename: 'app.bundle.js' });
  const app = s.__app;
  if (conDom) {
    app.document = s.__dom.document;
    app.alertas = s.__dom.alertas;
  }
  // Palanca de prueba: `app.localStorage.fallar = true` hace que guardar lance,
  // como un navegador con la cuota llena. Se expone siempre (no solo con DOM):
  // el fallo de guardado es independiente del DOM.
  app.localStorage = almacen;
  // Control de los temporizadores agendados por la app (toasts, debounce del
  // guardado, apagado del indicador). Cada `cargarApp` tiene los suyos: son por
  // «pestaña».
  app.timers = {
    // Avanza al primer vencimiento: ejecuta los temporizadores cuyo `ms` es el
    // más pequeño (los que «vencen antes»), no todos. Así un aviso normal (2,6 s)
    // cae antes que un error (6 s), como en el navegador. Devuelve cuántos corrió.
    run() {
      if (!pendientes.size) return 0;
      const menor = Math.min(...[...pendientes.values()].map(t => t.ms));
      const lote = [...pendientes.entries()].filter(([, t]) => t.ms === menor);
      lote.forEach(([id]) => pendientes.delete(id));
      lote.forEach(([, t]) => { try { t.fn(); } catch (e) { /* noop */ } });
      return lote.length;
    },
    runAll() {
      // Por si un callback agenda otro (p. ej. un toast nuevo): repite hasta
      // vaciar, con un tope para no colgarse ante un bucle.
      let vueltas = 0;
      while (pendientes.size && vueltas++ < 100) this.run();
    },
    pendientes: () => pendientes.size
  };
  return app;
}

module.exports = { raiz, ARCHIVOS, makeEl, cargarApp };
