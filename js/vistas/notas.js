// Notas del alumno: resumen, ranking de su ciudad, aciertos por tema e historial de tests.
// La administración usa informe() para ver las notas de cualquier alumno.

import * as almacen from '../almacen.js';
import * as sesion from '../sesion.js';
import { porTema, porcentaje, resumen } from '../estadisticas.js';
import { chipNota, esc, fecha, icono, nombreCiudad, nota, plural, titulo } from '../utiles.js';

export async function render(el) {
  titulo('Mis notas');
  const u = sesion.usuario();
  // El ranking es de los alumnos (la administración no hace tests para puntuar).
  const ranking = sesion.esAdmin() ? '' : await rankingCiudad(u);
  el.innerHTML = `
    <section class="contenedor">
      <h1>Mis notas</h1>
      ${await informe(u.id, ranking)}
    </section>`;

  // Sin ciudad: se pide aquí mismo para poder ver el ranking.
  el.querySelector('.ranking-ciudad-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const ciudad = nombreCiudad(e.currentTarget.ciudad.value);
    if (!ciudad) return;
    await almacen.guardarUsuario({ ...(await almacen.usuario(u.id)), ciudad });
    await sesion.refrescar();
    render(el);
  });
}

// extra: lo que va justo debajo de las cifras (el ranking de la ciudad, en «Mis notas»).
export async function informe(usuarioId, extra = '') {
  const intentos = await almacen.intentos({ usuarioId });
  if (!intentos.length) {
    return `<p class="vacio">Todavía no hay ningún test hecho.<br>Las notas aparecerán aquí en cuanto termines el primero.</p>${extra}`;
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
    ${extra}

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

// «Laura García» → «Laura G.»: en el ranking no se enseña el nombre completo de los demás.
function nombreCorto(nombre) {
  const [nombrePila, apellido] = nombre.trim().split(/\s+/);
  return apellido ? `${nombrePila} ${apellido[0].toUpperCase()}.` : nombrePila;
}

// Para comparar ciudades sin que importen mayúsculas, tildes ni espacios.
const clave = (texto) => (texto ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

const MAX_FILAS = 10;

// Ranking de la ciudad del alumno: los alumnos de su ciudad con algún test, ordenados por
// nota media (y, a igual media, por número de tests). Él sale resaltado, también si está
// más abajo de los diez primeros.
async function rankingCiudad(u) {
  const ciudad = (u.ciudad ?? '').trim();
  if (!ciudad) {
    return `
      <div class="seccion-fila"><h2>Ranking de tu ciudad</h2></div>
      <form class="ranking-ciudad-form">
        <p>Dinos de qué ciudad eres para ver cómo vas frente a los alumnos de tu ciudad.</p>
        <div class="ranking-ciudad-campos">
          <input name="ciudad" placeholder="Tu ciudad" autocomplete="address-level2" aria-label="Tu ciudad" required>
          <button class="btn btn-primario" type="submit">Guardar</button>
        </div>
      </form>`;
  }

  const [usuarios, intentos] = await Promise.all([almacen.usuarios(), almacen.intentos()]);
  const filas = usuarios
    .filter((x) => x.rol !== 'admin' && clave(x.ciudad) === clave(ciudad))
    .map((x) => ({ u: x, r: resumen(intentos.filter((i) => i.usuarioId === x.id)) }))
    .filter((f) => f.r.tests)
    .sort((a, b) => b.r.media - a.r.media || b.r.tests - a.r.tests || a.u.nombre.localeCompare(b.u.nombre, 'es'));
  const puesto = filas.findIndex((f) => f.u.id === u.id);
  const visibles = filas.slice(0, MAX_FILAS);
  if (puesto >= MAX_FILAS) visibles.push(filas[puesto]);

  const resumenTexto = puesto >= 0
    ? `Vas <b>${puesto + 1}.º</b> de ${plural(filas.length, 'alumno', 'alumnos')} de ${esc(ciudad)} con tests hechos.`
    : `Haz tu primer test para entrar en el ranking de ${esc(ciudad)}.`;

  return `
    <div class="seccion-fila"><h2>Ranking de ${esc(ciudad)}</h2></div>
    <div class="ranking-ciudad">
      <p class="ranking-ciudad-resumen">${icono('diana')}<span>${resumenTexto}</span></p>
      ${visibles.length ? `
        <ol class="ranking-ciudad-lista">
          ${visibles.map((f) => {
            const n = filas.indexOf(f) + 1;
            const yo = f.u.id === u.id;
            return `
              <li class="${yo ? 'yo' : ''} ${n <= 3 ? `podio podio-${n}` : ''}">
                <span class="ranking-ciudad-pos">${n}</span>
                <span class="ranking-ciudad-nombre">${yo ? `Tú <small>${esc(nombreCorto(f.u.nombre))}</small>` : esc(nombreCorto(f.u.nombre))}</span>
                <span class="ranking-ciudad-tests">${plural(f.r.tests, 'test', 'tests')}</span>
                ${chipNota(f.r.media)}
              </li>`;
          }).join('')}
        </ol>` : '<p class="apagado">Aún nadie de tu ciudad ha hecho un test.</p>'}
    </div>`;
}
