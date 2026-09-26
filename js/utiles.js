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
  // prevención (silbato)
  2: '<g transform="translate(0 3)"><path fill-rule="evenodd" d="M24 22H55a3 3 0 0 1 3 3V32a3 3 0 0 1-3 3H37.96A14 14 0 1 1 24 22ZM34 26h7v4h-7ZM24 31.5a4.5 4.5 0 1 0 0.01 0Z"/><circle cx="13" cy="22" r="4.2" fill="none" stroke="currentColor" stroke-width="3"/></g>',
  // rescate (tubo de rescate)
  3: '<g transform="rotate(-35 32 32)"><path fill-rule="evenodd" d="M8 32C8 27 14 24 24 24H31.5V40H24C14 40 8 37 8 32ZM17 27.2h12v2.2h-12ZM17 34.6h12v2.2h-12Z"/><path fill-rule="evenodd" d="M40.5 24H51a8 8 0 0 1 0 16H40.5ZM43 27.2h6v2.2h-6ZM43 34.6h6v2.2h-6ZM54.5 32a1.8 1.8 0 1 0 0.01 0Z"/><rect x="33.5" y="21" width="5" height="22" rx="1.5"/></g><path fill="none" stroke="currentColor" stroke-width="2.8" stroke-linejoin="round" d="M11.5 46.5C7 50 6 57.5 13 57.5H31C35.5 57.5 35.5 52 31 52H19C15.5 52 13.5 50 11.5 46.5Z"/>',
  // primeros auxilios (botiquín)
  4: '<path d="M21 17V12a4 4 0 0 1 4-4h14a4 4 0 0 1 4 4v5h-5v-4H26v4Z"/><path fill-rule="evenodd" d="M13 19H51a7 7 0 0 1 7 7V50a7 7 0 0 1-7 7H13a7 7 0 0 1-7-7V26a7 7 0 0 1 7-7ZM28 27h8v7h7v8h-7v7h-8v-7h-7v-8h7Z"/>',
};

export function emblemaCurso(curso, iconoLinea) {
  const glifo = GLIFOS_MODULO[Number(curso?.modulo)];
  if (!glifo) return icono(iconoLinea);
  return `<svg class="glifo-modulo" viewBox="0 0 64 64" fill="currentColor" aria-hidden="true">${glifo}</svg>`;
}
