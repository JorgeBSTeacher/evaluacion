// tools/checks.js — comprobaciones automaticas de EvalCrit (Node, sin frameworks).
// Carga la app real (js/*.js) en un sandbox con DOM/localStorage simulados y
// verifica importador de curriculo, retrocompatibilidad de backups y motor ACI.
// Uso: node tools/checks.js
'use strict';
const fs = require('fs');
const path = require('path');
const { raiz, makeEl, cargarApp } = require('./arnes');
const { estadoPrueba, resumen } = require('./datos-prueba');

let total = 0;
let fallos = 0;
function check(nombre, cond, detalle) {
  total++;
  if (cond) console.log('  ok   ' + nombre);
  else { fallos++; console.log('  FAIL ' + nombre + (detalle ? '  → ' + detalle : '')); }
}

// Un «aviso» documenta una inconsistencia conocida: se imprime y se cuenta,
// pero no tumba la batería (no es un contrato del código, sino un defecto de
// datos o una decisión de diseño pendiente). Si desaparece, saldrá «ok».
let avisos = 0;
function aviso(nombre, hay, detalle) {
  if (hay) { avisos++; console.log('  AVISO  ' + nombre + (detalle ? '  → ' + detalle : '')); }
  else console.log('  ok   ' + nombre);
}

// El cargador de la app (makeEl, cargarApp) vive en tools/arnes.js para poder
// reutilizarlo desde tools/datos-prueba.js.

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

