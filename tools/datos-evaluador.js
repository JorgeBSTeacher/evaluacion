'use strict';
// tools/datos-evaluador.js — genera un curso completo de DATOS FICTICIOS para
// entregar a un evaluador externo de la app, y lo vuelca a «json prueba no online/datos-evaluador.json» (carpeta ignorada por git)
// para importarlo en la app real (Configuración → Importar backup).
//
// Escenario: 3 grupos (5ºA, 5ºB, 6ºA) · 4 clases (CMN 5ºA, Inglés 5ºA,
// Inglés 5ºB, Inglés 6ºA) · currículo REAL del Decreto 66/2022 cargado desde
// las plantillas oficiales (plantillas/*.json), con un soporte ACI (CMN 4º) ·
// 11 instrumentos de los 4 tipos y varios modos (rúbrica «Libreta», test
// «Control», observación «Comportamiento», proyecto, modo global, nivel BASE
// y nivel ACI) · la mayoría de filas con nota, alguna sin nota, una exclusión
// «No realiza», dos instrumentos con observación, notas de ficha en tres
// alumnos y 3 moldes en el banco (sin T ni UD y con origen.curso).
//
// Los datos se construyen con las MISMAS funciones que usa la app
// (Storage.importarCurriculo sobre las plantillas incluidas), así que el JSON
// es exactamente lo que la app produce. Todos los identificadores y fechas son
// constantes del fichero: regenerar el volcado produce bytes idénticos. El
// alumnado y el docente son inventados (RGPD): ninguna combinación real.
//
// Uso:   node tools/datos-evaluador.js
const fs = require('fs');
const path = require('path');
const { cargarApp, raiz } = require('./arnes');

// Curso 2026/2027 en marcha: T1 evaluado (sept–nov 2026) y HOY fijo dentro de
// T1. «HOY» NO se toma del reloj: es una constante, para que dos ejecuciones
// del generador produzcan bytes idénticos (determinismo).
const CURSO = '2026/2027';
const HOY = '2026-11-22';
const HOY_ISO = '2026-11-22T09:30:00.000Z';

const RUBRICA_NIVELES = [
  { pct: 25, descriptor: 'Iniciado: no lo consigue todavía' },
  { pct: 50, descriptor: 'En proceso: lo consigue con ayuda' },
  { pct: 75, descriptor: 'Conseguido: lo hace de forma autónoma' },
  { pct: 100, descriptor: 'Excelente: lo domina y lo explica' }
];
const ESCALA = [{ pct: 25 }, { pct: 50 }, { pct: 75 }, { pct: 100 }];

// Currículos oficiales: [plantilla, curso, etiqueta] → asignatura. La etiqueta
// renombra el área con nombre largo (Lengua Extranjera → Inglés) tal y como la
// app lo permite al importar; CMN mantiene el nombre del decreto.
const CURRICULOS = {
  cmn5: ['conocimiento-del-medio-natural-social-y-cultural-tercer-ciclo.json', '5º', ''],
  ing5: ['lengua-extranjera-tercer-ciclo.json', '5º', 'Inglés'],
  ing6: ['lengua-extranjera-tercer-ciclo.json', '6º', 'Inglés'],
  // Soporte ACI: CMN de 4º (2º ciclo) para el nivel adaptado de CMN 5ºA.
  cmn4: ['conocimiento-del-medio-natural-social-y-cultural-segundo-ciclo.json', '4º', '']
};

