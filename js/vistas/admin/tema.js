// Administración de un tema: título, resumen, contenido, material y preguntas.

import * as almacen from '../../almacen.js';
import { aviso, esc, icono, nuevoId, pantallaVacia, plural, textoRico, titulo } from '../../utiles.js';
import { dialogo } from './comun.js';

const LETRAS = 'abcdefghij';
const MIN_OPCIONES = 4;
const MAX_OPCIONES = 6;

const TIPOS = [
  ['pdf', 'PDF'],
  ['video', 'Vídeo'],
  ['enlace', 'Enlace'],
];

function filaRecurso(r = { tipo: 'pdf', titulo: '', url: '' }) {
  return `
    <li class="fila-recurso">
      <select name="tipo" aria-label="Tipo">
        ${TIPOS.map(([v, t]) => `<option value="${v}" ${r.tipo === v ? 'selected' : ''}>${t}</option>`).join('')}
      </select>
      <input name="rtitulo" placeholder="Título (p. ej. Tema 1 en PDF)" value="${esc(r.titulo)}" aria-label="Título del material">
      <input name="url" type="url" placeholder="https://…" value="${esc(r.url)}" aria-label="Dirección del material">
      <button type="button" class="boton-icono" data-quitar-recurso aria-label="Quitar este material">${icono('borrar')}</button>
    </li>`;
}

