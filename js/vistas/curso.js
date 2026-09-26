// Un curso: lista de temas con el porcentaje de aciertos de cada uno.

import * as almacen from '../almacen.js';
import * as sesion from '../sesion.js';
import { porTema, porcentaje } from '../estadisticas.js';
import { esc, etiquetaModulo, icono, pantallaVacia, plural, titulo } from '../utiles.js';

export async function render(el, { params }) {
  const curso = await almacen.curso(params.id);
  if (!curso || !sesion.puedeVerCurso(params.id)) {
    titulo('Curso no disponible');
    el.innerHTML = pantallaVacia('Curso no disponible', 'No existe o no estás matriculado en él.', { href: '#/panel', texto: 'Volver a mis cursos' });
    return;
  }
  titulo(curso.titulo);

  const temas = await almacen.temas(curso.id);
  const cuentas = await almacen.contarPreguntas(temas.map((t) => t.id));
  const intentos = await almacen.intentos({ usuarioId: sesion.usuario().id, cursoId: curso.id });
  const aciertos = porTema(intentos);
  const totalPreguntas = Object.values(cuentas).reduce((a, b) => a + b, 0);

  el.innerHTML = `
    <section class="contenedor">
      <nav class="migas" aria-label="Ruta"><a href="#/panel">Mis cursos</a></nav>
      ${curso.modulo ? `<p class="antetitulo">${esc(etiquetaModulo(curso))}</p>` : ''}
      <h1>${esc(curso.titulo)}</h1>
      <p class="entradilla">${esc(curso.descripcion)}</p>
      <div class="acciones">
        ${totalPreguntas
          ? `<a class="btn btn-confirmar" href="#/test?curso=${esc(curso.id)}">${icono('test')} Hacer un test del curso</a>`
          : ''}
        <span class="dato-mono">${plural(temas.length, 'tema', 'temas')} · ${plural(totalPreguntas, 'pregunta', 'preguntas')}</span>
      </div>

      <div class="seccion-fila"><h2>Temario</h2></div>
      ${temas.length ? `
        <ol class="temario">
          ${temas.map((t, i) => {
            const pct = porcentaje(aciertos.get(t.id));
            return `
              <li>
                <a class="tema-fila" href="#/tema/${esc(t.id)}">
                  <span class="tema-numero">${i + 1}</span>
                  <span class="tema-texto">
                    <strong>${esc(t.titulo)}</strong>
                    <span class="apagado">${esc(t.resumen)}</span>
                  </span>
                  <span class="tema-progreso" title="Aciertos en tus tests de este tema">
                    ${pct == null
                      ? `<span class="apagado">${plural(cuentas[t.id], 'pregunta', 'preguntas')}</span>`
                      : `<span class="barra-progreso ${pct < 50 ? 'baja' : ''}" style="--valor:${pct}%"><span></span></span><span class="tema-pct">${pct}%</span>`}
                  </span>
                </a>
              </li>`;
          }).join('')}
        </ol>` : '<p class="apagado">Este curso todavía no tiene temas.</p>'}
    </section>`;
}