// Grupos y alumnado INVENTADO (apellidos, nombre). Lista fija y determinista;
// ninguna combinación corresponde a una persona real (RGPD).
const GRUPOS = [
  { id: 'g-5a', corto: '5a', nombre: '5ºA' },
  { id: 'g-5b', corto: '5b', nombre: '5ºB' },
  { id: 'g-6a', corto: '6a', nombre: '6ºA' }
];
const ALUMNADO = {
  'g-5a': [['Abascal', 'Irene'], ['Bustamante', 'Diego'], ['Ceballos', 'Vega'],
    ['Duarte', 'Hugo'], ['Escalante', 'Julia'], ['Fontán', 'Nicolás'],
    ['Gándara', 'Alba'], ['Hoyos', 'Mateo'], ['Iglesias', 'Candela']],
  'g-5b': [['Jáuregui', 'Marcos'], ['Lavia', 'Sara'], ['Mantilla', 'Noa'],
    ['Navarro', 'Elsa'], ['Obregón', 'Iván'], ['Peláez', 'Vera'],
    ['Quijano', 'Bruno'], ['Rivero', 'Alba']],
  'g-6a': [['Sainz', 'Emma'], ['Toca', 'Pablo'], ['Ubierna', 'Lucía'],
    ['Valdecilla', 'Hugo'], ['Yáñez', 'Marta'], ['Zubiri', 'Adrián'],
    ['Arce', 'Daniela'], ['Bermejo', 'Guillermo']]
};
// Índice (1-based) del alumnado con adaptación curricular dentro de su grupo.
const ADAPTADO = { 'g-5a': 9 };

// Clases: asignatura (currículo) · grupo. CMN 5ºA lleva un nivel ACI «4»
// apuntando al currículo de 4º; el resto son clases simples.
const CLASES = [
  { id: 'cl-cmn5a', asignatura: 'cmn5', grupo: 'g-5a', nivel: '4', nivelAsignatura: 'cmn4' },
  { id: 'cl-ing5a', asignatura: 'ing5', grupo: 'g-5a' },
  { id: 'cl-ing5b', asignatura: 'ing5', grupo: 'g-5b' },
  { id: 'cl-ing6a', asignatura: 'ing6', grupo: 'g-6a' }
];

// Instrumentos por clase. `off` = desplazamiento sobre la lista de criterios
// del currículo de SU nivel; `dif` = dificultad media (para notas creíbles);
// `sinNota` = índices (0-based) de alumnado SIN fila de notas;
// `noRealiza` = índice del alumno excluido («No realiza»); `sinCorregir` =
// instrumento sin ninguna fila; `global` = modo global (criterios globales).
const INSTRUMENTOS = [
  // --- CMN 5º · 5ºA ---
  { clase: 'cl-cmn5a', tipo: 'Control', titulo: 'Control UD1: Los seres vivos', fecha: '2026-10-09', periodo: 'T1', unidad: 'UD1', nivel: 'BASE', n: 4, off: 0, dif: 0.55,
    saberes: ['Iniciación en la actividad científica', 'La vida en nuestro planeta'] },
  { clase: 'cl-cmn5a', tipo: 'Rúbrica', titulo: 'Libreta de campo: salida al parque', fecha: '2026-10-23', periodo: 'T1', unidad: 'UD1', nivel: '', n: 3, off: 2, dif: 0.6, noRealiza: 8,
    obs: 'Propuesta de mejora: repetir la libreta en la salida de diciembre, explicando la rúbrica antes de salir.' },
  { clase: 'cl-cmn5a', tipo: 'Otro', titulo: 'Observación: Comportamiento', fecha: '2026-11-06', periodo: 'T1', unidad: '', nivel: '', n: 2, off: 4, dif: 0.5, sinNotaDesde: 6,
    obs: 'Dos alumnos necesitan refuerzo en normas de aula; se revisará tras la evaluación de noviembre.' },
  { clase: 'cl-cmn5a', tipo: 'Control', titulo: 'Prueba adaptada (currículo de 4º)', fecha: '2026-10-09', periodo: 'T1', unidad: 'UD1', nivel: '4', n: 3, off: 0, dif: 0.6 },

  // --- Inglés 5º · 5ºA ---
  { clase: 'cl-ing5a', tipo: 'Control', titulo: 'Vocabulary and grammar test (UD1)', fecha: '2026-10-16', periodo: 'T1', unidad: 'UD1', nivel: 'BASE', n: 4, off: 1, dif: 0.62 },
  { clase: 'cl-ing5a', tipo: 'Rúbrica', titulo: 'Presentación oral: My town', fecha: '2026-11-13', periodo: 'T1', unidad: 'UD2', nivel: '', n: 3, off: 3, dif: 0.58, sinNota: [6] },

  // --- Inglés 5º · 5ºB ---
  { clase: 'cl-ing5b', tipo: 'Control', titulo: 'Listening test (UD1)', fecha: '2026-10-23', periodo: 'T1', unidad: 'UD1', nivel: 'BASE', n: 3, off: 2, dif: 0.6, sinNotaDesde: 6 },
  { clase: 'cl-ing5b', tipo: 'Rúbrica', titulo: 'Producción escrita: My weekend', fecha: '2026-11-06', periodo: 'T1', unidad: 'UD1', nivel: '', n: 4, off: 0, dif: 0.57 },

  // --- Inglés 6º · 6ºA ---
  { clase: 'cl-ing6a', tipo: 'Control', titulo: 'Reading comprehension (UD1)', fecha: '2026-10-30', periodo: 'T1', unidad: 'UD1', nivel: '', n: 4, off: 1, dif: 0.6, global: true },
  { clase: 'cl-ing6a', tipo: 'Proyecto', titulo: 'Project: My town leaflet', fecha: '2026-11-27', periodo: 'T1', unidad: 'UD2', nivel: '', n: 3, off: 0, dif: 0.7, sinCorregir: true },
  { clase: 'cl-ing6a', tipo: 'Control', titulo: 'Speaking: pair dialogue (UD1)', fecha: '2026-11-20', periodo: 'T1', unidad: 'UD1', nivel: '', n: 2, off: 4, dif: 0.65 }
];

