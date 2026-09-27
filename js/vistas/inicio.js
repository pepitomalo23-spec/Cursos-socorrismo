// Portada: la bienvenida (el logo que vuela a la cabecera; js/bienvenida.js) y, debajo, sin
// sesión, el recuadro para entrar o crear cuenta; con sesión, un inicio con tarjetas que
// llevan a cada apartado (Temario y test, Mis notas, Administración…). Después, el contacto.

import { ESCUELA } from '../config.js';
import * as almacen from '../almacen.js';
import * as sesion from '../sesion.js';
import { resumen } from '../estadisticas.js';
import { emblemaCurso, esc, estiloCurso, icono, nota, plural, titulo } from '../utiles.js';
import { bienvenidaVista, montarBienvenida } from '../bienvenida.js';
import { formularioAcceso } from './acceso.js';

export async function render(el) {
  titulo('');
  const u = sesion.usuario();
  const conBienvenida = !bienvenidaVista();

  el.innerHTML = `
    <section class="portada" ${conBienvenida ? '' : 'hidden'}>
      <div class="portada-logo" aria-hidden="true">
        <svg viewBox="0 0 1862 623"><use href="assets/logo.svg#logo"/></svg>
      </div>
      <div class="logo-vuelo" aria-hidden="true">
        <div class="logo-vuelo-difuminado"><svg viewBox="0 0 1862 623"><use href="assets/logo.svg#logo"/></svg></div>
        <div class="logo-vuelo-nitido"><svg viewBox="0 0 1862 623"><use href="assets/logo.svg#logo"/></svg></div>
      </div>
      <div class="portada-texto">
        <p class="portada-lugar">${icono('salvavidas')} ${esc(ESCUELA.ciudad)}</p>
        <h1 class="portada-titulo">${u ? `Hola, ${esc(u.nombre.split(' ')[0])}` : 'Bienvenido'}</h1>
        <p class="portada-lema">${esc(ESCUELA.lema)}</p>
      </div>
      <a class="portada-deslizar" href="#inicio-contenido" data-desplazar>
        <span>Desliza para empezar</span>
        <span class="portada-deslizar-flecha" aria-hidden="true"></span>
      </a>
    </section>

    <section class="contenedor inicio-contenido" id="inicio-contenido">
      ${u ? await tarjetas(u) : registro()}
    </section>

    <section class="contenedor">
      <div class="seccion-fila"><h2>Contacto</h2></div>
      <div class="contacto">
        <p>¿Quieres apuntarte? Escríbenos o llámanos y te contamos las próximas fechas.</p>
        <div class="acciones">
          <a class="btn btn-primario" href="mailto:${esc(ESCUELA.email)}">${esc(ESCUELA.email)}</a>
          <a class="btn btn-fantasma" href="tel:${esc(ESCUELA.telefono.replace(/\s/g, ''))}">${esc(ESCUELA.telefono)}</a>
        </div>
      </div>
    </section>`;

  if (!u) formularioAcceso(el.querySelector('.inicio-formulario'), { modo: 'entrar' });
  const desmontarBienvenida = conBienvenida ? montarBienvenida(el.querySelector('.portada')) : () => {};

  // «Desliza para empezar» baja hasta el recuadro de acceso (o las tarjetas).
  el.querySelector('[data-desplazar]')?.addEventListener('click', (e) => {
    e.preventDefault();
    const destino = el.querySelector('#inicio-contenido');
    const arriba = document.querySelector('.cabecera')?.offsetHeight ?? 0;
    scrollTo({ top: destino.getBoundingClientRect().top + scrollY - arriba, behavior: 'smooth' });
  });

  // Al salir de la portada, la cabecera vuelve a ser la de siempre.
  return { alSalir: () => desmontarBienvenida() };
}

// Sin sesión: qué hay en la escuela y el recuadro para entrar o crear cuenta.
function registro() {
  return `
    <div class="inicio-registro">
      <div class="inicio-formulario"></div>
      <div class="inicio-presentacion">
        <p class="antetitulo">Curso de socorrista</p>
        <h2>Tu formación, en tu móvil</h2>
        <ul class="inicio-ventajas">
          <li>${icono('libro')}<span><strong>Temario</strong> de los cuatro módulos, con explicaciones, PDF y vídeos</span></li>
          <li>${icono('test')}<span><strong>Tests</strong> por tema o de todo el módulo, con corrección al momento</span></li>
          <li>${icono('grafica')}<span><strong>Notas</strong>: tu media y tus aciertos por tema</span></li>
        </ul>
        <a class="inicio-ver" href="#/temario">Ver el temario y test ${icono('flecha')}</a>
      </div>
    </div>`;
}

// Con sesión: una tarjeta por apartado del menú, con lo más útil de cada uno a la vista.
async function tarjetas(u) {
  const cursos = await almacen.cursos();
  const intentos = await almacen.intentos({ usuarioId: u.id });
  const r = resumen(intentos);
  const ultimo = intentos[0];
  const todos = cursos.filter((c) => c.modulo);
  const mios = todos.filter((c) => sesion.esAdmin() || u.cursos.includes(c.id));

  return `
    <h2 class="inicio-pregunta">¿Qué quieres hacer hoy?</h2>
    <div class="inicio-tarjetas">
      <a class="inicio-tarjeta grande" href="#/temario">
        <span class="inicio-tarjeta-emblemas">
          ${todos.map((c, i) => `<span class="color-${estiloCurso(i)[0]}">${emblemaCurso(c, estiloCurso(i)[1])}</span>`).join('')}
        </span>
        <span class="inicio-tarjeta-texto">
          <strong>Temario y test</strong>
          <span>${mios.length ? `${plural(mios.length, 'módulo', 'módulos')} con sus temas, vídeos y tests` : 'Los cuatro módulos del curso (la escuela te dará acceso)'}</span>
        </span>
        <span class="inicio-tarjeta-flecha">${icono('flecha')}</span>
      </a>
      <a class="inicio-tarjeta color-teal" href="#/notas">
        <span class="inicio-tarjeta-icono">${icono('grafica')}</span>
        <span class="inicio-tarjeta-texto">
          <strong>Mis notas</strong>
          <span>${r.tests ? `${plural(r.tests, 'test', 'tests')} · media <b>${nota(r.media)}</b>` : 'Aún no has hecho ningún test'}</span>
        </span>
        <span class="inicio-tarjeta-flecha">${icono('flecha')}</span>
      </a>
      ${ultimo ? `
        <a class="inicio-tarjeta color-coral" href="#/intento/${esc(ultimo.id)}">
          <span class="inicio-tarjeta-icono">${icono('test')}</span>
          <span class="inicio-tarjeta-texto">
            <strong>Tu último test</strong>
            <span>${esc(ultimo.temaTitulos.length === 1 ? ultimo.temaTitulos[0] : ultimo.cursoTitulo)} · <b>${nota(ultimo.nota)}</b></span>
          </span>
          <span class="inicio-tarjeta-flecha">${icono('flecha')}</span>
        </a>` : ''}
      ${sesion.esAdmin() ? `
        <a class="inicio-tarjeta color-morado" href="#/admin">
          <span class="inicio-tarjeta-icono">${icono('ajustes')}</span>
          <span class="inicio-tarjeta-texto">
            <strong>Administración</strong>
            <span>Cursos, temario, alumnos y notas</span>
          </span>
          <span class="inicio-tarjeta-flecha">${icono('flecha')}</span>
        </a>` : ''}
    </div>`;
}
