// Recorrido por los cuatro módulos en la portada: al bajar, las escenas del socorrista
// avanzan con el scroll (nada, vigila, rescata y hace una RCP) y a su lado aparece el
// módulo de cada una.
//
// Técnica: la misma que la intro (js/intro.js), fotogramas dibujados en un <canvas>. Un
// <video> movido con el scroll va a saltos en los móviles; las imágenes no.
//
// - Cada escena son FOTOGRAMAS imágenes (AVIF, o WebP si el navegador no tiene AVIF). No se
//   descarga nada hasta que el visitante se acerca a la sección. Primero llega el primer
//   fotograma de cada escena, luego uno de cada 8, de cada 4, de cada 2 y el resto, así que
//   se puede bajar enseguida: mientras falta alguno se dibuja el más cercano que ya está.
// - La sección mide ESCENAS pantallas de alto; su interior se queda fijo mientras se baja.
//   En el último tramo de cada escena se funde con la siguiente (el fondo es el mismo, así
//   que parece un solo plano).
// - Encuadre: en horizontal la imagen llena el hueco; en vertical ocupa la parte de arriba,
//   centrada en el socorrista de cada escena (ENFOQUE), y el texto va debajo.
// - Con «reducir movimiento» no hay vídeo: se ve una imagen fija de cada escena.
//
// Para cambiar las escenas: scripts/recorrido-fotogramas.sh (y subir la versión de RUTA).

const RUTA = 'assets/recorrido/v1'; // cambiar la versión al cambiar los fotogramas
const ESCENAS = 4;
const FOTOGRAMAS = 40; // por escena
const PROPORCION = 16 / 9;
const ENFOQUE = [0.47, 0.47, 0.47, 0.5]; // x del socorrista (0-1) en cada escena
const FUNDIDO = 0.16; // parte final de cada escena en la que se funde con la siguiente
const EN_PARALELO = 6;
const FIJO_REDUCIDO = 0.55; // con «reducir movimiento», qué fotograma de cada escena se enseña