// Estado para los paneles de Inicio: una clase completa, una sin criterios,
// una con pesos a 90% y una clase con nivel ACI (un alumno adaptado).
function estadoPaneles() {
  return {
    schemaVersion: 1,
    cursoEscolar: '2025/2026',
    grupos: [{ id: 'g1', nombre: '6ºA', etapa: 'Primaria' }],
    alumnos: [
      { id: 'a1', nombre: 'Ana', apellidos: 'Uno', grupoId: 'g1' },
      { id: 'a2', nombre: 'Beto', apellidos: 'Dos', grupoId: 'g1' },
      { id: 'a3', nombre: 'Carla', apellidos: 'Tres', grupoId: 'g1' }
    ],
    asignaturas: [
      { id: 's1', nombre: 'Matemáticas 6º', etapa: 'Primaria' },
      { id: 's2', nombre: 'Lengua 6º', etapa: 'Primaria' },
      { id: 's3', nombre: 'Matemáticas 4º', etapa: 'Primaria' }
    ],
    clases: [
      { id: 'c1', asignaturaId: 's1', grupoId: 'g1', nivelesAci: [], adaptaciones: {} },
      { id: 'c2', asignaturaId: 's2', grupoId: 'g1', nivelesAci: [], adaptaciones: {} },
      { id: 'c3', asignaturaId: 's1', grupoId: 'g1',
        nivelesAci: [{ codigo: 'N1', etiqueta: 'Nivel 1', asignaturaId: 's3' }],
        adaptaciones: { a3: 'N1' } }
    ],
    competenciasEspecificas: [{ id: 'e1', asignaturaId: 's1', codigo: 'CE1', descripcion: 'x' }],
    criterios: [
      { id: 'k1', asignaturaId: 's1', codigo: 'C1', descripcion: 'c1', peso: 60, espIds: ['e1'], claveIds: [] },
      { id: 'k2', asignaturaId: 's1', codigo: 'C2', descripcion: 'c2', peso: 40, espIds: ['e1'], claveIds: [] },
      { id: 'm1', asignaturaId: 's3', codigo: 'A1', descripcion: 'a1', peso: 90, espIds: [], claveIds: [] }
    ],
    instrumentos: [{
      id: 'i1', claseId: 'c1', tipo: 'Control', titulo: 'Control 1', fecha: '2026-01-10', periodo: 'T1', nivel: '', unidad: '',
      apartados: [
        { id: 'p1', orden: 1, descripcion: 'a', maxPts: 10, criterioIds: ['k1'] },
        { id: 'p2', orden: 2, descripcion: 'b', maxPts: 10, criterioIds: ['k2'] }
      ]
    }],
    // a1 y a3 corregidos; a2 queda pendiente → «1 por corregir».
    registros: { i1: { a1: { p1: 8, p2: 6 }, a3: { p1: 7, p2: 7 } } }
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
    check('la pestaña Criterios muestra la columna Evaluación (nota ponderada)',
      h3.includes('>Evaluación<'));

    const el4 = makeEl();
    app2.CuadriculaView.render(el4, { tab: 'competencias' });
    check('en Competencias el buscador sigue disponible', el4.innerHTML.includes('id="busca-alumno"'));

    // «Imprimir»: una sección por nivel, cada una con SU currículo y sus
    // alumnos. Con currículos distintos mezclar columnas no tiene sentido.
    const inf = app2.CuadriculaView.informeHtml('c1', 'T1', { criterios: true, competencias: false });
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
      inf.includes('Cuadrícula de calificaciones · Criterios') && inf.includes('Matemáticas 6º') && inf.includes('6ºA') && inf.includes('T1'));
    check('el informe de impresión incluye la columna Evaluación', inf.includes('>Evaluación<'));
    check('el informe también sirve para competencias',
      app2.CuadriculaView.informeHtml('c1', 'T1', { criterios: false, competencias: true })
        .includes('Competencias específicas y clave'));
    // Ambos bloques a la vez: la sección lleva rótulo para los criterios y
    // los suyos propios para las competencias.
    const infAmbos = app2.CuadriculaView.informeHtml('c1', 'T1', { criterios: true, competencias: true });
    check('el informe puede incluir criterios y competencias juntos',
      infAmbos.includes('Criterios y competencias') && infAmbos.includes('>Criterios</h3>'), infAmbos.slice(0, 160));
    // Informe individual: solo ese alumno, solo su nivel.
    const infAlu = app2.CuadriculaView.informeHtml('c1', 'T1',
      { criterios: true, competencias: false, alumnoId: 'c1al' });
    const filasAlu = (infAlu.match(/<td>[^<]*, [^<]*<\/td>/g) || []).length;
    check('el informe individual lleva solo al alumno elegido',
      infAlu.includes('Informe individual') && infAlu.includes('Aci, Carla') && !infAlu.includes('Base, Ana'),
      infAlu.slice(0, 160));
    check('el informe individual tiene una sola sección (su nivel)', filasAlu === 1, 'filas=' + filasAlu);
    // El informe fija nivel/clase/periodo del módulo: al terminar debe restaurarlos
    // (si no, tras imprimir la vista quedaría en el último nivel del informe).
    app2.CuadriculaView.informeHtml('c1', 'T1', { criterios: true, competencias: false });
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
    const infH = appH.CuadriculaView.informeHtml('c1', 'T1', { criterios: true, competencias: false });
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

    // Al llegar desde la Cuadrícula se arranca en el alumno tocado, no en el
    // primero. Necesita el DOM real: la fila activa se marca con una CLASE
    // (`fila-actual`), y el arnés sin DOM no simula `classList`.
    // `iBase` es de nivel BASE: solo lo corrigen a1 y a2 (c2al es ACI).
    const appDom = cargarApp({ dom: true });
    appDom.Storage.load();
    await importarJson(appDom, estadoAci());
    const filaActiva = el2 => {
      const tr = el2.querySelector('tbody tr.fila-actual');
      return tr ? tr.dataset.alumno : null;
    };
    const elDom = appDom.document.createElement('div');
    appDom.InstrumentosView.renderCorreccion(elDom, 'iBase', null, 'a2');
    check('la corrección arranca en el alumno tocado, no en el primero',
      filaActiva(elDom) === 'a2',
      'fila-actual=' + filaActiva(elDom) + ' · ' + elDom.querySelector('#nav-info').textContent.trim());

    // Sin alumno indicado se mantiene el comportamiento de siempre: el primero.
    const elDom2 = appDom.document.createElement('div');
    appDom.InstrumentosView.renderCorreccion(elDom2, 'iBase');
    check('sin alumno indicado la corrección arranca en el primero',
      filaActiva(elDom2) === 'a1', 'fila-actual=' + filaActiva(elDom2));

    // Un alumno ajeno al instrumento (nivel ACI) no rompe: cae al primero.
    const elDom3 = appDom.document.createElement('div');
    appDom.InstrumentosView.renderCorreccion(elDom3, 'iBase', null, 'c2al');
    check('un alumno ajeno al instrumento cae al primero sin romper',
      filaActiva(elDom3) === 'a1', 'fila-actual=' + filaActiva(elDom3));

    // La celda de la Cuadrícula lleva el alumno, que es lo que permite el salto.
    // Las columnas por unidad nacen plegadas, así que se abren UD1 y UD2.
    const elCuad = appDom.document.createElement('div');
    appDom.CuadriculaView.render(elCuad, { claseId: 'c1', tab: 'notas', unidadesAbiertas: ['UD1', 'UD2'] });
    const celda = elCuad.querySelector('td.celda-nota[data-inst="iBase"]');
    check('la celda de la cuadrícula lleva su alumno para poder saltar a él',
      !!celda && celda.dataset.alumno === 'a1',
      celda ? 'data-alumno=' + celda.dataset.alumno : '(sin celda)');
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

  console.log('\n== Modales reales: editor de rúbrica y salto a importar (P-09) ==');
  {
    // Aquí no se simulan las funciones «de lógica»: se monta el DOM de
    // tools/dom.js y se maneja el MISMO modal que el docente (UI.openModal,
    // querySelector, atributos data-*, chips y botones). Es lo que habría
    // cazado el selector mal escrito de v0.5.6.
    const app = cargarApp({ dom: true });
    app.Storage.load();
    await importarJson(app, estadoPrueba());
    const doc = app.document;
    const IV = app.InstrumentosView;
    const db = app.Storage.db;
    const nInst = db.instrumentos.length;

    // Rellena una fila del modal: nombre, un criterio y sus descriptores.
    const rellena = (fila, nombre, indice, prefijo) => {
      fila.querySelector('.ap-desc').value = nombre;
      const chip = fila.querySelectorAll('.chip input')[indice];
      chip.checked = true;
      chip._dispara('change');
      fila.querySelectorAll('.ap-nv').forEach((inp, i) => { inp.value = prefijo + ' ' + (i + 1); });
    };
    const nivelesDe = fila => Array.from(fila.querySelectorAll('.ap-nv'))
      .map(i => i.dataset.pct + '=' + i.value);

    IV.modalInstrumento(null, 'cl-l6a');
    let body = doc.querySelector('.modal-body');
    check('P-09 · el modal de instrumento se monta con su formulario', !!body && !!body.querySelector('#f-titulo'));
    check('P-09 · un instrumento nuevo arranca en Control y con un apartado',
      body.querySelector('#f-tipo').value === 'Control' && body.querySelectorAll('.apartado-fila').length === 1);

    body.querySelector('#f-titulo').value = 'Rúbrica de prueba';
    body.querySelector('#f-periodo').value = 'T2';
    const tipo = body.querySelector('#f-tipo');
    tipo.value = 'Rúbrica';
    tipo._dispara('change');
    check('P-09 · al elegir Rúbrica aparece la cuadrícula 25 %…100 %',
      /25%/.test(body.querySelector('.rub-head').textContent) && /100%/.test(body.querySelector('.rub-head').textContent));
    check('P-09 · cada ítem de rúbrica nace con cuatro casillas de nivel',
      body.querySelectorAll('.apartado-fila .ap-nv').length === 4);

    rellena(body.querySelectorAll('.apartado-fila')[0], 'Ortografía', 0, 'Ort');
    body.querySelector('#add-ap').click();
    rellena(body.querySelectorAll('.apartado-fila')[1], 'Presentación', 1, 'Pres');
    check('P-09 · «Añadir ítem» añade una fila y conserva la anterior',
      body.querySelectorAll('.apartado-fila').length === 2 &&
      body.querySelectorAll('.apartado-fila')[0].querySelector('.ap-desc').value === 'Ortografía');
    doc.querySelector('.guardar').click();

    const creado = db.instrumentos[db.instrumentos.length - 1];
    check('P-09 · guardar crea la rúbrica, sin avisos, y cierra el modal',
      db.instrumentos.length === nInst + 1 && doc.querySelector('.modal-body') === null && !app.alertas.length);
    check('P-09 · se guardan los dos ítems con su nombre, criterio y peso',
      creado && creado.tipo === 'Rúbrica' && creado.titulo === 'Rúbrica de prueba' &&
      creado.periodo === 'T2' && creado.apartados.map(a => a.descripcion).join(',') === 'Ortografía,Presentación' &&
      creado.apartados.every(a => a.criterioIds.length === 1 && a.peso === 1));
    check('P-09 · cada ítem guarda sus cuatro descriptores propios',
      creado.apartados[0].niveles.map(n => n.pct + '=' + n.descriptor).join('|') === '25=Ort 1|50=Ort 2|75=Ort 3|100=Ort 4' &&
      creado.apartados[1].niveles.map(n => n.pct + '=' + n.descriptor).join('|') === '25=Pres 1|50=Pres 2|75=Pres 3|100=Pres 4');

    // El riesgo anotado de P-09: al reabrir el ítem, ¿vuelven sus descriptores?
    IV.modalInstrumento(creado);
    body = doc.querySelector('.modal-body');
    const filas = body.querySelectorAll('.apartado-fila');
    check('P-09 · al reabrir, cada ítem recupera su nombre y su criterio marcado',
      filas.length === 2 && filas[0].querySelector('.ap-desc').value === 'Ortografía' &&
      filas[1].querySelector('.ap-desc').value === 'Presentación' &&
      filas[0].querySelectorAll('.chip input:checked').length === 1);
    check('P-09 · al reabrir, los descriptores propios vuelven a la cuadrícula',
      nivelesDe(filas[0]).join('|') === '25=Ort 1|50=Ort 2|75=Ort 3|100=Ort 4' &&
      nivelesDe(filas[1]).join('|') === '25=Pres 1|50=Pres 2|75=Pres 3|100=Pres 4',
      nivelesDe(filas[0]).join('|') + ' / ' + nivelesDe(filas[1]).join('|'));

    // Editar un descriptor y guardar: persiste y no arrastra al otro ítem.
    filas[1].querySelectorAll('.ap-nv')[0].value = 'Presentación revisada';
    doc.querySelector('.guardar').click();
    const editado = db.instrumentos.find(i => i.id === creado.id);
    check('P-09 · editar un descriptor y guardar lo persiste sin tocar el otro ítem',
      editado.apartados[1].niveles[0].descriptor === 'Presentación revisada' &&
      editado.apartados[0].niveles[0].descriptor === 'Ort 1' &&
      editado.apartados[0].niveles.length === 4 && editado.apartados[1].niveles.length === 4);

    // Validación: un ítem con menos de dos descriptores no se guarda.
    const antesVal = JSON.stringify(editado.apartados);
    const alertasAntes = app.alertas.length;
    IV.modalInstrumento(editado);
    body = doc.querySelector('.modal-body');
    body.querySelectorAll('.apartado-fila')[0].querySelectorAll('.ap-nv').forEach((inp, i) => {
      if (i > 0) inp.value = '';
    });
    doc.querySelector('.guardar').click();
    check('P-09 · un ítem con menos de dos descriptores no se guarda y se explica',
      app.alertas.length === alertasAntes + 1 && /al menos dos descriptores/.test(app.alertas[alertasAntes]) &&
      JSON.stringify(db.instrumentos.find(i => i.id === creado.id).apartados) === antesVal &&
      !!doc.querySelector('.modal-body'));
    doc.querySelector('.cancelar').click();

    // Ítems con distinto número de niveles: la cuadrícula enseña la unión,
    // pero al guardar cada ítem conserva EXACTAMENTE sus niveles (sin huecos).
    const asigId = app.Calc.asignaturaDeClase('cl-l6a').id;
    const critAsig = db.criterios.find(c => c.asignaturaId === asigId);
    const dosNiveles = {
      id: 'iDosNiveles', claseId: 'cl-l6a', tipo: 'Rúbrica', titulo: 'Escala mixta',
      fecha: '2026-10-19', periodo: 'T1', saberes: '', unidad: '', nivel: '',
      criteriosModo: 'desglosado', criterioIdsGlobal: '', url: '',
      niveles: [{ pct: 25, descriptor: 'a' }, { pct: 50, descriptor: 'b' },
        { pct: 75, descriptor: 'c' }, { pct: 100, descriptor: 'd' }],
      apartados: [
        { id: 'm1', orden: 1, descripcion: 'Cuatro niveles', maxPts: 100, peso: 1,
          criterioIds: [critAsig.id],
          niveles: [{ pct: 25, descriptor: 'a' }, { pct: 50, descriptor: 'b' },
            { pct: 75, descriptor: 'c' }, { pct: 100, descriptor: 'd' }] },
        { id: 'm2', orden: 2, descripcion: 'Dos niveles', maxPts: 100, peso: 1,
          criterioIds: [critAsig.id],
          niveles: [{ pct: 50, descriptor: 'b' }, { pct: 100, descriptor: 'd' }] }
      ]
    };
    db.instrumentos.push(dosNiveles);
    IV.modalInstrumento(dosNiveles);
    body = doc.querySelector('.modal-body');
    const filasMix = body.querySelectorAll('.apartado-fila');
    check('P-09 · la cuadrícula enseña la unión de niveles de todos los ítems',
      filasMix[1].querySelectorAll('.ap-nv').length === 4);
    check('P-09 · el ítem de dos niveles deja vacías las columnas que no tiene',
      nivelesDe(filasMix[1]).join('|') === '25=|50=b|75=|100=d');
    doc.querySelector('.guardar').click();
    check('P-09 · guardar sin tocar nada conserva los dos niveles del ítem',
      dosNiveles.apartados[1].niveles.map(n => n.pct + '=' + n.descriptor).join('|') === '50=b|100=d');

    // Salto «Nuevo instrumento (Rúbrica) → Importar rúbrica (IA)».
    IV.modalInstrumento(null, 'cl-l6a');
    body = doc.querySelector('.modal-body');
    body.querySelector('#f-periodo').value = 'T3';
    const tipo2 = body.querySelector('#f-tipo');
    tipo2.value = 'Rúbrica';
    tipo2._dispara('change');
    body.querySelector('#btn-importar-rub').click();
    const asig6 = app.Calc.asignaturaDeClase('cl-l6a');
    check('P-09 · «Importar rúbrica (IA)» abre el importador con el periodo elegido',
      !!doc.querySelector('#ia-json') && doc.querySelector('#ia-periodo').value === 'T3');
    check('P-09 · el importador trae las instrucciones de la asignatura',
      doc.querySelector('#ia-prompt').value.length > 100 &&
      doc.querySelector('#ia-prompt').value.includes(asig6.nombre));

    const crit6 = db.criterios.filter(c => c.asignaturaId === asig6.id);
    const rub = {
      tipo: 'rubrica-evalcrit', version: 1, titulo: 'Rúbrica pegada en el modal', nivel: '',
      items: [
        { criterio: 'Primero', peso: 2, criterios: [crit6[0].codigo],
          niveles: [{ pct: 25, descriptor: 'p1' }, { pct: 100, descriptor: 'p2' }] },
        { criterio: 'Segundo', peso: 1, criterios: [crit6[1].codigo],
          niveles: [{ pct: 25, descriptor: 'q1' }, { pct: 100, descriptor: 'q2' }] }
      ]
    };
    doc.querySelector('#ia-json').value = JSON.stringify(rub);
    const nAntesIa = db.instrumentos.length;
    doc.querySelector('.guardar').click();
    const importada = db.instrumentos[db.instrumentos.length - 1];
    check('P-09 · pegar la respuesta de la IA y guardar crea la rúbrica',
      db.instrumentos.length === nAntesIa + 1 && importada.titulo === 'Rúbrica pegada en el modal' &&
      importada.apartados[1].niveles.map(n => n.descriptor).join(',') === 'q1,q2');

    // Un texto que no es JSON no crea nada y avisa dentro del modal.
    IV.modalInstrumento(null, 'cl-l6a');
    body = doc.querySelector('.modal-body');
    const tipo3 = body.querySelector('#f-tipo');
    tipo3.value = 'Rúbrica';
    tipo3._dispara('change');
    body.querySelector('#btn-importar-rub').click();
    doc.querySelector('#ia-json').value = '{ esto no es json';
    const nAntesMal = db.instrumentos.length;
    const alertasMal = app.alertas.length;
    doc.querySelector('.guardar').click();
    check('P-09 · un JSON inválido en el importador no crea nada y avisa',
      db.instrumentos.length === nAntesMal && app.alertas.length === alertasMal + 1 &&
      /JSON válido/.test(app.alertas[alertasMal]) && !!doc.querySelector('.modal-body'));
    doc.querySelector('.cancelar').click();
  }

  console.log('\n== Modales reales: alta y edición en el resto de vistas (P-09) ==');
  {
    const app = cargarApp({ dom: true });
    app.Storage.load();
    await importarJson(app, estadoPrueba());
    const doc = app.document;
    const v = doc.getElementById('app');
    const db = app.Storage.db;
    const modal = () => doc.querySelector('.modal-body');
    const guardar = () => doc.querySelector('.guardar').click();

    // --- Grupos y alumnado (vista «Alumnos y grupos») ---
    app.App.ir('alumnos');
    const nG = db.grupos.length;
    v.querySelector('#add-grupo').click();
    modal().querySelector('#f-nombre').value = '  4ºB  ';
    modal().querySelector('#f-etapa').value = 'Infantil';
    guardar();
    const grupoNuevo = db.grupos[db.grupos.length - 1];
    check('P-09 · «Nuevo grupo» crea el grupo con lo escrito en el formulario',
      db.grupos.length === nG + 1 && grupoNuevo.nombre === '4ºB' && grupoNuevo.etapa === 'Infantil');

    const g0 = db.grupos[0];
    const nombreG0 = g0.nombre;
    v.querySelector('.editar-grupo').click();
    check('P-09 · el modal de edición de grupo llega relleno',
      modal() && modal().querySelector('#f-nombre').value === nombreG0);
    modal().querySelector('#f-nombre').value = nombreG0 + ' (editado)';
    guardar();
    check('P-09 · editar un grupo conserva su id (y con él su alumnado)',
      db.grupos.filter(g => g.id === g0.id).length === 1 &&
      db.grupos.find(g => g.id === g0.id).nombre === nombreG0 + ' (editado)');

    v.querySelectorAll('#lista-grupos li[data-id]')[0].click();
    const nA = db.alumnos.length;
    v.querySelector('#add-alumno').click();
    check('P-09 · el modal de alumno nuevo pide nombre, apellidos y grupo',
      !!modal().querySelector('#f-nombre') && !!modal().querySelector('#f-apellidos') &&
      !!modal().querySelector('#f-grupo'));
    modal().querySelector('#f-nombre').value = 'Ada';
    modal().querySelector('#f-apellidos').value = 'Lovelace';
    modal().querySelector('#f-grupo').value = g0.id;
    guardar();
    const alumnoNuevo = db.alumnos[db.alumnos.length - 1];
    check('P-09 · «Nuevo alumno» lo crea en el grupo elegido',
      db.alumnos.length === nA + 1 && alumnoNuevo.nombre === 'Ada' &&
      alumnoNuevo.apellidos === 'Lovelace' && alumnoNuevo.grupoId === g0.id);

    const nA2 = db.alumnos.length;
    v.querySelector('#add-varios').click();
    modal().querySelector('#f-lista').value = 'Turing, Alan\nHopper, Grace\n\nTuring, Alan';
    guardar();
    check('P-09 · «Añadir varios» crea uno por línea e ignora los repetidos',
      db.alumnos.length === nA2 + 2 &&
      db.alumnos.filter(a => a.apellidos === 'Turing').length === 1 &&
      db.alumnos.find(a => a.apellidos === 'Turing').nombre === 'Alan');
    const alertasVarios = app.alertas.length;
    v.querySelector('#add-varios').click();
    modal().querySelector('#f-lista').value = 'Turing, Alan';
    const nA3 = db.alumnos.length;
    guardar();
    check('P-09 · el alta masiva sin novedades avisa y no cierra el modal',
      db.alumnos.length === nA3 && app.alertas.length === alertasVarios + 1 && !!modal());
    doc.querySelector('.cancelar').click();

    // --- Asignaturas y clases (vista «Asignaturas y clases») ---
    app.App.ir('clases');
    const nAsig = db.asignaturas.length;
    v.querySelector('#add-asig').click();
    modal().querySelector('#f-modo').value = 'blanco';
    modal().querySelector('#f-modo')._dispara('change');
    modal().querySelector('#f-nombre').value = 'Taller de ajedrez';
    modal().querySelector('#f-etapa').value = 'Primaria';
    guardar();
    const asigNueva = db.asignaturas[db.asignaturas.length - 1];
    check('P-09 · «Nueva asignatura» en blanco usa el nombre del formulario',
      db.asignaturas.length === nAsig + 1 && asigNueva.nombre === 'Taller de ajedrez' &&
      asigNueva.curso === '');

    const asig0 = db.asignaturas[0];
    const nombreAsig0 = asig0.nombre;
    const critAsig0 = db.criterios.filter(c => c.asignaturaId === asig0.id).length;
    v.querySelector('.editar-asig').click();
    check('P-09 · el modal de edición de asignatura llega relleno',
      modal() && modal().querySelector('#f-nombre').value === nombreAsig0);
    modal().querySelector('#f-nombre').value = nombreAsig0 + ' (editada)';
    modal().querySelector('#f-curso').value = '5º';
    guardar();
    const asigEditada = db.asignaturas.find(a => a.id === asig0.id);
    check('P-09 · editar una asignatura cambia la etiqueta pero no su currículo',
      asigEditada.nombre === nombreAsig0 + ' (editada)' && asigEditada.curso === '5º' &&
      db.criterios.filter(c => c.asignaturaId === asig0.id).length === critAsig0);

    let par = null;
    for (const a of db.asignaturas) {
      for (const g of db.grupos) {
        if (!db.clases.some(c => c.asignaturaId === a.id && c.grupoId === g.id)) { par = { a, g }; break; }
      }
      if (par) break;
    }
    const nCl = db.clases.length;
    v.querySelector('#add-clase').click();
    modal().querySelector('#f-asig').value = par.a.id;
    modal().querySelector('#f-grupo').value = par.g.id;
    guardar();
    check('P-09 · «Nueva clase» combina la asignatura y el grupo elegidos',
      db.clases.length === nCl + 1 &&
      db.clases[db.clases.length - 1].asignaturaId === par.a.id &&
      db.clases[db.clases.length - 1].grupoId === par.g.id);
    const nCl2 = db.clases.length;
    const alertasClase = app.alertas.length;
    v.querySelector('#add-clase').click();
    modal().querySelector('#f-asig').value = par.a.id;
    modal().querySelector('#f-grupo').value = par.g.id;
    guardar();
    check('P-09 · una clase repetida se rechaza con aviso y sin duplicar',
      db.clases.length === nCl2 && app.alertas.length === alertasClase + 1 &&
      /ya existe/.test(app.alertas[alertasClase]) && !!modal());
    doc.querySelector('.cancelar').click();

    // --- Niveles ACI (desde el botón de la clase) ---
    const claseAci = db.clases.find(c => app.Calc.alumnosDeClase(c.id).length);
    const alumnoAci = app.Calc.alumnosDeClase(claseAci.id)[0];
    v.querySelector('.aci-clase[data-id="' + claseAci.id + '"]').click();
    const bodyAci = modal();
    check('P-09 · el modal ACI se abre para esa clase', !!bodyAci && !!bodyAci.querySelector('#add-nivel-aci'));
    bodyAci.querySelector('#add-nivel-aci').click();
    const filaAci = bodyAci.querySelector('.nivel-aci-fila:last-child');
    check('P-09 · «Añadir nivel» añade una fila de nivel ACI', !!filaAci && !!filaAci.querySelector('.nv-cod'));
    filaAci.querySelector('.nv-cod').value = 'b';
    filaAci.querySelector('.nv-cod')._dispara('input');
    filaAci.querySelector('.nv-etq').value = '5º';
    const asigAci = db.asignaturas.find(a => a.id !== claseAci.asignaturaId);
    filaAci.querySelector('.nv-asig').value = asigAci.id;
    bodyAci.querySelector('.alu-nivel').value = 'B';
    guardar();
    const claseGuardada = db.clases.find(c => c.id === claseAci.id);
    check('P-09 · el modal ACI guarda el nivel (código en mayúsculas) y su currículo',
      claseGuardada.nivelesAci.some(n => n.codigo === 'B' && n.etiqueta === '5º' && n.asignaturaId === asigAci.id));
    check('P-09 · el modal ACI asigna el alumnado al nivel elegido',
      claseGuardada.adaptaciones[alumnoAci.id] === 'B');

    // --- Currículo: competencia específica y criterio ---
    app.App.ir('curriculo');
    const nEsp = db.competenciasEspecificas.length;
    v.querySelector('#add-esp').click();
    modal().querySelector('#f-cod').value = 'CE9';
    modal().querySelector('#f-desc').value = 'Competencia de prueba';
    guardar();
    check('P-09 · «Añadir» competencia específica la guarda en el currículo',
      db.competenciasEspecificas.length === nEsp + 1 &&
      db.competenciasEspecificas[db.competenciasEspecificas.length - 1].codigo === 'CE9');

    const nCrit = db.criterios.length;
    v.querySelector('#add-crit').click();
    const bc = modal();
    bc.querySelector('#f-cod').value = 'PRUEBA 1.1';
    bc.querySelector('#f-desc').value = 'Criterio de prueba';
    bc.querySelector('#f-peso').value = '30';
    const chipEsp = bc.querySelectorAll('[data-campo=esp] input')[0];
    chipEsp.checked = true;
    chipEsp._dispara('change');
    guardar();
    const critNuevo = db.criterios[db.criterios.length - 1];
    check('P-09 · «Nuevo criterio» guarda código, peso y competencia específica',
      db.criterios.length === nCrit + 1 && critNuevo.codigo === 'PRUEBA 1.1' &&
      critNuevo.peso === 30 && critNuevo.espIds.length === 1);

    const nCrit2 = db.criterios.length;
    const alertasCrit = app.alertas.length;
    v.querySelector('#add-crit').click();
    modal().querySelector('#f-cod').value = 'PRUEBA 1.2';
    modal().querySelector('#f-desc').value = 'Sin competencia';
    modal().querySelector('#f-peso').value = '10';
    guardar();
    check('P-09 · un criterio sin competencia específica no se guarda y se explica',
      db.criterios.length === nCrit2 && app.alertas.length === alertasCrit + 1 &&
      /competencia específica/.test(app.alertas[alertasCrit]) && !!modal());
    doc.querySelector('.cancelar').click();
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
      (css.includes('.informe-seccion table { break-before: avoid; page-break-before: avoid;') ||
       css.includes('break-before: avoid; page-break-before: avoid;')));
    check('las tablas del informe pueden partirse entre páginas (sin página en blanco)',
      /\.informe-seccion table \{[^}]*page-break-inside: auto/.test(css));
    check('cada sección del informe (nivel) empieza en una hoja nueva',
      css.includes('.informe-seccion + .informe-seccion { break-before: page; page-break-before: always; }'));

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

  console.log('\n== Banco de instrumentos: filtro por asignatura (UI) ==');
  {
    // El filtro vive en el modal, así que necesita el DOM real. Las opciones
    // salen de lo guardado: si no hay moldes de una asignatura, no aparece.
    const app = cargarApp({ dom: true });
    app.Storage.load();
    await importarJson(app, estadoBanco());
    const S = app.Storage;
    const el = app.document.createElement('div');
    const abre = () => {
      app.Storage.db.bancoInstrumentos = app.Storage.db.bancoInstrumentos || [];
      app.InstrumentosView.modalBanco(el);
      return app.document.querySelector('.modal-body');
    };

    // Banco vacío: ni filtro ni filas, pero sí el aviso de cómo llenarlo.
    const bodyVacio = abre();
    check('con el banco vacío no hay filtro y se explica cómo llenarlo',
      !bodyVacio.querySelector('#banco-filtro') &&
      bodyVacio.textContent.includes('Todavía no has guardado'));

    // Un solo molde (una sola asignatura): el filtro no aporta y no se pinta.
    S.guardarEnBanco(S.db.instrumentos.find(i => i.id === 'i1')); // Matemáticas 6º
    const bodyUno = abre();
    check('con una sola asignatura el filtro no aparece',
      !bodyUno.querySelector('#banco-filtro'), bodyUno.querySelector('#banco-filtro') ? 'aparece' : 'no aparece');

    // Dos asignaturas distintas: aparece el filtro, con conteo por asignatura.
    const molde4 = JSON.parse(JSON.stringify(S.db.bancoInstrumentos[0]));
    molde4.id = 'm4f';
    molde4.titulo = 'Control 4º';
    molde4.origen.asignatura = 'Matemáticas 4º';
    S.db.bancoInstrumentos.push(molde4);
    const body = abre();
    const sel = body.querySelector('#banco-filtro');
    check('con dos asignaturas aparece el filtro', !!sel);
    check('las opciones del filtro salen de lo guardado, con su conteo',
      sel && [...sel.children].map(o => o.textContent).join(' | ') === 'Todas las asignaturas (2) | Matemáticas 4º (1) | Matemáticas 6º (1)',
      sel ? [...sel.children].map(o => o.textContent).join(' | ') : '(sin filtro)');

    // Filtrar oculta las filas de las demás asignaturas.
    sel.value = 'Matemáticas 4º';
    sel._dispara('change');
    const visibles = body.querySelectorAll('.fila-banco').filter(f => f.style.display !== 'none');
    check('filtrar por una asignatura deja solo sus instrumentos',
      visibles.length === 1 && visibles[0].dataset.asignatura === 'Matemáticas 4º',
      visibles.map(f => f.dataset.asignatura).join(', '));

    // Volver a «Todas» las muestra otra vez.
    sel.value = '';
    sel._dispara('change');
    check('volver a «Todas» muestra de nuevo todo el banco',
      body.querySelectorAll('.fila-banco').filter(f => f.style.display !== 'none').length === 2);
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
    check('el texto del hallazgo incluye la descripción del criterio',
      hCrit.some(h => h.criterioId === 'k1' && h.texto.includes('Operaciones')));
    const hPreg = hall.filter(h => h.tipo === 'pregunta');
    check('pregunta i1/p1 con 75% de fallos', hPreg.some(h => h.instrumentoId === 'i1' && h.pct === 75));
    check('la pregunta i2/p2 también aparece (umbral 50%)', hPreg.some(h => h.instrumentoId === 'i2' && h.pct === 75));
    check('los críticos van primero', hall[0].nivel === 'critico');

    // distribucionNotas
    const dist = C.distribucionNotas('c1', t1);
    check('distribución tiene 4 notas', dist.notas.length === 4);
    check('media de la distribución = 3,875', Math.abs(dist.media - 3.875) < 1e-9, String(dist.media));
    check('buckets: 10 rangos', dist.buckets.length === 10);
    const totalBuckets = dist.buckets.reduce((s, b) => s + b.cantidad, 0);
    check('suma de buckets = 4', totalBuckets === 4);

    // distribucionNotas con filtro de nivel (D-59: filtro base/ACI)
    const distBase = C.distribucionNotas('c1', t1, '');
    check('distribución filtrada por base = mismo alumnado', distBase.notas.length === 4);
    const distAci = C.distribucionNotas('c1', t1, '4');
    check('distribución filtrada por un nivel sin alumnado = vacía',
      distAci.notas.length === 0 && distAci.media === null);
  }

  console.log('\n== Informe: vista renderizada (D-59) ==');
  // Hallazgos: resumen de severidad, dos tablas y barra de porcentaje.
  {
    const app = cargarApp();
    app.Storage.load();
    await importarJson(app, estadoInforme());
    const chips = [
      { dataset: { subvista: 'hallazgos' } },
      { dataset: { subvista: 'criterios' } },
      { dataset: { subvista: 'distribucion' } },
      { dataset: { subvista: 'alumnos' } }
    ];
    const el = makeEl({ querySelectorAll: sel => (sel === '[data-subvista]' ? chips : []) });
    app.InformeView.render(el, { claseSel: 'c1', nivelSel: '__todas__' });
    const h = el.innerHTML;
    check('el informe muestra el resumen de severidad',
      /\d+ críticos?/.test(h) && h.includes('de atención'), h.slice(0, 160));
    check('los hallazgos salen en dos tablas (criterios y preguntas)',
      h.includes('Criterios con dificultades') && h.includes('Preguntas con fallos'));
    check('cada hallazgo lleva barra de porcentaje y chip de filtro',
      h.includes('min-width:70px') && h.includes('data-filtrosev'));

    // Subvista Alumnos: quién va por debajo del 50%, ordenado por riesgo.
    chips[3].onclick();
    const ha = el.innerHTML;
    check('la vista Alumnos resume cuántos alumnos hay en riesgo',
      ha.includes('<strong>3 de 4</strong>'), ha.slice(0, 160));
    const iDiego = ha.indexOf('Muybajo, Diego');
    const iBenito = ha.indexOf('Bajo, Benito');
    const iCarla = ha.indexOf('Regular, Carla');
    check('los alumnos en riesgo van ordenados (más criterios y nota más baja primero)',
      iDiego !== -1 && iBenito !== -1 && iCarla !== -1 && iDiego < iBenito && iBenito < iCarla,
      'indices=' + [iDiego, iBenito, iCarla].join(','));
    check('el alumno sin problemas no aparece en la lista de riesgo', !ha.includes('Alta, Ana'));

    // Informe de análisis para PDF: todas las subvistas compuestas.
    const infAn = app.InformeView.informeHtml();
    check('el informe de análisis lleva cabecera de clase y alcance',
      infAn.includes('Informe de análisis') && infAn.includes('Matemáticas 6º') && infAn.includes('6ºA'),
      infAn.slice(0, 160));
    check('el informe de análisis imprime las cuatro subvistas',
      infAn.includes('>Hallazgos</h2>') && infAn.includes('>Criterios</h2>')
      && infAn.includes('>Distribución</h2>') && infAn.includes('>Alumnos en riesgo</h2>'));
  }

  // Criterios y Distribución con niveles: una tabla por nivel y filtro de alumnado.
  {
    const app = cargarApp();
    app.Storage.load();
    await importarJson(app, estadoAci());
    const chips = [
      { dataset: { subvista: 'hallazgos' } },
      { dataset: { subvista: 'criterios' } },
      { dataset: { subvista: 'distribucion' } }
    ];
    const el = makeEl({ querySelectorAll: sel => (sel === '[data-subvista]' ? chips : []) });
    const opciones = { claseSel: 'c1', nivelSel: '__todas__' };
    app.InformeView.render(el, opciones);

    // Criterios: una tabla por nivel, cada una con SUS criterios.
    chips[1].onclick();
    const hc = el.innerHTML;
    const nTablas = (hc.match(/tabla-cuadricula/g) || []).length;
    check('«Todos los niveles» dibuja una tabla por nivel', nTablas === 2, 'tablas=' + nTablas);
    check('cada tabla lleva el título de su nivel',
      hc.includes('>Base</h3>') && hc.includes('>4º</h3>'));
    check('la tabla base usa los criterios base (C1, C2)', hc.includes('C1') && hc.includes('C2'));
    check('la tabla del ACI usa sus propios criterios (A1)', hc.includes('A1'));
    check('la descripción del criterio se ve en el tooltip de su cabecera',
      hc.includes('title="c1"') && hc.includes('title="a1"'));
    check('los alumnos base salen en la tabla base', hc.includes('Base, Ana') && hc.includes('Base, Beto'));
    check('los alumnos ACI salen con datos en su tabla',
      hc.includes('Aci, Carla') && hc.includes('75%'));

    // Distribución: el nivel del selector decide qué alumnado cuenta.
    chips[2].onclick();
    const hd = el.innerHTML;
    check('distribución con «Todos los niveles» cuenta a los 4 alumnos',
      hd.includes('4 de 4 aprueban'), hd.slice(-160));
    opciones.nivelSel = '';
    app.InformeView.render(el, opciones);
    const hb = el.innerHTML;
    check('distribución en Base solo cuenta a los 2 alumnos base',
      hb.includes('2 de 2 aprueban') && hb.includes('alumnado de <b>Base</b>'), hb.slice(0, 160));
  }

  console.log('\n== Inicio: paneles de estado (dashboard) ==');
  {
    const app = cargarApp();
    app.Storage.load();
    await importarJson(app, estadoPaneles());
    const P = app.App.panelesInicio;

    const est = P.estado();
    check('estado por clase lista todas las clases', (est.match(/fila-inicio/g) || []).length === 3, est);
    check('estado por clase muestra asignatura y grupo', est.includes('Matemáticas 6º') && est.includes('6ºA'));
    check('estado cuenta el alumnado del grupo', est.includes('<td class="num">3</td>'));
    check('estado marca lo que falta por corregir', est.includes('1 por corregir'), est);
    check('estado avisa de las clases sin instrumentos', est.includes('sin instrumentos'));

    const cob = P.cobertura();
    check('cobertura detecta una asignatura sin criterios', cob.includes('Lengua 6º') && cob.includes('sin criterios definidos'), cob);
    check('cobertura detecta pesos que no suman 100', cob.includes('suman 90'), cob);
    check('cobertura detecta criterios sin competencias clave', cob.includes('sin competencias clave asignadas'), cob);

    const aci = P.aci();
    check('el panel ACI lista los niveles con su alumnado', aci.includes('Nivel 1 · 1 alumno'), aci);
    check('el panel ACI solo incluye clases con niveles', !aci.includes('Lengua 6º'));

    // Sin clases no se muestran paneles (la portada no enseña tablas vacías).
    app.Storage.db.clases = [];
    check('sin clases no se muestra el panel de estado', P.estado() === '');
    check('sin clases no se muestra el panel ACI', P.aci() === '');
  }

  console.log('\n== Auditoría del curso de prueba (3 grupos · 6 clases · ACI · 9 UD) ==');
  {
    const estado = estadoPrueba();
    const r = resumen(estado);
    const app = cargarApp();
    app.Storage.load();
    await importarJson(app, estado);
    const { Calc, Storage } = app;
    const db = Storage.db;
    const clases = db.clases;
    const instsDe = c => Calc.instrumentosDeClase(c.id);

    // Currículos implicados: los de cada clase y los de cada nivel ACI.
    const enUso = [];
    clases.forEach(c => {
      if (enUso.indexOf(c.asignaturaId) === -1) enUso.push(c.asignaturaId);
      Calc.nivelesAciDeClase(c.id).forEach(n => {
        if (n.asignaturaId && enUso.indexOf(n.asignaturaId) === -1) enUso.push(n.asignaturaId);
      });
    });

    // ¿Las notas de este alumnado en este instrumento pueden puntuar? Depende del
    // currículo (no de si hay notas): sus criterios deben aparecer en algún
    // apartado del instrumento (o en los criterios globales, en modo global).
    const puede = (inst, aluId) => {
      const ids = new Set(Calc.criteriosDeAlumno(inst.claseId, aluId).map(cr => cr.id));
      if (inst.criteriosModo === 'global') return (inst.criterioIdsGlobal || []).some(id => ids.has(id));
      return (inst.apartados || []).some(ap => (ap.criterioIds || []).some(id => ids.has(id)));
    };

    console.log('  escenario: ' + r.grupos + ' grupos · ' + r.alumnos + ' alumnos · ' + r.clases + ' clases · '
      + r.asignaturas + ' currículos · ' + r.instrumentos + ' instrumentos (' + r.tipos.join(', ') + ') · '
      + r.unidades + ' unidades · ' + r.alumnadoAdaptado + ' ACI');

    // --- A. El escenario es el que se pidió ---
    check('A1 · 3 grupos (6ºA, 6ºB, 4ºA)', r.grupos === 3 && db.grupos.map(g => g.nombre).join(',') === '6ºA,6ºB,4ºA');
    check('A2 · 6 clases (asignatura · grupo)', r.clases === 6);
    check('A3 · 21 alumnos repartidos en los 3 grupos', r.alumnos === 21);
    check('A4 · 8 currículos importados de las plantillas oficiales', r.asignaturas === 8);
    check('A5 · al menos 9 unidades didácticas distintas', r.unidades >= 9, 'UD=' + r.unidades);
    check('A6 · instrumentos de los 4 tipos', r.tipos.length === 4, r.tipos.join(','));
    check('A7 · hay instrumentos con unidad y sin unidad', db.instrumentos.some(i => i.unidad) && db.instrumentos.some(i => !i.unidad));
    check('A8 · hay un instrumento en modo «global»', db.instrumentos.some(i => i.criteriosModo === 'global'));
    check('A9 · TODAS las clases tienen alumnado con ACI', clases.every(c => Object.keys(c.adaptaciones || {}).length > 0));
    check('A10 · hay una clase con dos niveles ACI', clases.some(c => Calc.nivelesAciDeClase(c.id).length > 1));
    check('A11 · el currículo de cada nivel ACI es de otro curso',
      clases.every(c => Calc.nivelesAciDeClase(c.id).every(n => {
        const base = Calc.asignaturaDeClase(c.id);
        const aci = Calc.asignatura(n.asignaturaId);
        return aci && base && aci.curso !== base.curso;
      })));

    // --- B. La importación es limpia y estable ---
    check('B1 · importar el volcado no exige reparaciones', Storage.reparadosCriterios === 0,
      'reparados=' + Storage.reparadosCriterios);
    const idsClase = new Set(clases.map(c => c.id));
    check('B2 · ningún instrumento huérfano de clase', db.instrumentos.every(i => idsClase.has(i.claseId)));
    const idsInst = new Set(db.instrumentos.map(i => i.id));
    check('B3 · ningún registro cuelga de un instrumento inexistente', Object.keys(db.registros).every(k => idsInst.has(k)));
    const idsGrupo = new Set(db.grupos.map(g => g.id));
    check('B4 · ningún alumno huérfano de grupo', db.alumnos.every(a => idsGrupo.has(a.grupoId)));
    const idsAlum = new Set(db.alumnos.map(a => a.id));
    check('B5 · ningún registro de alumnado inexistente', Object.keys(db.registros).every(k =>
      Object.keys(db.registros[k]).every(a => idsAlum.has(a))));

    const app2 = cargarApp();
    app2.Storage.load();
    await importarJson(app2, estado);
    const db2 = app2.Storage.db;
    check('B6 · reimportar el mismo JSON da los mismos recuentos',
      db2.criterios.length === db.criterios.length && db2.instrumentos.length === db.instrumentos.length
      && Object.keys(db2.registros).length === Object.keys(db.registros).length);
    const notasDe = (a, claseId) => a.Calc.alumnosDeClase(claseId).map(al => a.Calc.notaEvaluacion(claseId, al.id, 'Final'));
    check('B7 · las notas sobreviven a exportar/importar',
      JSON.stringify(notasDe(app2, 'cl-m6a')) === JSON.stringify(notasDe(app, 'cl-m6a')));

    // --- C. Currículo ---
    check('C1 · todos los currículos en uso tienen criterios',
      enUso.every(id => db.criterios.some(c => c.asignaturaId === id)));
    check('C2 · en cada currículo los pesos suman 100%', enUso.every(id => {
      const s = db.criterios.filter(c => c.asignaturaId === id).reduce((t, c) => t + (Number(c.peso) || 0), 0);
      return Math.abs(s - 100) < 0.01;
    }), enUso.map(id => (Calc.asignatura(id) || {}).nombre).join(', '));
    const idsAsig = new Set(db.asignaturas.map(a => a.id));
    check('C3 · ningún criterio huérfano de asignatura', db.criterios.every(c => idsAsig.has(c.asignaturaId)));
    const idsEsp = new Set(db.competenciasEspecificas.map(e => e.id));
    check('C4 · cada criterio cuelga de competencias específicas existentes',
      db.criterios.every(c => (c.espIds || []).length && c.espIds.every(id => idsEsp.has(id))));
    check('C5 · cada competencia específica pertenece a su asignatura',
      db.competenciasEspecificas.every(e => idsAsig.has(e.asignaturaId)));
    const ceVacias = [];
    enUso.forEach(id => {
      const a = Calc.asignatura(id);
      db.competenciasEspecificas.filter(e => e.asignaturaId === id
        && !db.criterios.some(c => c.espIds.includes(e.id))).forEach(e => ceVacias.push(a.nombre + ' ' + e.codigo));
    });
    aviso('C6 · ninguna competencia específica se queda sin criterios', ceVacias.length > 0,
      ceVacias.length + ' sin criterios: ' + ceVacias.join(', '));
    const sinClaves = [];
    enUso.forEach(id => {
      const a = Calc.asignatura(id);
      db.criterios.filter(c => c.asignaturaId === id && !(c.claveIds || []).length)
        .forEach(c => sinClaves.push(a.nombre + ' ' + c.codigo));
    });
    aviso('C7 · todos los criterios traen competencias clave', sinClaves.length > 0,
      sinClaves.length + ' sin ninguna: ' + sinClaves.join(', '));
    check('C8 · los criterios de cada nivel salen de un único currículo', clases.every(c =>
      [''].concat(Calc.nivelesAciDeClase(c.id).map(n => n.codigo)).every(nv =>
        new Set(Calc.criteriosDeNivel(c.id, nv).map(cr => cr.asignaturaId)).size <= 1)));
    check('C9 · el nivel ACI usa exactamente el currículo al que apunta', clases.every(c =>
      Calc.nivelesAciDeClase(c.id).every(n =>
        Calc.criteriosDeNivel(c.id, n.codigo).every(cr => cr.asignaturaId === n.asignaturaId))));

    // --- D. Instrumentos ---
    check('D1 · ningún instrumento evalúa criterios fuera de su nivel',
      db.instrumentos.every(i => Calc.criteriosFueraDeNivel(db, i).length === 0));
    check('D2 · el nivel de cada instrumento existe en su clase', db.instrumentos.every(i =>
      !Calc.nivelNorm(i.nivel) || Calc.nivelesAciDeClase(i.claseId).some(n => n.codigo === Calc.nivelNorm(i.nivel))));
    check('D3 · cada apartado (no global) evalúa al menos un criterio',
      db.instrumentos.filter(i => i.criteriosModo !== 'global')
        .every(i => i.apartados.every(ap => (ap.criterioIds || []).length)));
    check('D4 · el modo global declara criterios y del currículo del nivel', db.instrumentos
      .filter(i => i.criteriosModo === 'global')
      .every(i => (i.criterioIdsGlobal || []).length > 0
        && Calc.criteriosFueraDeNivel(db, i).length === 0));
    check('D5 · toda rúbrica tiene escala sobre 100 y ≥2 niveles con descriptor',
      db.instrumentos.filter(i => i.tipo === 'Rúbrica').every(i => i.apartados.every(ap => {
        const nv = Calc.nivelesDeApartado(i, ap);
        return Number(ap.maxPts) === 100 && nv.length >= 2 && nv.every(n => n.descriptor);
      })));
    check('D6 · todo apartado no-rúbrica tiene puntos máximos',
      db.instrumentos.filter(i => i.tipo !== 'Rúbrica')
        .every(i => i.apartados.every(ap => Number(ap.maxPts) > 0)));
    check('D7 · periodo y fecha válidos en todos los instrumentos',
      db.instrumentos.every(i => ['T1', 'T2', 'T3'].includes(i.periodo) && /^\d{4}-\d{2}-\d{2}$/.test(i.fecha)));
    check('D8 · los apartados van numerados 1..n', db.instrumentos.every(i =>
      i.apartados.every((ap, k) => ap.orden === k + 1)));

    // --- E. Registros ---
    const malas = [];
    db.instrumentos.forEach(i => {
      const fila = db.registros[i.id] || {};
      const aplicables = Calc.alumnosDeInstrumento(i).map(a => a.id);
      Object.keys(fila).forEach(aluId => {
        if (aplicables.indexOf(aluId) === -1) malas.push(i.titulo + ': alumnado no aplicable');
        i.apartados.forEach(ap => {
          const v = fila[aluId][ap.id];
          if (v == null || v === '') return;
          const n = Number(v);
          if (isNaN(n)) malas.push(i.titulo + ': valor no numérico');
          else if (i.tipo === 'Rúbrica') {
            if (!Calc.nivelesDeApartado(i, ap).some(nv => Math.abs(Number(nv.pct) - n) < 1e-9)) {
              malas.push(i.titulo + ': nivel ' + n + ' inexistente');
            }
          } else if (n < 0 || n > Number(ap.maxPts)) malas.push(i.titulo + ': ' + n + ' fuera de 0..' + ap.maxPts);
        });
      });
    });
    check('E1 · toda nota está en rango, con apartado real y alumnado aplicable', malas.length === 0, malas.slice(0, 3).join(' | '));
    check('E2 · ningún registro apunta a un apartado inexistente', db.instrumentos.every(i =>
      Object.keys(db.registros[i.id] || {}).every(aluId =>
        Object.keys(db.registros[i.id][aluId]).every(apId => i.apartados.some(ap => ap.id === apId)))));
    check('E3 · el avance cuadra (corregidos + pendientes = alumnado aplicable)',
      db.instrumentos.every(i => {
        const p = Calc.progresoInstrumento(i);
        return p.hechos + p.pendientes === p.total;
      }));
    check('E4 · el escenario deja instrumentos sin corregir',
      db.instrumentos.filter(i => !Object.keys(db.registros[i.id] || {}).length).length >= 1);
    check('E5 · el alumnado ACI tiene notas en sus instrumentos de nivel',
      db.instrumentos.filter(i => i.nivel && i.nivel !== 'BASE' && Object.keys(db.registros[i.id] || {}).length)
        .every(i => Calc.alumnosDeInstrumento(i).every(a =>
          !puede(i, a.id) || !!((db.registros[i.id] || {})[a.id]))));
    const muertas = [];
    db.instrumentos.forEach(i => Calc.alumnosDeInstrumento(i).forEach(a => {
      if (!puede(i, a.id)) muertas.push(i.titulo + ' → ' + a.apellidos + ', ' + a.nombre);
    }));
    check('E6 · la app no pide corregir celdas que no pueden puntuar', muertas.length === 0,
      muertas.length + ' celda(s): ' + muertas.slice(0, 4).join(' · '));

    // --- F. Motor de cálculo ---
    const baseDe = c => Calc.alumnosDeClase(c.id).filter(a => !Calc.nivelDeAlumno(c.id, a.id));
    const aciDe = c => Calc.alumnosDeClase(c.id).filter(a => !!Calc.nivelDeAlumno(c.id, a.id));
    let malRango = null, malLogro = null, sinNota = null;
    const notas = {};
    clases.forEach(c => {
      notas[c.id] = {};
      Calc.alumnosDeClase(c.id).forEach(a => {
        const n = Calc.notaEvaluacion(c.id, a.id, 'Final');
        notas[c.id][a.id] = n;
        if (n == null) sinNota = c.id + '/' + a.apellidos;
        else if (n < 0 || n > 10) malRango = c.id + '/' + a.apellidos + '=' + n;
        Calc.criteriosDeAlumno(c.id, a.id).forEach(cr => {
          const l = Calc.logroCriterioEnInsts(cr.id, c.id, a.id, instsDe(c));
          if (l != null && (l < 0 || l > 1)) malLogro = c.id + '/' + cr.codigo + '=' + l;
        });
      });
    });
    check('F1 · todas las notas de evaluación están entre 0 y 10', !malRango, malRango);
    check('F2 · todos los logros por criterio están entre 0 y 1', !malLogro, malLogro);
    check('F3 · ningún alumno del escenario queda sin nota', !sinNota, sinNota);

    // Aislamiento entre currículos: cada alumno se califica SOLO con el suyo.
    const conSolo = filtro => {
      const guardado = Storage.db;
      Storage.db = JSON.parse(JSON.stringify(db));
      Storage.db.instrumentos = Storage.db.instrumentos.filter(filtro);
      const salida = db.clases.map(c => notasDe(app, c.id));
      Storage.db = guardado;
      return salida;
    };
    const soloBase = conSolo(i => !i.nivel || i.nivel === 'BASE');
    const soloAci = conSolo(i => !!i.nivel && i.nivel !== 'BASE');
    const todas = db.clases.map(c => notasDe(app, c.id));
    check('F4 · quitar los instrumentos ACI no cambia la nota del alumnado sin adaptación',
      db.clases.every((c, ci) => Calc.alumnosDeClase(c.id).every((a, ai) =>
        !!Calc.nivelDeAlumno(c.id, a.id) || soloBase[ci][ai] === todas[ci][ai])));
    check('F5 · quitar los instrumentos base/comunes no cambia la nota del alumnado ACI',
      db.clases.every((c, ci) => Calc.alumnosDeClase(c.id).every((a, ai) =>
        !Calc.nivelDeAlumno(c.id, a.id) || soloAci[ci][ai] === todas[ci][ai])));

    let malCE = null, malClave = null;
    clases.forEach(c => Calc.alumnosDeClase(c.id).forEach(a => {
      const nv = Calc.nivelDeAlumno(c.id, a.id);
      Calc.competenciasEspecificasDeNivel(c.id, nv).forEach(e => {
        const n = Calc.notaCompetencia(c.id, a.id, e.id, 'Final');
        if (n != null && (n < 0 || n > 10)) malCE = c.id + '/' + e.codigo + '=' + n;
      });
      Calc.clavesDeNivel(c.id, nv).forEach(k => {
        const n = Calc.notaClave(c.id, a.id, k.id, 'Final');
        if (n != null && (n < 0 || n > 10)) malClave = c.id + '/' + k.codigo + '=' + n;
      });
    }));
    check('F6 · las notas por competencia específica están entre 0 y 10', !malCE, malCE);
    check('F7 · las notas por competencia clave están entre 0 y 10', !malClave, malClave);

    check('F8 · los tramos de la distribución suman las notas contadas', clases.every(c => {
      const d = Calc.distribucionNotas(c.id, instsDe(c));
      return d.buckets.reduce((s, b) => s + b.cantidad, 0) === d.notas.length;
    }));
    check('F9 · la media de la distribución está entre 0 y 10', clases.every(c => {
      const d = Calc.distribucionNotas(c.id, instsDe(c));
      return d.media == null || (d.media >= 0 && d.media <= 10);
    }));
    check('F10 · la distribución de un nivel ACI cuenta solo a su alumnado', clases.every(c =>
      Calc.nivelesAciDeClase(c.id).every(n =>
        Calc.distribucionNotas(c.id, instsDe(c), n.codigo).notas.length
        === aciDe(c).filter(a => Calc.nivelDeAlumno(c.id, a.id) === n.codigo).length)));
    check('F11 · la distribución de «Base» excluye al alumnado con ACI',
      clases.every(c => Calc.distribucionNotas(c.id, instsDe(c), '').notas.length === baseDe(c).length));

    check('F12 · absoluto y relativo de la tabla de criterios cuadran con el logro', clases.every(c =>
      Calc.tablaCriteriosInforme(c.id, instsDe(c), Calc.criteriosDeClase(c.id)).every(f =>
        f.filas.every(x => x.absoluto === (x.logro == null ? null : x.logro >= 0.5)
          && x.relativo === (x.logro == null || f.media == null ? null : x.logro >= f.media)))));
    check('F13 · la tabla de criterios incluye a todo el grupo', clases.every(c => {
      const t = Calc.tablaCriteriosInforme(c.id, instsDe(c), Calc.criteriosDeClase(c.id));
      return t.length > 0 && t.every(f => f.filas.length === Calc.alumnosDeClase(c.id).length);
    }));

    let dupH = null, ajeno = null, malOrden = null;
    clases.forEach(c => {
      const niveles = [{ etiqueta: 'Base', criterios: Calc.criteriosDeClase(c.id) }]
        .concat(Calc.nivelesAciDeClase(c.id).map(n => ({ etiqueta: n.etiqueta, criterios: Calc.criteriosDeNivel(c.id, n.codigo) })));
      const vistos = new Set();
      niveles.forEach(nv => Calc.hallazgos(c.id, instsDe(c), nv.criterios).forEach(h => {
        if (h.tipo !== 'criterio') return;
        if (vistos.has(h.criterioId)) dupH = c.id + '/' + h.codigo;
        vistos.add(h.criterioId);
        if (!nv.criterios.some(cr => cr.id === h.criterioId)) ajeno = c.id + '/' + h.codigo;
      }));
      const hs = Calc.hallazgos(c.id, instsDe(c), Calc.criteriosDeClase(c.id));
      const orden = { critico: 0, atencion: 1, bien: 2 };
      for (let i = 1; i < hs.length; i++) {
        if (orden[hs[i - 1].nivel] > orden[hs[i].nivel]
          || (hs[i - 1].nivel === hs[i].nivel && hs[i - 1].pct < hs[i].pct)) malOrden = c.id;
      }
    });
    check('F14 · ningún criterio genera dos hallazgos', !dupH, dupH);
    check('F15 · cada hallazgo pertenece al currículo del nivel analizado', !ajeno, ajeno);
    check('F16 · los hallazgos van de más grave a menos', !malOrden, malOrden);
    check('F17 · los hallazgos de pregunta apuntan a instrumentos de su clase', clases.every(c =>
      Calc.hallazgos(c.id, instsDe(c), []).every(h => instsDe(c).some(i => i.id === h.instrumentoId))));

    check('F18 · un instrumento de nivel ACI incluye solo a su alumnado',
      db.instrumentos.filter(i => i.nivel && i.nivel !== 'BASE').every(i =>
        Calc.alumnosDeInstrumento(i).every(a => Calc.nivelDeAlumno(i.claseId, a.id) === Calc.nivelNorm(i.nivel))));
    check('F19 · un instrumento «BASE» excluye al alumnado con ACI',
      db.instrumentos.filter(i => i.nivel === 'BASE').every(i =>
        Calc.alumnosDeInstrumento(i).every(a => !Calc.nivelDeAlumno(i.claseId, a.id))));
    check('F20 · un instrumento común incluye a todo el alumnado sin adaptación',
      db.instrumentos.filter(i => !i.nivel).every(i =>
        Calc.alumnosDeInstrumento(i).length === baseDe(Calc.clase(i.claseId)).length
        && Calc.alumnosDeInstrumento(i).every(a => !Calc.nivelDeAlumno(i.claseId, a.id))));
    check('F21 · el alumnado ACI solo entra en los instrumentos donde puede puntuar',
      db.instrumentos.every(i => Calc.alumnosDeInstrumento(i)
        .every(a => !Calc.nivelDeAlumno(i.claseId, a.id) || puede(i, a.id))));

    // --- G. Vistas ---
    const errores = [];
    clases.forEach(c => {
      try {
        const el = makeEl();
        app.CuadriculaView.render(el, { claseId: c.id });
        app.InstrumentosView.render(el);
        app.CurriculoView.render(el);
        app.ClasesView.render(el);
      } catch (e) { errores.push(c.id + ': ' + e.message); }
    });
    check('G1 · las vistas de las 6 clases se dibujan sin errores', errores.length === 0, errores.join(' | '));

    check('G2 · el imprimible de la cuadrícula lleva tres tablas por nivel', clases.every(c =>
      (app.CuadriculaView.informeHtml(c.id, 'Final', {}).match(/tabla-cuadricula/g) || []).length
      === 3 * (1 + Calc.nivelesAciDeClase(c.id).length)));

    const infErr = [];
    clases.forEach(c => {
      try {
        const el = makeEl();
        app.InformeView.render(el, { claseSel: c.id, nivelSel: '' });
        const html = app.InformeView.informeHtml();
        if (!html.includes('Informe de análisis')) infErr.push(c.id + ': sin cabecera');
        if (!html.includes('informe-seccion')) infErr.push(c.id + ': sin secciones');
      } catch (e) { infErr.push(c.id + ': ' + e.message); }
    });
    check('G3 · el informe se genera en las 6 clases', infErr.length === 0, infErr.join(' | '));
    check('G4 · el informe de criterios usa el currículo de cada nivel', clases.every(c =>
      [''].concat(Calc.nivelesAciDeClase(c.id).map(n => n.codigo)).every(nv => {
        const asig = Calc.asignaturaDeNivel(c.id, nv);
        return Calc.tablaCriteriosInforme(c.id, instsDe(c), Calc.criteriosDeNivel(c.id, nv))
          .every(f => f.criterio.asignaturaId === (asig ? asig.id : null));
      })));

    // --- H. Paneles de Inicio ---
    const P = app.App.panelesInicio;
    const est = P.estado();
    check('H1 · el panel de estado lista las 6 clases', (est.match(/data-clase=/g) || []).length === 6);
    check('H2 · ninguna clase aparece «sin instrumentos»', !est.includes('sin instrumentos'));
    const pendReal = clases.reduce((s, c) => s + instsDe(c).reduce((t, i) => t + Calc.progresoInstrumento(i).pendientes, 0), 0);
    const pendPanel = [...est.matchAll(/(\d+) por corregir/g)].map(m => Number(m[1])).reduce((a, b) => a + b, 0);
    check('H3 · el panel de estado cuenta las mismas celdas pendientes que el motor',
      pendPanel === pendReal, pendPanel + ' vs ' + pendReal);

    const cob = P.cobertura();
    check('H4 · la cobertura no ve currículos sin criterios', !cob.includes('sin criterios definidos'));
    check('H5 · la cobertura no ve pesos distintos de 100%', !cob.includes('suman'));
    aviso('H6 · la cobertura no avisa de criterios sin competencias clave', cob.includes('sin competencias clave'),
      'avisa de Lengua Castellana (perfil de salida de CE10 vacío en las plantillas)');
    const aci = P.aci();
    check('H7 · el panel ACI lista las 6 clases con niveles', (aci.match(/<tr>/g) || []).length === 7);
    const adaptTotal = clases.reduce((s, c) => s + Object.keys(c.adaptaciones).length, 0);
    check('H8 · el panel ACI cuenta el alumnado adaptado',
      [...aci.matchAll(/(\d+) alumno/g)].map(m => Number(m[1])).reduce((a, b) => a + b, 0) === adaptTotal);

    // La cobertura vigila también los currículos que solo usan los niveles ACI.
    const l3 = db.asignaturas.find(a => /Lengua/.test(a.nombre) && a.curso === '3º');
    Storage.db = JSON.parse(JSON.stringify(db));
    Storage.db.criterios = Storage.db.criterios.filter(c => c.asignaturaId !== l3.id);
    check('H9 · la cobertura vigila los currículos de los niveles ACI', (() => {
      const html = P.cobertura();
      return html.includes(l3.nombre) && html.includes('sin criterios definidos');
    })());
    Storage.db = db;

    // --- I. Coherencia global ---
    check('I1 · ningún alumnado con ACI cae fuera de su nivel', clases.every(c =>
      Object.keys(c.adaptaciones).every(al => Calc.nivelDeAlumno(c.id, al) !== '')));
    check('I2 · cada adaptación apunta a un nivel definido en su clase', clases.every(c =>
      Object.keys(c.adaptaciones).every(al =>
        Calc.nivelesAciDeClase(c.id).some(n => n.codigo === Calc.nivelNorm(c.adaptaciones[al])))));
    check('I3 · la cuadrícula de cada clase no mezcla alumnado de otro grupo', clases.every(c =>
      Calc.alumnosDeClase(c.id).every(a => a.grupoId === c.grupoId)));
  }

  console.log('\n' + (fallos ? 'FALLOS: ' + fallos + '/' + total : 'TODO OK: ' + total + ' comprobaciones')
    + (avisos ? ' · ' + avisos + ' aviso(s)' : ''));
  process.exitCode = fallos ? 1 : 0;
}

main().catch(e => { console.error(e); process.exitCode = 1; });
