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

// Escenario del fallo real: el control de un nivel ACI se creó copiando los
// criterios del control base (otro ciclo). Los códigos usan la numeración
// LOMLOE (MAT.TC/SC/PC) para probar el reajuste por número de criterio.
function estadoAciNumeros() {
  return {
    schemaVersion: 1,
    cursoEscolar: '2025/2026',
    grupos: [{ id: 'g1', nombre: '6ºA', etapa: 'Primaria' }],
    alumnos: [
      { id: 'a1', nombre: 'Ana', apellidos: 'Base', grupoId: 'g1' },
      { id: 'a4', nombre: 'Carla', apellidos: 'Aci', grupoId: 'g1' }
    ],
    asignaturas: [
      { id: 's1', nombre: 'Matemáticas 6º', etapa: 'Primaria' },
      { id: 's2', nombre: 'Matemáticas 4º', etapa: 'Primaria' }
    ],
    clases: [{
      id: 'c1', asignaturaId: 's1', grupoId: 'g1',
      nivelesAci: [{ codigo: 'B', etiqueta: '4º', asignaturaId: 's2' }],
      adaptaciones: { a4: 'B' }
    }],
    competenciasEspecificas: [],
    criterios: [
      { id: 'k11', asignaturaId: 's1', codigo: 'MAT.TC.1.1', descripcion: 'c11', peso: 50, espIds: [], claveIds: [] },
      { id: 'k12', asignaturaId: 's1', codigo: 'MAT.TC.2.1', descripcion: 'c12', peso: 50, espIds: [], claveIds: [] },
      { id: 'm11', asignaturaId: 's2', codigo: 'MAT.SC.1.1', descripcion: 'm11', peso: 50, espIds: [], claveIds: [] },
      { id: 'm12', asignaturaId: 's2', codigo: 'MAT.SC.2.1', descripcion: 'm12', peso: 50, espIds: [], claveIds: [] }
    ],
    instrumentos: [
      { id: 'iBase', claseId: 'c1', tipo: 'Control', titulo: 'Control base', fecha: '2026-01-10', periodo: 'T1', nivel: 'BASE', unidad: 'UD1',
        apartados: [{ id: 'p1', orden: 1, descripcion: 'a', maxPts: 10, criterioIds: ['k11'] }] },
      // El control del nivel B quedó con los criterios de 6º (k11): el fallo.
      { id: 'iMal', claseId: 'c1', tipo: 'Control', titulo: 'Control 4º', fecha: '2026-01-10', periodo: 'T1', nivel: 'B', unidad: 'UD1',
        apartados: [{ id: 'q1', orden: 1, descripcion: 'b', maxPts: 10, criterioIds: ['k11'] }] },
      // Variante global: el criterio vive en criterioIdsGlobal.
      { id: 'iMalGlobal', claseId: 'c1', tipo: 'Control', titulo: 'Control 4º global', fecha: '2026-01-10', periodo: 'T1', nivel: 'B', unidad: 'UD1',
        criteriosModo: 'global', criterioIdsGlobal: ['k12'], apartados: [{ id: 'z1', orden: 1, descripcion: 'c', maxPts: 10, criterioIds: [] }] },
      { id: 'iComun', claseId: 'c1', tipo: 'Prueba', titulo: 'Prueba común', fecha: '2026-02-01', periodo: 'T1', nivel: '', unidad: 'UD2',
        apartados: [{ id: 'r1', orden: 1, descripcion: 'd', maxPts: 10, criterioIds: ['k11'] }] }
    ],
    registros: {
      iBase: { a1: { p1: 8 } },
      iMal: { a4: { q1: 8 } },
      iMalGlobal: { a4: { z1: 6 } },
      iComun: { a1: { r1: 6 } }
    }
  };
}

// Escenario del banco de instrumentos (D-48): dos grupos con la misma
// asignatura (6ºA/6ºB) para reutilizar dentro del curso, y una clase de otro
// currículo (4º) para comprobar que un código inexistente aborta la copia.
function estadoBanco() {
  return {
    schemaVersion: 1,
    cursoEscolar: '2025/2026',
    grupos: [
      { id: 'g1', nombre: '6ºA', etapa: 'Primaria' },
      { id: 'g2', nombre: '6ºB', etapa: 'Primaria' }
    ],
    alumnos: [
      { id: 'a1', nombre: 'Ana', apellidos: 'Uno', grupoId: 'g1' },
      { id: 'a2', nombre: 'Beto', apellidos: 'Dos', grupoId: 'g2' }
    ],
    asignaturas: [
      { id: 's1', nombre: 'Matemáticas 6º', etapa: 'Primaria' },
      { id: 's2', nombre: 'Matemáticas 4º', etapa: 'Primaria' }
    ],
    clases: [
      { id: 'c1', asignaturaId: 's1', grupoId: 'g1' },
      { id: 'c2', asignaturaId: 's1', grupoId: 'g2' },
      { id: 'c4', asignaturaId: 's2', grupoId: 'g1' },
      { id: 'c3', asignaturaId: 's1', grupoId: 'g1', nivelesAci: [{ codigo: 'B', etiqueta: '4º', asignaturaId: 's2' }] }
    ],
    competenciasEspecificas: [],
    criterios: [
      { id: 'k1', asignaturaId: 's1', codigo: 'MAT.TC.1.1', descripcion: 'c1', peso: 60, espIds: [], claveIds: [] },
      { id: 'k2', asignaturaId: 's1', codigo: 'MAT.TC.2.1', descripcion: 'c2', peso: 40, espIds: [], claveIds: [] },
      { id: 'm1', asignaturaId: 's2', codigo: 'MAT.SC.1.1', descripcion: 'a1', peso: 100, espIds: [], claveIds: [] }
    ],
    instrumentos: [
      { id: 'i1', claseId: 'c1', tipo: 'Control', titulo: 'Control 1', fecha: '2026-01-10', periodo: 'T1', nivel: '', unidad: 'UD1',
        niveles: [], criteriosModo: 'desglosado', criterioIdsGlobal: [],
        apartados: [
          { id: 'p1', orden: 1, descripcion: 'a', maxPts: 10, criterioIds: ['k1'] },
          { id: 'p2', orden: 2, descripcion: 'b', maxPts: 10, criterioIds: ['k2'] }
        ] }
    ],
    registros: { i1: { a1: { p1: 8, p2: 6 } } }
  };
}

// Escenario de borrado en cascada: dos grupos, dos asignaturas (una base y otra
// que sirve de currículo ACI), clases en ambos grupos e instrumentos con notas.
// Comprueba que ninguna cascada deja instrumentos ni registros huérfanos y que
// las referencias ACI sin currículo se limpian.
function estadoCascada() {
  return {
    schemaVersion: 1,
    cursoEscolar: '2025/2026',
    grupos: [
      { id: 'g1', nombre: '6ºA', etapa: 'Primaria' },
      { id: 'g2', nombre: '6ºB', etapa: 'Primaria' }
    ],
    alumnos: [
      { id: 'a1', nombre: 'Ana', apellidos: 'Uno', grupoId: 'g1' },
      { id: 'a2', nombre: 'Beto', apellidos: 'Dos', grupoId: 'g1' },
      { id: 'a3', nombre: 'Carla', apellidos: 'Tres', grupoId: 'g2' }
    ],
    asignaturas: [
      { id: 's1', nombre: 'Matemáticas 6º', etapa: 'Primaria' },
      { id: 's2', nombre: 'Matemáticas 4º', etapa: 'Primaria' }
    ],
    clases: [
      { id: 'c1', asignaturaId: 's1', grupoId: 'g1',
        nivelesAci: [{ codigo: '4', etiqueta: '4º', asignaturaId: 's2' }], adaptaciones: { a2: '4' } },
      { id: 'c2', asignaturaId: 's1', grupoId: 'g2' },
      { id: 'c3', asignaturaId: 's2', grupoId: 'g1' },
      { id: 'c4', asignaturaId: 's2', grupoId: 'g2',
        nivelesAci: [{ codigo: '6', etiqueta: '6º', asignaturaId: 's1' }], adaptaciones: { a3: '6' } }
    ],
    competenciasEspecificas: [{ id: 'e1', asignaturaId: 's1', codigo: 'CE1', descripcion: 'x' }],
    criterios: [
      { id: 'k1', asignaturaId: 's1', codigo: 'C1', descripcion: 'c1', peso: 100, espIds: ['e1'], claveIds: [] },
      { id: 'm1', asignaturaId: 's2', codigo: 'A1', descripcion: 'a1', peso: 100, espIds: [], claveIds: [] }
    ],
    instrumentos: [
      { id: 'i1', claseId: 'c1', tipo: 'Control', titulo: 'Base 6º (c1)', fecha: '2026-01-10', periodo: 'T1', nivel: 'BASE', unidad: 'UD1',
        apartados: [{ id: 'p1', orden: 1, descripcion: 'a', maxPts: 10, criterioIds: ['k1'] }] },
      { id: 'i2', claseId: 'c2', tipo: 'Control', titulo: 'Base 6º (c2)', fecha: '2026-01-10', periodo: 'T1', nivel: '', unidad: 'UD1',
        apartados: [{ id: 'p2', orden: 1, descripcion: 'a', maxPts: 10, criterioIds: ['k1'] }] },
      { id: 'i3', claseId: 'c3', tipo: 'Control', titulo: 'ACI 4º (c3)', fecha: '2026-01-10', periodo: 'T1', nivel: '', unidad: 'UD1',
        apartados: [{ id: 'p3', orden: 1, descripcion: 'a', maxPts: 10, criterioIds: ['m1'] }] },
      { id: 'i4', claseId: 'c4', tipo: 'Control', titulo: 'ACI 6º (c4)', fecha: '2026-01-10', periodo: 'T1', nivel: '6', unidad: 'UD1',
        apartados: [{ id: 'p4', orden: 1, descripcion: 'a', maxPts: 10, criterioIds: ['k1'] }] }
    ],
    registros: {
      i1: { a1: { p1: 8 }, a2: { p1: 6 } },
      i2: { a3: { p2: 7 } },
      i3: { a1: { p3: 5 } },
      i4: { a1: { p4: 9 }, a3: { p4: 4 } }
    }
  };
}