// Notas de ficha del alumno (fase 1): { fecha, texto }, dentro del curso.
const NOTAS_FICHA = {
  'al-5a-9': [
    { fecha: '2026-10-08', texto: 'Llegadas tarde repetidas en septiembre; se recuerda el horario a la familia.' },
    { fecha: '2026-11-05', texto: 'Buena evolución con el plan de refuerzo del nivel 4.' }
  ],
  'al-5a-3': [
    { fecha: '2026-10-15', texto: 'No entregó la libreta de la salida; fecha nueva acordada para el 30.' }
  ],
  'al-6a-1': [
    { fecha: '2026-11-10', texto: 'Muy participativa en los debates de clase; se propone como ayudante de biblioteca.' }
  ]
};

// --- Construcción ---------------------------------------------------------------

// Importa los currículos oficiales y devuelve { clave → asignaturaId }.
function importarCurriculos(S) {
  const ids = {};
  Object.keys(CURRICULOS).forEach(k => {
    const [fichero, curso, etiqueta] = CURRICULOS[k];
    const datos = JSON.parse(fs.readFileSync(path.join(raiz, 'plantillas', fichero), 'utf8'));
    const opts = { cursos: [curso] };
    if (etiqueta) opts.etiqueta = etiqueta;
    ids[k] = S.importarCurriculo(datos, opts).ids[0];
  });
  return ids;
}

// Apartados de un instrumento sobre el currículo de SU nivel (los códigos
// nunca salen de ahí: es lo que exige el motor). `saberesSpec` etiqueta los
// primeros apartados con saberes básicos reales de la plantilla.
function apartadosDe(S, uid, asignaturaId, inst) {
  const crits = S.db.criterios.filter(c => c.asignaturaId === asignaturaId);
  if (!crits.length) throw new Error('Sin criterios para el instrumento «' + inst.titulo + '»');
  const esRub = inst.tipo === 'Rúbrica';
  const ap = [];
  for (let k = 0; k < inst.n; k++) {
    const c1 = crits[(inst.off + k * 2) % crits.length];
    const c2 = crits[(inst.off + k * 2 + 1) % crits.length];
    ap.push({
      id: uid(), orden: k + 1,
      descripcion: esRub
        ? ['Adecuación al enunciado', 'Riqueza de contenidos', 'Corrección y presentación', 'Vocabulario y expresión'][k % 4]
        : inst.tipo === 'Proyecto' ? ['Planificación', 'Producto final', 'Exposición'][k % 3]
        : inst.tipo === 'Otro' ? ['Participación en el aula', 'Respeto de normas y compañeros'][k % 2]
        : 'Apartado ' + (k + 1),
      maxPts: esRub ? 100 : 10,
      peso: esRub ? [1, 2, 1, 2][k % 4] : 10,
      niveles: esRub ? RUBRICA_NIVELES.map(n => Object.assign({}, n)) : [],
      saberes: (inst.saberes && inst.saberes[k]) || '',
      criterioIds: [c1.id].concat(c1.id === c2.id ? [] : [c2.id])
    });
  }
  return ap;
}

