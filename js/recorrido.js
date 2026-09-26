// Recorrido por los cuatro módulos en la portada: al bajar, las escenas del socorrista
// avanzan con el scroll (nada, vigila, rescata y hace una RCP) y a su lado aparece el
// módulo de cada una, con sus recuadros de Temario y Test.
//
// Técnica: la misma que la intro (js/intro.js), fotogramas dibujados en un <canvas>. Un
// <video> movido con el scroll va a saltos en los móviles; las imágenes no.
//
// - Cada escena son FOTOGRAMAS[e] imágenes, 20 por segundo de vídeo (AVIF, o WebP si el
//   navegador no tiene AVIF). No se descarga nada hasta que el visitante se acerca a la
//   sección. Primero llega el primer fotograma de cada escena, luego uno de cada 8, de cada 4,
//   de cada 2 y el resto, así que se puede bajar enseguida: mientras falta alguno se dibuja
//   el más cercano que ya está.
// - Fluidez: cuando el scroll cae entre dos fotogramas se dibuja la mezcla de los dos (así no
//   se ven saltos aunque se baje muy despacio), y el vídeo sigue al scroll con una inercia muy
//   corta (SUAVIZADO), para que un golpe de rueda no sea un salto brusco.
// - La sección mide ESCENAS + 1 pantallas de alto; su interior se queda fijo mientras se baja.
//   En el último tramo de cada escena se funde con la siguiente (el fondo es el mismo, así
//   que parece un solo plano).
// - Encuadre: en horizontal la imagen llena el hueco; en vertical ocupa la parte de arriba,
//   centrada en el socorrista de cada escena (ENFOQUE), y el texto va debajo.
// - Con «reducir movimiento» no hay vídeo: se ve una imagen fija de cada escena.
//
// Para cambiar las escenas: scripts/recorrido-fotogramas.sh (y subir la versión de RUTA).

const RUTA = 'assets/recorrido/v3'; // cambiar la versión al cambiar los fotogramas
const ESCENAS = 4;
const FOTOGRAMAS = [100, 100, 50, 100]; // por escena (20 por segundo; la 3 dura 2,5 s)
const ENFOQUE = [0.47, 0.47, 0.47, 0.5]; // x del socorrista (0-1) en cada escena
const FUNDIDO = 0.16; // parte final de cada escena en la que se funde con la siguiente
const SUAVIZADO = 90; // ms: cuánto tarda el vídeo en alcanzar al scroll (más, más inercia)
const EN_PARALELO = 6;
const FIJO_REDUCIDO = 0.55; // con «reducir movimiento», qué parte de cada escena se enseña

