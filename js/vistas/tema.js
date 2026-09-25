// Un tema: contenido, material (PDF, vídeos, enlaces) y acceso a su test.

import * as almacen from '../almacen.js';
import * as sesion from '../sesion.js';
import { esc, icono, pantallaVacia, plural, textoRico, titulo, urlSegura } from '../utiles.js';

const TIPOS = { pdf: 'PDF', video: 'Vídeo', enlace: 'Enlace' };

export async function render(el, { params }) {
  const tema = await almacen.tema(params.id);
  if (!tema || !sesion.puedeVerCurso(tema.cursoId)) {
    titulo('Tema no disponible');
    el.innerHTML = pantallaVacia('Tema no disponible', 'No existe o no tienes acceso a este curso.', { href: '#/panel', texto: 'Volver a mis cursos' });
    return;
  }
  titulo(tema.titulo);

  const curso = await almacen.curso(tema.cursoId);
  const temas = await almacen.temas(tema.cursoId);
  const posicion = temas.findIndex((t) => t.id === tema.id);
  const anterior = temas[posicion - 1];
  const siguiente = temas[posicion + 1];
  const numPreguntas = (await almacen.contarPreguntas([tema.id]))[tema.id];

  // El material sin dirección aún no se ha subido: se muestra, pero sin enlace.
  const recursos = (tema.recursos ?? []).map((r) => ({ ...r, url: urlSegura(r.url) }));

  el.innerHTML = `
    <article class="contenedor estrecho">
      <nav class="migas" aria-label="Ruta">
        <a href="#/panel">Mis cursos</a>
        <a href="#/curso/${esc(curso.id)}">${esc(curso.titulo)}</a>
      </nav>
      <p class="antetitulo">Tema ${posicion + 1}</p>
      <h1>${esc(tema.titulo)}</h1>

      ${recursos.length ? `
        <ul class="recursos">
          ${recursos.map((r) => `
            <li>
              ${r.url
                ? `<a class="recurso" href="${esc(r.url)}" target="_blank" rel="noopener">`
                : '<span class="recurso recurso-pendiente" title="Material pendiente de subir">'}
                ${icono(r.tipo in TIPOS ? r.tipo : 'enlace')}
                <span><strong>${esc(r.titulo)}</strong><span class="apagado">${r.url ? TIPOS[r.tipo] ?? 'Enlace' : 'Pendiente de subir'}</span></span>
              ${r.url ? '</a>' : '</span>'}
            </li>`).join('')}
        </ul>` : ''}

      <div class="texto-tema">
        ${textoRico(tema.contenido) || '<p class="apagado">Este tema todavía no tiene contenido.</p>'}
      </div>

      ${numPreguntas ? `
        <div class="caja-test">
          <div>
            <h2>Pon a prueba lo que has aprendido</h2>
            <p class="apagado">${plural(numPreguntas, 'pregunta', 'preguntas')} de este tema</p>
          </div>
          <a class="btn btn-confirmar" href="#/test?curso=${esc(curso.id)}&temas=${esc(tema.id)}">${icono('test')} Hacer el test del tema</a>
        </div>` : ''}

      <nav class="paginacion" aria-label="Temas">
        ${anterior ? `<a href="#/tema/${esc(anterior.id)}">${icono('atras')} ${esc(anterior.titulo)}</a>` : '<span></span>'}
        ${siguiente ? `<a class="derecha" href="#/tema/${esc(siguiente.id)}">${esc(siguiente.titulo)} ${icono('flecha')}</a>` : ''}
      </nav>
    </article>`;
}
