// Test: primero se configura (temas, número de preguntas, opciones) y después se hace.
// Al terminar se guarda el intento y se abre su corrección (vistas/intento.js).
//
// Direcciones:
//   #/test?curso=ID                       configurar un test del curso
//   #/test?curso=ID&temas=T1,T2           configurar con esos temas ya marcados
//   #/test?curso=ID&preguntas=P1,P2       empezar directamente con esas preguntas (repasar fallos)

import { PENALIZACION_FALLO } from '../config.js';
import * as almacen from '../almacen.js';
import * as sesion from '../sesion.js';
import { barajar, esc, icono, nuevoId, pantallaVacia, plural, titulo } from '../utiles.js';

const LETRAS = 'abcdefghij';
const CANTIDADES = [10, 20, 30, 0]; // 0 = todas

export async function render(el, { query }) {
  const curso = await almacen.curso(query.get('curso'));
  if (!curso || !sesion.puedeVerCurso(curso.id)) {
    titulo('Test no disponible');
    el.innerHTML = pantallaVacia('Test no disponible', 'El curso no existe o no estás matriculado en él.', { href: '#/panel', texto: 'Volver a mis cursos' });
    return null;
  }
  const temas = await almacen.temas(curso.id);

  // Lo que la navegación consulta antes de salir de la pantalla; cambia según la fase.
  const control = {
    puedeSalir: () => true,
    salidaPendiente: () => false,
    alSalir: () => {},
  };

  const ids = (query.get('preguntas') ?? '').split(',').filter(Boolean);
  if (ids.length) {
    const temaIds = new Set(temas.map((t) => t.id));
    const lista = (await almacen.preguntasPorId(ids)).filter((p) => temaIds.has(p.temaId));
    if (!lista.length) {
      titulo('Test no disponible');
      el.innerHTML = pantallaVacia('Estas preguntas ya no existen', 'Puede que la escuela las haya cambiado. Prepara un test nuevo.', { href: `#/test?curso=${curso.id}`, texto: 'Nuevo test' });
      return null;
    }
    empezar(el, control, { curso, temas, lista: barajar(lista), estudio: true, penaliza: false });
    return control;
  }

  const preseleccion = (query.get('temas') ?? '').split(',').filter(Boolean);
  await configurar(el, control, { curso, temas, preseleccion });
  return control;
}

// ---------- Configuración ----------

async function configurar(el, control, { curso, temas, preseleccion }) {
  titulo('Nuevo test');
  const cuentas = await almacen.contarPreguntas(temas.map((t) => t.id));
  const conPreguntas = temas.filter((t) => cuentas[t.id]);
  const marcados = new Set(preseleccion.length ? preseleccion : conPreguntas.map((t) => t.id));

  const migas = `
    <nav class="migas" aria-label="Ruta">
      <a href="#/panel">Mis cursos</a>
      <a href="#/curso/${esc(curso.id)}">${esc(curso.titulo)}</a>
    </nav>`;

  if (!conPreguntas.length) {
    el.innerHTML = `<section class="contenedor estrecho seccion">${migas}<h1>Nuevo test</h1>
      <p class="caja-info">Este curso todavía no tiene preguntas.</p></section>`;
    return;
  }

  el.innerHTML = `
    <section class="contenedor estrecho seccion">
      ${migas}
      <h1>Nuevo test</h1>
      <form class="formulario tarjeta" novalidate>
        <fieldset>
          <legend>Temas</legend>
          <p class="acciones-pequenas">
            <button type="button" class="enlace" data-marcar="todos">Todos</button>
            <button type="button" class="enlace" data-marcar="ninguno">Ninguno</button>
          </p>
          ${conPreguntas.map((t) => `
            <label class="opcion-check">
              <input type="checkbox" name="tema" value="${esc(t.id)}" ${marcados.has(t.id) ? 'checked' : ''}>
              <span><strong>${esc(t.titulo)}</strong><span class="apagado">${plural(cuentas[t.id], 'pregunta', 'preguntas')}</span></span>
            </label>`).join('')}
        </fieldset>

        <fieldset>
          <legend>Número de preguntas</legend>
          <div class="segmentado">
            ${CANTIDADES.map((n, i) => `
              <label><input type="radio" name="numero" value="${n}" ${i === 0 ? 'checked' : ''}><span>${n || 'Todas'}</span></label>`).join('')}
          </div>
        </fieldset>

        <fieldset>
          <legend>Opciones</legend>
          <label class="opcion-check">
            <input type="checkbox" name="estudio">
            <span><strong>Modo estudio</strong><span class="apagado">Al responder cada pregunta ves si has acertado y la explicación.</span></span>
          </label>
          <label class="opcion-check">
            <input type="checkbox" name="penaliza">
            <span><strong>Los fallos restan</strong><span class="apagado">Cada fallo resta un tercio de acierto, como en muchos exámenes oficiales.</span></span>
          </label>
        </fieldset>

        <p class="resumen-test" aria-live="polite"></p>
        <button class="boton boton-grande" type="submit">Empezar el test</button>
      </form>
    </section>`;

  const form = el.querySelector('form');
  const resumen = el.querySelector('.resumen-test');
  const boton = form.querySelector('[type=submit]');

  const elegidos = () => [...form.querySelectorAll('[name=tema]:checked')].map((c) => c.value);
  const cuantas = () => {
    const disponibles = elegidos().reduce((suma, id) => suma + cuentas[id], 0);
    const pedidas = Number(form.numero.value);
    return { disponibles, n: pedidas ? Math.min(pedidas, disponibles) : disponibles };
  };
  const actualizar = () => {
    const { disponibles, n } = cuantas();
    boton.disabled = !disponibles;
    resumen.textContent = disponibles
      ? `Test de ${plural(n, 'pregunta', 'preguntas')} de ${plural(elegidos().length, 'tema', 'temas')}.`
      : 'Elige al menos un tema.';
  };

  for (const b of form.querySelectorAll('[data-marcar]')) {
    b.addEventListener('click', () => {
      for (const c of form.querySelectorAll('[name=tema]')) c.checked = b.dataset.marcar === 'todos';
      actualizar();
    });
  }
  form.addEventListener('change', actualizar);
  actualizar();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const { n } = cuantas();
    if (!n) return;
    const lista = barajar(await almacen.preguntas(elegidos())).slice(0, n);
    empezar(el, control, {
      curso,
      temas,
      lista,
      estudio: form.estudio.checked,
      penaliza: form.penaliza.checked,
    });
  });
}

