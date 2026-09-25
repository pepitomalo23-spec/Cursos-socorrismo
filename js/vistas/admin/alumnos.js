// Administración de alumnos: lista, alta, edición (cursos a los que tiene acceso) y su ficha de notas.

import * as almacen from '../../almacen.js';
import * as sesion from '../../sesion.js';
import { resumen as resumenNotas } from '../../estadisticas.js';
import { aviso, esc, icono, nota, nuevoId, pantallaVacia, titulo } from '../../utiles.js';
import { informe } from '../notas.js';
import { dialogo } from './comun.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function lista(el) {
  titulo('Alumnos · Administración');
  const usuarios = await almacen.usuarios();
  const cursos = await almacen.cursos();
  const intentos = await almacen.intentos();
  const nombreCurso = Object.fromEntries(cursos.map((c) => [c.id, c.titulo]));

  const ordenados = [...usuarios].sort((a, b) => (a.rol === b.rol ? a.nombre.localeCompare(b.nombre, 'es') : a.rol === 'admin' ? 1 : -1));

  el.innerHTML = `
    <section class="contenedor seccion">
      <div class="titulo-con-accion">
        <h1>Alumnos</h1>
        <button type="button" class="boton" data-nuevo>${icono('mas')} Nuevo alumno</button>
      </div>
      <div class="tabla-desplazable">
        <table class="tabla">
          <thead>
            <tr><th scope="col">Nombre</th><th scope="col">Cursos</th><th scope="col">Tests</th><th scope="col">Media</th><th scope="col"><span class="oculto">Acciones</span></th></tr>
          </thead>
          <tbody>
            ${ordenados.map((u) => {
              const r = resumenNotas(intentos.filter((i) => i.usuarioId === u.id));
              return `
                <tr>
                  <td>
                    <a href="#/admin/alumno/${esc(u.id)}"><strong>${esc(u.nombre)}</strong></a>
                    ${u.rol === 'admin' ? '<span class="etiqueta">Administración</span>' : ''}
                    <br><span class="apagado pequeno">${esc(u.email)}</span>
                  </td>
                  <td>${u.rol === 'admin' ? '<span class="apagado">Todos</span>' : u.cursos.map((c) => esc(nombreCurso[c] ?? c)).join('<br>') || '<span class="apagado">Ninguno</span>'}</td>
                  <td>${r.tests}</td>
                  <td>${nota(r.media)}</td>
                  <td class="celda-botones">
                    <button type="button" class="boton-icono" data-editar="${esc(u.id)}" aria-label="Editar a ${esc(u.nombre)}">${icono('editar')}</button>
                  </td>
                </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      <p class="apagado pequeno">En la demostración, cada alumno entra solo con su correo. Con la base de datos conectada
      recibirá un correo para crear su contraseña.</p>
    </section>`;

  el.querySelector('[data-nuevo]').addEventListener('click', () => editarUsuario(null, cursos, () => lista(el)));
  for (const b of el.querySelectorAll('[data-editar]')) {
    b.addEventListener('click', () => editarUsuario(usuarios.find((u) => u.id === b.dataset.editar), cursos, () => lista(el)));
  }
}

function editarUsuario(u, cursos, alTerminar) {
  const nuevo = !u;
  const esYo = u?.id === sesion.usuario().id;
  const form = dialogo({
    titulo: nuevo ? 'Nuevo alumno' : `Editar a ${u.nombre}`,
    textoGuardar: nuevo ? 'Dar de alta' : 'Guardar',
    cuerpo: `
      <label>Nombre y apellidos <input name="nombre" value="${esc(u?.nombre ?? '')}" required autocomplete="off"></label>
      <label>Correo electrónico <input name="email" type="email" value="${esc(u?.email ?? '')}" required autocomplete="off"></label>
      <fieldset>
        <legend>Cursos a los que tiene acceso</legend>
        ${cursos.map((c) => `
          <label class="opcion-check">
            <input type="checkbox" name="curso" value="${esc(c.id)}" ${u?.cursos.includes(c.id) ? 'checked' : ''}>
            <span>${esc(c.titulo)}</span>
          </label>`).join('') || '<p class="apagado">Aún no hay cursos.</p>'}
      </fieldset>
      <label class="opcion-check">
        <input type="checkbox" name="admin" ${u?.rol === 'admin' ? 'checked' : ''} ${esYo ? 'disabled' : ''}>
        <span><strong>Administración</strong><span class="apagado">Puede editar cursos, temas, preguntas y alumnos, y ver todas las notas.</span></span>
      </label>
      ${nuevo || esYo ? '' : `<p><button type="button" class="enlace enlace-peligro" data-borrar>${icono('borrar')} Dar de baja a ${esc(u.nombre)}</button></p>`}`,
  }, async (f) => {
    const nombre = f.nombre.value.trim();
    const email = f.email.value.trim().toLowerCase();
    if (!nombre) throw new Error('Escribe el nombre.');
    if (!EMAIL.test(email)) throw new Error('El correo electrónico no es válido.');
    const otro = await almacen.usuarioPorEmail(email);
    if (otro && otro.id !== u?.id) throw new Error(`Ese correo ya es de ${otro.nombre}.`);
    await almacen.guardarUsuario({
      id: u?.id ?? nuevoId('u-'),
      nombre,
      email,
      rol: esYo || f.admin.checked ? 'admin' : 'alumno',
      cursos: [...f.querySelectorAll('[name=curso]:checked')].map((c) => c.value),
    });
    if (esYo) await sesion.refrescar();
    aviso(nuevo ? `${nombre} ya tiene acceso.` : 'Cambios guardados.');
    alTerminar();
  });

  form.querySelector('[data-borrar]')?.addEventListener('click', async () => {
    if (!confirm(`¿Dar de baja a ${u.nombre}? Se borrarán también sus notas. No se puede deshacer.`)) return;
    await almacen.borrarUsuario(u.id);
    form.closest('dialog').close();
    aviso(`${u.nombre} ya no tiene acceso.`);
    alTerminar();
  });
  form.nombre.focus();
}

export async function ficha(el, { id }) {
  const u = await almacen.usuario(id);
  if (!u) {
    el.innerHTML = pantallaVacia('Alumno no encontrado', 'Puede que se haya dado de baja.', { href: '#/admin/alumnos', texto: 'Volver a los alumnos' });
    return;
  }
  titulo(`${u.nombre} · Administración`);
  el.innerHTML = `
    <section class="contenedor seccion">
      <nav class="migas" aria-label="Ruta"><a href="#/admin/alumnos">Alumnos</a></nav>
      <h1>${esc(u.nombre)}</h1>
      <p class="apagado">${esc(u.email)}</p>
      ${await informe(u.id)}
    </section>`;
}
