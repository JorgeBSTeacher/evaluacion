const App = (() => {
  const VISTAS = [
    { id: 'inicio', label: 'Inicio', render: renderInicio },
    { id: 'alumnos', label: 'Alumnos y grupos', render: el => AlumnosView.render(el) },
    { id: 'clases', label: 'Asignaturas y clases', render: el => ClasesView.render(el) },
    { id: 'curriculo', label: 'Currículo', render: el => CurriculoView.render(el), riesgo: true },
    { id: 'instrumentos', label: 'Instrumentos', render: el => InstrumentosView.render(el) },
    { id: 'cuadricula', label: 'Cuadrícula', render: el => CuadriculaView.render(el) }
  ];
  let actual = 'inicio';

  function renderInicio(el) {
    const db = Storage.db;
    const stats = [
      ['Grupos', db.grupos.length],
      ['Alumnos', db.alumnos.length],
      ['Asignaturas', db.asignaturas.length],
      ['Clases', db.clases.length],
      ['Criterios', db.criterios.length],
      ['Instrumentos', db.instrumentos.length]
    ];
    el.innerHTML = `
      <section class="card">
        <div class="card-head">
          <h1>Bienvenido a EvalCrit</h1>
          <label class="campo" style="margin:0"><span>Curso escolar</span>
            <input type="text" id="f-curso" value="${Utils.esc(db.cursoEscolar)}" style="max-width:150px"></label>
        </div>
        <p style="color:var(--tinta-suave)">Califica con criterios ponderados según la LOMLOE. Los datos se guardan en este navegador:
          <b>exporta tu backup al USB con frecuencia</b>.</p>
        <div class="resumen-stats">
          ${stats.map(([k, v]) => `<div class="stat"><b>${v}</b><span>${k}</span></div>`).join('')}
        </div>
        ${Storage.vacio() ? `
          <div class="aviso">Tu aplicación está vacía. Puedes cargar datos de ejemplo para probarla.</div>
          <button class="btn btn-primario" id="btn-demo">Cargar datos de ejemplo</button>` : ''}
        <h2 style="font-size:15px;margin:18px 0 8px">Flujo recomendado</h2>
        <ol style="color:var(--tinta-suave);line-height:1.9;margin:0;padding-left:20px">
          <li>Crea <b>grupos</b> e inscribe <b>alumnos</b>.</li>
          <li>Crea <b>asignaturas</b> y sus <b>clases</b> (asignatura · grupo).</li>
          <li>Define en <b>Currículo</b> las competencias específicas, los criterios y sus ponderaciones (suman 100%).</li>
          <li>Crea <b>instrumentos</b>: control, rúbrica, proyecto u otro, mapeando cada apartado a criterios.</li>
          <li>Corrige y consulta resultados por instrumento, criterio y competencia en la <b>Cuadrícula</b>.</li>
          <li>Exporta el backup al terminar cada sesión.</li>
        </ol>
      </section>`;

    const curso = el.querySelector('#f-curso');
    if (curso) {
      curso.addEventListener('change', Utils.debounce(() => {
        db.cursoEscolar = curso.value.trim();
        Storage.save();
      }, 400));
    }
    const demo = el.querySelector('#btn-demo');
    if (demo) demo.onclick = () => {
      Storage.demoSeed();
      UI.toast('Datos de ejemplo cargados');
      App.ir('inicio');
    };
  }

  function ir(id) {
    actual = id;
    const vista = VISTAS.find(v => v.id === id);
    const nav = document.getElementById('nav');
    nav.innerHTML = '';
    for (const v of VISTAS) {
      const b = document.createElement('button');
      b.textContent = v.label;
      if (v.id === actual) b.classList.add('activo');
      if (v.riesgo && v.id !== actual) b.classList.add('peligro-activo');
      b.onclick = () => ir(v.id);
      nav.appendChild(b);
    }
    UI.closeModal();
    vista.render(document.getElementById('app'));
    window.scrollTo(0, 0);
  }

  function arrancar() {
    Storage.load();
    document.getElementById('btn-exportar').onclick = () => Storage.exportar();

    const input = document.getElementById('input-importar');
    document.getElementById('btn-importar').onclick = () => input.click();
    input.onchange = () => {
      const archivo = input.files[0];
      input.value = '';
      if (!archivo) return;
      if (!confirm('Importar reemplazará TODOS los datos actuales. ¿Continuar?')) return;
      Storage.importar(archivo)
        .then(() => { UI.toast('Backup importado'); ir(actual); })
        .catch(() => alert('El archivo no es un backup válido de EvalCrit'));
    };

    ir('inicio');
  }

  return { ir, arrancar };
})();

document.addEventListener('DOMContentLoaded', App.arrancar);
