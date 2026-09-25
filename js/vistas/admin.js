// Administración: reparte cada dirección #/admin/... a su pantalla.

import { pantallaVacia, titulo } from '../utiles.js';
import * as cursos from './admin/cursos.js';
import * as tema from './admin/tema.js';
import * as alumnos from './admin/alumnos.js';
import * as notas from './admin/notas.js';

const SECCIONES = {
  '': cursos.resumen,
  curso: cursos.editar,
  tema: tema.editar,
  alumnos: alumnos.lista,
  alumno: alumnos.ficha,
  notas: notas.lista,
};

const PESTANAS = [
  ['#/admin', 'Cursos y temario', ['', 'curso', 'tema']],
  ['#/admin/alumnos', 'Alumnos', ['alumnos', 'alumno']],
  ['#/admin/notas', 'Notas', ['notas']],
];

export async function render(el, { params, query }) {
  const seccion = params.seccion ?? '';
  const pintar = SECCIONES[seccion];
  if (!pintar) {
    titulo('Página no encontrada');
    el.innerHTML = pantallaVacia('Página no encontrada', 'Esta sección de la administración no existe.', { href: '#/admin', texto: 'Volver a Administración' });
    return;
  }

  el.innerHTML = `
    <div class="contenedor">
      <nav class="pestanas" aria-label="Administración">
        ${PESTANAS.map(([href, texto, incluye]) => `
          <a href="${href}" ${incluye.includes(seccion) ? 'aria-current="page"' : ''}>${texto}</a>`).join('')}
      </nav>
    </div>
    <div class="admin-contenido"></div>`;

  titulo('Administración');
  await pintar(el.querySelector('.admin-contenido'), { id: params.id, query });
}
