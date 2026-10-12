// tools/build-plantillas.js — embebe plantillas/*.json en js/plantillas.js.
// Genera un script clasico (sin modulos) con `const PLANTILLAS_CURRICULO = [...]`
// para que la carga del curriculo funcione en file:// sin fetch. Node, sin frameworks.
// Uso: node tools/build-plantillas.js
'use strict';
const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
const dir = path.join(raiz, 'plantillas');
const destino = path.join(raiz, 'js', 'plantillas.js');

function recoger() {
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .sort()
    .map(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
}

function main() {
  const pls = recoger();
  if (!pls.length) throw new Error('No hay plantillas en plantillas/*.json');

  const cabecera =
    '// Plantillas de currículo oficial generadas desde el Decreto 66/2022 (BOC nº 135).\n' +
    '// Archivo generado: no editar a mano; regenerar con tools/build-plantillas.js\n' +
    '// desde plantillas/*.json.\n';
  const cuerpo = 'const PLANTILLAS_CURRICULO = ' + JSON.stringify(pls) + ';\n';

  fs.writeFileSync(destino, cabecera + cuerpo, 'utf8');

  const ce = pls.reduce((s, p) => s + p.competenciasEspecificas.length, 0);
  const cr = pls.reduce((s, p) => s + p.criterios.length, 0);
  console.log('Escrito js/plantillas.js: ' + pls.length + ' plantillas, ' + ce + ' competencias, ' + cr + ' criterios');
}

main();
