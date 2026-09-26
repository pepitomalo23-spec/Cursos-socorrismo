// Panel del alumno: sus cursos (tarjetas como las de pj.fire) y sus últimos tests.

import * as almacen from '../almacen.js';
import * as sesion from '../sesion.js';
import { resumen } from '../estadisticas.js';
import { chipNota, emblemaCurso, esc, estiloCurso, etiquetaModulo, fecha, icono, nota, plural, titulo } from '../utiles.js';

export async function render(el) {
  titulo('Mis cursos');
  const u = sesion.usuario();
  const todos = await almacen.cursos();
  const cursos = sesion.esAdmin() ? todos : todos.filter((c) => u.cursos.includes(c.id));
  const intentos = await almacen.intentos({ usuarioId: u.id });

  const tarjetas = await Promise.all(cursos.map(async (c) => {
    const temas = await almacen.temas(c.id);
    const r = resumen(intentos.filter((i) => i.cursoId === c.id));
    const [color, ico] = estiloCurso(todos.findIndex((x) => x.id === c.id));
    return `
      <a class="modo color-${color}" href="#/curso/${esc(c.id)}">
        <span class="modo-emblema">${emblemaCurso(c, ico)}</span>
        ${c.modulo ? `<span class="modo-etiqueta">${esc(etiquetaModulo(c))}</span>` : ''}
        <span class="modo-nombre ${c.modulo ? 'modo-nombre-modulo' : ''}">${esc(c.titulo)}</span>
        <span class="modo-sub">${plural(temas.length, 'tema', 'temas')}${r.tests ? ` · media <b>${nota(r.media)}</b>` : ''}</span>
      </a>`;
  }));

  const nombres = Object.fromEntries(todos.map((c) => [c.id, c.titulo]));

  el.innerHTML = `
    <section class="contenedor">
      <h1>Hola, ${esc(u.nombre.split(' ')[0])}</h1>
      ${cursos.length
        ? `<div class="modos">${tarjetas.join('')}</div>`
        : '<p class="vacio">Todavía no tienes acceso a ningún curso.<br>La escuela te lo dará en cuanto se confirme tu matrícula.</p>'}

      <div class="seccion-fila">
        <h2>Historial</h2>
        ${intentos.length ? '<a class="seccion-enlace" href="#/notas">Ver todo</a>' : ''}
      </div>
      ${intentos.length ? `
        <div class="historial">
          ${intentos.slice(0, 5).map((i) => `
            <a class="hist-item" href="#/intento/${esc(i.id)}">
              <span class="hist-icono">${icono('test')}</span>
              <span class="hist-texto">
                <strong>${esc(i.temaTitulos.length === 1 ? i.temaTitulos[0] : nombres[i.cursoId] ?? i.cursoTitulo)}</strong>
                <span>${fecha(i.fecha)} · ${i.aciertos}/${i.total} aciertos</span>
              </span>
              ${chipNota(i.nota)}
            </a>`).join('')}
        </div>` : '<p class="vacio">Aún no has hecho ningún test. Entra en un curso y prueba el primero.</p>'}
    </section>`;
}
