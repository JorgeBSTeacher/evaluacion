'use strict';
// tools/datos-prueba.js — genera un curso completo de prueba y lo vuelca a
// datos-prueba.json para importarlo en la app real («Importar»).
//
// Escenario: 3 grupos (6ºA, 6ºB, 4ºA) · 6 clases (Lengua y Matemáticas en 6ºA y
// 6ºB; Matemáticas e Inglés en 4ºA) · alumnado con ACI en TODAS las clases ·
// 9 unidades didácticas (UD1–UD9) · instrumentos de los 4 tipos (Control,
// Rúbrica, Proyecto, Otro), incluido uno en modo «global» y otro sin unidad ·
// correcciones a medias (dos instrumentos sin corregir del todo).
//
// Los datos se construyen con las MISMAS funciones que usa la app
// (Storage.importarCurriculo sobre las plantillas LOMLOE incluidas), así que el
// JSON es exactamente lo que la app produce. Los identificadores son
// deterministas: regenerar el volcado no cambia el archivo.
//
// Uso:   node tools/datos-prueba.js
//        const { estadoPrueba } = require('./datos-prueba');   // desde los checks
const fs = require('fs');
const path = require('path');
const { cargarApp, raiz } = require('./arnes');

const CURSO = '2025/2026';
const FECHA = { T1: '2025-11-14', T2: '2026-02-20', T3: '2026-05-15' };
const ETIQUETA = { 3: '3º', 2: '2º', 4: '4º' };

// Currículos oficiales: [plantilla, curso] → asignatura «Nombre curso».
// Las plantillas son por ciclo; el curso se elige al importarlas.
const CURRICULOS = {
  l6: ['lengua-castellana-y-literatura-tercer-ciclo.json', '6º'],
  m6: ['matematicas-tercer-ciclo.json', '6º'],
  m4: ['matematicas-segundo-ciclo.json', '4º'],
  e4: ['lengua-extranjera-segundo-ciclo.json', '4º'],
  l3: ['lengua-castellana-y-literatura-segundo-ciclo.json', '3º'],
  m3: ['matematicas-segundo-ciclo.json', '3º'],
  m2: ['matematicas-primer-ciclo.json', '2º'],
  e2: ['lengua-extranjera-primer-ciclo.json', '2º']
};

// Grupos, alumnado (apellidos, nombre) y quién lleva adaptación.
const GRUPOS = [
  { id: 'g-6a', nombre: '6ºA' },
  { id: 'g-6b', nombre: '6ºB' },
  { id: 'g-4a', nombre: '4ºA' }
];
const ALUMNADO = {
  'g-6a': [['Álvarez', 'Noa'], ['Bermúdez', 'Iván'], ['Cabrera', 'Lucía'], ['Delgado', 'Mateo'],
    ['Escudero', 'Sara'], ['Ferrán', 'Hugo'], ['Gutiérrez', 'Alba'], ['Herrera', 'Pablo']],
  'g-6b': [['Iglesias', 'Emma'], ['Jiménez', 'Diego'], ['Lorenzo', 'Vera'], ['Márquez', 'Nicolás'],
    ['Núñez', 'Julia'], ['Otero', 'Bruno'], ['Prieto', 'Candela']],
  'g-4a': [['Quintana', 'Leo'], ['Rivas', 'Marta'], ['Salas', 'Adrián'], ['Tejeda', 'Elena'],
    ['Uribe', 'Guillem'], ['Valdés', 'Zaira']]
};
// Índice (1-based) del alumnado con adaptación dentro de su grupo.
const ADAPTADO = { 'g-6a': 7, 'g-6b': 5, 'g-4a': 5 };
// Un segundo nivel ACI en Matemáticas 6ºA: dos niveles en la misma clase.
const SEGUNDO_NIVEL = { clase: 'cl-m6a', codigo: '4', alumnoGrupo: ['g-6a', 8], asignatura: 'm4' };

