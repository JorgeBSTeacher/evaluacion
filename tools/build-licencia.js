// Regenera js/licencia.js desde LICENSE.
// La licencia viaja incrustada en el entregable (D-73): si cambias LICENSE,
// ejecuta esto y vuelve a construir dist. tools/checks.js compara ambos textos.
// Uso: node tools/build-licencia.js
'use strict';
const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
const texto = fs.readFileSync(path.join(raiz, 'LICENSE'), 'utf8');

if (texto.includes('`') || texto.includes('${') || texto.includes('\\')) {
  console.error('ERROR: LICENSE contiene caracteres que rompen la plantilla JS');
  process.exit(1);
}

const cabecera =
  '// Texto oficial de la EUPL-1.2 en castellano, incrustado en el entregable.\n' +
  '// Fuente de verdad: LICENSE. tools/checks.js verifica que coinciden.\n' +
  '// Regenerar: node tools/build-licencia.js\n';

const destino = path.join(raiz, 'js', 'licencia.js');
fs.writeFileSync(destino, cabecera + 'const LICENCIA_EUPL = `' + texto + '`;\n');
console.log('Generado', destino, 'desde LICENSE');
