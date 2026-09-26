// Portada: presentación de la escuela, recorrido por los módulos (con el acceso al temario y
// al test de cada uno) y contacto. Es también la pantalla de «Mis cursos» del alumno.

import { ESCUELA } from '../config.js';
import * as almacen from '../almacen.js';
import * as sesion from '../sesion.js';
import { resumen } from '../estadisticas.js';
import { emblemaCurso, esc, estiloCurso, etiquetaModulo, icono, nota, plural, titulo } from '../utiles.js';
import { montarRecorrido } from '../recorrido.js';
import { montarBienvenida } from '../bienvenida.js';

// Textos del recorrido si falta algún módulo en los datos.
const MODULOS_BASE = ['Natación', 'Prevención de accidentes en instalaciones acuáticas', 'Rescate de accidentados en instalaciones acuáticas', 'Primeros auxilios'];

export async function render(el) {
  titulo('');
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
    <section class="portada">
      <div class="portada-logo" aria-hidden="true">
        <svg viewBox="0 0 1862 623"><use href="assets/logo.svg#logo"/></svg>
      </div>
      <svg class="logo-vuelo" viewBox="0 0 1862 623" aria-hidden="true"><use href="assets/logo.svg#logo"/></svg>
      <div class="portada-texto">
        <p class="portada-lugar">${icono('salvavidas')} ${esc(ESCUELA.ciudad)}</p>
        <h1 class="portada-titulo">${u ? `Hola, ${esc(u.nombre.split(' ')[0])}` : 'Bienvenido'}</h1>
        <p class="portada-lema">${esc(ESCUELA.lema)}</p>
      </div>
      <a class="portada-deslizar" href="#recorrido" data-desplazar="recorrido">
        <span>${u ? 'Desliza para ver tus módulos' : 'Desliza para empezar'}</span>
        <span class="portada-deslizar-flecha" aria-hidden="true"></span>
      </a>
    </section>

    <section class="recorrido" id="recorrido" aria-label="Los cuatro módulos del curso">
      <div class="recorrido-fijo">
        <canvas class="recorrido-lienzo" aria-hidden="true"></canvas>
        <div class="recorrido-textos">
          ${recorrido.map((m, i) => `
            <div class="recorrido-paso color-${estiloCurso(i)[0]}">
              <span class="recorrido-etiqueta">Módulo ${i + 1}</span>
              <h2>${esc(m.titulo)}</h2>
              ${m.descripcion ? `<p>${esc(m.descripcion)}</p>` : ''}
              ${m.curso ? accesos(m, estiloCurso(i)[1]) : ''}
            </div>`).join('')}
          <div class="recorrido-progreso" aria-hidden="true">${recorrido.map(() => '<span></span>').join('')}</div>
        </div>
      </div>
    </section>

    <section class="contenedor">
      <div class="seccion-fila"><h2>Todo el curso en un solo sitio</h2></div>
      <div class="modos">
        <div class="modo color-morado">
          <span class="modo-emblema">${icono('libro')}</span>
          <span class="modo-nombre">Temario</span>
          <span class="modo-sub">Cada tema con su explicación, PDF y vídeos</span>
        </div>
        <div class="modo color-coral">
          <span class="modo-emblema">${icono('test')}</span>
          <span class="modo-nombre">Tests</span>
          <span class="modo-sub">Por tema o de todo el curso, con corrección</span>
        </div>
        <div class="modo color-teal">
          <span class="modo-emblema">${icono('grafica')}</span>
          <span class="modo-nombre">Notas</span>
          <span class="modo-sub">Tu media y tus aciertos por tema</span>
        </div>
      </div>

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

      <div class="seccion-fila"><h2>Contacto</h2></div>
      <div class="contacto">
        <p>¿Quieres apuntarte? Escríbenos o llámanos y te contamos las próximas fechas.</p>
        <div class="acciones">
          <a class="btn btn-primario" href="mailto:${esc(ESCUELA.email)}">${esc(ESCUELA.email)}</a>
          <a class="btn btn-fantasma" href="tel:${esc(ESCUELA.telefono.replace(/\s/g, ''))}">${esc(ESCUELA.telefono)}</a>
        </div>
      </div>
    </section>`;

  montarBienvenida(el.querySelector('.portada'));
  montarRecorrido(el.querySelector('.recorrido'));

  // «Desliza para empezar» baja al recorrido sin cambiar la dirección.
  el.querySelectorAll('[data-desplazar]').forEach((boton) => boton.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById(e.currentTarget.dataset.desplazar).scrollIntoView({ behavior: 'smooth' });
  }));
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
