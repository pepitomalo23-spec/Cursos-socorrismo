// Administración: todos los tests hechos, con filtro por curso y por alumno.

import * as almacen from '../../almacen.js';
import { resumen } from '../../estadisticas.js';
import { chipNota, esc, fecha, nota, plural, titulo } from '../../utiles.js';

export async function lista(el, { query }) {
  titulo('Notas · Administración');
  const intentos = await almacen.intentos();
  const cursos = await almacen.cursos();
  const usuarios = (await almacen.usuarios()).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  const filtro = { curso: query.get('curso') ?? '', alumno: query.get('alumno') ?? '' };

  el.innerHTML = `
    <section class="contenedor seccion">
      <h1>Notas de los alumnos</h1>
      <form class="filtros-notas" data-filtros>
        <label>Curso
          <select name="curso">
            <option value="">Todos</option>
            ${cursos.map((c) => `<option value="${esc(c.id)}" ${filtro.curso === c.id ? 'selected' : ''}>${esc(c.titulo)}</option>`).join('')}
          </select>
        </label>
        <label>Alumno
          <select name="alumno">
            <option value="">Todos</option>
            ${usuarios.map((u) => `<option value="${esc(u.id)}" ${filtro.alumno === u.id ? 'selected' : ''}>${esc(u.nombre)}</option>`).join('')}
          </select>
        </label>
      </form>
      <div data-resultado></div>
    </section>`;

  const form = el.querySelector('[data-filtros]');
  const resultado = el.querySelector('[data-resultado]');

  function pintar() {
    const elegidos = intentos.filter((i) => (!filtro.curso || i.cursoId === filtro.curso)
      && (!filtro.alumno || i.usuarioId === filtro.alumno));
    const r = resumen(elegidos);
    resultado.innerHTML = elegidos.length ? `
      <dl class="cifras">
        <div><dt>Tests</dt><dd>${r.tests}</dd></div>
        <div><dt>Media</dt><dd>${nota(r.media)}</dd></div>
        <div><dt>Aprobados</dt><dd>${r.aprobados}</dd></div>
      </dl>
      <div class="tabla-desplazable">
        <table class="tabla">
          <thead>
            <tr><th scope="col">Fecha</th><th scope="col">Alumno</th><th scope="col">Test</th><th scope="col">Aciertos</th><th scope="col">Nota</th></tr>
          </thead>
          <tbody>
            ${elegidos.map((i) => `
              <tr>
                <td>${fecha(i.fecha)}</td>
                <td><a href="#/admin/alumno/${esc(i.usuarioId)}">${esc(i.usuarioNombre)}</a></td>
                <td><a href="#/intento/${esc(i.id)}">${esc(i.temaTitulos.length === 1 ? i.temaTitulos[0] : `${i.cursoTitulo} (${plural(i.temaTitulos.length, 'tema', 'temas')})`)}</a></td>
                <td>${i.aciertos}/${i.total}</td>
                <td>${chipNota(i.nota)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>` : '<p class="caja-info">No hay tests con estos filtros.</p>';
  }

  form.addEventListener('change', () => {
    filtro.curso = form.curso.value;
    filtro.alumno = form.alumno.value;
    // Se guarda el filtro en la dirección (sin volver a cargar) para poder volver atrás.
    const q = new URLSearchParams(Object.entries(filtro).filter(([, v]) => v));
    history.replaceState(null, '', `#/admin/notas${q.toString() ? `?${q}` : ''}`);
    pintar();
  });
  pintar();
}