export async function editar(el, { id }) {
  const tema = await almacen.tema(id);
  if (!tema) {
    el.innerHTML = pantallaVacia('Tema no encontrado', 'Puede que se haya borrado.', { href: '#/admin', texto: 'Volver a los cursos' });
    return;
  }
  const curso = await almacen.curso(tema.cursoId);
  titulo(`${tema.titulo} · Administración`);

  el.innerHTML = `
    <section class="contenedor seccion">
      <nav class="migas" aria-label="Ruta">
        <a href="#/admin">Cursos</a>
        <a href="#/admin/curso/${esc(curso.id)}">${esc(curso.titulo)}</a>
      </nav>
      <h1>${esc(tema.titulo)}</h1>

      <form class="formulario tarjeta" data-tema novalidate>
        <label>Título <input name="titulo" value="${esc(tema.titulo)}" required></label>
        <label>Resumen <span class="apagado pequeno">(una línea que se ve en la lista de temas)</span>
          <input name="resumen" value="${esc(tema.resumen)}">
        </label>

        <div class="campo">
          <div class="titulo-con-accion">
            <label for="contenido">Contenido</label>
            <button type="button" class="enlace" data-vista-previa aria-pressed="false">Vista previa</button>
          </div>
          <textarea id="contenido" name="contenido" rows="14">${esc(tema.contenido)}</textarea>
          <div class="texto-tema vista-previa tarjeta" hidden></div>
          <p class="apagado pequeno">Formato: «## Título» para apartados, «- » al principio de línea para listas,
          **texto** para negrita y una línea en blanco entre párrafos.</p>
        </div>

        <fieldset>
          <legend>Material (PDF, vídeos, enlaces)</legend>
          <ul class="recursos-editor" data-recursos>
            ${(tema.recursos ?? []).map(filaRecurso).join('')}
          </ul>
          <button type="button" class="boton boton-secundario" data-anadir-recurso>${icono('mas')} Añadir material</button>
          <p class="apagado pequeno">De momento se pega la dirección del archivo (Google Drive, YouTube…). Cuando se conecte
          la base de datos se podrán subir los archivos directamente.</p>
        </fieldset>

        <div class="acciones">
          <button class="boton" type="submit">Guardar tema</button>
          <a class="boton boton-secundario" href="#/tema/${esc(tema.id)}">Ver como alumno</a>
        </div>
      </form>
    </section>

    <section class="contenedor seccion">
      <div class="titulo-con-accion">
        <h2 data-titulo-preguntas>Preguntas</h2>
        <button type="button" class="boton" data-nueva-pregunta>${icono('mas')} Nueva pregunta</button>
      </div>
      <ol class="lista lista-preguntas" data-preguntas></ol>
    </section>

    <section class="contenedor seccion zona-peligro">
      <h2>Borrar el tema</h2>
      <p class="apagado">Se borran también sus preguntas. Los tests ya hechos se conservan en las notas.</p>
      <button type="button" class="boton boton-peligro" data-borrar>Borrar este tema</button>
    </section>`;

  // ---- Datos del tema ----
  const form = el.querySelector('[data-tema]');
  const recursos = el.querySelector('[data-recursos]');
  const previa = el.querySelector('.vista-previa');
  const botonPrevia = el.querySelector('[data-vista-previa]');

  botonPrevia.addEventListener('click', () => {
    const mostrar = previa.hidden;
    previa.hidden = !mostrar;
    form.contenido.hidden = mostrar;
    botonPrevia.setAttribute('aria-pressed', String(mostrar));
    botonPrevia.textContent = mostrar ? 'Editar' : 'Vista previa';
    if (mostrar) previa.innerHTML = textoRico(form.contenido.value) || '<p class="apagado">Sin contenido.</p>';
  });

  el.querySelector('[data-anadir-recurso]').addEventListener('click', () => {
    recursos.insertAdjacentHTML('beforeend', filaRecurso());
    recursos.lastElementChild.querySelector('[name=rtitulo]').focus();
  });
  recursos.addEventListener('click', (e) => {
    e.target.closest('[data-quitar-recurso]')?.closest('li').remove();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombre = form.titulo.value.trim();
    if (!nombre) {
      aviso('El tema necesita un título.', 'error');
      form.titulo.focus();
      return;
    }
    const material = [...recursos.children]
      .map((li) => ({
        tipo: li.querySelector('[name=tipo]').value,
        titulo: li.querySelector('[name=rtitulo]').value.trim(),
        url: li.querySelector('[name=url]').value.trim(),
      }))
      .filter((r) => r.titulo || r.url)
      .map((r) => ({ ...r, titulo: r.titulo || 'Material' }));
    const malas = material.filter((r) => r.url && !/^https?:\/\//i.test(r.url));
    if (malas.length) {
      aviso('Las direcciones del material deben empezar por https://', 'error');
      return;
    }
    Object.assign(tema, {
      titulo: nombre,
      resumen: form.resumen.value.trim(),
      contenido: form.contenido.value,
      recursos: material,
    });
    await almacen.guardarTema(tema);
    el.querySelector('h1').textContent = nombre;
    titulo(`${nombre} · Administración`);
    aviso('Tema guardado.');
  });

  // ---- Preguntas ----
  const lista = el.querySelector('[data-preguntas]');

  async function pintarPreguntas() {
    const preguntas = await almacen.preguntas([tema.id]);
    el.querySelector('[data-titulo-preguntas]').textContent = `Preguntas (${preguntas.length})`;
    lista.innerHTML = preguntas.length ? preguntas.map((p) => `
      <li class="pregunta-admin">
        <div>
          <p><strong>${esc(p.enunciado)}</strong></p>
          <ol class="opciones-admin" type="a">
            ${p.opciones.map((o, i) => `<li class="${i === p.correcta ? 'correcta' : ''}">${esc(o)}${i === p.correcta ? ' <span class="marca-respuesta">✓</span>' : ''}</li>`).join('')}
          </ol>
        </div>
        <span class="fila-admin-botones">
          <button type="button" class="boton-icono" data-editar="${esc(p.id)}" aria-label="Editar pregunta">${icono('editar')}</button>
          <button type="button" class="boton-icono" data-borrar-pregunta="${esc(p.id)}" aria-label="Borrar pregunta">${icono('borrar')}</button>
        </span>
      </li>`).join('') : '<li class="apagado sin-marca">Este tema aún no tiene preguntas.</li>';

    for (const b of lista.querySelectorAll('[data-editar]')) {
      b.addEventListener('click', () => editarPregunta(preguntas.find((p) => p.id === b.dataset.editar)));
    }
    for (const b of lista.querySelectorAll('[data-borrar-pregunta]')) {
      b.addEventListener('click', async () => {
        if (!confirm('¿Borrar esta pregunta?')) return;
        await almacen.borrarPregunta(b.dataset.borrarPregunta);
        aviso('Pregunta borrada.');
        pintarPreguntas();
      });
    }
  }

  function editarPregunta(p) {
    const nueva = !p;
    const opciones = [...(p?.opciones ?? [])];
    while (opciones.length < MIN_OPCIONES) opciones.push('');
    const correcta = p?.correcta ?? 0;

    const fila = (texto, i, marcada) => `
      <li class="fila-opcion">
        <label class="radio-correcta" title="Marcar como correcta">
          <input type="radio" name="correcta" value="${i}" ${marcada ? 'checked' : ''} aria-label="La ${LETRAS[i]} es la correcta">
          <span class="letra">${LETRAS[i]}</span>
        </label>
        <input name="opcion" value="${esc(texto)}" placeholder="Opción ${LETRAS[i]}" aria-label="Opción ${LETRAS[i]}">
      </li>`;

    const formulario = dialogo({
      titulo: nueva ? 'Nueva pregunta' : 'Editar pregunta',
      ancho: true,
      cuerpo: `
        <label>Enunciado <textarea name="enunciado" rows="3" required>${esc(p?.enunciado ?? '')}</textarea></label>
        <fieldset>
          <legend>Opciones <span class="apagado pequeno">(marca la correcta)</span></legend>
          <ol class="opciones-editor">${opciones.map((o, i) => fila(o, i, i === correcta)).join('')}</ol>
          <button type="button" class="enlace" data-otra-opcion ${opciones.length >= MAX_OPCIONES ? 'hidden' : ''}>${icono('mas')} Añadir otra opción</button>
        </fieldset>
        <label>Explicación <span class="apagado pequeno">(se muestra al corregir)</span>
          <textarea name="explicacion" rows="2">${esc(p?.explicacion ?? '')}</textarea>
        </label>`,
    }, async (f) => {
      const enunciado = f.enunciado.value.trim();
      const campos = [...f.querySelectorAll('[name=opcion]')].map((c) => c.value.trim());
      const marcada = Number(f.querySelector('[name=correcta]:checked')?.value ?? -1);
      if (!enunciado) throw new Error('Escribe el enunciado.');
      if (marcada < 0 || !campos[marcada]) throw new Error('Marca cuál es la respuesta correcta (y que no esté vacía).');
      // Las opciones vacías se descartan; la correcta se recoloca según lo que quede.
      const llenas = campos.map((texto, i) => ({ texto, i })).filter((o) => o.texto);
      if (llenas.length < 2) throw new Error('Escribe al menos dos opciones.');
      await almacen.guardarPregunta({
        id: p?.id ?? nuevoId('p-'),
        temaId: tema.id,
        enunciado,
        opciones: llenas.map((o) => o.texto),
        correcta: llenas.findIndex((o) => o.i === marcada),
        explicacion: f.explicacion.value.trim(),
      });
      aviso(nueva ? 'Pregunta añadida.' : 'Pregunta guardada.');
      pintarPreguntas();
    });

    const botonOtra = formulario.querySelector('[data-otra-opcion]');
    botonOtra.addEventListener('click', () => {
      const ol = formulario.querySelector('.opciones-editor');
      const n = ol.children.length;
      ol.insertAdjacentHTML('beforeend', fila('', n, false));
      ol.lastElementChild.querySelector('[name=opcion]').focus();
      if (n + 1 >= MAX_OPCIONES) botonOtra.hidden = true;
    });
    formulario.enunciado.focus();
  }

  el.querySelector('[data-nueva-pregunta]').addEventListener('click', () => editarPregunta(null));
  await pintarPreguntas();

  el.querySelector('[data-borrar]').addEventListener('click', async () => {
    const n = (await almacen.contarPreguntas([tema.id]))[tema.id];
    if (!confirm(`¿Borrar el tema «${tema.titulo}»${n ? ` y sus ${plural(n, 'pregunta', 'preguntas')}` : ''}? No se puede deshacer.`)) return;
    await almacen.borrarTema(tema.id);
    const restantes = await almacen.temas(curso.id);
    await almacen.ordenarTemas(restantes.map((t) => t.id));
    aviso('Tema borrado.');
    location.hash = `#/admin/curso/${curso.id}`;
  });
}
