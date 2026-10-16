const Utils = {
  uid() {
    return 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  },
  esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },

  // Enlace de un instrumento (al examen, al proyecto, a los materiales…).
  // Al guardar se limpia: se descartan los esquemas peligrosos y, si falta el
  // esquema, se asume https://. Al pintar se vuelve a comprobar, de modo que un
  // backup manipulado no pueda inyectar código por el atributo href.
  urlLimpia(u) {
    let s = String(u == null ? '' : u).trim();
    if (!s || this.esquemaPeligroso(s)) return '';
    if (!/^[a-z][a-z0-9+.-]*:/i.test(s)) s = 'https://' + s;
    return s;
  },
  urlPintable(u) {
    const s = String(u == null ? '' : u).trim();
    return (s && !this.esquemaPeligroso(s)) ? s : '';
  },
  esquemaPeligroso(s) {
    return /^(javascript|data|vbscript):/i.test(String(s).trim());
  },
  fmt(n) {
    if (n == null || isNaN(n)) return '—';
    return (Math.round(n * 10) / 10).toFixed(1).replace('.', ',');
  },
  pct(n) {
    if (n == null || isNaN(n)) return '—';
    return Math.round(n) + '%';
  },
  hoy() {
    const d = new Date();
    const p = x => String(x).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  },

  fechaLegible(d = new Date()) {
    const p = x => String(x).padStart(2, '0');
    return p(d.getDate()) + '-' + p(d.getMonth() + 1) + '-' + d.getFullYear();
  },

  horaCorta(d = new Date()) {
    const p = x => String(x).padStart(2, '0');
    return p(d.getHours()) + p(d.getMinutes());
  },
  stamp() {
    const d = new Date();
    const p = x => String(x).padStart(2, '0');
    return '' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes());
  },
  debounce(fn, ms) {
    let t;
    return function (...a) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, a), ms);
    };
  }
};
