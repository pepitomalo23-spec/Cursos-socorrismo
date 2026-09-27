// Inicio de sesión y alta de alumnos (mismo sistema de cuentas: sesion.js). El formulario se
// usa también en la portada, bajo la bienvenida (formularioAcceso).

import * as sesion from '../sesion.js';
import { titulo } from '../utiles.js';

export async function render(el, { query }) {
  el.innerHTML = '<section class="acceso"></section>';
  formularioAcceso(el.querySelector('.acceso'), {
    modo: query.get('modo') === 'registro' ? 'registro' : 'entrar',
    volver: query.get('volver'),
    alCambiar: (modo) => titulo(modo === 'registro' ? 'Crear cuenta' : 'Acceso alumnos'),
    enfocar: true,
    encabezado: 'h1',
  });
}

// Pinta el formulario de entrar / crear cuenta en contenedor. Al entrar, va a volver (o a la
// portada). Opciones: modo ('entrar' o 'registro'), volver, alCambiar(modo), enfocar (poner el
// cursor en el primer campo; en la portada no, porque haría saltar la página) y encabezado
// (h1 en su pantalla, h2 dentro de la portada).
export function formularioAcceso(contenedor, { modo = 'entrar', volver = null, alCambiar = () => {}, enfocar = false, encabezado = 'h2' } = {}) {
  function pintar() {
    const registro = modo === 'registro';
    alCambiar(modo);
    contenedor.innerHTML = `
      <form class="panel-acceso" novalidate>
        <${encabezado} class="acceso-titulo">${registro ? 'Crear cuenta' : 'Acceso alumnos'}</${encabezado}>
        <p class="acceso-sub">${registro
          ? 'Crea tu cuenta y la escuela te dará acceso a tus cursos.'
          : 'Inicia sesión para ver tu temario, hacer tests y consultar tus notas.'}</p>
        ${registro ? `
          <input class="acceso-campo" name="nombre" placeholder="Nombre y apellidos" autocomplete="name" aria-label="Nombre y apellidos">
          <input class="acceso-campo" name="ciudad" placeholder="Ciudad" autocomplete="address-level2" aria-label="Ciudad">` : ''}
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
      </form>`;

    const form = contenedor.querySelector('form');
    const error = contenedor.querySelector('.acceso-error');

    contenedor.querySelector('[data-cambiar]').addEventListener('click', () => {
      modo = registro ? 'entrar' : 'registro';
      enfocar = true;
      pintar();
    });
    for (const b of contenedor.querySelectorAll('[data-email]')) {
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
        if (registro) await sesion.registrar(form.nombre.value, email, form.clave.value, form.ciudad.value);
        else await sesion.entrar(email, form.clave.value);
        const destino = volver && !volver.startsWith('/acceso') ? `#${volver}` : '#/';
        // Si ya se está ahí (el formulario de la portada), se vuelve a pintar igualmente.
        if ((location.hash || '#/') === destino) dispatchEvent(new HashChangeEvent('hashchange'));
        else location.hash = destino;
      } catch (err) {
        error.textContent = err.message;
      }
    });

    if (enfocar) (registro ? form.nombre : form.email).focus({ preventScroll: encabezado !== 'h1' });
  }

  pintar();
}