// Clases: asignatura · grupo y el currículo al que apunta su nivel ACI.
const CLASES = [
  { id: 'cl-l6a', asignatura: 'l6', grupo: 'g-6a', nivel: '3', nivelAsignatura: 'l3' },
  { id: 'cl-m6a', asignatura: 'm6', grupo: 'g-6a', nivel: '3', nivelAsignatura: 'm3' },
  { id: 'cl-l6b', asignatura: 'l6', grupo: 'g-6b', nivel: '3', nivelAsignatura: 'l3' },
  { id: 'cl-m6b', asignatura: 'm6', grupo: 'g-6b', nivel: '3', nivelAsignatura: 'm3' },
  { id: 'cl-m4a', asignatura: 'm4', grupo: 'g-4a', nivel: '2', nivelAsignatura: 'm2' },
  { id: 'cl-e4a', asignatura: 'e4', grupo: 'g-4a', nivel: '2', nivelAsignatura: 'e2' }
];

// 9 unidades didácticas repartidas por clase y trimestre. `dif` = dificultad
// media del grupo (para que el informe tenga casos de riesgo creíbles).
// tipo · periodo · unidad · nivel ('' común, 'BASE' solo base, o código ACI).
const INSTRUMENTOS = [
  // --- Lengua Castellana 6º · 6ºA ---
  { clase: 'cl-l6a', tipo: 'Control', titulo: 'Comprensión lectora UD1', periodo: 'T1', unidad: 'UD1', nivel: 'BASE', n: 4, off: 0, dif: 0.62 },
  { clase: 'cl-l6a', tipo: 'Rúbrica', titulo: 'Rúbrica de expresión escrita UD1', periodo: 'T1', unidad: 'UD1', nivel: '3', n: 4, off: 0, dif: 0.6 },
  { clase: 'cl-l6a', tipo: 'Proyecto', titulo: 'Proyecto: podcast literario', periodo: 'T2', unidad: 'UD2', nivel: '', n: 3, off: 6, dif: 0.72 },
  { clase: 'cl-l6a', tipo: 'Otro', titulo: 'Rincón de lectura (registro)', periodo: 'T3', unidad: 'UD3', nivel: '', n: 3, off: 12, dif: 0.78 },

  // --- Matemáticas 6º · 6ºA ---
  { clase: 'cl-m6a', tipo: 'Control', titulo: 'Cálculo y operaciones UD1', periodo: 'T1', unidad: 'UD1', nivel: 'BASE', n: 4, off: 0, dif: 0.55 },
  { clase: 'cl-m6a', tipo: 'Rúbrica', titulo: 'Rúbrica de resolución de problemas UD2', periodo: 'T2', unidad: 'UD2', nivel: '3', n: 4, off: 0, dif: 0.58 },
  { clase: 'cl-m6a', tipo: 'Proyecto', titulo: 'Proyecto: presupuesto familiar', periodo: 'T2', unidad: 'UD3', nivel: '', n: 3, off: 6, dif: 0.7 },
  { clase: 'cl-m6a', tipo: 'Control', titulo: 'Geometría y medida UD4', periodo: 'T3', unidad: 'UD4', nivel: 'BASE', n: 3, off: 11, dif: 0.5, sinCorregir: true },
  { clase: 'cl-m6a', tipo: 'Control', titulo: 'Matemáticas 4º · prueba adaptada', periodo: 'T3', unidad: 'UD4', nivel: '4', n: 3, off: 0, dif: 0.6 },

  // --- Lengua Castellana 6º · 6ºB ---
  { clase: 'cl-l6b', tipo: 'Control', titulo: 'Dictado y ortografía', periodo: 'T1', unidad: 'UD5', nivel: 'BASE', n: 4, off: 2, dif: 0.42 },
  { clase: 'cl-l6b', tipo: 'Rúbrica', titulo: 'Rúbrica de exposición oral UD5', periodo: 'T2', unidad: 'UD5', nivel: '3', n: 4, off: 5, dif: 0.55 },
  { clase: 'cl-l6b', tipo: 'Proyecto', titulo: 'Antología poética UD6', periodo: 'T3', unidad: 'UD6', nivel: '', n: 3, off: 9, dif: 0.75 },

  // --- Matemáticas 6º · 6ºB ---
  { clase: 'cl-m6b', tipo: 'Control', titulo: 'Cálculo mental y estimación', periodo: 'T1', unidad: 'UD5', nivel: 'BASE', n: 3, off: 3, dif: 0.6 },
  { clase: 'cl-m6b', tipo: 'Rúbrica', titulo: 'Rúbrica de resolución colaborativa UD6', periodo: 'T2', unidad: 'UD6', nivel: '3', n: 4, off: 5, dif: 0.52 },
  { clase: 'cl-m6b', tipo: 'Control', titulo: 'Estadística y probabilidad', periodo: 'T3', unidad: 'UD6', nivel: 'BASE', n: 3, off: 12, dif: 0.48, parcial: 2 },

  // --- Matemáticas 4º · 4ºA ---
  { clase: 'cl-m4a', tipo: 'Control', titulo: 'Números y operaciones', periodo: 'T1', unidad: 'UD7', nivel: 'BASE', n: 4, off: 0, dif: 0.65 },
  { clase: 'cl-m4a', tipo: 'Control', titulo: 'Prueba diagnóstica de entrada', periodo: 'T1', unidad: '', nivel: 'BASE', n: 3, off: 13, dif: 0.6 },
  { clase: 'cl-m4a', tipo: 'Rúbrica', titulo: 'Rúbrica de problemas con unidades', periodo: 'T2', unidad: 'UD7', nivel: '2', n: 4, off: 0, dif: 0.55 },
  { clase: 'cl-m4a', tipo: 'Proyecto', titulo: 'Proyecto: el mercado del aula', periodo: 'T3', unidad: 'UD8', nivel: '', n: 3, off: 7, dif: 0.73 },

  // --- Lengua Extranjera 4º · 4ºA ---
  { clase: 'cl-e4a', tipo: 'Control', titulo: 'Vocabulary and grammar UD8', periodo: 'T1', unidad: 'UD8', nivel: 'BASE', n: 4, off: 0, dif: 0.68 },
  { clase: 'cl-e4a', tipo: 'Rúbrica', titulo: 'Rúbrica de producción oral UD9', periodo: 'T2', unidad: 'UD9', nivel: '2', n: 3, off: 0, dif: 0.6 },
  { clase: 'cl-e4a', tipo: 'Control', titulo: 'Listening test UD9', periodo: 'T3', unidad: 'UD9', nivel: 'BASE', n: 4, off: 4, dif: 0.5, global: true, sinCorregir: true }
];

