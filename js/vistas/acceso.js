// Inicio de sesión y alta de alumnos (mismo sistema de cuentas: sesion.js).

import * as sesion from '../sesion.js';
import { titulo } from '../utiles.js';

export async function render(el, { query }) {
  let modo = query.get('modo') === 'registro' ? 'registro' : 'entrar';

  function pintar() {
    const registro = modo === 'registro';
    titulo(registro ? 'Crear cuenta' : 'Acceso alumnos');
    el.innerHTML = `
      <section class="acceso">
        <form class="panel-acceso" novalidate>
          <h1 class="acceso-titulo">${registro ? 'Crear cuenta' : 'Acceso alumnos'}</h1>
          <p class="acceso-sub">${registro
            ? 'Crea tu cuenta y la escuela te dará acceso a tus cursos.'
            : 'Inicia sesión para ver tu temario, hacer tests y consultar tus notas.'}</p>
          ${registro ? '<input class="acceso-campo" name="nombre" placeholder="Nombre y apellidos" autocomplete="name" aria-label="Nombre y apellidos">' : ''}
          <input class="acceso-campo" name="email" type="email" inputmode="email" placeholder="Correo electrónico" autocomplete="email" autocapitalize="off" spellcheck="false" aria-label="Correo electrónico">
          <input class="acceso-campo" name="clave" type="password" placeholder="Contraseña" autocomplete="${registro ? 'new-password' : 'current-password'}" aria-label="Contraseña">
          <p class="acceso-error" role="alert"></p>
          <div class="acceso-botones">
            <button class="btn btn-claro btn-bloque" type="submit">${registro ? 'Crear cuenta' : 'Iniciar sesión'}</button>
            <button class="btn btn-fantasma btn-bloque" type="button" data-cambiar>${registro ? 'Ya tengo cuenta' : 'Crear cuenta'}</button>
          </div>
          ${registro ? '' : `
            <div class="acceso-separador">demostración</div>
            <p class="acceso-demo">Entra con <button type="button" class="enlace" data-email="alumno@demo.es">alumno@demo.es</button>
            o <button type="button" class="enlace" data-email="admin@demo.es">admin@demo.es</button> (vale cualquier contraseña).</p>`}
        </form>
      </section>`;

    const form = el.querySelector('form');
    const error = el.querySelector('.acceso-error');

    el.querySelector('[data-cambiar]').addEventListener('click', () => {
      modo = registro ? 'entrar' : 'registro';
      pintar();
    });
    for (const b of el.querySelectorAll('[data-email]')) {
      b.addEventListener('click', () => {
        form.email.value = b.dataset.email;
        form.clave.focus();
      });
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      error.textContent = '';
      const email = form.email.value.trim();
      try {
        if (!email) throw new Error('Escribe tu correo electrónico.');
        if (registro) await sesion.registrar(form.nombre.value, email, form.clave.value);
        else await sesion.entrar(email, form.clave.value);
        const volver = query.get('volver');
        location.hash = volver && !volver.startsWith('/acceso') ? `#${volver}` : '#/';
      } catch (err) {
        error.textContent = err.message;
      }
    });

    (registro ? form.nombre : form.email).focus();
  }

  pintar();
}
