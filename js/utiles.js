// Utilidades comunes a todas las pantallas.

import { ESCUELA, NOTA_APROBADO } from './config.js';

const ENTIDADES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

// Escapa un texto para meterlo en HTML. Todo lo que venga de los datos pasa por aquí.
export const esc = (texto) => String(texto ?? '').replace(/[&<>"']/g, (c) => ENTIDADES[c]);

// Convierte el texto de un tema en HTML. Admite un formato mínimo:
// «## Título», «### Subtítulo», líneas que empiezan por «- » (lista) y **negrita**.
export function textoRico(texto) {
  const enLinea = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  return String(texto ?? '')
    .replace(/\r/g, '')
    .split(/\n\s*\n/)
    .map((bloque) => bloque.trim())
    .filter(Boolean)
    .map((bloque) => {
      const lineas = bloque.split('\n');
      const html = [];
      let lista = [];
      let parrafo = [];
      const cerrar = () => {
        if (lista.length) html.push(`<ul>${lista.map((l) => `<li>${enLinea(l)}</li>`).join('')}</ul>`);
        if (parrafo.length) html.push(`<p>${parrafo.map(enLinea).join('<br>')}</p>`);
        lista = [];
        parrafo = [];
      };
      for (const linea of lineas) {
        if (linea.startsWith('### ')) { cerrar(); html.push(`<h4>${enLinea(linea.slice(4))}</h4>`); }
        else if (linea.startsWith('## ')) { cerrar(); html.push(`<h3>${enLinea(linea.slice(3))}</h3>`); }
        else if (/^[-*] /.test(linea)) { if (parrafo.length) cerrar(); lista.push(linea.slice(2)); }
        else { if (lista.length) cerrar(); parrafo.push(linea); }
      }
      cerrar();
      return html.join('');
    })
    .join('');
}

// Solo deja pasar direcciones http(s); cualquier otra (javascript:, data:…) se descarta.
export function urlSegura(url) {
  if (!url) return '';
  try {
    const u = new URL(url, location.href);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : '';
  } catch {
    return '';
  }
}

export function fecha(iso) {
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function fechaHora(iso) {
  return new Date(iso).toLocaleString('es-ES', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function nota(n) {
  return n == null ? '—' : n.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
}

// Nota con color de aprobado o suspenso.
export function chipNota(n) {
  if (n == null) return '<span class="chip-nota">—</span>';
  return `<span class="chip-nota ${n >= NOTA_APROBADO ? 'aprobado' : 'suspenso'}">${nota(n)}</span>`;
}

export function media(valores) {
  return valores.length ? valores.reduce((a, b) => a + b, 0) / valores.length : null;
}

export function barajar(lista) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

export function nuevoId(prefijo = '') {
  const aleatorio = globalThis.crypto?.randomUUID?.()
    ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  return prefijo + aleatorio;
}

export function plural(n, singular, varios) {
  return `${n} ${n === 1 ? singular : varios}`;
}

// Aviso breve en la esquina de la pantalla.
export function aviso(mensaje, tipo = 'info') {
  let zona = document.getElementById('avisos');
  if (!zona) {
    zona = document.createElement('div');
    zona.id = 'avisos';
    zona.setAttribute('role', 'status');
    zona.setAttribute('aria-live', 'polite');
    document.body.append(zona);
  }
  const caja = document.createElement('div');
  caja.className = `aviso aviso-${tipo}`;
  caja.textContent = mensaje;
  zona.append(caja);
  setTimeout(() => caja.classList.add('saliendo'), 3200);
  setTimeout(() => caja.remove(), 3600);
}

// Pantalla de «no encontrado» o «sin permiso».
export function pantallaVacia(titulo, texto, enlace = { href: '#/', texto: 'Volver al inicio' }) {
  return `
    <section class="contenedor estrecho vacio">
      <h1>${esc(titulo)}</h1>
      <p>${esc(texto)}</p>
      <a class="boton" href="${esc(enlace.href)}">${esc(enlace.texto)}</a>
    </section>`;
}

// Icono SVG (trazos) por nombre.
const ICONOS = {
  libro: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  test: '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  grafica: '<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 6-6"/>',
  pdf: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 15h6"/><path d="M9 11h2"/>',
  video: '<rect x="2" y="5" width="15" height="14" rx="2"/><path d="M17 10l5-3v10l-5-3z"/>',
  enlace: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  flecha: '<path d="M5 12h14"/><path d="M12 5l7 7-7 7"/>',
  atras: '<path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>',
  editar: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  borrar: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/>',
  mas: '<path d="M12 5v14"/><path d="M5 12h14"/>',
  arriba: '<path d="M18 15l-6-6-6 6"/>',
  abajo: '<path d="M6 9l6 6 6-6"/>',
  usuarios: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  salvavidas: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><path d="M4.93 4.93l4.24 4.24"/><path d="M14.83 14.83l4.24 4.24"/><path d="M14.83 9.17l4.24-4.24"/><path d="M4.93 19.07l4.24-4.24"/>',
  reloj: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  casa: '<path d="M3 10.5L12 3l9 7.5"/><path d="M5 9v12h14V9"/><path d="M10 21v-6h4v6"/>',
  usuario: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  ajustes: '<path d="M4 21v-7"/><path d="M4 10V3"/><path d="M12 21v-9"/><path d="M12 8V3"/><path d="M20 21v-5"/><path d="M20 12V3"/><path d="M1 14h6"/><path d="M9 8h6"/><path d="M17 16h6"/>',
  sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="M4.93 4.93l1.41 1.41"/><path d="M17.66 17.66l1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="M6.34 17.66l-1.41 1.41"/><path d="M19.07 4.93l-1.41 1.41"/>',
  luna: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
  salir: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
  corazon: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"/><path d="M3.5 12h4l2-3 3 6 2-3h6"/>',
  olas: '<path d="M2 7c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2"/><path d="M2 13c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2"/><path d="M2 19c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2"/>',
  diana: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  escudo: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/>',
  fallos: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M10 8l4 4"/><path d="M14 8l-4 4"/>',
  candado: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
};

export function icono(nombre, clase = '') {
  return `<svg class="icono ${clase}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONOS[nombre] ?? ''}</svg>`;
}

// Título de la pestaña del navegador.
export function titulo(texto) {
  document.title = texto ? `${texto} · ${ESCUELA.nombre}` : ESCUELA.nombre;
}

// Color e icono de cada curso en las tarjetas, según su posición en la lista de cursos.
const ESTILOS_CURSO = [
  ['azul', 'olas'], // módulo 1: natación
  ['ambar', 'escudo'], // módulo 2: prevención
  ['coral', 'salvavidas'], // módulo 3: rescate
  ['teal', 'corazon'], // módulo 4: primeros auxilios
  ['morado', 'libro'],
];

// «Módulo 3» si el curso tiene número de módulo; si no, nada.
export function etiquetaModulo(curso) {
  return curso?.modulo ? `Módulo ${curso.modulo}` : '';
}

export function estiloCurso(indice) {
  return ESTILOS_CURSO[Math.max(0, indice) % ESTILOS_CURSO.length];
}

// Silueta rellena de cada módulo (un solo color, el del módulo). Los cursos sin
// módulo usan el icono de línea.
const GLIFOS_MODULO = {
  // natación
  1: '<path d="M17.7 49.5C17.5 49.5 16.5 49.3 15.4 49.2C13.1 48.8 9.4 47.5 7.4 46.3C3.7 44.3 0.9 41.0 2.3 40.5C2.5 40.4 4.1 40.7 5.9 41.2C11.0 42.7 13.4 43.0 17.6 42.8C22.4 42.7 24.8 42.1 32.3 39.6C40.3 37.0 41.3 36.8 45.7 36.8C48.7 36.8 49.7 36.9 51.6 37.4C57.8 39.0 63.5 43.3 61.6 44.9C61.1 45.3 60.6 45.2 56.8 44.2C53.7 43.3 49.9 43.0 46.7 43.4C43.2 43.7 41.1 44.3 33.9 46.7C30.7 47.8 27.2 48.8 26.1 49.1C24.2 49.4 18.6 49.8 17.7 49.5ZM16.2 40.9C11.0 40.3 6.3 38.3 3.6 35.4C1.3 33.0 1.7 32.3 5.1 33.3C6.4 33.7 8.5 34.1 9.8 34.3C14.4 35.0 24.6 34.6 21.7 33.8C20.8 33.6 21.1 33.2 23.1 32.2C25.8 30.7 28.5 28.6 30.1 26.7C31.7 24.8 32.8 22.7 32.5 22.4C32.4 22.2 30.8 22.8 28.7 23.9C22.8 26.7 19.0 27.5 14.8 26.9C10.2 26.3 10.1 25.6 14.5 23.8C18.2 22.3 21.6 20.6 27.3 17.4C35.5 12.8 35.2 12.8 39.9 19.6C42.5 23.5 43.0 24.0 42.8 22.6C42.4 20.2 44.5 17.3 47.1 16.5C52.7 14.9 56.9 21.7 52.9 25.9C51.2 27.6 48.5 28.2 46.5 27.4C45.6 27.0 45.6 27.0 45.4 28.0C45.2 28.8 45.2 28.8 47.5 29.0C54.2 29.5 61.1 33.5 60.4 36.5C60.1 37.4 59.3 37.4 55.9 36.3C52.3 35.1 50.0 34.8 46.3 35.0C42.7 35.2 40.6 35.7 34.2 37.8C25.2 40.7 21.2 41.4 16.2 40.9ZM34.5 30.8C35.4 30.5 36.9 30.0 37.9 29.8C40.0 29.3 41.0 28.7 39.3 29.0C38.0 29.2 33.1 30.9 32.8 31.2C32.5 31.5 32.7 31.5 34.5 30.8Z"/>',
  // prevención (silbato con su cordón)
  2: '<path d="M20.4 53.1C6.3 50.8 -1.7 39.4 3.5 29.1C4.0 28.1 4.4 26.9 4.4 26.4C4.4 25.6 6.8 21.1 8.2 19.4C9.2 18.2 10.5 17.4 11.5 17.4C11.9 17.4 13.0 16.9 13.8 16.4C15.4 15.4 15.4 15.4 16.6 15.9C17.3 16.1 17.9 16.5 18.0 16.7C18.0 16.9 17.3 17.8 16.3 18.8C15.3 19.8 14.5 20.7 14.5 20.9C14.5 21.0 14.1 22.5 13.5 24.1C12.6 26.7 12.3 27.2 10.9 28.6C9.4 30.0 9.3 30.2 9.3 31.7C9.2 36.5 12.2 39.6 18.3 41.0C22.3 41.9 23.6 42.4 23.7 43.1C23.8 43.8 24.0 43.8 25.4 43.4C27.6 42.8 31.2 44.6 32.2 47.0C33.2 49.2 32.3 51.1 29.7 52.4C27.6 53.5 24.1 53.7 20.4 53.1ZM26.5 48.6C27.9 47.4 26.6 46.6 20.9 45.3C12.7 43.3 9.9 41.8 8.0 38.5C6.9 36.6 6.3 36.0 5.7 36.4C4.2 37.7 7.5 42.7 11.6 45.4C14.5 47.3 18.0 48.5 21.6 49.0C24.8 49.4 25.6 49.4 26.5 48.6ZM41.4 44.6L37.2 40.5L34.0 41.7C30.7 42.9 30.7 42.9 29.9 42.3C28.9 41.6 28.9 41.6 30.1 40.3C32.1 38.0 33.5 33.8 33.5 30.0C33.6 26.3 31.8 21.6 29.6 19.3C28.4 18.0 28.1 18.0 27.5 18.9C27.1 19.6 27.1 19.7 28.2 20.9C28.8 21.6 29.6 22.7 29.9 23.4C32.6 29.0 31.2 37.6 27.1 40.2C26.1 40.9 26.1 40.9 23.5 40.2C22.0 39.9 20.4 39.4 19.8 39.3C19.3 39.1 18.5 38.9 18.1 38.8C16.6 38.5 14.2 33.8 13.5 29.8C13.4 28.8 13.5 28.5 14.1 27.6C14.5 27.0 15.2 25.2 15.8 23.6C16.7 20.9 17.0 20.4 18.5 18.9C20.0 17.3 20.2 17.1 19.9 16.5C19.7 16.0 19.7 15.7 20.0 15.2C20.8 14.1 19.1 12.6 17.4 13.0C17.0 13.1 16.3 13.3 15.9 13.3C15.5 13.4 14.6 13.8 13.8 14.3C12.0 15.4 11.6 15.4 12.0 14.4C13.1 11.5 16.8 9.7 19.4 10.7C20.4 11.0 22.1 12.5 22.7 13.5C23.4 14.5 23.3 14.5 26.5 13.3C29.0 12.3 29.4 12.2 32.2 12.2C37.9 12.2 39.1 13.1 51.9 25.8C61.9 35.8 61.9 35.8 61.8 36.9C61.6 37.9 59.6 42.4 59.4 42.2C59.4 42.2 59.5 41.2 59.7 40.0C59.9 38.9 60.0 37.9 60.0 37.8C59.8 37.6 50.5 40.1 50.3 40.4C50.1 40.8 49.2 46.0 49.3 46.1C49.4 46.2 51.6 45.5 54.1 44.6C60.6 42.2 60.8 42.6 54.5 45.4C52.8 46.2 51.0 47.0 50.5 47.2C48.0 48.3 46.9 48.7 46.2 48.7C45.7 48.7 44.5 47.8 41.4 44.6ZM41.9 23.2L46.1 21.5L45.1 20.4C42.6 17.5 41.6 16.6 41.3 16.6C40.9 16.6 32.7 19.8 32.5 20.0C32.3 20.3 36.7 24.9 37.2 24.9C37.4 24.9 39.5 24.2 41.9 23.2Z"/>',
  // rescate (tubo de rescate con su correa)
  3: '<path d="M20.5 59.5C13.9 58.5 9.0 56.3 4.6 52.3C2.9 50.8 2.1 49.4 2.0 47.9C1.9 46.4 2.2 45.7 3.4 45.1C3.8 44.8 4.4 44.3 4.7 43.8C5.8 42.0 6.8 41.4 7.5 42.1C8.0 42.6 8.0 42.8 7.2 43.7C6.4 44.6 6.3 45.0 6.9 45.8C7.5 46.5 7.5 47.3 7.1 47.7C6.7 48.1 7.3 49.0 8.5 49.6C11.8 51.1 15.3 51.2 20.8 49.9C25.5 48.8 27.2 48.6 30.0 48.7C32.8 48.8 34.7 49.4 35.9 50.6C36.7 51.4 36.7 51.4 36.6 54.0C36.5 56.7 36.5 56.7 35.5 57.6C33.2 59.6 26.8 60.4 20.5 59.5ZM30.4 55.0C33.1 54.5 34.1 53.9 32.5 53.6C29.0 52.9 19.5 53.7 20.5 54.7C21.0 55.2 28.0 55.4 30.4 55.0ZM9.2 47.0C9.2 46.7 9.0 46.2 8.7 45.9C7.9 45.2 7.9 44.8 8.8 43.8C9.7 42.8 9.6 42.5 8.4 41.3C6.8 39.7 6.4 39.8 4.4 41.9C3.2 43.3 2.8 43.6 2.6 43.4C2.3 42.9 2.3 43.0 2.7 41.5C3.4 38.7 6.5 33.4 8.9 30.8C11.3 28.3 19.9 21.0 20.6 21.0C20.7 21.0 21.0 21.2 21.2 21.5C21.4 21.7 21.8 21.9 22.0 21.9C22.2 21.9 22.6 22.1 22.8 22.2C23.1 22.5 22.9 22.7 20.3 24.4C18.8 25.4 17.4 26.4 17.3 26.6C17.0 27.6 17.5 28.6 18.6 28.9C19.1 29.0 19.7 28.7 21.7 27.4C23.1 26.5 24.4 25.6 24.7 25.3C25.3 24.7 25.7 24.9 27.2 26.9C29.2 29.7 30.3 31.6 30.2 32.5C30.2 34.7 30.4 34.5 27.2 36.1C23.8 37.8 23.4 38.3 24.2 39.5C25.0 40.4 25.7 40.3 28.8 38.9C32.6 37.0 32.6 37.0 32.4 37.9C32.3 38.4 32.2 38.9 32.2 39.2C32.2 40.2 24.4 44.2 18.5 46.1C15.8 47.0 13.5 47.5 11.1 47.5C9.3 47.5 9.2 47.5 9.2 47.0ZM34.0 38.0C34.2 36.5 34.2 36.5 33.0 35.4C31.8 34.3 31.8 34.3 31.9 33.2C32.1 32.1 32.0 31.9 31.4 30.7C30.1 28.3 27.5 24.9 25.7 23.2C25.5 22.9 24.7 22.2 24.1 21.5C23.4 20.8 22.7 20.3 22.3 20.2C20.8 19.9 21.4 19.3 25.2 17.0C26.4 16.3 27.6 15.8 27.8 15.8C29.8 15.8 34.9 21.1 38.3 26.9C38.8 27.7 39.6 28.8 40.0 29.3C40.8 30.3 40.9 30.4 41.1 32.4C41.2 33.7 41.1 34.6 41.0 34.9C40.6 35.5 34.9 39.5 34.3 39.5C33.9 39.5 33.9 39.3 34.0 38.0ZM42.7 31.4C42.7 30.3 42.7 30.3 45.2 28.6C48.2 26.7 48.7 26.1 48.2 25.2C48.1 24.8 47.6 24.4 47.3 24.2C46.7 23.9 46.6 23.9 44.0 25.6C42.5 26.6 41.1 27.4 40.9 27.5C40.7 27.6 40.1 26.9 39.0 25.2C38.1 23.8 36.6 21.8 35.7 20.8C34.8 19.7 34.1 18.8 34.1 18.7C34.1 18.5 38.0 16.2 39.6 15.4C40.6 15.0 41.4 14.5 41.5 14.3C41.8 13.6 41.6 12.8 41.2 12.3C40.7 11.9 39.5 11.7 39.3 12.1C39.2 12.2 34.5 14.3 32.5 15.1C32.2 15.2 32.0 15.5 31.9 15.8C31.8 16.0 31.6 16.2 31.5 16.2C31.2 16.2 29.8 14.8 29.8 14.6C29.8 14.4 34.2 11.5 36.6 10.2C46.9 4.4 58.7 2.3 61.3 5.9C63.6 9.2 59.6 16.6 50.6 25.8C48.2 28.1 43.3 32.4 42.9 32.4C42.9 32.4 42.8 31.9 42.7 31.4ZM58.5 10.4C59.6 8.7 59.1 7.5 57.3 7.5C55.4 7.5 55.2 7.9 56.2 9.4C57.5 11.5 57.8 11.6 58.5 10.4Z"/>',
  // primeros auxilios (botiquín)
  4: '<path d="M21 17V12a4 4 0 0 1 4-4h14a4 4 0 0 1 4 4v5h-5v-4H26v4Z"/><path fill-rule="evenodd" d="M13 19H51a7 7 0 0 1 7 7V50a7 7 0 0 1-7 7H13a7 7 0 0 1-7-7V26a7 7 0 0 1 7-7ZM28 27h8v7h7v8h-7v7h-8v-7h-7v-8h7Z"/>',
};

export function emblemaCurso(curso, iconoLinea) {
  const glifo = GLIFOS_MODULO[Number(curso?.modulo)];
  if (!glifo) return icono(iconoLinea);
  return `<svg class="glifo-modulo" viewBox="0 0 64 64" fill="currentColor" aria-hidden="true">${glifo}</svg>`;
}