function crearInstrumentos(app, S, cur) {
  const uid = () => app.Utils.uid();
  // Asignatura (currículo) de cada nivel de cada clase, tal y como quedaron
  // las clases: es lo que decide de dónde salen los criterios.
  const nivelAsig = {};
  S.db.clases.forEach(c => {
    nivelAsig[c.id] = { '': c.asignaturaId, BASE: c.asignaturaId };
    (c.nivelesAci || []).forEach(n => {
      nivelAsig[c.id][String(n.codigo).toUpperCase()] = n.asignaturaId;
    });
  });
  return INSTRUMENTOS.map(inst => {
    const cl = CLASES.find(c => c.id === inst.clase);
    const asignaturaId = nivelAsig[inst.clase][String(inst.nivel).toUpperCase()];
    if (!asignaturaId) throw new Error('Nivel sin currículo: ' + inst.titulo);
    const esRub = inst.tipo === 'Rúbrica';
    const apartados = apartadosDe(S, uid, asignaturaId, inst);
    // Modo global: los criterios van en el bloque global, no por apartado.
    const criterioIdsGlobal = inst.global
      ? S.db.criterios.filter(c => c.asignaturaId === cur[cl.asignatura]).slice(0, 3).map(c => c.id)
      : [];
    if (inst.global && !criterioIdsGlobal.length) throw new Error('Global sin criterios: ' + inst.titulo);
    if (inst.global) apartados.forEach(ap => { ap.criterioIds = []; });
    return {
      id: uid(),
      claseId: inst.clase,
      tipo: inst.tipo,
      titulo: inst.titulo,
      fecha: inst.fecha,
      periodo: inst.periodo,
      saberes: '',
      unidad: inst.unidad,
      nivel: inst.nivel,
      niveles: esRub ? RUBRICA_NIVELES.map(n => Object.assign({}, n)) : ESCALA.map(n => Object.assign({}, n)),
      apartados,
      criteriosModo: inst.global ? 'global' : 'desglosado',
      criterioIdsGlobal,
      url: '',
      _ev: {
        sinCorregir: !!inst.sinCorregir,
        sinNota: inst.sinNota || null,
        sinNotaDesde: inst.sinNotaDesde != null ? inst.sinNotaDesde : null,
        noRealiza: inst.noRealiza != null ? inst.noRealiza : null,
        dif: inst.dif
      }
    };
  });
}

