// Corrección de un test ya hecho: nota, resumen y revisión pregunta a pregunta.

import { NOTA_APROBADO } from '../config.js';
import * as almacen from '../almacen.js';
import * as sesion from '../sesion.js';
import { chipNota, esc, fechaHora, pantallaVacia, titulo } from '../utiles.js';

const LETRAS = 'abcdefghij';

const FILTROS = [
  ['todas', 'Todas', () => true],
  ['fallos', 'Fallos', (p) => p.elegida != null && p.elegida !== p.correcta],
  ['blanco', 'En blanco', (p) => p.elegida == null],
  ['aciertos', 'Aciertos', (p) => p.elegida === p.correcta],
];

function duracion(inicio, fin) {
  if (!inicio) return '';
  const minutos = Math.round((new Date(fin) - new Date(inicio)) / 60000);
  if (minutos < 1) return 'menos de 1 minuto';
  return minutos === 1 ? '1 minuto' : `${minutos} minutos`;
}

export async function render(el, { params }) {
  const i = await almacen.intento(params.id);
  const u = sesion.usuario();
  if (!i || (i.usuarioId !== u.id && !sesion.esAdmin())) {
    titulo('Test no encontrado');
    el.innerHTML = pantallaVacia('Test no encontrado', 'No existe o no es tuyo.', { href: '#/notas', texto: 'Ver mis notas' });
    return;
  }
  titulo(`Corrección · ${i.cursoTitulo}`);

  const aprobado = i.nota >= NOTA_APROBADO;
  const deOtro = i.usuarioId !== u.id;
  const repasar = i.preguntas.filter((p) => p.elegida !== p.correcta).map((p) => p.id);
  let filtro = 'todas';

  el.innerHTML = `
    <section class="contenedor estrecho seccion">
      <nav class="migas" aria-label="Ruta">
        ${deOtro ? '<a href="#/admin/notas">Notas de los alumnos</a>' : '<a href="#/notas">Mis notas</a>'}
      </nav>
      <div class="resultado ${aprobado ? 'aprobado' : 'suspenso'}">
        <div class="resultado-nota">
          <span class="resultado-numero">${chipNota(i.nota)}</span>
          <span>${aprobado ? 'Aprobado' : 'Suspenso'}</span>
        </div>
        <div>
          <h1>${esc(i.temaTitulos.length === 1 ? i.temaTitulos[0] : i.cursoTitulo)}</h1>
          <p class="apagado">
            ${deOtro ? `${esc(i.usuarioNombre)} · ` : ''}${fechaHora(i.fecha)}
            ${duracion(i.inicio, i.fecha) ? ` · ${duracion(i.inicio, i.fecha)}` : ''}
            ${i.penaliza ? ' · los fallos restan' : ''}
          </p>
          <dl class="cifras">
            <div><dt>Aciertos</dt><dd class="bien">${i.aciertos}</dd></div>
            <div><dt>Fallos</dt><dd class="mal">${i.fallos}</dd></div>
            <div><dt>En blanco</dt><dd>${i.blancos}</dd></div>
          </dl>
        </div>
      </div>

      ${deOtro ? '' : `
        <div class="acciones">
          <a class="boton" href="#/test?curso=${esc(i.cursoId)}&temas=${esc(i.temaIds.join(','))}">Otro test de ${i.temaIds.length === 1 ? 'este tema' : 'estos temas'}</a>
          ${repasar.length ? `<a class="boton boton-secundario" href="#/test?curso=${esc(i.cursoId)}&preguntas=${esc(repasar.join(','))}">Repasar mis ${repasar.length} fallos y en blanco</a>` : ''}
        </div>`}

      <h2>Revisión</h2>
      <div class="segmentado filtros" role="group" aria-label="Mostrar">
        ${FILTROS.map(([id, texto, cumple]) => `
          <label><input type="radio" name="filtro" value="${id}" ${id === filtro ? 'checked' : ''}>
          <span>${texto} (${i.preguntas.filter(cumple).length})</span></label>`).join('')}
      </div>
      <ol class="revision"></ol>
    </section>`;

  const lista = el.querySelector('.revision');

  function pintarLista() {
    const cumple = FILTROS.find(([id]) => id === filtro)[2];
    const html = i.preguntas.map((p, n) => {
      if (!cumple(p)) return '';
      const estado = p.elegida == null ? 'blanco' : p.elegida === p.correcta ? 'bien' : 'mal';
      return `
        <li class="revision-pregunta ${estado}" value="${n + 1}">
          <p class="revision-enunciado"><span class="revision-numero">${n + 1}.</span> ${esc(p.enunciado)}</p>
          <ul class="revision-opciones">
            ${p.orden.map((o, pos) => {
              const clases = [];
              if (o === p.correcta) clases.push('correcta');
              if (o === p.elegida && o !== p.correcta) clases.push('incorrecta');
              const marca = o === p.correcta ? ' ✓' : o === p.elegida ? ' ✗' : '';
              return `<li class="${clases.join(' ')}"><span class="letra">${LETRAS[pos]}</span> <span>${esc(p.opciones[o])}${marca ? `<span class="marca">${marca}</span>` : ''}</span></li>`;
            }).join('')}
          </ul>
          ${estado === 'blanco' ? '<p class="apagado">Sin responder.</p>' : ''}
          ${p.explicacion ? `<p class="revision-explicacion">${esc(p.explicacion)}</p>` : ''}
        </li>`;
    }).join('');
    lista.innerHTML = html || '<li class="apagado sin-marca">No hay preguntas en este apartado.</li>';
  }

  el.querySelector('.filtros').addEventListener('change', (e) => {
    filtro = e.target.value;
    pintarLista();
  });
  pintarLista();
}