const RUBRICA_NIVELES = [
  { pct: 25, descriptor: 'Iniciado: no lo consigue todavía' },
  { pct: 50, descriptor: 'En proceso: lo consigue con ayuda' },
  { pct: 75, descriptor: 'Conseguido: lo hace de forma autónoma' },
  { pct: 100, descriptor: 'Excelente: lo domina y lo explica' }
];
const ESCALA = [{ pct: 25 }, { pct: 50 }, { pct: 75 }, { pct: 100 }];

// --- Construcción -------------------------------------------------------------

function importarCurriculos(S) {
  const ids = {};
  Object.keys(CURRICULOS).forEach(k => {
    const [fichero, curso] = CURRICULOS[k];
    const datos = JSON.parse(fs.readFileSync(path.join(raiz, 'plantillas', fichero), 'utf8'));
    ids[k] = S.importarCurriculo(datos, { cursos: [curso] }).ids[0];
  });
  return ids;
}

// Reparte los apartados de un instrumento sobre el currículo de SU nivel (los
// códigos nunca salen de ahí: es lo que exige el motor).
function apartadosDe(S, uid, asignaturaId, inst) {
  const crits = S.db.criterios.filter(c => c.asignaturaId === asignaturaId);
  if (!crits.length) throw new Error('Sin criterios para el instrumento «' + inst.titulo + '»');
  const esRub = inst.tipo === 'Rúbrica';
  const ap = [];
  for (let k = 0; k < inst.n; k++) {
    const c1 = crits[(inst.off + k * 2) % crits.length];
    const c2 = crits[(inst.off + k * 2 + 1) % crits.length];
    const criterioIds = inst.global ? [] : [c1.id].concat(c1.id === c2.id ? [] : [c2.id]);
    ap.push({
      id: uid(), orden: k + 1,
      descripcion: esRub
        ? ['Adecuación al enunciado', 'Riqueza léxica', 'Ortografía y puntuación', 'Presentación'][k % 4]
        : inst.tipo === 'Proyecto' ? ['Planificación', 'Producto final', 'Exposición'][k % 3]
        : inst.tipo === 'Otro' ? ['Registro semanal', 'Ficha de lectura', 'Recomendación'][k % 3]
        : 'Pregunta ' + (k + 1),
      maxPts: esRub ? 100 : 10,
      peso: esRub ? [1, 2, 1, 2][k % 4] : 10,
      niveles: esRub ? RUBRICA_NIVELES.map(n => Object.assign({}, n)) : [],
      criterioIds
    });
  }
  return ap;
}

