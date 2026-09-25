// Portada pública: presentación de la escuela, cursos y contacto.

import { ESCUELA } from '../config.js';
import * as almacen from '../almacen.js';
import * as sesion from '../sesion.js';
import { esc, estiloCurso, icono, titulo } from '../utiles.js';

export async function render(el) {
  titulo('');
  const cursos = await almacen.cursos();
  const u = sesion.usuario();

  el.innerHTML = `
    <section class="portada">
      <p class="portada-lugar">${icono('salvavidas')} ${esc(ESCUELA.ciudad)}</p>
      <h1 class="portada-titulo">${esc(ESCUELA.nombre)}</h1>
      <p class="portada-lema">${esc(ESCUELA.lema)}</p>
      <div class="portada-botones">
        <a class="btn btn-claro btn-bloque" href="${u ? '#/panel' : '#/acceso'}">${u ? 'Ir a mis cursos' : 'Acceso alumnos'}</a>
        <a class="btn-portada" href="#cursos" data-desplazar="cursos">${icono('libro')} Ver cursos</a>
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

      <div class="seccion-fila" id="cursos"><h2>Cursos</h2></div>
      ${cursos.length ? `
        <div class="lista-cursos">
          ${cursos.map((c, i) => {
            const [color, ico] = estiloCurso(i);
            return `
              <article class="curso-fila color-${color}">
                <span class="curso-emblema">${icono(ico)}</span>
                <div class="curso-texto">
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

  // «Ver cursos» baja hasta la lista sin cambiar la dirección.
  el.querySelector('[data-desplazar]').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById(e.currentTarget.dataset.desplazar).scrollIntoView({ behavior: 'smooth' });
  });
}
