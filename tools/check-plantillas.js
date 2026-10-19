// tools/check-plantillas.js — valida las plantillas de curriculo de plantillas/*.json.
// Comprueba estructura, codigos unicos, vinculos criterio→competencia, suma de pesos
// (cuando son numericos) y ausencia de plantillas duplicadas. Node, sin frameworks.
// Uso: node tools/check-plantillas.js
'use strict';
const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
const dir = path.join(raiz, 'plantillas');

let total = 0;
let fallos = 0;
function check(nombre, cond, detalle) {
  total++;
  if (cond) console.log('  ok   ' + nombre);
  else { fallos++; console.log('  FAIL ' + nombre + (detalle ? '  → ' + detalle : '')); }
}

function plantillas() {
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .sort()
    .map(f => ({ archivo: f, datos: JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) }));
}

function clave(p) {
  const a = p.asignatura || {};
  return [String(a.nombre || '').trim().toLowerCase(), String(a.ciclo || '').trim()].join('::');
}

function validar({ archivo, datos: d }) {
  const pre = archivo.replace(/\.json$/, '') + ': ';
  const a = d.asignatura || {};
  check(pre + 'version=1', d.version === 1);
  check(pre + 'tipo curriculo-evalcrit', d.tipo === 'curriculo-evalcrit');
  check(pre + 'fuente presente', typeof d.fuente === 'string' && d.fuente.trim().length > 0);
  check(pre + 'asignatura.nombre', typeof a.nombre === 'string' && a.nombre.trim().length > 0);
  check(pre + 'asignatura.etapa', typeof a.etapa === 'string' && a.etapa.trim().length > 0);
  check(pre + 'asignatura.ciclo', typeof a.ciclo === 'string' && a.ciclo.trim().length > 0);
  check(pre + 'asignatura.cursos no vacio', Array.isArray(a.cursos) && a.cursos.length > 0);

  const ces = Array.isArray(d.competenciasEspecificas) ? d.competenciasEspecificas : [];
  const crit = Array.isArray(d.criterios) ? d.criterios : [];
  const ceCod = ces.map(c => c.codigo);
  const crCod = crit.map(c => c.codigo);
  check(pre + 'CE presentes', ces.length > 0);
  check(pre + 'criterios presentes', crit.length > 0);
  check(pre + 'codigos CE unicos', new Set(ceCod).size === ceCod.length);
  check(pre + 'codigos criterio unicos', new Set(crCod).size === crCod.length);
  check(pre + 'todo criterio referencia una CE existente',
    crit.every(c => ceCod.includes(c.ceCodigo)),
    crit.filter(c => !ceCod.includes(c.ceCodigo)).map(c => c.codigo).join(','));
  check(pre + 'toda CE tiene descripcion',
    ces.every(c => typeof c.descripcion === 'string' && c.descripcion.trim()));
  check(pre + 'toda CE tiene perfilSalida (array)',
    ces.every(c => Array.isArray(c.perfilSalida)));
  // Dos invariantes que la app necesita: una CE sin criterios de evaluacion no
  // puede puntuar nunca, y una CE sin descriptores de perfil de salida deja sus
  // criterios sin competencias clave (aviso de Cobertura). El Decreto 66/2022
  // las cumple en las 130 CE; si el extractor vuelve a perderlas, salta aquí.
  const ceSinCrit = ces.filter(e => !crit.some(c => c.ceCodigo === e.codigo)).map(e => e.codigo);
  check(pre + 'toda CE tiene al menos un criterio', ceSinCrit.length === 0, ceSinCrit.join(','));
  const ceSinPerfil = ces.filter(e => !Array.isArray(e.perfilSalida) || !e.perfilSalida.length).map(e => e.codigo);
  check(pre + 'toda CE tiene descriptores de perfil de salida', ceSinPerfil.length === 0, ceSinPerfil.join(','));

  const numericos = crit.map(c => c.peso).filter(p => typeof p === 'number' && !isNaN(p));
  if (numericos.length === crit.length && crit.length) {
    const suma = Math.round(numericos.reduce((s, p) => s + p, 0) * 100) / 100;
    check(pre + 'pesos numericos suman 100', suma === 100, 'suma=' + suma);
  } else {
    check(pre + 'pesos nulos (la app reparte al importar)',
      crit.every(c => c.peso === null || c.peso === undefined));
  }

  const sab = d.saberesBasicos;
  if (sab !== undefined) {
    check(pre + 'saberesBasicos es array',
      Array.isArray(sab) && sab.every(b => typeof b.bloque === 'string' && Array.isArray(b.apartados)));
  }
  return ces.length + crit.length;
}

function main() {
  console.log('== Plantillas de curriculo (plantillas/*.json) ==');
  const pls = plantillas();
  check('hay plantillas', pls.length > 0, 'n=' + pls.length);

  let ceTotal = 0, crTotal = 0;
  const vistas = new Map();
  for (const p of pls) {
    const n = validar(p);
    ceTotal += (p.datos.competenciasEspecificas || []).length;
    crTotal += (p.datos.criterios || []).length;
    const k = clave(p.datos);
    if (vistas.has(k)) {
      check('sin plantilla duplicada (' + k + ')', false, vistas.get(k) + ' == ' + p.archivo);
    } else {
      vistas.set(k, p.archivo);
    }
  }
  check('sin nombres de asignatura+ciclo duplicados', vistas.size === pls.length,
    vistas.size + '/' + pls.length);

  console.log('\n  plantillas: ' + pls.length + ' · competencias: ' + ceTotal + ' · criterios: ' + crTotal);
  console.log('\n' + (fallos ? 'FALLOS: ' + fallos + '/' + total : 'TODO OK: ' + total + ' comprobaciones'));
  process.exitCode = fallos ? 1 : 0;
}

main();
