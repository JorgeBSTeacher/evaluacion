// Color por unidad didáctica (UD) en la cuadrícula de Instrumentos.
// Paleta curada de 15 tonos pastel: `intenso` para la barra de la UD y
// `suave` para las cabeceras de instrumento. Ambos pasan contraste >= 4.6:1
// con el texto que se pintan encima (--tinta y --tinta-suave).
const ColoresUd = {
  PALETA: [
    { h: 0,   intenso: '#e07b7b', suave: '#f7e8e8' },
    { h: 24,  intenso: '#e0a37b', suave: '#f4e9e1' },
    { h: 48,  intenso: '#e0cc7b', suave: '#f0ebd5' },
    { h: 72,  intenso: '#cce07b', suave: '#e9efd2' },
    { h: 96,  intenso: '#a3e07b', suave: '#ddefd2' },
    { h: 120, intenso: '#7be07b', suave: '#d9f2d9' },
    { h: 144, intenso: '#7be0a3', suave: '#d5f0e0' },
    { h: 168, intenso: '#7be0cc', suave: '#d5f0eb' },
    { h: 192, intenso: '#7bcce0', suave: '#d9edf2' },
    { h: 210, intenso: '#7bade0', suave: '#e1ebf4' },
    { h: 230, intenso: '#7f8fe1', suave: '#e8ebf7' },
    { h: 250, intenso: '#9687e3', suave: '#ebe8f7' },
    { h: 275, intenso: '#b67be0', suave: '#f1e8f7' },
    { h: 300, intenso: '#e07be0', suave: '#f6e5f6' },
    { h: 330, intenso: '#e07bad', suave: '#f6e5ed' }
  ],
  esValido(hex) {
    return typeof hex === 'string' && /^#[0-9a-fA-F]{6}$/.test(hex);
  },
  // Entrada de la paleta a partir de su tono `intenso`, o null si no existe.
  entradaPorIntenso(hex) {
    return this.PALETA.find(c => c.intenso === hex) || null;
  },
  // Primer color de la paleta cuyo `intenso` no está en `usados`.
  primerLibre(usados) {
    const set = new Set(usados || []);
    return this.PALETA.find(c => !set.has(c.intenso)) || this.PALETA[0];
  }
};
