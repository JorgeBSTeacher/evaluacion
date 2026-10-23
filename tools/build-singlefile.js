// Genera dist/evalora.html: la app completa en UN solo fichero (CSS y JS incrustados).
// Motivo: Chrome en Android abre los HTML desde gestores de archivos vía content://
// y ahí los recursos externos no cargan. Con todo incrustado funciona igual.
// Uso: node tools/build-singlefile.js
const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(raiz, 'index.html'), 'utf8');

let salida = html.replace(
  /[ \t]*<link rel="stylesheet" href="([^"?]+)\?v=\d+"><\/link>|[ \t]*<link rel="stylesheet" href="([^"?]+)\?v=\d+" *\/?>/g,
  (m, a, b) => {
    const ruta = path.join(raiz, a || b);
    return '<style>\n' + fs.readFileSync(ruta, 'utf8') + '\n</style>';
  }
);

salida = salida.replace(
  /[ \t]*<script src="([^"?]+)\?v=\d+"><\/script>/g,
  (m, ruta) => '<script>\n' + fs.readFileSync(path.join(raiz, ruta), 'utf8') + '\n</script>'
);

if (/src="js\//.test(salida) || /rel="stylesheet"/.test(salida)) {
  console.error('ERROR: quedaron recursos externos sin incrustar');
  process.exit(1);
}

fs.mkdirSync(path.join(raiz, 'dist'), { recursive: true });
const destino = path.join(raiz, 'dist', 'evalora.html');
fs.writeFileSync(destino, salida);
console.log('Generado', destino, (salida.length / 1024).toFixed(0) + ' KB');
