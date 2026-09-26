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

// Icono 3D de cada módulo (assets/modulos/). Los cursos sin módulo usan el icono de línea.
const MODULOS_CON_IMAGEN = [1, 2, 3, 4];

export function emblemaCurso(curso, iconoLinea) {
  const n = Number(curso?.modulo);
  if (!MODULOS_CON_IMAGEN.includes(n)) return icono(iconoLinea);
  return `<img class="emblema-3d" src="assets/modulos/modulo-${n}.webp" alt="" width="192" height="192" decoding="async">`;
}
