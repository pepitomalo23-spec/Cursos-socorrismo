// Arranque de la web y navegación entre pantallas.
//
// Las direcciones van detrás de «#» (por ejemplo #/curso/socorrismo-acuatico) para que la
// web funcione como archivos estáticos, sin servidor. Cada pantalla es un archivo de
// js/vistas/ con una función render(contenedor, { params, query }). Si render devuelve
// { puedeSalir() }, se le pregunta antes de salir de ella (lo usa el test en curso).

import { ESCUELA } from './config.js';
import * as sesion from './sesion.js';
import { esc, icono, pantallaVacia, titulo } from './utiles.js';

import * as inicio from './vistas/inicio.js';
import * as acceso from './vistas/acceso.js';
import * as curso from './vistas/curso.js';
import * as tema from './vistas/tema.js';
import * as test from './vistas/test.js';
import * as intento from './vistas/intento.js';
import * as notas from './vistas/notas.js';
import * as admin from './vistas/admin.js';

// [ruta, vista, quién puede entrar: null (todos), 'usuario' o 'admin']
const RUTAS = [
  ['/', inicio, null],
  ['/acceso', acceso, null],
  ['/curso/:id', curso, 'usuario'],
  ['/tema/:id', tema, 'usuario'],
  ['/test', test, 'usuario'],
  ['/intento/:id', intento, 'usuario'],
  ['/notas', notas, 'usuario'],
  ['/admin', admin, 'admin'],
  ['/admin/:seccion', admin, 'admin'],
  ['/admin/:seccion/:id', admin, 'admin'],
].map(([ruta, vista, acceso]) => ({
  vista,
  acceso,
  nombres: [...ruta.matchAll(/:(\w+)/g)].map((m) => m[1]),
  patron: new RegExp(`^${ruta.replace(/:\w+/g, '([^/]+)')}$`),
}));

const principal = document.getElementById('principal');
const cabecera = document.getElementById('cabecera');

let vistaActual = null;
let hashActual = location.hash;
let volviendo = false;