// Escenario para la pestaña Informe (D-59): 4 alumnos con niveles distintos,
// 3 instrumentos en 2 trimestres y 2 unidades, para probar alcance, hallazgos,
// tabla 2×2 y distribución.
function estadoInforme() {
  return {
    schemaVersion: 1,
    cursoEscolar: '2025/2026',
    grupos: [{ id: 'g1', nombre: '6ºA', etapa: 'Primaria' }],
    alumnos: [
      { id: 'a1', nombre: 'Ana', apellidos: 'Alta', grupoId: 'g1' },
      { id: 'a2', nombre: 'Benito', apellidos: 'Bajo', grupoId: 'g1' },
      { id: 'a3', nombre: 'Carla', apellidos: 'Regular', grupoId: 'g1' },
      { id: 'a4', nombre: 'Diego', apellidos: 'Muybajo', grupoId: 'g1' }
    ],
    asignaturas: [{ id: 's1', nombre: 'Matemáticas 6º', etapa: 'Primaria' }],
    clases: [{ id: 'c1', asignaturaId: 's1', grupoId: 'g1', nivelesAci: [], adaptaciones: {} }],
    competenciasClave: [],
    competenciasEspecificas: [],
    criterios: [
      { id: 'k1', asignaturaId: 's1', codigo: 'MAT.TC.1.1', descripcion: 'Operaciones', peso: 50, espIds: [], claveIds: [] },
      { id: 'k2', asignaturaId: 's1', codigo: 'MAT.TC.2.1', descripcion: 'Resolución', peso: 50, espIds: [], claveIds: [] }
    ],
    instrumentos: [
      { id: 'i1', claseId: 'c1', tipo: 'Control', titulo: 'Control T1', fecha: '2025-10-15', periodo: 'T1', unidad: 'UD1', nivel: '',
        apartados: [{ id: 'p1', orden: 1, descripcion: 'Sumas', maxPts: 10, criterioIds: ['k1'] }] },
      { id: 'i2', claseId: 'c1', tipo: 'Control', titulo: 'Control T1b', fecha: '2025-11-15', periodo: 'T1', unidad: 'UD1', nivel: '',
        apartados: [{ id: 'p2', orden: 1, descripcion: 'Restas', maxPts: 10, criterioIds: ['k1', 'k2'] }] },
      { id: 'i3', claseId: 'c1', tipo: 'Prueba', titulo: 'Prueba T2', fecha: '2026-01-15', periodo: 'T2', unidad: 'UD2', nivel: '',
        apartados: [{ id: 'p3', orden: 1, descripcion: 'Problemas', maxPts: 10, criterioIds: ['k2'] }] }
    ],
    registros: {
      i1: { a1: { p1: 8 }, a2: { p1: 4 }, a3: { p1: 3 }, a4: { p1: 2 } },
      i2: { a1: { p2: 7 }, a2: { p2: 3 }, a3: { p2: 4 }, a4: { p2: 1 } },
      i3: { a1: { p3: 5 }, a2: { p3: 2 }, a3: { p3: 8 }, a4: { p3: 6 } }
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
    check('apartados antiguos ganan niveles vacío', Array.isArray(db.instrumentos[0].apartados[0].niveles));
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

    // Lo que sostiene el modal «¿Qué quieres corregir?».
    const progBase = C.progresoInstrumento(C.instrumento('iBase'));
    check('progresoInstrumento: iBase está completo (2 de 2)', progBase.hechos === 2 && progBase.total === 2 && progBase.pendientes === 0, JSON.stringify(progBase));
    const progComun = C.progresoInstrumento(C.instrumento('iComun'));
    check('progresoInstrumento: iComun tiene a los 4 sin terminar', progComun.hechos === 0 && progComun.pendientes === 4, JSON.stringify(progComun));
    check('progresoInstrumento: sin alumnado no se queda a cero', C.progresoInstrumento({ id: 'x', apartados: [] }).total === 0);
    check('progresoInstrumento: un instrumento sin apartados no cuenta como hecho', (() => {
      const p = C.progresoInstrumento({ id: 'iBase', claseId: 'c1', nivel: 'BASE', apartados: [] });
      return p.hechos === 0 && p.total === 2 && p.pendientes === 2;
    })());
    check('instrumentosPorCorregir pone lo pendiente primero', C.instrumentosPorCorregir('c1').map(i => i.id).join(',') === 'iComun,iBase,iAci', C.instrumentosPorCorregir('c1').map(i => i.id).join(','));
    check('instrumentosPorCorregir de una clase vacía', C.instrumentosPorCorregir('noexiste').length === 0);
  }

  console.log('\n== Vista Cuadrícula (pestañas, buscador y plegado por UD) ==');
  {
    const app = cargarApp();
    app.Storage.load();
    await importarJson(app, estadoAci());
    const el = makeEl();
    app.CuadriculaView.render(el);
    const h = el.innerHTML;
    check('la pestaña se llama «Competencias específicas y clave»', h.includes('Competencias específicas y clave'));
    // La cuadrícula ya no filtra por desplegable ni da de alta instrumentos:
    // el plegado de las barras es el único filtro y crear se hace en «Instrumentos».
    check('la cuadrícula ya no ofrece desplegable de unidades ni crear instrumentos', !h.includes('id="sel-ud"') && !h.includes('id="add-inst"'), 'aparece sel-ud o add-inst');
    check('la cuadrícula ofrece «Corregir» lo que falta', h.includes('id="btn-corregir"'));
    check('«Corregir» indica cuántos instrumentos están sin corregir', h.includes('Corregir · 1 pendiente</button>'));
    check('la cuadrícula lleva cabecera de informe solo para imprimir', h.includes('class="solo-impresion cabecera-impresion"'));

    // El modal «¿Qué quieres corregir?» se apoya en estas filas.
    const filas = app.InstrumentosView.filasCorregirHtml(app.Calc.instrumentosPorCorregir('c1'));
    check('el listado de corrección pone lo pendiente primero', filas.indexOf('data-inst="iComun"') < filas.indexOf('data-inst="iBase"'), filas.replace(/\s+/g, ' ').slice(0, 200));
    check('el listado de corrección enseña cuánto falta', filas.includes('0/4 corregidos'));
    check('el listado de corrección marca lo que ya está completo', filas.includes('>Completo<'));
    check('cada fila lleva su progreso junto al título', filas.includes('Control A (base)') && filas.includes('Control · T1 · UD1'));

    // En «Todos los niveles» deben verse todos los alumnos y, si hay ACI, las notas
    // de los adaptados llevan «*» para distinguirlos del nivel base.

    check('cabecera agrupada por UD1 y UD2', h.includes('ud-grupo') && h.includes('>UD1<small>') && h.includes('>UD2<small>'));
    check('las unidades se pueden plegar', h.includes('data-toggle-ud="UD1"') && h.includes('data-toggle-ud="UD2"'));
    check('las columnas de las unidades empiezan plegadas', h.includes('celda-plegada') && h.includes('ud-flecha">▸'));
    check('la barra plegada indica cuántos instrumentos tiene', h.includes('>UD1<small>(1)</small>') && h.includes('>UD2<small>(1)</small>'));

    // Regresión: al plegar una unidad sus columnas NO se borran; una celda con
    // colspan las ocupa en cada fila. Si desaparecieran, las filas quedarían
    // cortas y la nota final se iría de su columna (lo que se veía desplazado).
    const anchoFila = f => (f.match(/<(?:th|td)\b[^>]*>/g) || []).reduce((n, tag) => {
      const m = /colspan="(\d+)"/.exec(tag);
      return n + (m ? parseInt(m[1], 10) : 1);
    }, 0);
    const filasDe = (html, seccion) => ((html.match(new RegExp('<' + seccion + '>[\\s\\S]*?</' + seccion + '>')) || [''])[0]
      .match(/<tr[^>]*>[\s\S]*?<\/tr>/g) || []);
    const cuadra = html => {
      const cab = anchoFila(filasDe(html, 'thead')[0]);
      const filas = filasDe(html, 'tbody');
      return filas.length > 0 && filas.every(f => anchoFila(f) === cab);
    };
    check('todas las filas cuadran con la cabecera (la nota final no se desplaza)', cuadra(h));

    const elAb = makeEl();
    app.CuadriculaView.render(elAb, { unidadesAbiertas: ['UD1'] });
    const hAb = elAb.innerHTML;
    check('una unidad desplegada muestra sus instrumentos', hAb.includes('Control A (base)'));
    check('la unidad desplegada abre su flecha y la otra sigue cerrada', hAb.includes('ud-flecha">▾') && hAb.includes('ud-flecha">▸'));
    check('con una unidad a medias las filas siguen cuadrando', cuadra(hAb));

    const elTod = makeEl();
    app.CuadriculaView.render(elTod, { unidadesAbiertas: ['UD1', 'UD2'] });
    const hTod = elTod.innerHTML;
    check('con todo desplegado no quedan celdas de relleno', !hTod.includes('celda-plegada'));
    check('la barra desplegada cuenta en palabras', hTod.includes('instrumento</small>'));
    check('con todo desplegado las filas siguen cuadrando', cuadra(hTod));

    // Y con varias columnas dentro de una unidad plegada: una sola celda de
    // relleno debe ocupar exactamente esas columnas.
    const estAncha = estadoAci();
    estAncha.instrumentos.push({
      id: 'iExtra', claseId: 'c1', tipo: 'Control', titulo: 'Control B (base)', fecha: '2026-01-20',
      periodo: 'T1', nivel: 'BASE', unidad: 'UD1',
      apartados: [{ id: 's1p', orden: 1, descripcion: 'e', maxPts: 10, criterioIds: ['k2'] }]
    });
    const app5 = cargarApp();
    app5.Storage.load();
    await importarJson(app5, estAncha);
    const el6 = makeEl();
    app5.CuadriculaView.render(el6);
    const h6 = el6.innerHTML;
    check('la unidad plegada con 2 instrumentos ocupa sus 2 columnas con una sola celda',
      h6.includes('<th class="celda-plegada" colspan="2">') && h6.includes('<td class="celda-plegada" colspan="2">'));
    check('la nota final sigue cuadrando con columnas plegadas de varias posiciones', cuadra(h6));

    // Con un grupo grande debe aparecer el buscador de alumnado, en todas las pestañas.
    const est = estadoAci();
    for (let i = 1; i <= 6; i++) est.alumnos.push({ id: 'x' + i, nombre: 'Alumno' + i, apellidos: 'Zeta', grupoId: 'g1' });
    const app2 = cargarApp();
    app2.Storage.load();
    await importarJson(app2, est);
    const el2 = makeEl();
    app2.CuadriculaView.render(el2);
    check('con más de 6 alumnos aparece el buscador', el2.innerHTML.includes('id="busca-alumno"'));

    const el3 = makeEl();
    app2.CuadriculaView.render(el3, { tab: 'criterios' });
    const h3 = el3.innerHTML;
    check('en Criterios el buscador sigue disponible', h3.includes('id="busca-alumno"'));
    check('en Criterios no aparece «Añadir calificación»', !h3.includes('id="add-inst"'));
    check('en Criterios tampoco hay botón de «Corregir»', !h3.includes('id="btn-corregir"'));
    check('en Criterios tampoco el desplegable de unidades', !h3.includes('id="sel-ud"'));

    const el4 = makeEl();
    app2.CuadriculaView.render(el4, { tab: 'competencias' });
    check('en Competencias el buscador sigue disponible', el4.innerHTML.includes('id="busca-alumno"'));

    // «Imprimir todo»: una sección por nivel, cada una con SU currículo y sus
    // alumnos. Con currículos distintos mezclar columnas no tiene sentido.
    const inf = app2.CuadriculaView.informeHtml('c1', 'T1', 'criterios');
    const secs = inf.split('<section class="informe-seccion">').slice(1);
    check('el informe de impresión separa base y cada nivel ACI', secs.length === 2, 'secciones=' + secs.length);
    const secBase = secs[0] || '';
    const secAci = secs[1] || '';
    check('la sección base nombra su asignatura y lleva solo a los suyos',
      secBase.includes('Base (sin adaptación) · Matemáticas 6º') && secBase.includes('Base, Ana') && secBase.includes('Base, Beto') && !secBase.includes('Aci, Carla'), secBase.slice(0, 120));
    check('la sección ACI nombra su asignatura y lleva solo a los suyos',
      secAci.includes('4º · Matemáticas 4º') && secAci.includes('Aci, Carla') && secAci.includes('Aci, Dani') && !secAci.includes('Base, Ana'), secAci.slice(0, 120));
    check('cada sección muestra los criterios de su propio currículo',
      secBase.includes('>C1<') && !secBase.includes('>A1<') && secAci.includes('>A1<') && !secAci.includes('>C1<'));
    check('el informe lleva cabecera con asignatura, grupo y periodo',
      inf.includes('Cuadrícula de alumnado · Criterios') && inf.includes('Matemáticas 6º') && inf.includes('6ºA') && inf.includes('T1'));
    check('el informe también sirve para competencias',
      app2.CuadriculaView.informeHtml('c1', 'T1', 'competencias').includes('Competencias específicas y clave'));
    // El informe fija nivel/clase/periodo del módulo: al terminar debe restaurarlos
    // (si no, tras imprimir la vista quedaría en el último nivel del informe).
    app2.CuadriculaView.informeHtml('c1', 'T1', 'criterios');
    const elImp = makeEl();
    app2.CuadriculaView.render(elImp, { tab: 'criterios' });
    check('el informe no deja cambiado el nivel seleccionado en la vista',
      elImp.innerHTML.includes('<option value="" selected>'), elImp.innerHTML.slice(0, 120));

    // Trampa a evitar: con UNA sola unidad debe seguir habiendo barra, o las
    // columnas quedarían plegadas sin nada que tocar para abrirlas.
    const estUna = estadoAci();
    estUna.instrumentos.filter(i => i.claseId === 'c1').forEach(i => { i.unidad = 'UD1'; });
    const app4 = cargarApp();
    app4.Storage.load();
    await importarJson(app4, estUna);
    const el5 = makeEl();
    app4.CuadriculaView.render(el5);
    const h5 = el5.innerHTML;
    check('con una sola unidad sigue habiendo barra para desplegarla', h5.includes('data-toggle-ud="UD1"') && h5.includes('celda-plegada'));
  }

  console.log('\n== Niveles ACI: normalización de códigos (el alumnado no puede desaparecer) ==');
  {
    // Un código tecleado en minúscula o con espacios (p. ej. « 4 ») debe casar
    // con el nivel guardado. Antes, el alumnado quedaba apuntando a un nivel
    // inexistente y desaparecía de la cuadrícula y del informe.
    const estN = estadoAci();
    estN.clases[0].nivelesAci = [{ codigo: ' 4 ', etiqueta: '4º', asignaturaId: 's2' }];
    estN.clases[0].adaptaciones = { c1al: '4', c2al: '4' };
    const appN = cargarApp();
    const Cn = appN.Calc;
    check('nivelNorm recorta y sube a mayúsculas', Cn.nivelNorm(' b ') === 'B');
    check('nivelNorm unifica la base (base/BASE)', Cn.nivelNorm('BASE') === '' && Cn.nivelNorm('') === '');
    appN.Storage.load();
    await importarJson(appN, estN);
    check('al guardar, el código de nivel queda normalizado (« 4 » → «4»)', appN.Calc.nivelesAciDeClase('c1')[0].codigo === '4');
    check('la adaptación del alumnado sigue casando con su nivel', appN.Calc.nivelDeAlumno('c1', 'c1al') === '4');

    // Código huérfano (nivel borrado): el alumnado cae a base, nunca desaparece.
    const estH = estadoAci();
    estH.clases[0].adaptaciones = { c1al: 'Z', c2al: '4' };
    const appH = cargarApp();
    appH.Storage.load();
    await importarJson(appH, estH);
    check('un código huérfano cae a base (nivel efectivo)', appH.Calc.nivelDeAlumno('c1', 'c1al') === '');
    const infH = appH.CuadriculaView.informeHtml('c1', 'T1', 'criterios');
    const secsH = infH.split('<section class="informe-seccion">').slice(1);
    const filasH = secsH.reduce((n, s) => n + (s.match(/<td>[^<]*, [^<]*<\/td>/g) || []).length, 0);
    check('el informe conserva a TODO el alumnado aunque falte un nivel', filasH === 4, 'filas=' + filasH);
    check('el alumno huérfano sale en la sección base', (secsH[0] || '').includes('Aci, Carla'));

    // La migración sanea datos ya guardados (minúsculas/espacios) al importar.
    const estM = estadoAci();
    estM.clases[0].nivelesAci = [{ codigo: ' 4 ', etiqueta: '4º', asignaturaId: 's2' }];
    estM.clases[0].adaptaciones = { c1al: ' 4 ', c2al: '4' };
    estM.instrumentos.forEach(i => { if (i.nivel === '4') i.nivel = ' 4 '; });
    const appM = cargarApp();
    appM.Storage.load();
    await importarJson(appM, estM);
    check('al importar se sanean niveles y adaptaciones',
      appM.Storage.db.clases[0].nivelesAci[0].codigo === '4'
      && Object.values(appM.Storage.db.clases[0].adaptaciones).every(v => v === '4'));
    check('un instrumento con nivel saneado casa con su alumnado',
      appM.Calc.instrumentoParaAlumno(appM.Storage.db.instrumentos.find(i => i.titulo === 'Control 4º'), 'c1', 'c1al') === true);
  }

  console.log('\n== Vista Corrección (guardar y siguiente alumno) ==');
  {
    const app = cargarApp();
    app.Storage.load();
    await importarJson(app, estadoAci());
    const el = makeEl();
    app.InstrumentosView.renderCorreccion(el, 'iBase');
    const h = el.innerHTML;
    check('la corrección incluye la barra de navegación', h.includes('id="barra-nav"') && h.includes('id="nav-info"'));
    check('el botón «Guardar y siguiente» existe', h.includes('id="btn-siguiente"') && h.includes('Guardar y siguiente'));

    // Un instrumento con enlace ofrece abrirlo mientras se corrige.
    app.Storage.db.instrumentos.find(i => i.id === 'iBase').url = 'https://ejemplo.test/control';
    const el2 = makeEl();
    app.InstrumentosView.renderCorreccion(el2, 'iBase');
    check('la corrección ofrece abrir el enlace del instrumento',
      el2.innerHTML.includes('Abrir enlace') && el2.innerHTML.includes('href="https://ejemplo.test/control"'), el2.innerHTML.slice(0, 80));
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

  console.log('');
  console.log('== Alta de asignatura por curso y recuperación de currículo (D-49) ==');
  {
    const app = cargarApp();
    app.Storage.load();
    const pl = app.PLANTILLAS_CURRICULO.find(p => (p.asignatura.cursos || []).length >= 2);
    check('hay una plantilla de varios cursos', !!pl, pl ? pl.asignatura.nombre : '');
    const cursos = pl.asignatura.cursos.map(String);
    const curso = cursos[cursos.length - 1];
    const otro = ['1º', '2º', '3º', '4º', '5º', '6º'].find(c => cursos.indexOf(c) === -1) || '9º';

    const r = app.Storage.importarCurriculo(pl, { cursos: [curso] });
    check('importa solo el curso pedido',
      r.asignaturas.length === 1 && r.asignaturas[0] === pl.asignatura.nombre + ' ' + curso, r.asignaturas.join(','));
    const a = app.Storage.db.asignaturas.find(x => x.id === r.ids[0]);
    check('la asignatura recuerda su curso', a.curso === curso, String(a.curso));
    check('la asignatura recuerda la fuente legal',
      typeof a.fuente === 'string' && a.fuente.indexOf('Decreto') !== -1, a.fuente);
    check('no crea el resto de cursos del ciclo',
      !app.Storage.db.asignaturas.some(x => x.id !== a.id && x.nombre === pl.asignatura.nombre + ' ' + cursos[0]),
      app.Storage.db.asignaturas.map(x => x.nombre).join(' | '));

    let fuera = false;
    try { app.Storage.importarCurriculo(pl, { cursos: [otro] }); } catch (e) { fuera = /no cubre/.test(e.message); }
    check('rechaza un curso que la plantilla no cubre', fuera);

    app.Storage.db.asignaturas.push({ id: 'v1', nombre: pl.asignatura.nombre, etapa: pl.asignatura.etapa, curso: '', fuente: '' });
    const r2 = app.Storage.importarCurriculo(pl, { cursos: [curso], asignaturaId: 'v1' });
    check('recupera el currículo en una asignatura existente en vez de duplicarla',
      r2.ids.length === 1 && r2.ids[0] === 'v1' && app.Storage.db.criterios.filter(c => c.asignaturaId === 'v1').length > 0);
    check('la asignatura recuperada recuerda su curso',
      app.Storage.db.asignaturas.find(x => x.id === 'v1').curso === curso);
    let dup2 = false;
    try { app.Storage.importarCurriculo(pl, { cursos: [curso], asignaturaId: 'v1' }); } catch (e) { dup2 = /ya tiene curr/.test(e.message); }
    check('no rellena dos veces la misma asignatura', dup2);

    await importarJson(app, estadoAci());
    const leg = app.Storage.db.asignaturas.find(x => x.id === 's1');
    check('backup antiguo: la asignatura gana curso y fuente vacíos', leg.curso === '' && leg.fuente === '',
      'curso=' + JSON.stringify(leg.curso) + ' fuente=' + JSON.stringify(leg.fuente));
  }

  console.log('\n== Rúbrica: niveles por ítem y herencia (D-40) ==');
  {
    const app = cargarApp();
    app.Storage.load();
    const est = estadoAci();
    est.instrumentos.push({
      id: 'iRub', claseId: 'c1', tipo: 'Rúbrica', titulo: 'Rúbrica de libreta', fecha: '2026-03-02',
      periodo: 'T1', nivel: '', unidad: 'UD3', saberes: '',
      niveles: [
        { pct: 25, descriptor: 'común bajo' },
        { pct: 50, descriptor: 'común medio' },
        { pct: 75, descriptor: 'común alto' },
        { pct: 100, descriptor: 'común excelente' }
      ],
      apartados: [
        { id: 'rb1', orden: 1, descripcion: 'Ortografía', maxPts: 100, criterioIds: ['k1'], peso: 2,
          niveles: [
            { pct: 25, descriptor: 'propio bajo' },
            { pct: 50, descriptor: 'propio medio' },
            { pct: 75, descriptor: 'propio alto' },
            { pct: 100, descriptor: 'propio excelente' }
          ] },
        { id: 'rb2', orden: 2, descripcion: 'Presentación', maxPts: 100, criterioIds: ['k2'], peso: 1, niveles: [] }
      ],
      criteriosModo: 'desglosado', criterioIdsGlobal: []
    });
    est.registros.iRub = { a1: { rb1: 75, rb2: 100 }, a2: { rb1: 100 } };
    await importarJson(app, est);
    const C = app.Calc;
    const inst = C.instrumento('iRub');
    check('los niveles del ítem salen de menor a mayor', C.nivelesDeApartado(inst, inst.apartados[0]).map(n => n.pct).join(',') === '25,50,75,100');
    check('el ítem usa su descriptor propio', C.nivelesDeApartado(inst, inst.apartados[0])[0].descriptor === 'propio bajo');
    check('un ítem sin propios hereda la escala común', C.nivelesDeApartado(inst, inst.apartados[1])[0].descriptor === 'común bajo');
    check('nota de rúbrica a1 = 8,3 (media ponderada)', app.Utils.fmt(C.notaInstrumento(inst, 'a1')) === '8,3', app.Utils.fmt(C.notaInstrumento(inst, 'a1')));
    check('nota de rúbrica a2 = 10,0', app.Utils.fmt(C.notaInstrumento(inst, 'a2')) === '10,0', app.Utils.fmt(C.notaInstrumento(inst, 'a2')));

    const el = makeEl();
    app.InstrumentosView.renderCorreccion(el, 'iRub');
    const h = el.innerHTML;
    check('la corrección muestra los niveles de menor a mayor', h.includes('data-val="25"') && h.indexOf('data-val="25"') < h.indexOf('data-val="100"'));
    check('la corrección lleva la leyenda de descriptores', h.includes('leyenda-rubrica') && h.includes('propio bajo') && h.includes('común bajo'));
  }

  console.log('\n== Cuadrícula de rúbrica: cabecera y filas alineadas (D-40) ==');
  {
    const app = cargarApp();
    app.Storage.load();
    const IV = app.InstrumentosView;
    const cuenta = (html, re) => (html.match(re) || []).length;
    for (const cols of [
      [{ pct: 25, descriptor: 'a' }, { pct: 50, descriptor: 'b' }, { pct: 75, descriptor: 'c' }, { pct: 100, descriptor: 'd' }],
      [{ pct: 50, descriptor: 'x' }, { pct: 100, descriptor: 'y' }]
    ]) {
      const n = cols.length;
      const plantilla = IV.plantillaColumnas(n);
      const cab = IV.cabeceraRubrica(cols);
      const fila = IV.filaApartado({ id: 'x', descripcion: 'Ortografía', criterioIds: [], peso: 3, niveles: [] }, 's1', true, false, cols);
      const tokens = plantilla.trim().split(/\s+(?![^(]*\))/).length;
      check(`plantilla de ${n} niveles = ${n + 5} columnas`, tokens === n + 5, 'tokens=' + tokens);
      check(`la cabecera de ${n} niveles tiene ${n + 5} celdas`, cuenta(cab, /<span/g) === n + 5);
      check(`la fila de ${n} niveles tiene ${n + 5} campos`, cuenta(fila, /<(input|button|span)/g) === n + 5);
      check(`la fila crea ${n} entradas de nivel`, cuenta(fila, /class="ap-nv"/g) === n);
      check(`la cabecera y la fila usan la misma plantilla`, cab.includes(plantilla) && fila.includes(plantilla));
    }
    const filaNormal = IV.filaApartado({ id: 'x', descripcion: 'P1', criterioIds: [], maxPts: 10 }, 's1', false, false, []);
    check('un apartado normal no lleva niveles por ítem', !filaNormal.includes('ap-nv') && filaNormal.includes('ap-max'));
    const p = IV.promptIa('Matemáticas', [{ codigo: 'MAT 1.1', descripcion: 'Resuelve problemas' }]);
    check('el prompt de IA lleva huecos para personalizar', p.includes('___'));
    check('el prompt de IA incluye los códigos del currículo', p.includes('MAT 1.1 — Resuelve problemas'));
    check('el prompt de IA pide el formato JSON correcto', p.includes('"tipo": "rubrica-evalcrit"') && p.includes('"version": 1'));
  }
  {
    const app = cargarApp();
    const IV = app.InstrumentosView;
    const SC = IV.columnasNivel([]);
    check('sin ítems, columnasNivel usa la escala estándar', SC.map(n => n.pct).join(',') === '25,50,75,100');
    const SU = IV.columnasNivel([{ niveles: [{ pct: 50, descriptor: 'x' }, { pct: 100, descriptor: 'y' }] }, { niveles: [{ pct: 25, descriptor: 'z' }] }]);
    check('columnasNivel devuelve la unión de los niveles de los ítems', SU.map(n => n.pct).join(',') === '25,50,100');
  }

  console.log('\n== Importar rúbrica generada por IA (P-08) ==');
  {
    const app = cargarApp();
    app.Storage.load();
    await importarJson(app, estadoAci());
    const rub = {
      tipo: 'rubrica-evalcrit', version: 1, titulo: 'Rúbrica IA', unidad: 'UD9', nivel: '',
      items: [
        { criterio: 'Ortografía', peso: 3, criterios: ['C1'],
          niveles: [{ pct: 25, descriptor: 'a' }, { pct: 50, descriptor: 'b' }, { pct: 75, descriptor: 'c' }, { pct: 100, descriptor: 'd' }] },
        { criterio: 'Orden', peso: 1, criterios: ['C2'],
          niveles: [{ pct: 25, descriptor: 'e' }, { pct: 100, descriptor: 'f' }] }
      ]
    };
    const r = app.Storage.importarRubrica(rub, 'c1', 'T2');
    const inst = app.Calc.instrumento(r.id);
    check('se crea la rúbrica importada', !!inst && inst.tipo === 'Rúbrica' && inst.titulo === 'Rúbrica IA');
    check('conserva unidad y periodo elegido', inst.unidad === 'UD9' && inst.periodo === 'T2');
    check('conserva los descriptores de cada ítem', inst.apartados[0].niveles[3].descriptor === 'd');
    check('resuelve los códigos a criterios de la asignatura', inst.apartados[0].criterioIds.join(',') === 'k1');
    check('acepta ítems con distinto número de niveles', inst.apartados[1].niveles.length === 2);
    check('la escala del instrumento refleja el primer ítem', inst.niveles.length === 4);

    const clon = () => JSON.parse(JSON.stringify(rub));
    const rechaza = (d, re) => {
      try { app.Storage.importarRubrica(d, 'c1'); return false; }
      catch (e) { return re ? re.test(e.message) : true; }
    };
    check('rechaza un texto que no es una rúbrica', rechaza({ tipo: 'otro', version: 1 }, /no es una rúbrica/));
    check('rechaza peso no válido', rechaza((() => { const b = clon(); b.items[0].peso = 0; return b; })(), /peso/));
    check('rechaza ítems repetidos', rechaza((() => { const b = clon(); b.items[1].criterio = 'Ortografía'; return b; })(), /repetido/));
    check('rechaza niveles insuficientes', rechaza((() => { const b = clon(); b.items[0].niveles = [{ pct: 100, descriptor: 'x' }]; return b; })(), /al menos 2 niveles/));
    check('rechaza ítems sin criterios', rechaza((() => { const b = clon(); b.items[0].criterios = []; return b; })(), /no indican ningún criterio/));
    {
      const antes = app.Storage.db.instrumentos.length;
      const bad = clon();
      bad.items[0].criterios = ['NO-EXISTE'];
      const ok = rechaza(bad, /no existen/);
      check('un criterio inexistente aborta sin importar nada', ok && app.Storage.db.instrumentos.length === antes);
    }
  }

  console.log('\n== Instrumentos: por trimestre y unidades plegables ==');
  {
    const app = cargarApp();
    app.Storage.load();
    const est = estadoAci();
    est.instrumentos.push(
      { id: 'i1', claseId: 'c1', tipo: 'Control', titulo: 'UD1 control', fecha: '2026-01-10', periodo: 'T1', nivel: '', unidad: 'UD1', saberes: '', url: 'https://ejemplo.test/ud1', niveles: [{ pct: 100, descriptor: '' }], apartados: [{ id: 'p1', orden: 1, descripcion: 'a', maxPts: 10, criterioIds: ['k1'] }], criteriosModo: 'desglosado', criterioIdsGlobal: [] },
      { id: 'i2', claseId: 'c1', tipo: 'Control', titulo: 'UD2 control', fecha: '2026-02-10', periodo: 'T2', nivel: '', unidad: 'UD2', saberes: '', niveles: [{ pct: 100, descriptor: '' }], apartados: [{ id: 'p2', orden: 1, descripcion: 'a', maxPts: 10, criterioIds: ['k2'] }], criteriosModo: 'desglosado', criterioIdsGlobal: [] },
      { id: 'i3', claseId: 'c1', tipo: 'Proyecto', titulo: 'Proyecto suelto', fecha: '2026-03-10', periodo: 'T1', nivel: '', unidad: '', saberes: '', url: 'javascript:alert(1)', niveles: [{ pct: 100, descriptor: '' }], apartados: [{ id: 'p3', orden: 1, descripcion: 'a', maxPts: 10, criterioIds: ['k1'] }], criteriosModo: 'desglosado', criterioIdsGlobal: [] }
    );
    await importarJson(app, est);
    const C = app.Calc;
    const insts = app.Storage.db.instrumentos.filter(i => i.claseId === 'c1');
    check('unidadesDe: lista ordenada y sin vacios', C.unidadesDe(insts).join(',') === 'UD1,UD2');
    const ud1 = C.instrumentosDeUnidad(insts, 'UD1').map(i => i.id);
    check('instrumentosDeUnidad filtra por unidad', ud1.indexOf('i1') !== -1 && ud1.every(id => ['iBase', 'iAci', 'i1'].indexOf(id) !== -1), ud1.join(','));
    check('instrumentosDeUnidad sin unidad devuelve todo', C.instrumentosDeUnidad(insts, null).length === insts.length && C.instrumentosDeUnidad(insts, '').length === insts.length);

    const el = makeEl();
    app.InstrumentosView.render(el);
    const h = el.innerHTML;
    check('hay desplegable de trimestre con «Todos los trimestres»', h.includes('id="sel-per"') && h.includes('Todos los trimestres'));
    check('la opción «Todos» lleva el valor correcto', h.includes('<option value="Todos"') && h.includes('<option value="T1"'));
    check('se muestran las secciones T1 y T2', h.includes('class="per-titulo">T1') && h.includes('class="per-titulo">T2'));
    check('T3 aparece aunque esté vacío', h.includes('Sin instrumentos en T3'));
    check('bloques plegables por periodo y unidad', h.includes('data-ud-clave="T1::UD1"') && h.includes('data-ud-clave="T1::UD2"') && h.includes('data-ud-clave="T2::UD2"'));
    check('los instrumentos sin unidad van a su propio bloque', h.includes('data-ud-clave="T1::"'));
    check('por defecto todos los bloques están cerrados', h.includes('ud-bloque') && !h.includes('ud-bloque abierta'));
    check('cada bloque lleva su tabla de instrumentos', h.includes('ud-cuerpo'));
    check('los instrumentos siguen estando en el listado', h.includes('UD1 control') && h.includes('UD2 control') && h.includes('Proyecto suelto'));
    check('un instrumento con enlace lo pinta como enlace', h.includes('href="https://ejemplo.test/ud1"'));
    check('un enlace peligroso (javascript:) no se pinta', !h.includes('href="javascript:'));
    check('la vista ya no tiene el desplegable de unidades', !h.includes('id="sel-ud-inst"'));
  }

  console.log('== Unidad: sugerencias editables (datalist) ==');
  {
    const app = cargarApp();
    app.Storage.load();
    const est = estadoAci();
    // La asignatura s1 ya tiene UD1/UD2 en la clase c1. Anadimos otra clase de
    // la misma asignatura (s1) y una de otra (s2) para comprobar el alcance.
    est.clases.push({ id: 'c2', asignaturaId: 's1', grupoId: 'g1', nivelesAci: [], adaptaciones: {} });
    est.clases.push({ id: 'c3', asignaturaId: 's2', grupoId: 'g1', nivelesAci: [], adaptaciones: {} });
    est.instrumentos.push(
      { id: 'j1', claseId: 'c2', tipo: 'Control', titulo: 'UD3 otra clase s1', fecha: '2026-04-10', periodo: 'T3', nivel: '', unidad: 'UD3', saberes: '', niveles: [], apartados: [{ id: 'z1', orden: 1, descripcion: 'a', maxPts: 10, criterioIds: ['k1'] }] },
      { id: 'j2', claseId: 'c3', tipo: 'Control', titulo: 'UD9 otra asignatura', fecha: '2026-04-10', periodo: 'T3', nivel: '', unidad: 'UD9', saberes: '', niveles: [], apartados: [{ id: 'z2', orden: 1, descripcion: 'a', maxPts: 10, criterioIds: ['m1'] }] }
    );
    await importarJson(app, est);
    const C = app.Calc;

    check('unidadesDeAsignatura junta las clases de la asignatura', C.unidadesDeAsignatura('s1').join(',') === 'UD1,UD2,UD3', C.unidadesDeAsignatura('s1').join(','));
    check('unidadesDeAsignatura no mezcla otras asignaturas', C.unidadesDeAsignatura('s2').join(',') === 'UD9', C.unidadesDeAsignatura('s2').join(','));

    const dl = app.InstrumentosView.datalistUnidades('s1');
    check('datalistUnidades genera el datalist con las unidades', dl.indexOf('<datalist id="lista-unidades">') === 0 && dl.indexOf('value="UD1"') !== -1 && dl.indexOf('value="UD3"') !== -1);
    check('datalistUnidades sin unidades devuelve vacio', app.InstrumentosView.datalistUnidades('sX') === '');
  }

  // Formato de impresión (P-10): el PDF sale como informe, sin controles.
  {
    const css = fs.readFileSync(path.join(raiz, 'css', 'styles.css'), 'utf8');
    check('al imprimir se ocultan controles y botones', css.includes('.card-head select, .card-head input, .btn, .icon-btn { display: none !important; }'));
    check('la cabecera de informe solo sale impresa', css.includes('.solo-impresion { display: none;') && css.includes('.solo-impresion { display: block !important; }'));
    check('la cabecera de tabla se repite en cada página', css.includes('thead { display: table-header-group; }'));
    check('las filas no se parten entre páginas', css.includes('tr { page-break-inside: avoid; break-inside: avoid; }'));
    check('al imprimir la tabla ocupa todo el ancho', css.includes('.scroll-x { overflow: visible !important; }'));
    check('el informe de impresión sustituye a la vista solo al imprimir',
      css.includes('body.imprimiendo-informe main { display: none !important; }') &&
      css.includes('body.imprimiendo-informe #informe-impresion { display: block !important; }'));
    check('el título de cada sección del informe no se separa de su tabla',
      css.includes('break-after: avoid; page-break-after: avoid;') &&
      css.includes('.informe-seccion table { break-before: avoid; page-break-before: avoid; }'));

    // La fila de apartado (Control/Proyecto) pinta 6 controles: nº, descripción,
    // máximo, «peso», «Criterios» y «Quitar». Si el grid declara menos columnas,
    // «Quitar» se va a una segunda fila (la columna de 28px) y no cabe su texto.
    const apCols = (css.match(/\.apartado-fila\s*\{[^}]*grid-template-columns:\s*([^;]+);/) || [])[1];
    check('la fila de apartado (no rúbrica) declara una columna por control: «Quitar» no salta de fila',
      !!apCols && apCols.trim().split(/\s+/).length === 6, apCols);
  }

  console.log('\n== Nivel ACI: los criterios del instrumento deben ser de su currículo ==');
  {
    const app = cargarApp();
    app.Storage.load();
    await importarJson(app, estadoAciNumeros());
    const C = app.Calc;
    const db = app.Storage.db;

    // La migración reapunta al cargar: los dos instrumentos del nivel B que
    // traían criterios de 6º pasan a los de 4º, emparejando por número.
    const mal = C.instrumento('iMal');
    const malG = C.instrumento('iMalGlobal');
    check('al importar se corrige el instrumento de nivel con criterios de otro ciclo',
      mal.apartados[0].criterioIds.join(',') === 'm11', mal.apartados[0].criterioIds.join(','));
    check('también se corrige la variante global', malG.criterioIdsGlobal.join(',') === 'm12', malG.criterioIdsGlobal.join(','));
    check('el número de corregidos se expone para poder avisar', app.Storage.reparadosCriterios === 2, String(app.Storage.reparadosCriterios));
    check('no quedan criterios fuera de nivel', C.criteriosFueraDeNivel(db, mal).length === 0 && C.criteriosFueraDeNivel(db, malG).length === 0);
    check('las notas siguen intactas tras reapuntar', db.registros.iMal.a4.q1 === 8 && db.registros.iMalGlobal.a4.z1 === 6);

    // Efecto buscado: los criterios y la nota de la alumna ACI ya salen.
    check('el criterio de 4º ya puntúa para la alumna ACI', Math.abs(C.logroCriterio('m11', 'c1', 'a4', 'T1') - 0.8) < 1e-9, String(C.logroCriterio('m11', 'c1', 'a4', 'T1')));
    check('la nota de la alumna ACI deja de estar vacía', app.Utils.fmt(C.notaEvaluacion('c1', 'a4', 'T1')) === '7,0', app.Utils.fmt(C.notaEvaluacion('c1', 'a4', 'T1')));

    // Los instrumentos base y común no se tocan.
    check('el control base conserva sus criterios', C.instrumento('iBase').apartados[0].criterioIds.join(',') === 'k11');
    check('la prueba común (sin nivel) no se toca', C.instrumento('iComun').apartados[0].criterioIds.join(',') === 'k11');

    // Idempotencia: volver a migrar no cambia nada más.
    app.Storage.migrar(JSON.parse(JSON.stringify(db)));
    check('la corrección es idempotente', app.Storage.reparadosCriterios === 0, String(app.Storage.reparadosCriterios));

    // La clave empareja por número entre ciclos.
    check('claveCriterio empareja entre ciclos (TC/SC/PC)',
      C.claveCriterio('MAT.TC.2.2') === '2.2' && C.claveCriterio('MAT.SC.2.2') === '2.2' && C.claveCriterio('MAT.PC.2.2') === '2.2');
    check('claveCriterio ignora códigos sin número con punto', C.claveCriterio('C1') === '' && C.claveCriterio('') === '');

    // Lo que usa «Duplicar» para crear un examen paralelo.
    const copia = { claseId: 'c1', nivel: 'B', apartados: [{ id: 'x', criterioIds: ['k11', 'k12'] }] };
    check('criteriosFueraDeNivel detecta los criterios del original', C.criteriosFueraDeNivel(db, copia).length === 2);
    C.repararCriteriosDeInstrumento(db, copia);
    check('duplicar a 4º reapunta los criterios por número', copia.apartados[0].criterioIds.join(',') === 'm11,m12', copia.apartados[0].criterioIds.join(','));
    check('tras reapuntar ya no hay criterios fuera de nivel', C.criteriosFueraDeNivel(db, copia).length === 0);

    // Blindaje: sin equivalente no se reapunta a medias (se deja visible).
    db.criterios.push({ id: 'k99', asignaturaId: 's1', codigo: 'MAT.TC.9.9', descripcion: 'x', peso: 0, espIds: [], claveIds: [] });
    const sinPar = { claseId: 'c1', nivel: 'B', apartados: [{ id: 'z', criterioIds: ['k99'] }] };
    check('sin criterio equivalente no se toca nada',
      !C.repararCriteriosDeInstrumento(db, sinPar) && sinPar.apartados[0].criterioIds[0] === 'k99');
  }

  console.log('\n== Enlaces de instrumento: normalización y seguridad ==');
  {
    const app = cargarApp();
    const U = app.Utils;
    check('un enlace sin esquema recibe https://', U.urlLimpia('drive.google.com/x') === 'https://drive.google.com/x', U.urlLimpia('drive.google.com/x'));
    check('un enlace con esquema se respeta', U.urlLimpia('http://a.test/b') === 'http://a.test/b' && U.urlLimpia('mailto:x@y.test') === 'mailto:x@y.test');
    check('se descartan los esquemas peligrosos al guardar', U.urlLimpia('javascript:alert(1)') === '' && U.urlLimpia('  DATA:text/html,x') === '');
    check('urlPintable bloquea javascript: aunque venga de un backup', U.urlPintable('javascript:alert(1)') === '' && U.urlPintable('https://a.test') === 'https://a.test');
    check('urlPintable vacío con cadena vacía o nula', U.urlPintable('') === '' && U.urlPintable(null) === '');
  }

  console.log('\n== Banco de instrumentos: reutilizar en otra clase o curso (D-48) ==');
  {
    const app = cargarApp();
    app.Storage.load();
    await importarJson(app, estadoBanco());
    const C = app.Calc;
    const S = app.Storage;

    check('un backup antiguo (sin banco) se migra con bancoInstrumentos vacío',
      Array.isArray(S.db.bancoInstrumentos) && S.db.bancoInstrumentos.length === 0);

    const inst = C.instrumento('i1');
    inst.url = 'https://ejemplo.test/examen';
    const molde = S.guardarEnBanco(inst);
    check('el molde guarda los criterios por CÓDIGO (no por id)',
      molde.apartados[0].criterioCodes.join(',') === 'MAT.TC.1.1' && molde.apartados[1].criterioCodes.join(',') === 'MAT.TC.2.1',
      JSON.stringify(molde.apartados.map(a => a.criterioCodes)));
    check('el molde conserva el enlace del instrumento', molde.url === 'https://ejemplo.test/examen', molde.url);
    check('el molde recuerda su asignatura de origen', molde.origen.asignatura === 'Matemáticas 6º', molde.origen.asignatura);
    check('guardar en el banco no duplica el instrumento del curso', S.db.instrumentos.length === 1);
    check('guardar en el banco no toca las notas del original', S.db.registros.i1.a1.p1 === 8);

    // Reutilizar en otra clase de la MISMA asignatura: los criterios se resuelven por código.
    const r = S.anadirDesdeBanco(molde.id, 'c2', '', 'T2');
    check('se añade a otra clase sin fallar', r.faltan.length === 0 && !!r.inst);
    check('el instrumento añadido queda en la clase y periodo elegidos', r.inst.claseId === 'c2' && r.inst.periodo === 'T2');
    check('los criterios del molde se resuelven a los ids de la clase destino',
      r.inst.apartados[0].criterioIds.join(',') === 'k1' && r.inst.apartados[1].criterioIds.join(',') === 'k2',
      JSON.stringify(r.inst.apartados.map(a => a.criterioIds)));
    check('la copia nace sin notas', S.db.registros[r.inst.id] === undefined);
    check('la copia recibe ids de apartado nuevos', r.inst.apartados[0].id !== 'p1');
    check('la copia conserva el enlace del molde', r.inst.url === 'https://ejemplo.test/examen', r.inst.url);

    // Otro currículo: si un código no existe en el destino no se crea nada.
    const antes = S.db.instrumentos.length;
    const r2 = S.anadirDesdeBanco(molde.id, 'c4', '', 'T1');
    check('si falta un código en el destino no se crea nada y se avisan los que faltan',
      S.db.instrumentos.length === antes && r2.faltan.length === 2, JSON.stringify(r2.faltan));

    // Modo global y rúbrica: el molde conserva lo que define el motor.
    const instG = Object.assign({}, inst, {
      id: 'iG', criteriosModo: 'global', criterioIdsGlobal: ['k1', 'k2'],
      apartados: [{ id: 'pG', orden: 1, descripcion: 'x', maxPts: 10, criterioIds: [] }]
    });
    const moldeG = C.moldeDeInstrumento(S.db, instG);
    check('el molde conserva el modo global',
      moldeG.criteriosModo === 'global' && moldeG.criterioCodesGlobal.join(',') === 'MAT.TC.1.1,MAT.TC.2.1',
      moldeG.criterioCodesGlobal.join(','));
    const rub = Object.assign({}, inst, {
      id: 'iR', tipo: 'Rúbrica', niveles: [{ pct: 50, descriptor: 'a' }, { pct: 100, descriptor: 'b' }],
      apartados: [{ id: 'pR', orden: 1, descripcion: 'it', maxPts: 100, peso: 3, niveles: [{ pct: 100, descriptor: 'b' }], criterioIds: ['k1'] }]
    });
    const desdeR = C.instrumentoDesdeMolde(C.moldeDeInstrumento(S.db, rub), 'c2', '', 'T1');
    check('el molde de rúbrica conserva escala común, peso y descriptores por ítem',
      desdeR.inst.niveles.length === 2 && desdeR.inst.apartados[0].peso === 3 &&
      desdeR.inst.apartados[0].niveles[0].descriptor === 'b' && desdeR.faltan.length === 0);

    // Un molde de 4º añadido al NIVEL ACI de una clase de 6º: usa el currículo del nivel.
    const inst4 = { id: 'i4', claseId: 'c4', tipo: 'Control', titulo: 'Control 4º',
      apartados: [{ id: 'q1', orden: 1, descripcion: 'a', maxPts: 10, criterioIds: ['m1'] }] };
    const molde4 = C.moldeDeInstrumento(S.db, inst4);
    S.db.bancoInstrumentos.push(molde4);
    const r4 = S.anadirDesdeBanco(molde4.id, 'c3', 'B', 'T1');
    check('un molde de otro curso se resuelve contra el currículo de su nivel ACI',
      r4.faltan.length === 0 && r4.inst.nivel === 'B' && r4.inst.apartados[0].criterioIds.join(',') === 'm1',
      JSON.stringify(r4.faltan));
    check('el instrumento ACI añadido no queda con criterios fuera de su nivel',
      C.criteriosFueraDeNivel(S.db, r4.inst).length === 0);

    // Quitar del banco no toca nada del curso.
    const nInst = S.db.instrumentos.length;
    S.borrarDelBanco(molde.id);
    check('quitar del banco no borra instrumentos del curso',
      !S.db.bancoInstrumentos.some(m => m.id === molde.id) && S.db.instrumentos.length === nInst);
  }

  console.log('\n== Borrado en cascada sin datos huérfanos ==');
  {
    const estado = async () => {
      const app = cargarApp();
      app.Storage.load();
      await importarJson(app, estadoCascada());
      return app;
    };
    // Invariante: ningún instrumento apunta a una clase inexistente y ningún
    // registro apunta a un instrumento inexistente.
    const huerfanos = S => {
      const instIds = new Set(S.db.instrumentos.map(i => i.id));
      const claseIds = new Set(S.db.clases.map(c => c.id));
      return {
        instSinClase: S.db.instrumentos.filter(i => !claseIds.has(i.claseId)).map(i => i.id).join(','),
        regSinInst: Object.keys(S.db.registros).filter(id => !instIds.has(id)).join(',')
      };
    };
    const sinHuerfanos = S => { const h = huerfanos(S); return !h.instSinClase && !h.regSinInst; };

    // 1) Borrar una clase: se lleva sus instrumentos Y sus notas.
    {
      const app = await estado();
      const S = app.Storage;
      const r = S.borrarClase('c2');
      check('borrarClase elimina el instrumento de esa clase',
        r.instrumentos === 1 && !S.db.instrumentos.some(i => i.id === 'i2'));
      check('borrarClase NO deja las notas del instrumento huérfanas', S.db.registros.i2 === undefined);
      check('borrarClase conserva los demás instrumentos y sus notas',
        S.db.instrumentos.some(i => i.id === 'i1') && S.db.registros.i1.a1.p1 === 8);
      check('tras borrar una clase no quedan huérfanos', sinHuerfanos(S), JSON.stringify(huerfanos(S)));
    }

    // 2) Borrar un grupo: se lleva alumnado, clases, instrumentos y notas.
    {
      const app = await estado();
      const S = app.Storage;
      const r = S.borrarGrupo('g1');
      check('borrarGrupo elimina alumnado, clases e instrumentos del grupo',
        r.alumnos === 2 && r.clases === 2 && r.instrumentos === 2, JSON.stringify(r));
      check('borrarGrupo conserva el otro grupo y su alumnado',
        S.db.grupos.some(g => g.id === 'g2') && S.db.alumnos.some(a => a.id === 'a3') && !S.db.alumnos.some(a => a.id === 'a1'));
      check('borrarGrupo elimina las clases y los instrumentos de ese grupo',
        !S.db.clases.some(c => c.id === 'c1') && !S.db.clases.some(c => c.id === 'c3') &&
        !S.db.instrumentos.some(i => i.id === 'i1') && !S.db.instrumentos.some(i => i.id === 'i3'));
      check('borrarGrupo borra las notas de los instrumentos eliminados',
        S.db.registros.i1 === undefined && S.db.registros.i3 === undefined);
      check('borrarGrupo quita las notas del alumnado en instrumentos que sobreviven',
        !(S.db.registros.i4 && S.db.registros.i4.a1) && S.db.registros.i4.a3.p4 === 4);
      check('tras borrar un grupo no quedan huérfanos', sinHuerfanos(S), JSON.stringify(huerfanos(S)));
    }

    // 3) Borrar una asignatura: currículo, clases, instrumentos, notas y ACI.
    {
      const app = await estado();
      const S = app.Storage;
      const r = S.borrarAsignatura('s1');
      check('borrarAsignatura elimina criterios, clases e instrumentos',
        r.criterios === 1 && r.clases === 2 && r.instrumentos === 2, JSON.stringify(r));
      check('borrarAsignatura quita la asignatura y su currículo',
        !S.db.asignaturas.some(a => a.id === 's1') && !S.db.criterios.some(c => c.id === 'k1') &&
        !S.db.competenciasEspecificas.some(e => e.id === 'e1') && S.db.asignaturas.some(a => a.id === 's2'));
      check('borrarAsignatura elimina sus clases, instrumentos y notas',
        !S.db.clases.some(c => c.id === 'c1') && !S.db.clases.some(c => c.id === 'c2') &&
        !S.db.instrumentos.some(i => i.id === 'i1') && !S.db.instrumentos.some(i => i.id === 'i2') &&
        S.db.registros.i1 === undefined && S.db.registros.i2 === undefined);
      const c4 = S.db.clases.find(c => c.id === 'c4');
      check('borrarAsignatura limpia el nivel ACI que apuntaba a ella',
        (c4.nivelesAci || []).length === 0, JSON.stringify(c4.nivelesAci));
      check('borrarAsignatura limpia la adaptación del alumnado de ese nivel',
        !(c4.adaptaciones && 'a3' in c4.adaptaciones), JSON.stringify(c4.adaptaciones));
      check('tras borrar una asignatura no quedan huérfanos', sinHuerfanos(S), JSON.stringify(huerfanos(S)));
    }

    // 4) Borrar un alumno: sus notas en todos los instrumentos.
    {
      const app = await estado();
      const S = app.Storage;
      S.borrarAlumno('a1');
      check('borrarAlumno quita al alumno', !S.db.alumnos.some(a => a.id === 'a1'));
      check('borrarAlumno borra sus notas en todos los instrumentos',
        !S.db.registros.i1.a1 && !S.db.registros.i3.a1 && !S.db.registros.i4.a1);
      check('borrarAlumno conserva las notas del resto',
        S.db.registros.i1.a2.p1 === 6 && S.db.registros.i2.a3.p2 === 7);
      check('tras borrar un alumno no quedan huérfanos', sinHuerfanos(S), JSON.stringify(huerfanos(S)));
    }
  }

  console.log('\n== Alta y edición de grupos y alumnado ==');
  {
    const app = cargarApp();
    app.Storage.load();
    await importarJson(app, estadoCascada());
    const S = app.Storage;

    // Grupo: crear y editar en sitio.
    const nG = S.db.grupos.length;
    const nuevo = S.guardarGrupo({ nombre: '  3ºA  ', etapa: 'Primaria' });
    check('guardarGrupo crea un grupo y recorta el nombre',
      !!nuevo && nuevo.nombre === '3ºA' && S.db.grupos.length === nG + 1);
    const editado = S.guardarGrupo({ nombre: '6ºA (mañana)', etapa: 'Infantil' }, 'g1');
    check('guardarGrupo edita el grupo en sitio (mismo id, sin duplicar)',
      editado.id === 'g1' && editado.nombre === '6ºA (mañana)' && editado.etapa === 'Infantil' &&
      S.db.grupos.length === nG + 1 && S.db.grupos.filter(g => g.id === 'g1').length === 1);
    check('guardarGrupo sin nombre devuelve null y no cambia nada',
      S.guardarGrupo({ nombre: '   ' }, 'g1') === null && S.db.grupos.find(g => g.id === 'g1').nombre === '6ºA (mañana)');
    check('guardarGrupo con id inexistente no crea nada',
      S.guardarGrupo({ nombre: 'X' }, 'no-existe') === null && S.db.grupos.length === nG + 1);

    // Alumno: al editar se conserva el id (y con él las notas).
    const editadoAl = S.guardarAlumno({ nombre: 'Ana', apellidos: 'Uno Editada', grupoId: 'g1' }, 'a1');
    check('guardarAlumno edita en sitio y conserva el id (y sus notas)',
      editadoAl.id === 'a1' && editadoAl.apellidos === 'Uno Editada' &&
      S.db.alumnos.filter(a => a.id === 'a1').length === 1 && S.db.registros.i1.a1.p1 === 8);
    const movido = S.guardarAlumno({ nombre: 'Ana', apellidos: 'Uno Editada', grupoId: 'g2' }, 'a1');
    check('guardarAlumno puede cambiar de grupo sin perder las notas',
      movido.grupoId === 'g2' && movido.id === 'a1' && S.db.registros.i3.a1.p3 === 5);
    check('guardarAlumno sin nombre ni apellidos devuelve null',
      S.guardarAlumno({ nombre: '  ', apellidos: '' }, 'a1') === null);
    const nA = S.db.alumnos.length;
    const nuevoAl = S.guardarAlumno({ nombre: 'Nuevo', apellidos: 'Alumno', grupoId: 'g2' });
    check('guardarAlumno crea un alumno nuevo con su grupo',
      !!nuevoAl && nuevoAl.grupoId === 'g2' && S.db.alumnos.length === nA + 1);
  }

  console.log('\n== Alta y edición de asignaturas ==');
  {
    const app = cargarApp();
    app.Storage.load();
    await importarJson(app, estadoCascada());
    const S = app.Storage;

    // Crear en blanco.
    const nAsig = S.db.asignaturas.length;
    const nueva = S.guardarAsignatura({ nombre: '  Taller de ajedrez  ', etapa: 'Primaria' });
    check('guardarAsignatura crea en blanco y recorta el nombre',
      !!nueva && nueva.nombre === 'Taller de ajedrez' && nueva.curso === '' && nueva.fuente === '' &&
      S.db.asignaturas.length === nAsig + 1);
    check('guardarAsignatura sin nombre devuelve null',
      S.guardarAsignatura({ nombre: '   ' }) === null && S.db.asignaturas.length === nAsig + 1);

    // Renombrar una asignatura con currículo: conserva id, criterios y notas.
    const nCrit = S.db.criterios.filter(c => c.asignaturaId === 's1').length;
    const renombrada = S.guardarAsignatura({ nombre: 'Matemáticas 6º (nuevo)', etapa: 'Primaria', curso: '6º' }, 's1');
    check('guardarAsignatura renombra en sitio (mismo id, sin duplicar)',
      renombrada.id === 's1' && renombrada.nombre === 'Matemáticas 6º (nuevo)' &&
      S.db.asignaturas.filter(a => a.id === 's1').length === 1);
    check('renombrar una asignatura NO toca su currículo',
      S.db.criterios.filter(c => c.asignaturaId === 's1').length === nCrit &&
      S.db.criterios.some(c => c.id === 'k1'));
    check('renombrar una asignatura NO toca las notas',
      S.db.registros.i1.a1.p1 === 8 && S.db.registros.i1.a2.p1 === 6);

    // Cambiar el nivel (curso): es una etiqueta, no el currículo.
    const critAntes = S.db.criterios.filter(c => c.asignaturaId === 's1').map(c => c.id).join(',');
    S.guardarAsignatura({ nombre: 'Matemáticas 6º', curso: '5º', etapa: 'Primaria' }, 's1');
    check('cambiar el nivel (curso) NO toca el currículo',
      S.db.asignaturas.find(a => a.id === 's1').curso === '5º' && critAntes !== '' &&
      S.db.criterios.filter(c => c.asignaturaId === 's1').map(c => c.id).join(',') === critAntes);
    check('cambiar el nivel (curso) NO toca las notas',
      S.db.registros.i1.a1.p1 === 8 && S.db.registros.i1.a2.p1 === 6);

    check('guardarAsignatura con id inexistente no crea nada',
      S.guardarAsignatura({ nombre: 'X' }, 'no-existe') === null && S.db.asignaturas.length === nAsig + 1);
  }

  console.log('\n== Alta masiva de alumnado ==');
  {
    const app = cargarApp();
    app.Storage.load();
    const S = app.Storage;
    await importarJson(app, estadoCascada());
    const antes = S.db.alumnos.length;

    const r = S.guardarAlumnosDesdeTexto('g2', [
      'García Pérez, José Luis',
      'Martínez Ruiz, Ana',
      '',
      '   ',
      'SoloNombre'
    ].join('\n'));
    check('alta masiva crea un alumno por línea (ignora vacías)',
      r.creados === 3 && S.db.alumnos.length === antes + 3);
    const jose = S.db.alumnos.find(a => a.apellidos === 'García Pérez');
    check('alta masiva interpreta «Apellidos, Nombre»',
      !!jose && jose.nombre === 'José Luis' && jose.grupoId === 'g2');
    const solo = S.db.alumnos.find(a => a.nombre === 'SoloNombre');
    check('sin coma, toda la línea es el nombre', !!solo && solo.apellidos === '' && solo.grupoId === 'g2');

    const r2 = S.guardarAlumnosDesdeTexto('g2', 'García Pérez, José Luis\nNuevo Alumno\nNuevo Alumno');
    check('alta masiva evita duplicados (ya existentes y repetidos)',
      r2.creados === 1 && r2.duplicados === 2 &&
      S.db.alumnos.filter(a => a.nombre === 'Nuevo Alumno').length === 1);

    const r3 = S.guardarAlumnosDesdeTexto('g2', '\n  \n');
    check('alta masiva con texto vacío no crea nada',
      r3.creados === 0 && r3.duplicados === 0 && S.db.alumnos.length === antes + 4);
  }

  console.log('\n== Seguridad de datos (copias) ==');
  {
    const app = cargarApp();
    app.Storage.load();
    const S = app.Storage;
    await importarJson(app, estadoCascada());

    check('importar deja el estado como «cambios sin copiar»', S.db.meta.cambiosSinCopia === true);
    check('estadoCopia: datos sin copia previa → «nunca»', S.estadoCopia().nivel === 'nunca');

    S.marcarCopia();
    check('marcarCopia sella la fecha y quita «cambios sin copiar»',
      !!S.db.meta.ultimaExportacion && S.db.meta.cambiosSinCopia === false);
    check('estadoCopia tras copiar → «ok»', S.estadoCopia().nivel === 'ok');

    S.guardarGrupo({ nombre: '6ºC', etapa: 'Primaria' });
    check('un cambio nuevo vuelve a marcar «pendiente»', S.estadoCopia().nivel === 'pendiente');

    S.marcarCopia();
    S.volcar();
    check('volcar() NO marca «cambios sin copiar»', S.db.meta.cambiosSinCopia === false);

    S.db.meta.ultimaExportacion = new Date(Date.now() - 10 * 86400000).toISOString();
    S.db.meta.cambiosSinCopia = false;
    check('una copia de hace 10 días sale «antigua»',
      S.estadoCopia().nivel === 'antigua' && S.estadoCopia().dias >= 10);

    const vacio = cargarApp();
    vacio.Storage.load();
    check('sin datos no hay aviso de copia',
      vacio.Storage.estadoCopia().nivel === 'ok' && vacio.Storage.estadoCopia().hayDatos === false);
  }

  console.log('\n== Deshacer una importación ==');
  {
    const app = cargarApp();
    app.Storage.load();
    const S = app.Storage;
    const propio = S.guardarGrupo({ nombre: 'Propio', etapa: 'Primaria' });
    const idPropio = propio.id;

    const copiada = await importarJson(app, estadoCascada());
    check('importar guarda una copia previa y lo indica', copiada === true && !!S.copiaPrevia());
    check('tras importar, los datos son los importados',
      S.db.grupos.some(g => g.id === 'g1') && !S.db.grupos.some(g => g.id === idPropio));

    check('restaurarCopiaPrevia recupera los datos anteriores',
      S.restaurarCopiaPrevia() === true && S.db.grupos.some(g => g.id === idPropio) && !S.copiaPrevia());
    check('sin copia previa, restaurar no hace nada', S.restaurarCopiaPrevia() === false);

    const vacio2 = cargarApp();
    vacio2.Storage.load();
    const copiada2 = await importarJson(vacio2, estadoCascada());
    check('importar sobre una app vacía no genera copia previa',
      copiada2 === false && !vacio2.Storage.copiaPrevia());
  }

  console.log('\n== Informe: análisis de criterios y distribución (D-59) ==');
  {
    const app = cargarApp();
    app.Storage.load();
    await importarJson(app, estadoInforme());
    const C = app.Calc;
    const criterios = C.criteriosDeClase('c1');

    // Alcance
    const t1 = C.instrumentosAlcance('c1', { periodo: 'T1' });
    check('alcance T1 = 2 instrumentos', t1.length === 2 && t1.map(i => i.id).join(',') === 'i1,i2');
    const ud1 = C.instrumentosAlcance('c1', { unidad: 'UD1' });
    check('alcance UD1 = 2 instrumentos', ud1.length === 2);
    const inst3 = C.instrumentosAlcance('c1', { instrumentoId: 'i3' });
    check('alcance instrumento i3 = 1', inst3.length === 1 && inst3[0].id === 'i3');
    const todo = C.instrumentosAlcance('c1', {});
    check('alcance sin filtros = todos', todo.length === 3);

    // logroCriterioEnInsts
    const l1a1 = C.logroCriterioEnInsts('k1', 'c1', 'a1', t1);
    check('logro k1 a1 en T1 = 0,75', Math.abs(l1a1 - 0.75) < 1e-9, String(l1a1));
    const l1a2 = C.logroCriterioEnInsts('k1', 'c1', 'a2', t1);
    check('logro k1 a2 en T1 = 0,35', Math.abs(l1a2 - 0.35) < 1e-9, String(l1a2));

    // logroCriterio sigue funcionando igual (refactor sin regresión)
    check('logroCriterio k1 a1 T1 = 0,75', Math.abs(C.logroCriterio('k1', 'c1', 'a1', 'T1') - 0.75) < 1e-9);

    // mediaClaseCriterio
    const mediaK1 = C.mediaClaseCriterio('k1', 'c1', t1);
    check('media clase k1 en T1 = 0,4', Math.abs(mediaK1 - 0.4) < 1e-9, String(mediaK1));

    // notaEnInsts
    const n1 = C.notaEnInsts('c1', 'a1', t1);
    check('nota a1 en T1 = 7,25', Math.abs(n1 - 7.25) < 1e-9, String(n1));
    const n4 = C.notaEnInsts('c1', 'a4', t1);
    check('nota a4 en T1 = 1,25', Math.abs(n4 - 1.25) < 1e-9, String(n4));

    // tablaCriteriosInforme (2×2 absoluto × relativo)
    const tabla = C.tablaCriteriosInforme('c1', t1, criterios);
    check('tabla tiene 2 criterios', tabla.length === 2);
    const crit1 = tabla[0];
    check('criterio k1: media = 0,4', Math.abs(crit1.media - 0.4) < 1e-9, String(crit1.media));
    check('criterio k1: 4 filas (1 por alumno)', crit1.filas.length === 4);
    const filaA1 = crit1.filas.find(f => f.alumno.id === 'a1');
    check('k1 a1: absoluto true (0,75 >= 0,5)', filaA1.absoluto === true);
    check('k1 a1: relativo true (0,75 >= 0,4)', filaA1.relativo === true);
    const filaA2 = crit1.filas.find(f => f.alumno.id === 'a2');
    check('k1 a2: absoluto false (0,35 < 0,5)', filaA2.absoluto === false);
    check('k1 a2: relativo false (0,35 < 0,4)', filaA2.relativo === false);

    // hallazgos
    const hall = C.hallazgos('c1', t1, criterios);
    check('hay hallazgos', hall.length > 0);
    const hCrit = hall.filter(h => h.tipo === 'criterio');
    check('k1 crítico (75% < 50%)', hCrit.some(h => h.criterioId === 'k1' && h.nivel === 'critico' && h.pct === 75));
    check('k2 crítico (75% < 50%)', hCrit.some(h => h.criterioId === 'k2' && h.nivel === 'critico' && h.pct === 75));
    const hPreg = hall.filter(h => h.tipo === 'pregunta');
    check('pregunta i1/p1 con 75% de fallos', hPreg.some(h => h.instrumentoId === 'i1' && h.pct === 75));
    check('los críticos van primero', hall[0].nivel === 'critico');

    // distribucionNotas
    const dist = C.distribucionNotas('c1', t1);
    check('distribución tiene 4 notas', dist.notas.length === 4);
    check('media de la distribución = 3,875', Math.abs(dist.media - 3.875) < 1e-9, String(dist.media));
    check('buckets: 10 rangos', dist.buckets.length === 10);
    const totalBuckets = dist.buckets.reduce((s, b) => s + b.cantidad, 0);
    check('suma de buckets = 4', totalBuckets === 4);
  }

  console.log('\n' + (fallos ? 'FALLOS: ' + fallos + '/' + total : 'TODO OK: ' + total + ' comprobaciones'));
  process.exitCode = fallos ? 1 : 0;
}

main().catch(e => { console.error(e); process.exitCode = 1; });
