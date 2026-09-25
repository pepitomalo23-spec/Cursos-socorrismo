// Notas del alumno: resumen, aciertos por tema e historial de tests.
// La administración usa informe() para ver las notas de cualquier alumno.

import * as almacen from '../almacen.js';
import * as sesion from '../sesion.js';
import { porTema, porcentaje, resumen } from '../estadisticas.js';
import { chipNota, esc, fecha, icono, nota, plural, titulo } from '../utiles.js';

export async function render(el) {
  titulo('Mis notas');
  el.innerHTML = `
    <section class="contenedor">
      <h1>Mis notas</h1>
      ${await informe(sesion.usuario().id)}
    </section>`;
}

export async function informe(usuarioId) {
  const intentos = await almacen.intentos({ usuarioId });
  if (!intentos.length) {
    return '<p class="vacio">Todavía no hay ningún test hecho.<br>Las notas aparecerán aquí en cuanto termines el primero.</p>';
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
      <article class="ranking">
        <div class="ranking-cabecera">
          <h3>${esc(c.titulo)}</h3>
          <span class="ranking-sub">media ${nota(rc.media)}</span>
        </div>
        <div class="ranking-lista">
          ${temas.map((t, n) => {
            const cuenta = aciertos.get(t.id);
            const pct = porcentaje(cuenta);
            const color = pct == null ? '' : pct >= 80 ? 'verde' : pct >= 50 ? 'ambar' : 'coral';
            return `
              <div class="ranking-fila">
                <span class="ranking-pos">${n + 1}</span>
                <div class="ranking-cuerpo">
                  <div class="ranking-nombre">${esc(t.titulo)}</div>
                  <div class="ranking-pista"><span class="ranking-relleno ${color}" style="width:${pct ?? 0}%"></span></div>
                </div>
                <span class="ranking-pct ${color}" title="${cuenta ? `${cuenta.aciertos} de ${cuenta.total} preguntas` : 'Sin tests'}">${pct == null ? '—' : `${pct}%`}</span>
              </div>`;
          }).join('')}
        </div>
      </article>`;
  }));

  return `
    <dl class="cifras-grandes">
      <div><dt>Tests hechos</dt><dd class="morado">${r.tests}</dd></div>
      <div><dt>Nota media</dt><dd class="azul">${nota(r.media)}</dd></div>
      <div><dt>Mejor nota</dt><dd class="teal">${nota(r.mejor)}</dd></div>
      <div><dt>Aprobados</dt><dd class="coral">${r.aprobados}<small>/${r.tests}</small></dd></div>
    </dl>

    <div class="seccion-fila"><h2>Aciertos por tema</h2></div>
    <div class="rejilla-ranking">${bloquesCurso.join('')}</div>

    <div class="seccion-fila"><h2>Historial</h2></div>
    <div class="historial">
      ${intentos.map((i) => `
        <a class="hist-item" href="#/intento/${esc(i.id)}">
          <span class="hist-icono">${icono('test')}</span>
          <span class="hist-texto">
            <strong>${esc(i.temaTitulos.length === 1 ? i.temaTitulos[0] : `${i.cursoTitulo} (${plural(i.temaTitulos.length, 'tema', 'temas')})`)}</strong>
            <span>${fecha(i.fecha)} · ${i.aciertos}/${i.total} aciertos</span>
          </span>
          ${chipNota(i.nota)}
        </a>`).join('')}
    </div>`;
}
