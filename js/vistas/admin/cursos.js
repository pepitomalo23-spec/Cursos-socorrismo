// Administración de cursos: resumen de todos y edición de uno (datos y lista de temas).

import * as almacen from '../../almacen.js';
import { aviso, esc, icono, nuevoId, pantallaVacia, plural, titulo } from '../../utiles.js';
import { dialogo, identificador } from './comun.js';

export async function resumen(el) {
  const cursos = await almacen.cursos();
  const usuarios = await almacen.usuarios();
  const filas = await Promise.all(cursos.map(async (c) => {
    const temas = await almacen.temas(c.id);
    const cuentas = await almacen.contarPreguntas(temas.map((t) => t.id));
    const preguntas = Object.values(cuentas).reduce((a, b) => a + b, 0);
    const alumnos = usuarios.filter((u) => u.cursos.includes(c.id)).length;
    return `
      <a class="tarjeta tarjeta-enlace" href="#/admin/curso/${esc(c.id)}">
        <h3>${esc(c.titulo)}</h3>
        <dl class="cifras">
          <div><dt>Temas</dt><dd>${temas.length}</dd></div>
          <div><dt>Preguntas</dt><dd>${preguntas}</dd></div>
          <div><dt>Alumnos</dt><dd>${alumnos}</dd></div>
        </dl>
        <span class="mas-info">Editar ${icono('flecha')}</span>
      </a>`;
  }));

  el.innerHTML = `
    <section class="contenedor seccion">
      <div class="titulo-con-accion">
        <h1>Cursos</h1>
        <button type="button" class="boton" data-nuevo>${icono('mas')} Nuevo curso</button>
      </div>
      ${filas.length ? `<div class="rejilla rejilla-2">${filas.join('')}</div>` : '<p class="caja-info">Aún no hay cursos. Crea el primero.</p>'}
    </section>
    <section class="contenedor seccion">
      <h2>Datos de demostración</h2>
      <p class="apagado">Mientras la web no esté conectada a la base de datos, todo se guarda en este navegador.
      Este botón borra los cambios y vuelve a los cursos y alumnos de ejemplo.</p>
      <button type="button" class="boton boton-peligro" data-restablecer>Restablecer datos de demostración</button>
    </section>`;

  el.querySelector('[data-nuevo]').addEventListener('click', () => {
    dialogo({
      titulo: 'Nuevo curso',
      textoGuardar: 'Crear curso',
      cuerpo: `<label>Nombre del curso <input name="titulo" required autofocus></label>`,
    }, async (form) => {
      const nombre = form.titulo.value.trim();
      if (!nombre) throw new Error('Escribe el nombre del curso.');
      const existentes = new Set((await almacen.cursos()).map((c) => c.id));
      let id = identificador(nombre);
      for (let n = 2; existentes.has(id); n++) id = `${identificador(nombre)}-${n}`;
      await almacen.guardarCurso({ id, titulo: nombre, descripcion: '', horas: null });
      location.hash = `#/admin/curso/${id}`;
    });
  });

  el.querySelector('[data-restablecer]').addEventListener('click', async () => {
    if (!confirm('Se borrarán todos los cambios, los alumnos añadidos y los tests hechos en este navegador. ¿Continuar?')) return;
    await almacen.restablecerDemo();
    // Se recarga la web entera: la sesión y la cabecera dependen de los datos.
    location.reload();
  });
}