function crearInstrumentos(app, S, curIds) {
  const uid = () => app.Utils.uid();
  // Asignatura (currículo) de cada nivel ACI de cada clase, tal y como quedaron
  // en las clases: es lo que decide de dónde salen los criterios.
  const nivelAsig = {};
  S.db.clases.forEach(c => {
    nivelAsig[c.id] = {};
    (c.nivelesAci || []).forEach(n => { nivelAsig[c.id][String(n.codigo).toUpperCase()] = n.asignaturaId; });
  });
  return INSTRUMENTOS.map(inst => {
    const cl = CLASES.find(c => c.id === inst.clase);
    const propio = curIds[cl.asignatura];
    const esNivel = !!inst.nivel && inst.nivel !== 'BASE';
    const asignaturaId = esNivel
      ? (nivelAsig[inst.clase][String(inst.nivel).toUpperCase()] || propio)
      : propio;
    const esRub = inst.tipo === 'Rúbrica';
    const apartados = apartadosDe(S, uid, asignaturaId, inst);
    const criterioIdsGlobal = inst.global
      ? S.db.criterios.filter(c => c.asignaturaId === propio).slice(0, 3).map(c => c.id)
      : [];
    if (inst.global && !criterioIdsGlobal.length) throw new Error('Global sin criterios: ' + inst.titulo);
    return {
      id: uid(),
      claseId: inst.clase,
      tipo: inst.tipo,
      titulo: inst.titulo,
      fecha: FECHA[inst.periodo],
      periodo: inst.periodo,
      saberes: '',
      unidad: inst.unidad,
      nivel: inst.nivel,
      niveles: esRub ? RUBRICA_NIVELES.map(n => Object.assign({}, n)) : ESCALA.map(n => Object.assign({}, n)),
      apartados,
      criteriosModo: inst.global ? 'global' : 'desglosado',
      criterioIdsGlobal,
      url: '',
      _prueba: { sinCorregir: !!inst.sinCorregir, parcial: inst.parcial || 0, dif: inst.dif }
    };
  });
}

function claveAlumno(v) {
  return String(v).replace(/\s+/g, '').replace(/\[|\]|,/g, '');
}

// ¿Las notas de este alumno en este instrumento pueden puntuar? Solo si algún
// apartado evalúa un criterio DE SU currículo (o, en modo global, si el criterio
// global es suyo). Es la diferencia entre «corregido» y «corregido para nada».
function cuentaPara(Calc, inst, alumnoId) {
  const ids = new Set(Calc.criteriosDeAlumno(inst.claseId, alumnoId).map(c => c.id));
  if (inst.criteriosModo === 'global') return (inst.criterioIdsGlobal || []).some(id => ids.has(id));
  return (inst.apartados || []).some(ap => (ap.criterioIds || []).some(id => ids.has(id)));
}

// Notas sembradas con una fórmula determinista (nada de Math.random): la misma
// corrección a medias en cada ejecución.
function sembrar(app, instrumentos) {
  const S = app.Storage;
  const registros = {};
  instrumentos.forEach(inst => {
    if (inst._prueba.sinCorregir) return;
    const alumnos = S ? app.Calc.alumnosDeInstrumento(inst) : [];
    const esRub = inst.tipo === 'Rúbrica';
    const fila = {};
    alumnos.forEach((a, i) => {
      const celdas = {};
      const parcial = inst._prueba.parcial;
      if (parcial && i >= alumnos.length - parcial) return;
      if (!cuentaPara(app.Calc, inst, a.id)) return;
      inst.apartados.forEach((ap, k) => {
        const s = (inst.titulo.length + k * 3) % 5;
        const ratio = Math.max(0.15, Math.min(0.98, inst._prueba.dif + (((i * 7 + k * 11 + s) % 5) - 2) * 0.07));
        if (esRub) {
          const pct = [25, 50, 75, 100][Math.min(3, Math.floor(ratio * 4))];
          celdas[ap.id] = pct;
        } else {
          celdas[ap.id] = Math.round(ratio * Number(ap.maxPts) * 2) / 2;
        }
      });
      fila[a.id] = celdas;
    });
    registros[inst.id] = fila;
  });
  return registros;
}