export function montarRecorrido(raiz) {
  const fijo = raiz.querySelector('.recorrido-fijo');
  const lienzo = raiz.querySelector('.recorrido-lienzo');
  const ctx = lienzo.getContext('2d');
  const pasos = [...raiz.querySelectorAll('.recorrido-paso')];
  const barras = [...raiz.querySelectorAll('.recorrido-progreso span')];
  const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // imagenes[escena][fotograma]: la imagen ya decodificada, o undefined si aún no ha llegado.
  const imagenes = FOTOGRAMAS.map((n) => new Array(n));
  let formato = 'avif';
  let ancho = 960;
  let empezada = false;
  let pasoActivo = -1;
  let mostrado = null; // posición (en escenas) que se está enseñando; persigue al scroll
  let ultimoCuadro = 0;
  let animando = false;
  let pintado = null; // posición que hay dibujada en el lienzo
  let sucio = true; // hay que volver a dibujar aunque la posición sea la misma (llegó una imagen…)

  const archivo = (e, f) => `${RUTA}/${ancho}/${e + 1}-${String(f + 1).padStart(3, '0')}.${formato}`;
  const fijoReducido = (e) => Math.round(FIJO_REDUCIDO * (FOTOGRAMAS[e] - 1));

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
      const clave = `${e}-${f}`;
      if (!visto.has(clave)) { visto.add(clave); orden.push([e, f]); }
    };
    for (let e = 0; e < ESCENAS; e++) anadir(e, reducido ? fijoReducido(e) : 0);
    if (reducido) return orden;
    for (const paso of [8, 4, 2, 1]) {
      for (let e = 0; e < ESCENAS; e++) {
        for (let f = 0; f < FOTOGRAMAS[e]; f += paso) anadir(e, f);
        anadir(e, FOTOGRAMAS[e] - 1);
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
        .then((img) => { imagenes[e][f] = img; sucio = true; pedirPintar(); })
        .catch(() => {})
        .finally(pedir);
    };
    // El primero decide el formato: si el AVIF no se puede ver, todo en WebP.
    const [e0, f0] = cola.shift();
    cargar(e0, f0)
      .catch(() => { formato = 'webp'; return cargar(e0, f0); })
      .then((img) => { imagenes[e0][f0] = img; sucio = true; pedirPintar(); })
      .catch(() => {})
      .finally(() => { for (let n = 0; n < EN_PARALELO; n++) pedir(); });
  }

  // El fotograma cargado más cercano al que toca (para no dejar huecos mientras llegan).
  function masCercano(e, f) {
    const lista = imagenes[e];
    for (let d = 0; d < lista.length; d++) {
      if (lista[f - d]) return lista[f - d];
      if (lista[f + d]) return lista[f + d];
    }
    return null;
  }

  // Posición del scroll en escenas: 0 al empezar a quedarse fija la sección, ESCENAS al soltarse.
  function objetivo() {
    const caja = raiz.getBoundingClientRect();
    const recorrido = caja.height - fijo.offsetHeight;
    if (recorrido <= 0) return 0;
    const arriba = parseFloat(getComputedStyle(fijo).top) || 0;
    return Math.min(1, Math.max(0, (arriba - caja.top) / recorrido)) * ESCENAS;
  }

  // Resolución del lienzo: la de la pantalla, pero nunca más que la de los fotogramas (dibujar
  // más píxeles de los que tiene la imagen no la hace más nítida y cuesta mucho más).
  function medir() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    // Píxeles de fotograma por píxel de pantalla con el encuadre «cubrir» (16:9).
    const cw = Math.max(1, lienzo.clientWidth);
    const ch = Math.max(1, lienzo.clientHeight);
    const densidad = 1 / Math.max(cw / ancho, ch / (ancho * 9 / 16));
    const escala = Math.max(1, Math.min(dpr, densidad));
    const w = Math.round(lienzo.clientWidth * escala);
    const h = Math.round(lienzo.clientHeight * escala);
    if (lienzo.width !== w || lienzo.height !== h) { lienzo.width = w; lienzo.height = h; sucio = true; }
  }

  // Dibuja la imagen cubriendo el lienzo, con el socorrista (enfoque) lo más centrado posible.
  function dibujar(img, enfoque, alfa) {
    if (!img || alfa <= 0) return;
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

  // Dibuja el momento t (0-1) de la escena e, mezclando los dos fotogramas entre los que cae.
  function dibujarMomento(e, t, enfoque, alfa) {
    const n = FOTOGRAMAS[e];
    const exacto = reducido ? fijoReducido(e) : t * (n - 1);
    const f = Math.floor(exacto);
    const resto = exacto - f;
    dibujar(masCercano(e, f), enfoque, alfa);
    if (resto > 0.02 && imagenes[e][f + 1]) dibujar(imagenes[e][f + 1], enfoque, alfa * resto);
  }

  function pintar(pos) {
    medir();
    pos = Math.min(ESCENAS, Math.max(0, pos));
    const e = Math.min(ESCENAS - 1, Math.floor(pos));
    const t = pos - e; // 0-1 dentro de la escena
    const ultima = e === ESCENAS - 1;
    const tramoVideo = ultima ? 1 : 1 - FUNDIDO;
    const mezcla = ultima ? 0 : Math.max(0, (t - tramoVideo) / FUNDIDO); // 0-1 hacia la siguiente
    const suave = mezcla * mezcla * (3 - 2 * mezcla);
    const enfoque = ENFOQUE[e] + (ultima ? 0 : (ENFOQUE[e + 1] - ENFOQUE[e]) * suave);

    dibujarMomento(e, Math.min(1, t / tramoVideo), enfoque, 1);
    if (suave > 0) dibujarMomento(e + 1, 0, enfoque, suave);

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

  // Cada cuadro, la posición enseñada se acerca a la del scroll; se para al alcanzarla.
  function cuadro(ahora) {
    if (!raiz.isConnected) { animando = false; desmontar(); return; }
    const meta = objetivo();
    const dt = Math.max(0, Math.min(64, ahora - ultimoCuadro));
    ultimoCuadro = ahora;
    if (mostrado === null || reducido) mostrado = meta;
    else mostrado += (meta - mostrado) * (1 - Math.exp(-dt / SUAVIZADO));
    if (Math.abs(meta - mostrado) < 0.0005) mostrado = meta;
    // Solo se dibuja si la sección está a la vista y algo ha cambiado.
    const caja = raiz.getBoundingClientRect();
    if (caja.bottom > 0 && caja.top < innerHeight && (sucio || mostrado !== pintado)) {
      pintar(mostrado);
      pintado = mostrado;
      sucio = false;
    }
    if (mostrado !== meta) requestAnimationFrame(cuadro);
    else animando = false;
  }

  function pedirPintar() {
    if (animando) return;
    animando = true;
    ultimoCuadro = performance.now();
    requestAnimationFrame(cuadro);
  }

  // La sección se queda fija entre la cabecera y, en el móvil, la barra de abajo.
  function ajustarHueco() {
    const cabecera = document.querySelector('.cabecera');
    const nav = document.querySelector('.nav');
    const arriba = cabecera ? cabecera.offsetHeight : 0;
    const abajo = nav && getComputedStyle(nav).position === 'fixed' ? nav.offsetHeight : 0;
    raiz.style.setProperty('--recorrido-arriba', `${arriba}px`);
    raiz.style.setProperty('--recorrido-alto', `${innerHeight - arriba - abajo}px`);
    sucio = true;
    pedirPintar();
  }

  // Lleva al módulo n (0-3): baja hasta la mitad de su escena, con el texto y sus recuadros.
  function irA(n) {
    const caja = raiz.getBoundingClientRect();
    const arriba = parseFloat(getComputedStyle(fijo).top) || 0;
    const recorrido = caja.height - fijo.offsetHeight;
    const y = caja.top + scrollY - arriba + recorrido * ((n + 0.45 * (1 - FUNDIDO)) / ESCENAS);
    scrollTo({ top: Math.round(y), behavior: reducido ? 'auto' : 'smooth' });
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
  return { irA };
}