// ---------- Test en curso ----------

function empezar(el, control, { curso, temas, lista, estudio, penaliza }) {
  titulo('Test en curso');
  const estado = {
    // «orden» es el orden (barajado) en que se muestran las opciones de cada pregunta.
    preguntas: lista.map((p) => ({ ...p, orden: barajar(p.opciones.map((_, i) => i)) })),
    respuestas: lista.map(() => null),
    actual: 0,
    mapaAbierto: false,
    inicio: new Date().toISOString(),
    terminado: false,
  };

  const respondidas = () => estado.respuestas.filter((r) => r != null).length;
  control.puedeSalir = () => estado.terminado || respondidas() === 0
    || confirm('Si sales ahora perderás las respuestas de este test. ¿Quieres salir?');
  control.salidaPendiente = () => !estado.terminado && respondidas() > 0;

  const alPulsarTecla = (e) => {
    if (e.target.closest('input, textarea, select') || e.ctrlKey || e.metaKey || e.altKey) return;
    const p = estado.preguntas[estado.actual];
    const letra = LETRAS.indexOf(e.key.toLowerCase());
    const numero = Number(e.key) - 1;
    const posicion = letra >= 0 ? letra : numero;
    if (posicion >= 0 && posicion < p.orden.length) elegir(p.orden[posicion]);
    else if (e.key === 'ArrowRight') ir(estado.actual + 1);
    else if (e.key === 'ArrowLeft') ir(estado.actual - 1);
  };
  document.addEventListener('keydown', alPulsarTecla);
  control.alSalir = () => document.removeEventListener('keydown', alPulsarTecla);

  function ir(i) {
    if (i < 0 || i >= estado.preguntas.length) return;
    estado.actual = i;
    pintar();
    el.querySelector('.enunciado')?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }

  function elegir(indice) {
    const i = estado.actual;
    if (estudio && estado.respuestas[i] != null) return; // en modo estudio no se cambia
    estado.respuestas[i] = estado.respuestas[i] === indice && !estudio ? null : indice;
    pintar();
  }

  function pintar() {
    const i = estado.actual;
    const p = estado.preguntas[i];
    const total = estado.preguntas.length;
    const elegida = estado.respuestas[i];
    const corregir = estudio && elegida != null;
    const ultima = i === total - 1;

    el.innerHTML = `
      <section class="contenedor estrecho seccion test">
        <div class="test-cabecera">
          <span><strong>Pregunta ${i + 1}</strong> de ${total}</span>
          <span class="apagado">${respondidas()} respondidas</span>
        </div>
        <div class="barra-progreso" style="--valor:${((i + 1) / total) * 100}%"><span></span></div>

        <h1 class="enunciado" tabindex="-1">${esc(p.enunciado)}</h1>

        <div class="opciones">
          ${p.orden.map((o, pos) => {
            const clases = ['opcion'];
            if (elegida === o) clases.push('elegida');
            if (corregir && o === p.correcta) clases.push('correcta');
            if (corregir && elegida === o && o !== p.correcta) clases.push('incorrecta');
            return `
              <button type="button" class="${clases.join(' ')}" data-opcion="${o}" aria-pressed="${elegida === o}" ${corregir ? 'aria-disabled="true"' : ''}>
                <span class="letra">${LETRAS[pos]}</span>
                <span>${esc(p.opciones[o])}</span>
              </button>`;
          }).join('')}
        </div>

        ${corregir ? `
          <div class="explicacion ${elegida === p.correcta ? 'bien' : 'mal'}" role="status">
            <strong>${elegida === p.correcta ? '¡Correcto!' : `Incorrecto. La respuesta correcta es la ${LETRAS[p.orden.indexOf(p.correcta)]}.`}</strong>
            ${p.explicacion ? `<p>${esc(p.explicacion)}</p>` : ''}
          </div>` : ''}

        <div class="test-navegacion">
          <button type="button" class="boton boton-secundario" data-ir="${i - 1}" ${i === 0 ? 'disabled' : ''}>${icono('atras')} Anterior</button>
          ${ultima
            ? '<button type="button" class="boton" data-terminar>Terminar y corregir</button>'
            : `<button type="button" class="boton" data-ir="${i + 1}">Siguiente ${icono('flecha')}</button>`}
        </div>

        <details class="mapa" ${estado.mapaAbierto ? 'open' : ''}>
          <summary>Todas las preguntas</summary>
          <div class="mapa-rejilla">
            ${estado.preguntas.map((q, j) => {
              const r = estado.respuestas[j];
              const clases = ['mapa-celda'];
              if (r != null) clases.push(estudio ? (r === q.correcta ? 'bien' : 'mal') : 'respondida');
              if (j === i) clases.push('actual');
              return `<button type="button" class="${clases.join(' ')}" data-ir="${j}" aria-label="Pregunta ${j + 1}${r != null ? ', respondida' : ''}">${j + 1}</button>`;
            }).join('')}
          </div>
          ${ultima ? '' : '<p><button type="button" class="enlace" data-terminar>Terminar ya y corregir</button></p>'}
        </details>
        <p class="atajos apagado">Atajos: teclas a–${LETRAS[p.orden.length - 1]} para responder, ← → para moverte.</p>
      </section>`;

    for (const b of el.querySelectorAll('[data-opcion]')) {
      b.addEventListener('click', () => elegir(Number(b.dataset.opcion)));
    }
    for (const b of el.querySelectorAll('[data-ir]')) {
      b.addEventListener('click', () => ir(Number(b.dataset.ir)));
    }
    for (const b of el.querySelectorAll('[data-terminar]')) {
      b.addEventListener('click', terminar);
    }
    el.querySelector('.mapa').addEventListener('toggle', (e) => { estado.mapaAbierto = e.target.open; });
  }

  async function terminar() {
    const blancos = estado.respuestas.filter((r) => r == null).length;
    if (blancos && !confirm(`Te ${blancos === 1 ? 'queda 1 pregunta' : `quedan ${blancos} preguntas`} sin responder. ¿Terminar igualmente?`)) return;

    const total = estado.preguntas.length;
    const aciertos = estado.preguntas.filter((p, i) => estado.respuestas[i] === p.correcta).length;
    const fallos = total - aciertos - blancos;
    const puntos = penaliza ? aciertos - fallos * PENALIZACION_FALLO : aciertos;
    const nota = Math.max(0, Math.round((puntos / total) * 1000) / 100);

    const temaIds = temas.map((t) => t.id).filter((id) => estado.preguntas.some((p) => p.temaId === id));
    const u = sesion.usuario();
    const intento = {
      id: nuevoId('i-'),
      usuarioId: u.id,
      usuarioNombre: u.nombre,
      cursoId: curso.id,
      cursoTitulo: curso.titulo,
      temaIds,
      temaTitulos: temaIds.map((id) => temas.find((t) => t.id === id).titulo),
      inicio: estado.inicio,
      fecha: new Date().toISOString(),
      total,
      aciertos,
      fallos,
      blancos,
      nota,
      penaliza,
      estudio,
      // Copia de cada pregunta tal como se hizo, para poder revisarla aunque cambie después.
      preguntas: estado.preguntas.map((p, i) => ({
        id: p.id,
        temaId: p.temaId,
        enunciado: p.enunciado,
        opciones: p.opciones,
        correcta: p.correcta,
        explicacion: p.explicacion,
        orden: p.orden,
        elegida: estado.respuestas[i],
      })),
    };
    await almacen.guardarIntento(intento);
    estado.terminado = true;
    location.hash = `#/intento/${intento.id}`;
  }

  pintar();
}