function resolver(hash) {
  const [camino, busqueda = ''] = (hash.replace(/^#/, '') || '/').split('?');
  for (const ruta of RUTAS) {
    const m = camino.match(ruta.patron);
    if (m) {
      const params = Object.fromEntries(ruta.nombres.map((n, i) => [n, decodeURIComponent(m[i + 1])]));
      return { ruta, params, query: new URLSearchParams(busqueda), camino: camino + (busqueda ? `?${busqueda}` : '') };
    }
  }
  return { ruta: null, camino };
}

async function mostrar() {
  if (volviendo) {
    volviendo = false;
    return;
  }
  if (vistaActual?.puedeSalir && !vistaActual.puedeSalir()) {
    // Se queda en la pantalla: se restaura la dirección sin volver a pintar.
    volviendo = true;
    location.hash = hashActual;
    return;
  }
  vistaActual?.alSalir?.();
  vistaActual = null;
  hashActual = location.hash;

  // «Mis cursos» es ahora la portada (el recorrido por los módulos); #/panel queda como alias.
  if (/^#\/panel(\?|$)/.test(location.hash)) {
    location.replace('#/');
    return;
  }
  const { ruta, params, query, camino } = resolver(location.hash);
  const u = sesion.usuario();

  if (ruta?.acceso && !u) {
    location.replace(`#/acceso?volver=${encodeURIComponent(camino)}`);
    return;
  }
  // Quien ya ha entrado no necesita la pantalla de acceso.
  if (ruta?.vista === acceso && u) {
    location.replace(query.get('volver') ? `#${query.get('volver')}` : '#/');
    return;
  }

  pintarCabecera(camino);
  principal.innerHTML = '<div class="cargando" aria-label="Cargando"></div>';

  if (!ruta) {
    titulo('Página no encontrada');
    principal.innerHTML = pantallaVacia('Página no encontrada', 'La dirección no existe o ha cambiado.');
  } else if (ruta.acceso === 'admin' && !sesion.esAdmin()) {
    titulo('Sin permiso');
    principal.innerHTML = pantallaVacia('Sin permiso', 'Esta sección es solo para la administración de la escuela.');
  } else {
    try {
      vistaActual = (await ruta.vista.render(principal, { params, query })) ?? null;
    } catch (error) {
      console.error(error);
      titulo('Error');
      principal.innerHTML = pantallaVacia('Algo ha fallado', 'No se ha podido cargar esta pantalla. Prueba a recargar la página.');
    }
  }
  window.scrollTo(0, 0);
  principal.focus({ preventScroll: true });
}

function pintarCabecera(camino) {
  const u = sesion.usuario();
  const enlaces = u
    ? [
      ['#/', 'Mis cursos', 'libro'],
      ['#/notas', 'Mis notas', 'grafica'],
      ...(sesion.esAdmin() ? [['#/admin', 'Administración', 'ajustes']] : []),
    ]
    : [
      ['#/', 'Inicio', 'casa'],
      ['#/acceso', 'Acceso alumnos', 'usuario'],
    ];
  const activo = (href) => {
    const destino = href.slice(1);
    return destino === '/' ? camino === '/' : camino === destino || camino.startsWith(`${destino}/`);
  };

  cabecera.innerHTML = `
    <a class="marca" href="#/" aria-label="${esc(ESCUELA.nombre)} · inicio">
      <svg class="marca-logo" viewBox="0 0 1862 623" aria-hidden="true"><use href="assets/logo.svg#logo"/></svg>
    </a>
    <nav class="nav" aria-label="Principal">
      ${enlaces.map(([href, texto, ico]) => `
        <a class="nav-item" href="${href}" ${activo(href) ? 'aria-current="page"' : ''}>${icono(ico)}<span class="nav-texto">${esc(texto)}</span></a>`)
        .join('<span class="nav-punto" aria-hidden="true"></span>')}
    </nav>
    ${u ? `
      <div class="usuario">
        <button type="button" class="usuario-boton" aria-expanded="false" aria-haspopup="true" aria-label="Tu cuenta">${icono('usuario')}</button>
        <div class="usuario-menu" hidden>
          <p class="usuario-nombre">${esc(u.nombre)}</p>
          <p class="usuario-email">${esc(u.email)}</p>
          <button type="button" class="usuario-opcion" data-tema>${icono(temaActual() === 'light' ? 'luna' : 'sol')}<span>${temaActual() === 'light' ? 'Tema oscuro' : 'Tema claro'}</span></button>
          <button type="button" class="usuario-opcion peligro" data-salir>${icono('salir')}<span>Cerrar sesión</span></button>
        </div>
      </div>` : `
      <button type="button" class="usuario-boton tema-suelto" data-tema aria-label="${temaActual() === 'light' ? 'Tema oscuro' : 'Tema claro'}">${icono(temaActual() === 'light' ? 'luna' : 'sol')}</button>`}`;

  const boton = cabecera.querySelector('.usuario > .usuario-boton');
  boton?.addEventListener('click', () => {
    const menu = cabecera.querySelector('.usuario-menu');
    menu.hidden = !menu.hidden;
    boton.setAttribute('aria-expanded', String(!menu.hidden));
  });

  for (const b of cabecera.querySelectorAll('[data-tema]')) {
    b.addEventListener('click', () => {
      cambiarTema(temaActual() === 'light' ? 'dark' : 'light');
      pintarCabecera(camino);
    });
  }
  cabecera.querySelector('[data-salir]')?.addEventListener('click', () => {
    if (vistaActual?.puedeSalir && !vistaActual.puedeSalir()) return;
    vistaActual = null;
    sesion.salir();
    location.hash = '#/';
  });
}

function cerrarMenuUsuario() {
  const menu = cabecera.querySelector('.usuario-menu');
  if (!menu || menu.hidden) return;
  menu.hidden = true;
  cabecera.querySelector('.usuario > .usuario-boton')?.setAttribute('aria-expanded', 'false');
}
document.addEventListener('click', (e) => { if (!e.target.closest?.('.usuario')) cerrarMenuUsuario(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrarMenuUsuario(); });

// Tema claro u oscuro (oscuro por defecto). js/tema-previo.js lo aplica antes de pintar.
function temaActual() {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

function cambiarTema(tema) {
  if (tema === 'light') document.documentElement.dataset.theme = 'light';
  else delete document.documentElement.dataset.theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', tema === 'light' ? '#FFFFFF' : '#000000');
  try {
    localStorage.setItem('escuela.tema', tema);
  } catch {
    // Sin almacenamiento: el tema dura hasta recargar.
  }
}

function pintarPie() {
  document.getElementById('pie').innerHTML = `
    <div class="contenedor pie">
      <p><strong>${esc(ESCUELA.nombre)}</strong> · ${esc(ESCUELA.ciudad)}</p>
      <p>
        <a href="mailto:${esc(ESCUELA.email)}">${esc(ESCUELA.email)}</a> ·
        <a href="tel:${esc(ESCUELA.telefono.replace(/\s/g, ''))}">${esc(ESCUELA.telefono)}</a>
      </p>
      <p class="nota-demo">Versión de demostración: los datos se guardan solo en este navegador.</p>
    </div>`;
}

// El enlace «Saltar al contenido» no puede cambiar la dirección (la usa la navegación).
document.querySelector('.saltar').addEventListener('click', (e) => {
  e.preventDefault();
  principal.focus();
});

window.addEventListener('hashchange', mostrar);
window.addEventListener('beforeunload', (e) => {
  if (vistaActual?.salidaPendiente?.()) e.preventDefault();
});

pintarPie();
await sesion.refrescar();
mostrar();
