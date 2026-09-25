// Piezas comunes de la administración.

import { esc } from '../../utiles.js';

// Abre una ventana con un formulario. alGuardar(form) puede lanzar un Error con un
// mensaje para el usuario: se muestra y la ventana sigue abierta.
export function dialogo({ titulo, cuerpo, textoGuardar = 'Guardar', ancho = false }, alGuardar) {
  const d = document.createElement('dialog');
  d.className = `dialogo ${ancho ? 'dialogo-ancho' : ''}`;
  d.innerHTML = `
    <form class="formulario" novalidate>
      <h2>${esc(titulo)}</h2>
      ${cuerpo}
      <p class="error" role="alert" hidden></p>
      <div class="dialogo-botones">
        <button type="button" class="boton boton-secundario" data-cancelar>Cancelar</button>
        <button type="submit" class="boton">${esc(textoGuardar)}</button>
      </div>
    </form>`;
  document.body.append(d);

  const form = d.querySelector('form');
  const error = d.querySelector('.error');
  d.querySelector('[data-cancelar]').addEventListener('click', () => d.close());
  d.addEventListener('close', () => d.remove());
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    error.hidden = true;
    try {
      await alGuardar(form);
      d.close();
    } catch (err) {
      error.textContent = err.message;
      error.hidden = false;
    }
  });
  d.showModal();
  return form;
}

// Convierte un título en un identificador para la dirección: «Uso del DEA» → «uso-del-dea».
export function identificador(texto) {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50) || 'curso';
}