export async function editar(el, { id }) {
  const curso = await almacen.curso(id);
  if (!curso) {
    el.innerHTML = pantallaVacia('Curso no encontrado', 'Puede que se haya borrado.', { href: '#/admin', texto: 'Volver a los cursos' });
    return;
  }
  titulo(`${curso.titulo} · Administración`);

  el.innerHTML = `
    <section class="contenedor seccion">
      <nav class="migas" aria-label="Ruta"><a href="#/admin">Cursos</a></nav>
      <h1>${esc(curso.titulo)}</h1>
      <form class="formulario tarjeta" data-curso novalidate>
        <label>Nombre <input name="titulo" value="${esc(curso.titulo)}" required></label>
        <label>Descripción <textarea name="descripcion" rows="3">${esc(curso.descripcion)}</textarea></label>
        <label class="campo-corto">Horas <input name="horas" type="number" min="0" inputmode="numeric" value="${esc(curso.horas ?? '')}"></label>
        <div class="acciones">
          <button class="boton" type="submit">Guardar cambios</button>
          <a class="boton boton-secundario" href="#/curso/${esc(curso.id)}">Ver como alumno</a>
        </div>
      </form>
    </section>

    <section class="contenedor seccion">
      <div class="titulo-con-accion">
        <h2>Temas</h2>
        <button type="button" class="boton" data-nuevo-tema>${icono('mas')} Nuevo tema</button>
      </div>
      <ol class="lista lista-admin" data-temas></ol>
    </section>

    <section class="contenedor seccion zona-peligro">
      <h2>Borrar el curso</h2>
      <p class="apagado">Se borran también sus temas y preguntas. Los tests ya hechos se conservan en las notas.</p>
      <button type="button" class="boton boton-peligro" data-borrar>Borrar este curso</button>
    </section>`;

  const form = el.querySelector('[data-curso]');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombre = form.titulo.value.trim();
    if (!nombre) {
      aviso('El curso necesita un nombre.', 'error');
      form.titulo.focus();
      return;
    }
    Object.assign(curso, {
      titulo: nombre,
      descripcion: form.descripcion.value.trim(),
      horas: form.horas.value ? Number(form.horas.value) : null,
    });
    await almacen.guardarCurso(curso);
    el.querySelector('h1').textContent = nombre;
    aviso('Curso guardado.');
  });

  const lista = el.querySelector('[data-temas]');

  async function pintarTemas() {
    const temas = await almacen.temas(curso.id);
    const cuentas = await almacen.contarPreguntas(temas.map((t) => t.id));
    lista.innerHTML = temas.length ? temas.map((t, i) => `
      <li class="fila-admin">
        <span class="tema-numero">${i + 1}</span>
        <a class="fila-admin-texto" href="#/admin/tema/${esc(t.id)}">
          <strong>${esc(t.titulo)}</strong>
          <span class="apagado">${plural(cuentas[t.id], 'pregunta', 'preguntas')} · ${plural((t.recursos ?? []).length, 'material', 'materiales')}</span>
        </a>
        <span class="fila-admin-botones">
          <button type="button" class="boton-icono" data-mover="${i}" data-hacia="-1" ${i === 0 ? 'disabled' : ''} aria-label="Subir «${esc(t.titulo)}»">${icono('arriba')}</button>
          <button type="button" class="boton-icono" data-mover="${i}" data-hacia="1" ${i === temas.length - 1 ? 'disabled' : ''} aria-label="Bajar «${esc(t.titulo)}»">${icono('abajo')}</button>
          <a class="boton-icono" href="#/admin/tema/${esc(t.id)}" aria-label="Editar «${esc(t.titulo)}»">${icono('editar')}</a>
        </span>
      </li>`).join('') : '<li class="apagado sin-marca">Este curso aún no tiene temas.</li>';

    for (const b of lista.querySelectorAll('[data-mover]')) {
      b.addEventListener('click', async () => {
        const i = Number(b.dataset.mover);
        const j = i + Number(b.dataset.hacia);
        const ids = temas.map((t) => t.id);
        [ids[i], ids[j]] = [ids[j], ids[i]];
        await almacen.ordenarTemas(ids);
        await pintarTemas();
        lista.querySelectorAll('[data-mover]')[j * 2 + (b.dataset.hacia === '1' ? 1 : 0)]?.focus();
      });
    }
  }
  await pintarTemas();

  el.querySelector('[data-nuevo-tema]').addEventListener('click', async () => {
    const temas = await almacen.temas(curso.id);
    const t = {
      id: nuevoId('t-'),
      cursoId: curso.id,
      orden: temas.length ? Math.max(...temas.map((x) => x.orden)) + 1 : 1,
      titulo: `Tema ${temas.length + 1}`,
      resumen: '',
      contenido: '',
      recursos: [],
    };
    await almacen.guardarTema(t);
    location.hash = `#/admin/tema/${t.id}`;
  });

  el.querySelector('[data-borrar]').addEventListener('click', async () => {
    if (!confirm(`¿Borrar el curso «${curso.titulo}» con todos sus temas y preguntas? No se puede deshacer.`)) return;
    await almacen.borrarCurso(curso.id);
    aviso('Curso borrado.');
    location.hash = '#/admin';
  });
}