// Estado completo (objeto plano listo para Storage.importar).
function construir(app) {
  const S = app.Storage;
  // Identificadores deterministas mientras dura la construcción.
  let n = 0;
  app.Utils.uid = () => 'u' + String(++n);

  S.load();
  const db = S.db;
  db.cursoEscolar = CURSO;

  const cur = importarCurriculos(S);

  db.grupos = GRUPOS.map(g => ({ id: g.id, nombre: g.nombre, etapa: 'Primaria' }));

  db.alumnos = [];
  const aciDeGrupo = {};
  GRUPOS.forEach(g => {
    ALUMNADO[g.id].forEach(([apellidos, nombre], i) => {
      const id = claveAlumno('a-' + g.id.slice(2) + '-' + (i + 1));
      db.alumnos.push({ id, nombre, apellidos, grupoId: g.id });
      if (i + 1 === ADAPTADO[g.id]) aciDeGrupo[g.id] = id;
    });
  });
  const segundo = db.alumnos.find(a => a.grupoId === SEGUNDO_NIVEL.alumnoGrupo[0]
    && db.alumnos.filter(x => x.grupoId === a.grupoId).indexOf(a) + 1 === SEGUNDO_NIVEL.alumnoGrupo[1]);

  db.clases = CLASES.map(c => {
    const nivelesAci = [{ codigo: c.nivel, etiqueta: ETIQUETA[c.nivel] || c.nivel, asignaturaId: cur[c.nivelAsignatura] }];
    const adaptaciones = {};
    if (aciDeGrupo[c.grupo]) adaptaciones[aciDeGrupo[c.grupo]] = c.nivel;
    if (c.id === SEGUNDO_NIVEL.clase && segundo) {
      nivelesAci.push({ codigo: SEGUNDO_NIVEL.codigo, etiqueta: ETIQUETA[SEGUNDO_NIVEL.codigo], asignaturaId: cur[SEGUNDO_NIVEL.asignatura] });
      adaptaciones[segundo.id] = SEGUNDO_NIVEL.codigo;
    }
    return { id: c.id, asignaturaId: cur[c.asignatura], grupoId: c.grupo, nivelesAci, adaptaciones };
  });

  db.instrumentos = crearInstrumentos(app, S, cur);
  db.registros = sembrar(app, db.instrumentos);
  db.instrumentos.forEach(i => { delete i._prueba; });

  return db;
}

// Estado de prueba como objeto plano (JSON.stringify → archivo importable).
function estadoPrueba() {
  const app = cargarApp();
  const db = construir(app);
  return JSON.parse(JSON.stringify(db));
}

// Resumen legible del escenario (para el volcado y para los checks).
function resumen(estado) {
  const clases = estado.clases.length;
  const criticas = new Set(estado.asignaturas.map(a => a.id));
  const uds = new Set(estado.instrumentos.map(i => i.unidad).filter(Boolean));
  const tipos = new Set(estado.instrumentos.map(i => i.tipo));
  const adaptados = estado.clases.reduce((s, c) => s + Object.keys(c.adaptaciones || {}).length, 0);
  return {
    grupos: estado.grupos.length,
    alumnos: estado.alumnos.length,
    asignaturas: criticas.size,
    clases,
    unidades: uds.size,
    instrumentos: estado.instrumentos.length,
    tipos: [...tipos],
    alumnadoAdaptado: adaptados
  };
}

if (require.main === module) {
  const estado = estadoPrueba();
  const destino = path.join(raiz, 'datos-prueba.json');
  fs.writeFileSync(destino, JSON.stringify(estado, null, 2) + '\n');
  const r = resumen(estado);
  console.log('Escrito ' + path.relative(raiz, destino) + ' (' + Math.round(fs.statSync(destino).size / 1024) + ' KB)');
  console.log(`  ${r.grupos} grupos · ${r.alumnos} alumnos · ${r.asignaturas} asignaturas · ${r.clases} clases`);
  console.log(`  ${r.instrumentos} instrumentos (${r.tipos.join(', ')}) en ${r.unidades} unidades didácticas`);
  console.log(`  ${r.alumnadoAdaptado} asignaciones de ACI`);
}

module.exports = { estadoPrueba, construir, resumen, CLASES, GRUPOS, ADAPTADO, SEGUNDO_NIVEL, INSTRUMENTOS };
