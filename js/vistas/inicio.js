// Portada pública: presentación de la escuela, cursos y contacto.

import { ESCUELA } from '../config.js';
import * as almacen from '../almacen.js';
import * as sesion from '../sesion.js';
import { esc, icono, titulo } from '../utiles.js';

export async function render(el) {
  titulo('');
  const cursos = await almacen.cursos();
  const u = sesion.usuario();

  el.innerHTML = `
    <section class="portada">
      <div class="contenedor portada-contenido">
        <p class="antetitulo">${esc(ESCUELA.ciudad)}</p>
        <h1>${esc(ESCUELA.nombre)}</h1>
        <p class="lema">${esc(ESCUELA.lema)}</p>
        <div class="acciones">
          <a class="boton boton-grande" href="${u ? '#/panel' : '#/acceso'}">${u ? 'Ir a mis cursos' : 'Acceso alumnos'}</a>
          <a class="boton boton-secundario boton-grande" href="#cursos" data-desplazar="cursos">Ver cursos</a>
        </div>
      </div>
    </section>

    <section class="contenedor seccion">
      <h2>Todo el curso en un solo sitio</h2>
      <div class="rejilla rejilla-3">
        <article class="rasgo">
          ${icono('libro')}
          <h3>Temario</h3>
          <p>Cada tema con su explicación, los PDF y los vídeos, disponible también desde el móvil.</p>
        </article>
        <article class="rasgo">
          ${icono('test')}
          <h3>Tests</h3>
          <p>Tests por tema o de todo el curso, con la corrección y la explicación de cada pregunta.</p>
        </article>
        <article class="rasgo">
          ${icono('grafica')}
          <h3>Notas</h3>
          <p>Tu historial de tests y tu media por tema, para saber qué repasar antes del examen.</p>
        </article>
      </div>
    </section>

    <section class="contenedor seccion" id="cursos">
      <h2>Cursos</h2>
      <div class="rejilla rejilla-2">
        ${cursos.map((c) => `
          <article class="tarjeta">
            <h3>${esc(c.titulo)}</h3>
            <p>${esc(c.descripcion)}</p>
            ${c.horas ? `<p class="dato">${icono('reloj')} ${esc(c.horas)} horas</p>` : ''}
          </article>`).join('') || '<p class="apagado">Pronto publicaremos los próximos cursos.</p>'}
      </div>
    </section>

    <section class="contenedor seccion contacto">
      <h2>¿Quieres apuntarte?</h2>
      <p>Escríbenos o llámanos y te contamos las próximas fechas.</p>
      <p class="acciones">
        <a class="boton" href="mailto:${esc(ESCUELA.email)}">${esc(ESCUELA.email)}</a>
        <a class="boton boton-secundario" href="tel:${esc(ESCUELA.telefono.replace(/\s/g, ''))}">${esc(ESCUELA.telefono)}</a>
      </p>
    </section>`;

  // «Ver cursos» baja hasta la lista sin cambiar la dirección.
  el.querySelector('[data-desplazar]').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById(e.currentTarget.dataset.desplazar).scrollIntoView({ behavior: 'smooth' });
  });
}
