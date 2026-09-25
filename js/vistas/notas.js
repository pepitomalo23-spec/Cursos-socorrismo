// Notas del alumno: resumen, aciertos por tema e historial de tests.
// La administración usa informe() para ver las notas de cualquier alumno.

import * as almacen from '../almacen.js';
import * as sesion from '../sesion.js';
import { porTema, porcentaje, resumen } from '../estadisticas.js';
import { chipNota, esc, fecha, nota, plural, titulo } from '../utiles.js';

export async function render(el) {
  titulo('Mis notas');
  el.innerHTML = `
    <section class="contenedor seccion">
      <h1>Mis notas</h1>
      ${await informe(sesion.usuario().id)}
    </section>`;
}

export async function informe(usuarioId) {
  const intentos = await almacen.intentos({ usuarioId });
  if (!intentos.length) {
    return '<p class="caja-info">Todavía no hay ningún test hecho. Las notas aparecerán aquí en cuanto termines el primero.</p>';
  }

  const r = resumen(intentos);
  const cursoIds = [...new Set(intentos.map((i) => i.cursoId))];
  const cursos = (await Promise.all(cursoIds.map((id) => almacen.curso(id)))).filter(Boolean);

  const bloquesCurso = await Promise.all(cursos.map(async (c) => {
    const temas = await almacen.temas(c.id);
    const delCurso = intentos.filter((i) => i.cursoId === c.id);
    const aciertos = porTema(delCurso);
    const rc = resumen(delCurso);
    return `
      <article class="tarjeta">
        <div class="titulo-con-accion">
          <h3>${esc(c.titulo)}</h3>
          <span class="apagado">Media ${nota(rc.media)}</span>
        </div>
        <table class="tabla tabla-temas">
          <thead><tr><th scope="col">Tema</th><th scope="col">Aciertos</th></tr></thead>
          <tbody>
            ${temas.map((t) => {
              const cuenta = aciertos.get(t.id);
              const pct = porcentaje(cuenta);
              return `
                <tr>
                  <td>${esc(t.titulo)}</td>
                  <td>${pct == null
                    ? '<span class="apagado">Sin tests</span>'
                    : `<span class="tema-progreso"><span class="barra-progreso ${pct < 50 ? 'baja' : ''}" style="--valor:${pct}%"><span></span></span>
                       <span>${pct}%</span></span>
                       <span class="apagado pequeno">${cuenta.aciertos} de ${plural(cuenta.total, 'pregunta', 'preguntas')}</span>`}</td>
                </tr>`;
            }).join('')}
          </tbody>
        </table>
      </article>`;
  }));

  return `
    <dl class="cifras cifras-grandes">
      <div><dt>Tests hechos</dt><dd>${r.tests}</dd></div>
      <div><dt>Nota media</dt><dd>${nota(r.media)}</dd></div>
      <div><dt>Mejor nota</dt><dd>${nota(r.mejor)}</dd></div>
      <div><dt>Aprobados</dt><dd>${r.aprobados} de ${r.tests}</dd></div>
    </dl>

    <h2>Aciertos por tema</h2>
    <div class="rejilla rejilla-2">${bloquesCurso.join('')}</div>

    <h2>Historial</h2>
    <div class="tabla-desplazable">
      <table class="tabla">
        <thead>
          <tr><th scope="col">Fecha</th><th scope="col">Test</th><th scope="col">Aciertos</th><th scope="col">Nota</th><th scope="col"><span class="oculto">Revisar</span></th></tr>
        </thead>
        <tbody>
          ${intentos.map((i) => `
            <tr>
              <td>${fecha(i.fecha)}</td>
              <td>${esc(i.temaTitulos.length === 1 ? i.temaTitulos[0] : `${i.cursoTitulo} (${plural(i.temaTitulos.length, 'tema', 'temas')})`)}</td>
              <td>${i.aciertos}/${i.total}</td>
              <td>${chipNota(i.nota)}</td>
              <td><a href="#/intento/${esc(i.id)}">Revisar</a></td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}