export function montarRecorrido(raiz) {
  const lienzo = raiz.querySelector('.recorrido-lienzo');
  const ctx = lienzo.getContext('2d');
  const pasos = [...raiz.querySelectorAll('.recorrido-paso')];
  const barras = [...raiz.querySelectorAll('.recorrido-progreso span')];
  const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // imagenes[escena][fotograma]: la imagen ya decodificada, o undefined si aún no ha llegado.
  const imagenes = Array.from({ length: ESCENAS }, () => new Array(FOTOGRAMAS));
  let formato = 'avif';
  let ancho = 1080;
  let empezada = false;
  let pintando = false;
  let pasoActivo = -1;

  const archivo = (e, f) => `${RUTA}/${ancho}/${e + 1}-${String(f + 1).padStart(3, '0')}.${formato}`;

  function cargar(e, f) {
    return new Promise((resolver, rechazar) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => (img.decode ? img.decode().catch(() => {}) : Promise.resolve()).then(() => resolver(img));
      img.onerror = () => rechazar(new Error(archivo(e, f)));
      img.src = archivo(e, f);
    });
  }

  // Orden de carga: lo que antes hace falta para poder bajar sin huecos.
  function ordenDeCarga() {
    const orden = [];
    const visto = new Set();
    const anadir = (e, f) => {
      const clave = e * FOTOGRAMAS + f;
      if (!visto.has(clave)) { visto.add(clave); orden.push([e, f]); }
    };
    const soloUno = reducido ? Math.round(FIJO_REDUCIDO * (FOTOGRAMAS - 1)) : 0;
    for (let e = 0; e < ESCENAS; e++) anadir(e, soloUno);
    if (reducido) return orden;
    for (const paso of [8, 4, 2, 1]) {
      for (let e = 0; e < ESCENAS; e++) {
        for (let f = 0; f < FOTOGRAMAS; f += paso) anadir(e, f);
        anadir(e, FOTOGRAMAS - 1);
      }
    }
    return orden;
  }

  function empezarCarga() {
    if (empezada) return;
    empezada = true;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const conexion = navigator.connection;
    const lenta = conexion && (conexion.saveData || /2g|3g/.test(conexion.effectiveType ?? ''));
    ancho = lienzo.clientWidth * dpr > 1100 && !lenta ? 1440 : 960;

    const cola = ordenDeCarga();
    const pedir = () => {
      const siguiente = cola.shift();
      if (!siguiente || !raiz.isConnected) return;
      const [e, f] = siguiente;
      cargar(e, f)
        .then((img) => { imagenes[e][f] = img; pedirPintar(); })
        .catch(() => {})
        .finally(pedir);
    };
    // El primero decide el formato: si el AVIF no se puede ver, todo en WebP.
    const [e0, f0] = cola.shift();
    cargar(e0, f0)
      .catch(() => { formato = 'webp'; return cargar(e0, f0); })
      .then((img) => { imagenes[e0][f0] = img; pedirPintar(); })
      .catch(() => {})
      .finally(() => { for (let n = 0; n < EN_PARALELO; n++) pedir(); });
  }

  // El fotograma cargado más cercano al que toca (para no dejar huecos mientras llegan).
  function masCercano(e, f) {
    const lista = imagenes[e];
    for (let d = 0; d < FOTOGRAMAS; d++) {
      if (lista[f - d]) return lista[f - d];
      if (lista[f + d]) return lista[f + d];
    }
    return null;
  }

  // Avance del scroll dentro de la sección: 0 al empezar a quedarse fija, 1 al soltarse.
  function avance() {
    const caja = raiz.getBoundingClientRect();
    const fijo = raiz.querySelector('.recorrido-fijo');
    const recorrido = caja.height - fijo.offsetHeight;
    if (recorrido <= 0) return 0;
    const arriba = parseFloat(getComputedStyle(fijo).top) || 0;
    return Math.min(1, Math.max(0, (arriba - caja.top) / recorrido));
  }

  function medir() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(lienzo.clientWidth * dpr);
    const h = Math.round(lienzo.clientHeight * dpr);
    if (lienzo.width !== w || lienzo.height !== h) { lienzo.width = w; lienzo.height = h; }
  }

  // Dibuja la imagen cubriendo el lienzo, con el socorrista (enfoque) lo más centrado posible.
  function dibujar(img, enfoque, alfa) {
    if (!img) return;
    const W = lienzo.width;
    const H = lienzo.height;
    const escala = Math.max(W / img.naturalWidth, H / img.naturalHeight);
    const w = img.naturalWidth * escala;
    const h = img.naturalHeight * escala;
    const x = Math.min(0, Math.max(W - w, W / 2 - enfoque * w));
    ctx.globalAlpha = alfa;
    ctx.drawImage(img, x, (H - h) / 2, w, h);
    ctx.globalAlpha = 1;
  }

  function pintar() {
    pintando = false;
    if (!raiz.isConnected) { desmontar(); return; }
    medir();

    const pos = avance() * ESCENAS;
    const e = Math.min(ESCENAS - 1, Math.floor(pos));
    const t = pos - e; // 0-1 dentro de la escena
    const ultima = e === ESCENAS - 1;
    const tramoVideo = ultima ? 1 : 1 - FUNDIDO;
    const f = reducido
      ? Math.round(FIJO_REDUCIDO * (FOTOGRAMAS - 1))
      : Math.round(Math.min(1, t / tramoVideo) * (FOTOGRAMAS - 1));
    const mezcla = ultima ? 0 : Math.max(0, (t - tramoVideo) / FUNDIDO); // 0-1 hacia la siguiente
    const suave = mezcla * mezcla * (3 - 2 * mezcla);
    const enfoque = ENFOQUE[e] + (ultima ? 0 : (ENFOQUE[e + 1] - ENFOQUE[e]) * suave);

    const actual = masCercano(e, f);
    if (actual) dibujar(actual, enfoque, 1);
    if (suave > 0) dibujar(masCercano(e + 1, reducido ? f : 0), enfoque, suave);

    const paso = suave > 0.5 ? e + 1 : e;
    if (paso !== pasoActivo) {
      pasoActivo = paso;
      pasos.forEach((p, i) => p.classList.toggle('activo', i === paso));
    }
    barras.forEach((b, i) => {
      const lleno = Math.min(1, Math.max(0, pos - i));
      b.style.setProperty('--lleno', lleno.toFixed(3));
    });
  }

  function pedirPintar() {
    if (pintando) return;
    pintando = true;
    requestAnimationFrame(pintar);
  }

  // La sección se queda fija entre la cabecera y, en el móvil, la barra de abajo.
  function ajustarHueco() {
    const cabecera = document.querySelector('.cabecera');
    const nav = document.querySelector('.nav');
    const arriba = cabecera ? cabecera.offsetHeight : 0;
    const abajo = nav && getComputedStyle(nav).position === 'fixed' ? nav.offsetHeight : 0;
    raiz.style.setProperty('--recorrido-arriba', `${arriba}px`);
    raiz.style.setProperty('--recorrido-alto', `${innerHeight - arriba - abajo}px`);
    pedirPintar();
  }

  const observador = new IntersectionObserver((entradas) => {
    if (entradas.some((x) => x.isIntersecting)) empezarCarga();
  }, { rootMargin: '150% 0px' });

  function desmontar() {
    observador.disconnect();
    removeEventListener('scroll', pedirPintar);
    removeEventListener('resize', ajustarHueco);
  }

  observador.observe(raiz);
  addEventListener('scroll', pedirPintar, { passive: true });
  addEventListener('resize', ajustarHueco);
  ajustarHueco();
}
