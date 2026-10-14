// tools/checks.js — comprobaciones automaticas de EvalCrit (Node, sin frameworks).
// Carga la app real (js/*.js) en un sandbox con DOM/localStorage simulados y
// verifica importador de curriculo, retrocompatibilidad de backups y motor ACI.
// Uso: node tools/checks.js
'use strict';
const vm = require('vm');
const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
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
  'js/views-cuadricula.js'
];

let total = 0;
let fallos = 0;
function check(nombre, cond, detalle) {
  total++;
  if (cond) console.log('  ok   ' + nombre);
  else { fallos++; console.log('  FAIL ' + nombre + (detalle ? '  → ' + detalle : '')); }
}

function makeEl() {
  return {
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
    + '\nthis.__app = { Utils, Storage, Calc, PLANTILLAS_CURRICULO, CurriculoView, InstrumentosView, CuadriculaView, ClasesView };';
  vm.runInContext(code, s, { filename: 'app.bundle.js' });
  return s.__app;
}

function estadoLegacy() {
  return {
    schemaVersion: 1,
    cursoEscolar: '2025/2026',
    grupos: [{ id: 'g1', nombre: '6ºA', etapa: 'Primaria' }],
    alumnos: [
      { id: 'a1', nombre: 'Ana', apellidos: 'Uno', grupoId: 'g1' },
      { id: 'a2', nombre: 'Beto', apellidos: 'Dos', grupoId: 'g1' }
    ],
    asignaturas: [{ id: 's1', nombre: 'Matemáticas 6º', etapa: 'Primaria' }],
    clases: [{ id: 'c1', asignaturaId: 's1', grupoId: 'g1' }],
    competenciasEspecificas: [{ id: 'e1', asignaturaId: 's1', codigo: 'CE1', descripcion: 'x' }],
    criterios: [
      { id: 'k1', asignaturaId: 's1', codigo: 'C1', descripcion: 'c1', peso: 60, espIds: ['e1'] },
      { id: 'k2', asignaturaId: 's1', codigo: 'C2', descripcion: 'c2', peso: 40, espIds: ['e1'] }
    ],
    instrumentos: [{
      id: 'i1', claseId: 'c1', tipo: 'Control', titulo: 'Control 1', fecha: '2026-01-10', periodo: 'T1', saberes: '',
      apartados: [
        { id: 'p1', orden: 1, descripcion: 'a', maxPts: 10, criterioIds: ['k1'] },
        { id: 'p2', orden: 2, descripcion: 'b', maxPts: 10, criterioIds: ['k2'] }
      ]
    }],
    registros: { i1: { a1: { p1: 8, p2: 6 }, a2: { p1: 5, p2: 4 } } }
  };
}

const importarJson = (app, obj) => app.Storage.importar({ _text: JSON.stringify(obj) });

function estadoAci() {
  return {
    schemaVersion: 1,
    cursoEscolar: '2025/2026',
    grupos: [{ id: 'g1', nombre: '6ºA', etapa: 'Primaria' }],
    alumnos: [
      { id: 'a1', nombre: 'Ana', apellidos: 'Base', grupoId: 'g1' },
      { id: 'a2', nombre: 'Beto', apellidos: 'Base', grupoId: 'g1' },
      { id: 'c1al', nombre: 'Carla', apellidos: 'Aci', grupoId: 'g1' },
      { id: 'c2al', nombre: 'Dani', apellidos: 'Aci', grupoId: 'g1' }
    ],
    asignaturas: [
      { id: 's1', nombre: 'Matemáticas 6º', etapa: 'Primaria' },
      { id: 's2', nombre: 'Matemáticas 4º', etapa: 'Primaria' }
    ],
    clases: [{
      id: 'c1', asignaturaId: 's1', grupoId: 'g1',
      nivelesAci: [{ codigo: '4', etiqueta: '4º', asignaturaId: 's2' }],
      adaptaciones: { c1al: '4', c2al: '4' }
    }],
    competenciasEspecificas: [],
    criterios: [
      { id: 'k1', asignaturaId: 's1', codigo: 'C1', descripcion: 'c1', peso: 60, espIds: [], claveIds: [] },
      { id: 'k2', asignaturaId: 's1', codigo: 'C2', descripcion: 'c2', peso: 40, espIds: [], claveIds: [] },
      { id: 'm1', asignaturaId: 's2', codigo: 'A1', descripcion: 'a1', peso: 100, espIds: [], claveIds: [] }
    ],
    instrumentos: [
      { id: 'iBase', claseId: 'c1', tipo: 'Control', titulo: 'Control A (base)', fecha: '2026-01-10', periodo: 'T1', nivel: 'BASE', unidad: 'UD1',
        apartados: [{ id: 'p1', orden: 1, descripcion: 'a', maxPts: 10, criterioIds: ['k1'] }] },
      { id: 'iAci', claseId: 'c1', tipo: 'Control', titulo: 'Control 4º', fecha: '2026-01-10', periodo: 'T1', nivel: '4', unidad: 'UD1',
        apartados: [{ id: 'q1', orden: 1, descripcion: 'b', maxPts: 10, criterioIds: ['m1'] }] },
      { id: 'iComun', claseId: 'c1', tipo: 'Prueba', titulo: 'Prueba común', fecha: '2026-02-01', periodo: 'T1', nivel: '', unidad: 'UD2',
        apartados: [
          { id: 'r1', orden: 1, descripcion: 'c', maxPts: 10, criterioIds: ['k1'] },
          { id: 'r2', orden: 2, descripcion: 'd', maxPts: 10, criterioIds: ['m1'] }
        ] }
    ],
    registros: {
      iBase: { a1: { p1: 8 }, a2: { p1: 5 }, c1al: { p1: 9 } },
      iAci: { c1al: { q1: 7 }, c2al: { q1: 6 }, a1: { q1: 10 } },
      iComun: { a1: { r1: 6 }, c1al: { r2: 8 } }
    }
  };
}

async function main() {
  console.log('\n== Carga y estado por defecto ==');
  {
    const app = cargarApp();
    const db = app.Storage.load();
    check('estado nuevo trae las 8 competencias clave', db.competenciasClave.length === 8);
    check('estado nuevo vacío', app.Storage.vacio());
  }

  console.log('\n== Retrocompatibilidad de backups ==');
  {
    const app = cargarApp();
    app.Storage.load();
    const legacy = estadoLegacy();
    delete legacy.competenciasClave;
    await importarJson(app, legacy);
    const db = app.Storage.db;
    check('backup antiguo importado (sin competenciasClave)', db.competenciasClave.length === 8);
    check('criterios antiguos ganan claveIds vacío', Array.isArray(db.criterios[0].claveIds) && db.criterios[0].claveIds.length === 0);
    check('instrumentos antiguos ganan nivel/unidad', db.instrumentos[0].nivel === '' && db.instrumentos[0].unidad === '');
    check('clases antiguas ganan nivelesAci/adaptaciones', Array.isArray(db.clases[0].nivelesAci) && typeof db.clases[0].adaptaciones === 'object');
    check('nota legacy a1 T1 = 7,2', app.Utils.fmt(app.Calc.notaEvaluacion('c1', 'a1', 'T1')) === '7,2', app.Utils.fmt(app.Calc.notaEvaluacion('c1', 'a1', 'T1')));
    check('nota legacy a2 T1 = 4,6', app.Utils.fmt(app.Calc.notaEvaluacion('c1', 'a2', 'T1')) === '4,6', app.Utils.fmt(app.Calc.notaEvaluacion('c1', 'a2', 'T1')));
  }

  console.log('\n== Motor ACI (adaptación curricular por niveles) ==');
  {
    const app = cargarApp();
    app.Storage.load();
    await importarJson(app, estadoAci());
    const C = app.Calc;
    check('la clase expone 1 nivel ACI', C.nivelesAciDeClase('c1').length === 1);
    check('etiqueta del nivel 4', C.etiquetaNivel('c1', '4') === '4º');
    check('alumno base sin adaptación', C.nivelDeAlumno('c1', 'a1') === '');
    check('alumno ACI = nivel 4', C.nivelDeAlumno('c1', 'c1al') === '4');
    check('asignatura base = s1', C.asignaturaDeNivel('c1', '').id === 's1');
    check('asignatura del nivel 4 = s2', C.asignaturaDeAlumno('c1', 'c1al').id === 's2');
    check('criterios base = C1,C2', C.criteriosDeAlumno('c1', 'a1').map(c => c.codigo).join(',') === 'C1,C2');
    check('criterios ACI = A1', C.criteriosDeAlumno('c1', 'c1al').map(c => c.codigo).join(',') === 'A1');
    check('iBase solo para base', C.alumnosDeInstrumento(C.instrumento('iBase')).map(a => a.id).join(',') === 'a1,a2');
    check('iAci solo para ACI', C.alumnosDeInstrumento(C.instrumento('iAci')).map(a => a.id).join(',') === 'c1al,c2al');
    check('iComun para todos', C.alumnosDeInstrumento(C.instrumento('iComun')).length === 4);
    check('logro k1 base = 0,7', Math.abs(C.logroCriterio('k1', 'c1', 'a1', 'T1') - 0.7) < 1e-9, String(C.logroCriterio('k1', 'c1', 'a1', 'T1')));
    check('logro m1 ACI = 0,75', Math.abs(C.logroCriterio('m1', 'c1', 'c1al', 'T1') - 0.75) < 1e-9, String(C.logroCriterio('m1', 'c1', 'c1al', 'T1')));
    check('nota base a1 T1 = 7,0', app.Utils.fmt(C.notaEvaluacion('c1', 'a1', 'T1')) === '7,0', app.Utils.fmt(C.notaEvaluacion('c1', 'a1', 'T1')));
    check('nota ACI c1al T1 = 7,5', app.Utils.fmt(C.notaEvaluacion('c1', 'c1al', 'T1')) === '7,5', app.Utils.fmt(C.notaEvaluacion('c1', 'c1al', 'T1')));
    check('instrumentos del alumno base excluyen iAci', C.instrumentosDeAlumno('c1', 'a1', 'T1').map(i => i.id).join(',') === 'iBase,iComun');
    check('instrumentos del alumno ACI excluyen iBase', C.instrumentosDeAlumno('c1', 'c1al', 'T1').map(i => i.id).join(',') === 'iAci,iComun');
    check('unidades didácticas únicas y ordenadas', C.unidadesDe(app.Storage.db.instrumentos).join(',') === 'UD1,UD2', C.unidadesDe(app.Storage.db.instrumentos).join(','));
    check('unidadesDe ignora instrumentos sin unidad', C.unidadesDe([{ unidad: '' }, { unidad: 'UD9' }, {}]).join(',') === 'UD9');
  }

  console.log('\n== Vista Cuadrícula (agrupación por unidades didácticas) ==');
  {
    const app = cargarApp();
    app.Storage.load();
    await importarJson(app, estadoAci());
    const el = makeEl();
    app.CuadriculaView.render(el);
    const h = el.innerHTML;
    check('la cuadrícula ofrece el desplegable de unidades', h.includes('id="sel-ud"'));
    check('cabecera agrupada por UD1 y UD2', h.includes('ud-grupo') && h.includes('>UD1</th>') && h.includes('>UD2</th>'));
  }

  console.log('\n== Importador de currículo ==');
  {
    const app = cargarApp();
    app.Storage.load();
    const pl = app.PLANTILLAS_CURRICULO;
    check('hay plantillas embebidas', Array.isArray(pl) && pl.length >= 1, 'n=' + (pl ? pl.length : 0));
    const ids = [], nombres = [];
    for (const p of pl) {
      const r = app.Storage.importarCurriculo(p);
      ids.push(...r.ids);
      nombres.push(...r.asignaturas);
      const target = app.Storage.db.asignaturas.find(a => a.id === r.ids[0]);
      const suma = app.Storage.db.criterios.filter(c => c.asignaturaId === target.id).reduce((s, c) => s + c.peso, 0);
      check('pesos suman 100 en ' + target.nombre, Math.round(suma) === 100, 'suma=' + suma);
    }
    check('devuelve un id por asignatura creada', ids.length === nombres.length && ids.every(Boolean));
    let dup = false;
    try { app.Storage.importarCurriculo(pl[0]); } catch (e) { dup = /ya tiene curr/.test(e.message); }
    check('rechaza reimportar sobre currículo existente', dup);
    let inval = false;
    try { app.Storage.importarCurriculo({ tipo: 'otro', version: 1 }); } catch (e) { inval = true; }
    check('rechaza plantilla no válida', inval);
  }

  console.log('\n' + (fallos ? 'FALLOS: ' + fallos + '/' + total : 'TODO OK: ' + total + ' comprobaciones'));
  process.exitCode = fallos ? 1 : 0;
}

main().catch(e => { console.error(e); process.exitCode = 1; });
