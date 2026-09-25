// Panel del alumno: sus cursos y sus últimos tests.

import * as almacen from '../almacen.js';
import * as sesion from '../sesion.js';
import { resumen } from '../estadisticas.js';
import { chipNota, esc, fecha, icono, nota, plural, titulo } from '../utiles.js';

export async function render(el) {
  titulo('Mis cursos');
  const u = sesion.usuario();
  const todos = await almacen.cursos();
  const cursos = sesion.esAdmin() ? todos : todos.filter((c) => u.cursos.includes(c.id));
  const intentos = await almacen.intentos({ usuarioId: u.id });

  const tarjetas = await Promise.all(cursos.map(async (c) => {
    const temas = await almacen.temas(c.id);
    const r = resumen(intentos.filter((i) => i.cursoId === c.id));
    return `
      <a class="tarjeta tarjeta-enlace" href="#/curso/${esc(c.id)}">
        <h3>${esc(c.titulo)}</h3>
        <p class="apagado">${plural(temas.length, 'tema', 'temas')}</p>
        <dl class="cifras">
          <div><dt>Tests</dt><dd>${r.tests}</dd></div>
          <div><dt>Media</dt><dd>${nota(r.media)}</dd></div>
          <div><dt>Mejor</dt><dd>${nota(r.mejor)}</dd></div>
        </dl>
        <span class="mas-info">Entrar ${icono('flecha')}</span>
      </a>`;
  }));

  const nombres = Object.fromEntries(todos.map((c) => [c.id, c.titulo]));

  el.innerHTML = `
    <section class="contenedor seccion">
      <h1>Hola, ${esc(u.nombre.split(' ')[0])}</h1>
      <h2>Mis cursos</h2>
      ${cursos.length
        ? `<div class="rejilla rejilla-2">${tarjetas.join('')}</div>`
        : '<p class="caja-info">Todavía no estás matriculado en ningún curso. Habla con la escuela para que te den acceso.</p>'}
    </section>

    <section class="contenedor seccion">
      <div class="titulo-con-accion">
        <h2>Últimos tests</h2>
        ${intentos.length ? '<a href="#/notas">Ver todas mis notas</a>' : ''}
      </div>
      ${intentos.length ? `
        <ul class="lista">
          ${intentos.slice(0, 5).map((i) => `
            <li>
              <a class="fila-enlace" href="#/intento/${esc(i.id)}">
                <span>
                  <strong>${esc(i.temaTitulos.length === 1 ? i.temaTitulos[0] : nombres[i.cursoId] ?? i.cursoTitulo)}</strong>
                  <span class="apagado">${fecha(i.fecha)} · ${i.aciertos}/${i.total} aciertos</span>
                </span>
                ${chipNota(i.nota)}
              </a>
            </li>`).join('')}
        </ul>` : '<p class="apagado">Aún no has hecho ningún test. Entra en un curso y prueba el primero.</p>'}
    </section>`;
}
