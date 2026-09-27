// Temario y test: los cuatro módulos en el recorrido (un socorrista en la misma playa nada,
// vigila, rescata y hace una RCP; js/recorrido.js), cada uno con sus recuadros de Temario y
// Test, los botones para ir directo a cada módulo y la lista de módulos.

import * as almacen from '../almacen.js';
import * as sesion from '../sesion.js';
import { resumen } from '../estadisticas.js';
import { emblemaCurso, esc, estiloCurso, etiquetaModulo, icono, nota, plural, titulo } from '../utiles.js';
import { montarRecorrido } from '../recorrido.js';

// Textos del recorrido si falta algún módulo en los datos.
const MODULOS_BASE = ['Natación', 'Prevención de accidentes en instalaciones acuáticas', 'Rescate de accidentados en instalaciones acuáticas', 'Primeros auxilios'];
// Nombres cortos para los botones de ir directo a un módulo.
const MODULOS_CORTOS = ['Natación', 'Prevención', 'Rescate', 'Primeros auxilios'];

export async function render(el) {
  titulo('Temario y test');
  const cursos = await almacen.cursos();
  const u = sesion.usuario();
  const intentos = u ? await almacen.intentos({ usuarioId: u.id }) : [];
  const recorrido = await Promise.all(MODULOS_BASE.map(async (nombre, i) => {
    const curso = cursos.find((c) => Number(c.modulo) === i + 1);
    return {
      curso,
      titulo: curso?.titulo ?? nombre,
      descripcion: curso?.descripcion ?? '',
      temas: curso ? (await almacen.temas(curso.id)).length : 0,
      // Sin sesión se enlaza igual: al pulsar se pide entrar y luego se vuelve aquí.
      abierto: !u || sesion.esAdmin() || (curso && u.cursos.includes(curso.id)),
      tests: curso ? resumen(intentos.filter((x) => x.cursoId === curso.id)) : null,
    };
  }));

  el.innerHTML = `
    <section class="contenedor temario-cabeza">
      <h1>Temario y test</h1>
      <p class="apagado">Los cuatro módulos del curso de socorrista. Entra en el temario de cada uno o ponte a prueba con su test.</p>
    </section>

    <nav class="saltos-modulo" aria-label="Ir directo a un módulo">
      <p class="saltos-titulo">¿Con prisa? Ve directo a un módulo</p>
      <div class="saltos-lista">
        ${recorrido.map((m, i) => {
          const [color, ico] = estiloCurso(i);
          return `
            <a class="salto-modulo color-${color}" href="#recorrido" data-modulo="${i}">
              <span class="salto-icono">${m.curso ? emblemaCurso(m.curso, ico) : icono(ico)}</span>
              <span class="salto-texto"><span>Módulo ${i + 1}</span><strong>${MODULOS_CORTOS[i]}</strong></span>
            </a>`;
        }).join('')}
      </div>
    </nav>

    <section class="recorrido" id="recorrido" aria-label="Los cuatro módulos del curso">
      <div class="recorrido-fijo">
        <canvas class="recorrido-lienzo" aria-hidden="true"></canvas>
        <div class="recorrido-textos">
          ${recorrido.map((m, i) => `
            <div class="recorrido-paso color-${estiloCurso(i)[0]}" data-corto="${MODULOS_CORTOS[i]}">
              <span class="recorrido-etiqueta">Módulo ${i + 1}</span>
              <h2>${esc(m.titulo)}</h2>
              ${m.descripcion ? `<p>${esc(m.descripcion)}</p>` : ''}
              ${m.curso ? accesos(m, estiloCurso(i)[1]) : ''}
            </div>`).join('')}
          <div class="recorrido-progreso" aria-hidden="true">${recorrido.map(() => '<span></span>').join('')}</div>
        </div>
        <p class="recorrido-siguiente" aria-hidden="true"><span></span></p>
      </div>
    </section>

    <section class="contenedor">
      <div class="seccion-fila" id="cursos"><h2>Módulos</h2></div>
      ${cursos.length ? `
        <div class="lista-cursos">
          ${cursos.map((c, i) => {
            const [color, ico] = estiloCurso(i);
            return `
              <article class="curso-fila color-${color}">
                <span class="curso-emblema">${emblemaCurso(c, ico)}</span>
                <div class="curso-texto">
                  ${c.modulo ? `<span class="curso-etiqueta">${esc(etiquetaModulo(c))}</span>` : ''}
                  <h3>${esc(c.titulo)}</h3>
                  <p>${esc(c.descripcion)}</p>
                </div>
                ${c.horas ? `<span class="curso-horas">${esc(c.horas)} h</span>` : ''}
              </article>`;
          }).join('')}
        </div>` : '<p class="vacio">Pronto publicaremos los próximos cursos.</p>'}

    </section>`;

  const tour = montarRecorrido(el.querySelector('.recorrido'));
  el.querySelectorAll('[data-modulo]').forEach((boton) => boton.addEventListener('click', (e) => {
    e.preventDefault();
    tour.irA(Number(e.currentTarget.dataset.modulo));
  }));

  // Al salir, el scroll vuelve a ser el normal.
  return { alSalir: () => tour.desmontar() };
}

// Recuadros «Temario» y «Test» de un módulo dentro del recorrido.
function accesos(m, iconoLinea) {
  const id = encodeURIComponent(m.curso.id);
  const recuadro = (href, simbolo, nombre, detalle) => m.abierto
    ? `<a class="recorrido-acceso" href="${href}"><span class="recorrido-acceso-icono">${simbolo}</span><span class="recorrido-acceso-texto"><strong>${nombre}</strong><span>${detalle}</span></span></a>`
    : `<span class="recorrido-acceso bloqueado"><span class="recorrido-acceso-icono">${icono('candado')}</span><span class="recorrido-acceso-texto"><strong>${nombre}</strong><span>Sin acceso</span></span></span>`;
  return `
    <div class="recorrido-accesos">
      ${recuadro(`#/curso/${id}`, emblemaCurso(m.curso, iconoLinea), 'Temario', plural(m.temas, 'tema', 'temas'))}
      ${recuadro(`#/test?curso=${id}`, icono('test'), 'Test', m.tests?.tests ? `Media <b>${nota(m.tests.media)}</b>` : 'Tipo examen')}
    </div>`;
}
