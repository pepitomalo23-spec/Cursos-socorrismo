// Inicio de sesión.

import * as sesion from '../sesion.js';
import { esc, titulo } from '../utiles.js';

export async function render(el, { query }) {
  titulo('Acceso alumnos');
  el.innerHTML = `
    <section class="contenedor estrecho seccion">
      <h1>Acceso alumnos</h1>
      <form class="formulario tarjeta" novalidate>
        <label>Correo electrónico
          <input type="email" name="email" autocomplete="email" required>
        </label>
        <label>Contraseña
          <input type="password" name="clave" autocomplete="current-password">
        </label>
        <p class="error" role="alert" hidden></p>
        <button class="boton" type="submit">Entrar</button>
      </form>
      <div class="caja-info">
        <p><strong>Demostración.</strong> Entra con una de estas cuentas (vale cualquier contraseña):</p>
        <ul>
          <li><button type="button" class="enlace" data-email="alumno@demo.es">alumno@demo.es</button> — alumna</li>
          <li><button type="button" class="enlace" data-email="admin@demo.es">admin@demo.es</button> — administración</li>
        </ul>
      </div>
    </section>`;

  const form = el.querySelector('form');
  const error = el.querySelector('.error');

  for (const b of el.querySelectorAll('[data-email]')) {
    b.addEventListener('click', () => {
      form.email.value = b.dataset.email;
      form.clave.focus();
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    error.hidden = true;
    const email = form.email.value.trim();
    if (!email) {
      error.textContent = 'Escribe tu correo electrónico.';
      error.hidden = false;
      form.email.focus();
      return;
    }
    try {
      await sesion.entrar(email, form.clave.value);
      const volver = query.get('volver');
      location.hash = volver && volver !== '/acceso' ? `#${volver}` : '#/panel';
    } catch (err) {
      error.innerHTML = esc(err.message);
      error.hidden = false;
    }
  });

  form.email.focus();
}