// Notas sembradas con una fórmula determinista (nada de Math.random): la misma
// corrección en cada ejecución. La elegibilidad la decide el motor real
// (Calc.alumnosDeInstrumento), igual que en la corrección de la app.
function sembrar(app, instrumentos) {
  const S = app.Storage;
  const registros = {};
  instrumentos.forEach(inst => {
    const ev = inst._ev;
    if (ev.sinCorregir) return;
    const alumnos = app.Calc.alumnosDeInstrumento(inst);
    const esRub = inst.tipo === 'Rúbrica';
    const fila = {};
    alumnos.forEach((a, i) => {
      if (ev.noRealiza != null && i === ev.noRealiza) {
        fila[a.id] = { noRealiza: true };
        return;
      }
      if (ev.sinNota && ev.sinNota.indexOf(i) !== -1) return;
      if (ev.sinNotaDesde != null && i >= ev.sinNotaDesde) return;
      const celdas = {};
      inst.apartados.forEach((ap, k) => {
        const s = (inst.titulo.length + k * 3) % 5;
        const ratio = Math.max(0.15, Math.min(0.98, ev.dif + (((i * 7 + k * 11 + s) % 5) - 2) * 0.07));
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

// Moldes del banco (D-48, diseño v0.11.5): SIN T ni UD, con criterios por
// CÓDIGO y `origen.curso`. Shape idéntico al de Storage.guardarMoldeBanco.
function crearBanco(app, S, cur, codigosDe) {
  const molde = (titulo, tipo, curso, origenId, origenNombre, apartados, niveles, globalCodes) => ({
    id: app.Utils.uid(),
    titulo,
    tipo,
    saberes: '',
    url: '',
    niveles: niveles.map(n => Object.assign({}, n)),
    criteriosModo: 'desglosado',
    criterioCodesGlobal: globalCodes || [],
    apartados: apartados.map(ap => ({
      descripcion: ap.descripcion,
      maxPts: ap.maxPts,
      peso: ap.peso,
      niveles: (ap.niveles || []).map(n => Object.assign({}, n)),
      criterioCodes: ap.criterioCodes || []
    })),
    origen: {
      asignaturaId: origenId,
      asignatura: origenNombre,
      etapa: 'Primaria',
      curso,
      guardadoEn: HOY
    }
  });
  const cmn5 = S.db.asignaturas.find(a => a.id === cur.cmn5);
  const ing6 = S.db.asignaturas.find(a => a.id === cur.ing6);
  const codes = codigosDe;

  // «Libreta de campo» (Rúbrica, 5º): los mismos apartados y códigos de la
  // rúbrica sembrada, guardada como molde para reutilizarla.
  const libreta = INSTRUMENTOS.find(i => i.tipo === 'Rúbrica' && i.clase === 'cl-cmn5a');
  const apLibreta = [];
  for (let k = 0; k < libreta.n; k++) {
    apLibreta.push({
      descripcion: ['Adecuación al enunciado', 'Riqueza de contenidos', 'Corrección y presentación', 'Vocabulario y expresión'][k % 4],
      maxPts: 100,
      peso: [1, 2, 1, 2][k % 4],
      niveles: RUBRICA_NIVELES,
      criterioCodes: codes(cmn5, libreta.off + k * 2, 2)
    });
  }

  // «Comportamiento» (Otro, 5º): sin criterios (moldes sin criterios son
  // válidos: se asignan luego en la ficha del instrumento).
  const comportamiento = [
    { descripcion: 'Participación en el aula', maxPts: 10, peso: 10, niveles: [], criterioCodes: [] },
    { descripcion: 'Respeto de normas y compañeros', maxPts: 10, peso: 10, niveles: [], criterioCodes: [] }
  ];

  // «Vocabulary test» (Control, 6º): apartados con criterios reales de Inglés 6º.
  const vocab = [
    { descripcion: 'Reading', maxPts: 10, peso: 10, niveles: [], criterioCodes: codes(ing6, 0, 2) },
    { descripcion: 'Writing', maxPts: 10, peso: 10, niveles: [], criterioCodes: codes(ing6, 2, 2) },
    { descripcion: 'Use of English', maxPts: 10, peso: 10, niveles: [], criterioCodes: codes(ing6, 4, 2) }
  ];

  return [
    molde('Libreta de campo', 'Rúbrica', '5º', cmn5.id, cmn5.nombre, apLibreta, RUBRICA_NIVELES),
    molde('Observación: Comportamiento', 'Otro', '5º', cmn5.id, cmn5.nombre, comportamiento, ESCALA),
    molde('Vocabulary test', 'Control', '6º', ing6.id, ing6.nombre, vocab, ESCALA)
  ];
}

// Códigos de criterio (2 consecutivos desde `off`) del currículo de una
// asignatura, para el banco.
function codigosDe(S) {
  return (asig, off, n) => {
    const crits = S.db.criterios.filter(c => c.asignaturaId === asig.id);
    const salida = [];
    for (let k = 0; k < n; k++) salida.push(crits[(off + k) % crits.length].codigo);
    return salida;
  };
}

// Estado completo (objeto plano listo para Storage.migrar / importar).
function construir(app) {
  const S = app.Storage;
  // Identificadores deterministas mientras dura la construcción.
  let n = 0;
  app.Utils.uid = () => 'u' + String(++n);

  S.load();
  const db = S.db;
  db.cursoEscolar = CURSO;
  // Perfil docente INVENTADO (RGPD): sin logo.
  db.perfil = { nombre: 'Marta Ruiz Delgado', centro: 'CEIP Ejemplo Cantabria', logo: '' };

  const cur = importarCurriculos(S);

  db.grupos = GRUPOS.map(g => ({ id: g.id, nombre: g.nombre, etapa: 'Primaria' }));

  db.alumnos = [];
  const aciDeGrupo = {};
  GRUPOS.forEach(g => {
    ALUMNADO[g.id].forEach(([apellidos, nombre], i) => {
      const id = 'al-' + g.corto + '-' + (i + 1);
      db.alumnos.push({ id, nombre, apellidos, grupoId: g.id, notas: NOTAS_FICHA[id] || [] });
      if (i + 1 === ADAPTADO[g.id]) aciDeGrupo[g.id] = id;
    });
  });

  db.clases = CLASES.map(c => {
    if (!c.nivel) return { id: c.id, asignaturaId: cur[c.asignatura], grupoId: c.grupo, nivelesAci: [], adaptaciones: {} };
    const nivelesAci = [{
      codigo: c.nivel, etiqueta: c.nivel + 'º',
      asignaturaId: cur[c.nivelAsignatura]
    }];
    const adaptaciones = {};
    if (aciDeGrupo[c.grupo]) adaptaciones[aciDeGrupo[c.grupo]] = c.nivel;
    return { id: c.id, asignaturaId: cur[c.asignatura], grupoId: c.grupo, nivelesAci, adaptaciones };
  });

  db.instrumentos = crearInstrumentos(app, S, cur);
  db.registros = sembrar(app, db.instrumentos);

  // Observaciones del docente (D-74c), sobre los instrumentos marcados con obs.
  db.observaciones = {};
  INSTRUMENTOS.forEach((spec, i) => {
    if (spec.obs) db.observaciones[db.instrumentos[i].id] = spec.obs;
  });

  // Banco de instrumentos (moldes sin T ni UD y con origen.curso).
  db.bancoInstrumentos = crearBanco(app, S, cur, codigosDe(S));

  // Meta al FINAL: importarCurriculo llama a save() (marca «cambios sin
  // copiar») y un backup recién exportado queda sellado, no pendiente.
  db.meta = { ultimaExportacion: HOY_ISO, cambiosSinCopia: false };

  // Volcado a objeto plano: sin referencias al arnés ni campos internos.
  const plano = JSON.parse(JSON.stringify(db, (k, v) => (k === '_ev' ? undefined : v)));
  return plano;
}

// --- Validación (el generador se valida a sí mismo antes de escribir) ---------

function validar(db) {
  const fallos = [];
  const check = (ok, msg) => { if (!ok) fallos.push(msg); };

  // Claves obligatorias del backup.
  ['schemaVersion', 'cursoEscolar', 'meta', 'grupos', 'alumnos', 'asignaturas', 'clases',
    'competenciasClave', 'competenciasEspecificas', 'criterios', 'instrumentos',
    'bancoInstrumentos', 'perfil', 'configuracion', 'tema', 'coloresUd', 'registros',
    'observaciones'].forEach(k => check(db[k] != null, 'falta la clave ' + k));
  check(db.schemaVersion === 1, 'schemaVersion != 1');
  check(/^(19|20)\d{2}\/(19|20)\d{2}$/.test(db.cursoEscolar), 'cursoEscolar raro: ' + db.cursoEscolar);

  const grupos = new Set(db.grupos.map(g => g.id));
  const asigs = new Map(db.asignaturas.map(a => [a.id, a]));
  const clases = new Map(db.clases.map(c => [c.id, c]));
  const alus = new Set(db.alumnos.map(a => a.id));
  const crits = new Map(db.criterios.map(c => [c.id, c]));
  const insts = new Map(db.instrumentos.map(i => [i.id, i]));

  db.grupos.forEach(g => check(g.nombre && g.etapa, 'grupo sin nombre/etapa: ' + g.id));
  db.alumnos.forEach(a => {
    check(grupos.has(a.grupoId), 'alumno ' + a.id + ' con grupo inexistente');
    check(a.nombre && a.apellidos, 'alumno sin nombre/apellidos: ' + a.id);
    check(Array.isArray(a.notas), 'alumno ' + a.id + ' sin notas[]');
    (a.notas || []).forEach(nt => check(nt && nt.fecha && nt.texto, 'nota de ficha malformada en ' + a.id));
  });
  db.asignaturas.forEach(a => check(a.nombre && a.etapa, 'asignatura sin nombre: ' + a.id));
  db.clases.forEach(c => {
    check(asigs.has(c.asignaturaId), 'clase ' + c.id + ' con asignatura inexistente');
    check(grupos.has(c.grupoId), 'clase ' + c.id + ' con grupo inexistente');
    (c.nivelesAci || []).forEach(nv => check(asigs.has(nv.asignaturaId), 'nivel ACI de ' + c.id + ' sin asignatura'));
  });

  // Asignatura por nivel de cada clase (réplica de Calc.asignaturaDeNivel).
  const asignaturaDeNivel = (cl, nivel) => {
    const nv = String(nivel == null ? '' : nivel).trim().toUpperCase();
    if (!nv || nv === 'BASE') return cl.asignaturaId;
    const e = (cl.nivelesAci || []).find(x => String(x.codigo).trim().toUpperCase() === nv);
    return e ? e.asignaturaId : null;
  };

  db.instrumentos.forEach(i => {
    check(clases.has(i.claseId), 'instrumento ' + i.titulo + ' sin clase');
    if (!clases.has(i.claseId)) return;
    const cl = clases.get(i.claseId);
    const asigId = asignaturaDeNivel(cl, i.nivel);
    check(asigId, 'instrumento ' + i.titulo + ' con nivel sin currículo');
    check(i.fecha >= CURSO.slice(0, 4) + '-09-01' && i.fecha <= CURSO.slice(5, 9) + '-07-31',
      'instrumento ' + i.titulo + ' con fecha fuera del curso: ' + i.fecha);
    const mirar = (ids, donde) => (ids || []).forEach(id => {
      const c = crits.get(id);
      check(c, 'criterio inexistente (' + donde + ') en ' + i.titulo);
      check(c && c.asignaturaId === asigId,
        'criterio ' + (c ? c.codigo : id) + ' de otra asignatura en ' + i.titulo);
    });
    (i.apartados || []).forEach(ap => {
      check(ap.descripcion, 'apartado sin descripción en ' + i.titulo);
      mirar(ap.criterioIds, 'apartado «' + ap.descripcion + '»');
    });
    mirar(i.criterioIdsGlobal, 'global');
    // Registros de este instrumento.
    const reg = db.registros[i.id] || {};
    Object.keys(reg).forEach(aid => {
      check(alus.has(aid), 'registro de alumno inexistente en ' + i.titulo);
      const fila = reg[aid];
      if (fila.noRealiza === true) {
        check(Object.keys(fila).length === 1, 'excluido con notas en ' + i.titulo);
        return;
      }
      (i.apartados || []).forEach(ap => {
        const v = fila[ap.id];
        if (v == null || v === '') return;
        check(typeof v === 'number' && isFinite(v), 'valor no numérico en ' + i.titulo);
        if (i.tipo === 'Rúbrica') {
          check([25, 50, 75, 100].indexOf(Number(v)) !== -1, 'valor de rúbrica fuera de escala en ' + i.titulo);
        } else {
          check(v >= 0 && v <= Number(ap.maxPts), 'valor fuera de rango en ' + i.titulo);
        }
      });
    });
  });

  Object.keys(db.registros).forEach(id => check(insts.has(id), 'registros de instrumento inexistente ' + id));
  Object.keys(db.observaciones).forEach(id => check(insts.has(id), 'observación de instrumento inexistente ' + id));
  Object.values(db.observaciones).forEach(t => check(typeof t === 'string' && t.trim(), 'observación vacía'));

  // Banco: sin T ni UD, con origen.curso y códigos existentes en ESE curso.
  db.bancoInstrumentos.forEach(m => {
    check(!('unidad' in m) && !('periodo' in m), 'molde «' + m.titulo + '» guarda T/UD');
    check(m.origen && m.origen.curso, 'molde «' + m.titulo + '» sin origen.curso');
    if (!m.origen || !m.origen.curso) return;
    const codes = new Set();
    db.asignaturas.forEach(a => {
      if (String(a.curso) !== m.origen.curso) return;
      db.criterios.forEach(c => { if (c.asignaturaId === a.id) codes.add(c.codigo); });
    });
    (m.apartados || []).forEach(ap => (ap.criterioCodes || []).forEach(cod =>
      check(codes.has(cod), 'molde «' + m.titulo + '» con código inexistente en ' + m.origen.curso + ': ' + cod)));
    (m.criterioCodesGlobal || []).forEach(cod =>
      check(codes.has(cod), 'molde «' + m.titulo + '» con código global inexistente: ' + cod));
  });

  return fallos;
}

// Resumen legible del volcado (para consola y para el reporte).
function resumen(db) {
  const conNota = Object.values(db.registros).reduce((s, fila) => {
    return s + Object.values(fila).filter(f => f.noRealiza !== true
      && Object.keys(f).some(k => f[k] != null && f[k] !== '')).length;
  }, 0);
  const excluidos = Object.values(db.registros).reduce((s, fila) =>
    s + Object.values(fila).filter(f => f.noRealiza === true).length, 0);
  const tipos = [...new Set(db.instrumentos.map(i => i.tipo))];
  const niveles = [...new Set(db.instrumentos.map(i => i.nivel || '(común)'))];
  return {
    curso: db.cursoEscolar,
    grupos: db.grupos.length,
    alumnos: db.alumnos.length,
    asignaturas: db.asignaturas.length,
    clases: db.clases.length,
    criterios: db.criterios.length,
    competenciasEspecificas: db.competenciasEspecificas.length,
    instrumentos: db.instrumentos.length,
    tipos,
    niveles,
    filasConNota: conNota,
    excluidosNoRealiza: excluidos,
    observaciones: Object.keys(db.observaciones).length,
    notasFicha: db.alumnos.reduce((s, a) => s + (a.notas || []).length, 0),
    moldes: db.bancoInstrumentos.length
  };
}

if (require.main === module) {
  const db = construir(cargarApp());
  const texto = JSON.stringify(db, null, 2) + '\n';

  // Round-trip: el texto que se escribe vuelve a parsear.
  JSON.parse(texto);

  // Autocomprobaciones de estructura y referencias.
  const fallos = validar(db);

  // Prueba de importación real: migrar() en una app limpia debe tragarse el
  // backup SIN reparar ningún criterio (un «reparado» = criterio apuntando a
  // otro currículo, que aquí no puede ocurrir).
  if (!fallos.length) {
    const app2 = cargarApp();
    const migrado = app2.Storage.migrar(JSON.parse(texto));
    if (app2.Storage.reparadosCriterios) {
      fallos.push('migrar reparó ' + app2.Storage.reparadosCriterios + ' instrumentos: hay criterios fuera de su currículo');
    }
    if (migrado.instrumentos.length !== db.instrumentos.length) {
      fallos.push('migrar perdió instrumentos (' + migrado.instrumentos.length + '/' + db.instrumentos.length + ')');
    }
    if (migrado.bancoInstrumentos.length !== db.bancoInstrumentos.length) {
      fallos.push('migrar perdió moldes del banco');
    }
  }

  if (fallos.length) {
    console.error('FALLOS de validación (' + fallos.length + '):');
    fallos.forEach(f => console.error('  - ' + f));
    process.exitCode = 1;
  } else {
    const destino = path.join(raiz, 'json prueba no online', 'datos-evaluador.json');
    fs.writeFileSync(destino, texto);
    const r = resumen(db);
    console.log('Escrito ' + path.relative(raiz, destino) + ' (' + Math.round(fs.statSync(destino).size / 1024) + ' KB)');
    console.log('  curso ' + r.curso + ' · ' + r.grupos + ' grupos · ' + r.alumnos + ' alumnos · '
      + r.asignaturas + ' asignaturas · ' + r.clases + ' clases');
    console.log('  currículo: ' + r.competenciasEspecificas + ' competencias específicas · ' + r.criterios + ' criterios');
    console.log('  ' + r.instrumentos + ' instrumentos (' + r.tipos.join(', ') + ') en niveles: ' + r.niveles.join(', '));
    console.log('  ' + r.filasConNota + ' filas con nota · ' + r.excluidosNoRealiza + ' «No realiza» · '
      + r.observaciones + ' observaciones · ' + r.notasFicha + ' notas de ficha');
    console.log('  ' + r.moldes + ' moldes en el banco (sin T/UD, con origen.curso)');
    console.log('  Validación: OK (estructura, referencias, escala, round-trip, migrar)');
  }
}

module.exports = { construir, validar, resumen, CURRICULOS, GRUPOS, ALUMNADO, CLASES, INSTRUMENTOS };
