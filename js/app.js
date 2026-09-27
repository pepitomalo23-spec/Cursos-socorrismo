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
import * as temario from './vistas/temario.js';
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
  ['/temario', temario, null],
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

  // El antiguo «Mis cursos» (#/panel) es ahora «Temario y test».
  if (/^#\/panel(\?|$)/.test(location.hash)) {
    location.replace('#/temario');
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
  document.documentElement.classList.remove('menu-abierto'); // el menú del móvil se pinta cerrado
  const u = sesion.usuario();
  const enlaces = u
    ? [
      ['#/', 'Inicio', 'casa'],
      ['#/temario', 'Temario y test', 'libro'],
      ['#/notas', 'Mis notas', 'grafica'],
      ...(sesion.esAdmin() ? [['#/admin', 'Administración', 'ajustes']] : []),
    ]
    : [
      ['#/', 'Inicio', 'casa'],
      ['#/temario', 'Temario y test', 'libro'],
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
      <button type="button" class="usuario-boton tema-suelto" data-tema aria-label="${temaActual() === 'light' ? 'Tema oscuro' : 'Tema claro'}">${icono(temaActual() === 'light' ? 'luna' : 'sol')}</button>`}
    <div class="menu-movil">
      <button type="button" class="usuario-boton menu-boton" aria-expanded="false" aria-controls="menu-panel" aria-label="Menú">${icono('menu', 'icono-abrir')}${icono('cerrar', 'icono-cerrar')}</button>
      <div class="menu-panel" id="menu-panel" hidden>
        ${u ? `
          <div class="menu-cuenta">
            <span class="menu-avatar">${icono('usuario')}</span>
            <span><strong>${esc(u.nombre)}</strong><span>${esc(u.email)}</span></span>
          </div>` : ''}
        <nav class="menu-enlaces" aria-label="Principal">
          ${enlaces.map(([href, texto, ico]) => `
            <a class="menu-enlace" href="${href}" ${activo(href) ? 'aria-current="page"' : ''}>${icono(ico)}<span>${esc(texto)}</span></a>`).join('')}
        </nav>
        <div class="menu-opciones">
          <button type="button" class="usuario-opcion" data-tema>${icono(temaActual() === 'light' ? 'luna' : 'sol')}<span>${temaActual() === 'light' ? 'Tema oscuro' : 'Tema claro'}</span></button>
          ${u ? `<button type="button" class="usuario-opcion peligro" data-salir>${icono('salir')}<span>Cerrar sesión</span></button>` : ''}
        </div>
      </div>
    </div>`;

  medirCabecera();

  const boton = cabecera.querySelector('.usuario > .usuario-boton');
  boton?.addEventListener('click', () => {
    const menu = cabecera.querySelector('.usuario-menu');
    menu.hidden = !menu.hidden;
    boton.setAttribute('aria-expanded', String(!menu.hidden));
  });

  // Menú del móvil (☰): se abre y cierra con su botón; al elegir algo, se cierra solo.
  const botonMenu = cabecera.querySelector('.menu-boton');
  botonMenu.addEventListener('click', () => (botonMenu.getAttribute('aria-expanded') === 'true' ? cerrarMenuMovil() : abrirMenuMovil()));
  for (const a of cabecera.querySelectorAll('.menu-enlace')) a.addEventListener('click', cerrarMenuMovil);

  for (const b of cabecera.querySelectorAll('[data-tema]')) {
    b.addEventListener('click', () => {
      cambiarTema(temaActual() === 'light' ? 'dark' : 'light');
      pintarCabecera(camino);
    });
  }
  for (const b of cabecera.querySelectorAll('[data-salir]')) {
    b.addEventListener('click', () => {
      if (vistaActual?.puedeSalir && !vistaActual.puedeSalir()) return;
      vistaActual = null;
      sesion.salir();
      location.hash = '#/';
    });
  }
}

function abrirMenuMovil() {
  const panel = cabecera.querySelector('.menu-panel');
  if (!panel) return;
  panel.hidden = false;
  cabecera.querySelector('.menu-boton').setAttribute('aria-expanded', 'true');
  document.documentElement.classList.add('menu-abierto');
}

function cerrarMenuMovil() {
  const panel = cabecera.querySelector('.menu-panel');
  if (!panel || panel.hidden) return;
  panel.hidden = true;
  cabecera.querySelector('.menu-boton').setAttribute('aria-expanded', 'false');
  document.documentElement.classList.remove('menu-abierto');
}

// Alto de la cabecera, para el css (--alto-cabecera): la portada y el recorrido ocupan justo el
// hueco que queda debajo. Solo cambia con el ancho (no al esconderse la barra de direcciones
// del móvil, que no la toca).
function medirCabecera() {
  document.documentElement.style.setProperty('--alto-cabecera', `${cabecera.offsetHeight}px`);
}
let anchoMedido = innerWidth;
addEventListener('resize', () => {
  if (innerWidth === anchoMedido) return;
  anchoMedido = innerWidth;
  medirCabecera();
});

function cerrarMenuUsuario() {
  const menu = cabecera.querySelector('.usuario-menu');
  if (!menu || menu.hidden) return;
  menu.hidden = true;
  cabecera.querySelector('.usuario > .usuario-boton')?.setAttribute('aria-expanded', 'false');
}
document.addEventListener('click', (e) => {
  if (!e.target.closest?.('.usuario')) cerrarMenuUsuario();
  if (!e.target.closest?.('.menu-movil')) cerrarMenuMovil();
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  cerrarMenuUsuario();
  cerrarMenuMovil();
});
// Si se pasa a pantalla ancha con el menú del móvil abierto, se cierra.
matchMedia('(min-width: 641px)').addEventListener('change', (e) => { if (e.matches) cerrarMenuMovil(); });

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
