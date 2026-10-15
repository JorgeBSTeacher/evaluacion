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

    // Con un grupo grande debe aparecer el buscador de alumnado
    const est = estadoAci();
    for (let i = 1; i <= 6; i++) est.alumnos.push({ id: 'x' + i, nombre: 'Alumno' + i, apellidos: 'Zeta', grupoId: 'g1' });
    const app2 = cargarApp();
    app2.Storage.load();
    await importarJson(app2, est);
    const el2 = makeEl();
    app2.CuadriculaView.render(el2);
    check('con más de 6 alumnos aparece el buscador', el2.innerHTML.includes('id="busca-alumno"'));
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
    check('la escala por defecto toma el primer ítem', inst.niveles.length === 4);

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

  console.log('\n== Instrumentos: desplegable por unidad ==');
  {
    const app = cargarApp();
    app.Storage.load();
    const est = estadoAci();
    est.instrumentos.push(
      { id: 'i1', claseId: 'c1', tipo: 'Control', titulo: 'UD1 control', fecha: '2026-01-10', periodo: 'T1', nivel: '', unidad: 'UD1', saberes: '', niveles: [{ pct: 100, descriptor: '' }], apartados: [{ id: 'p1', orden: 1, descripcion: 'a', maxPts: 10, criterioIds: ['k1'] }], criteriosModo: 'desglosado', criterioIdsGlobal: [] },
      { id: 'i2', claseId: 'c1', tipo: 'Control', titulo: 'UD2 control', fecha: '2026-02-10', periodo: 'T2', nivel: '', unidad: 'UD2', saberes: '', niveles: [{ pct: 100, descriptor: '' }], apartados: [{ id: 'p2', orden: 1, descripcion: 'a', maxPts: 10, criterioIds: ['k2'] }], criteriosModo: 'desglosado', criterioIdsGlobal: [] },
      { id: 'i3', claseId: 'c1', tipo: 'Proyecto', titulo: 'Sin unidad', fecha: '2026-03-10', periodo: 'T1', nivel: '', unidad: '', saberes: '', niveles: [{ pct: 100, descriptor: '' }], apartados: [{ id: 'p3', orden: 1, descripcion: 'a', maxPts: 10, criterioIds: ['k1'] }], criteriosModo: 'desglosado', criterioIdsGlobal: [] }
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
    check('el listado muestra el desplegable de unidades', h.includes('id="sel-ud-inst"') && h.includes('Todas las unidades'));
    check('el desplegable ofrece UD1 y UD2', h.includes('>UD1<') && h.includes('>UD2<'));
    check('el listado incluye los tres instrumentos', h.includes('UD1 control') && h.includes('UD2 control') && h.includes('Sin unidad'));
  }

  console.log('\n' + (fallos ? 'FALLOS: ' + fallos + '/' + total : 'TODO OK: ' + total + ' comprobaciones'));
  process.exitCode = fallos ? 1 : 0;
}

main().catch(e => { console.error(e); process.exitCode = 1; });
