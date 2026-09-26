// Recorrido por los cuatro módulos en la portada: un socorrista en la misma playa nada,
// vigila, rescata y hace una RCP, y al lado aparece cada módulo con su Temario y su Test.
//
// Se avanza de módulo en módulo: al acabar un gesto de scroll (rueda, trackpad o dedo) la
// página encaja enseguida en el módulo más cercano en esa dirección; si el gesto ha sido largo
// se avanzan varios o se sale de la sección. Al llegar, su escena se reproduce sola a velocidad
// real y se queda en el último fotograma. El vídeo no va pegado al scroll: así nunca se ve a
// cámara lenta cuando el scroll frena.
//
// Técnica: la misma que la intro (js/intro.js), fotogramas dibujados en un <canvas>; un
// <video> no siempre arranca solo en el móvil y las imágenes sí.
//
// - La sección mide ESCENAS + 1 pantallas de alto y su interior se queda fijo mientras se
//   baja; cada pantalla de recorrido es un módulo. Pasado el cuarto, la página sigue con
//   normalidad.
// - Cada escena son FOTOGRAMAS imágenes (AVIF, o WebP si el navegador no tiene AVIF). No se
//   descarga nada hasta acercarse a la sección. Primero llega el primer fotograma de cada
//   escena y después las escenas enteras, antes la del módulo en el que se está. Si falta
//   algún fotograma, se dibuja el más cercano que ya ha llegado.
// - Al cambiar de módulo, la escena anterior se funde con la nueva (el fondo es el mismo).
// - Encuadre: en horizontal la imagen llena el hueco; en vertical ocupa la parte de arriba,
//   centrada en el socorrista de cada escena (ENFOQUE), y el texto va debajo.
// - Con «reducir movimiento» no hay vídeo: una imagen fija de cada escena, sin deslizamientos.
//
// Para cambiar las escenas: scripts/recorrido-fotogramas.sh (y subir la versión de RUTA).

const RUTA = 'assets/recorrido/v2'; // cambiar la versión al cambiar los fotogramas
const ESCENAS = 4;
const FOTOGRAMAS = 40; // por escena
const DURACION = [5000, 5000, 2500, 5000]; // ms de cada escena (su duración real)
const ENFOQUE = [0.47, 0.47, 0.47, 0.5]; // x del socorrista (0-1) en cada escena
const FUNDIDO = 300; // ms del fundido entre escenas
const EN_PARALELO = 6;
const FIJO_REDUCIDO = 0.55; // con «reducir movimiento», qué fotograma de cada escena se enseña
const ESPERA_FIN_SCROLL = 140; // ms sin scroll para darlo por acabado (sin evento scrollend)
const DESLIZAMIENTO = 260; // ms que tarda en encajar en un módulo

export function montarRecorrido(raiz) {
  const fijo = raiz.querySelector('.recorrido-fijo');
  const lienzo = raiz.querySelector('.recorrido-lienzo');
  const ctx = lienzo.getContext('2d');
  const pasos = [...raiz.querySelectorAll('.recorrido-paso')];
  const barras = [...raiz.querySelectorAll('.recorrido-progreso span')];
  const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // imagenes[escena][fotograma]: la imagen ya decodificada, o undefined si aún no ha llegado.
  const imagenes = Array.from({ length: ESCENAS }, () => new Array(FOTOGRAMAS));
  let formato = 'avif';
  let ancho = 960;
  let cola = null; // fotogramas pendientes de pedir, en orden: [escena, fotograma]

  // Reproducción: la escena del módulo en el que se está y, durante el fundido, la anterior.
  let modulo = -1; // -1: aún no se ha llegado a la sección
  let escena = { n: 0, inicio: -Infinity }; // con inicio -Infinity se ve su primer fotograma
  let saliente = null; // { n, fotograma, enfoque } de la escena que se está yendo
  let inicioFundido = -Infinity;
  let animando = false;

  // Encaje: si hay un deslizamiento en curso (pedido por este código) y hacia dónde iba el
  // último scroll del usuario.
  let deslizando = false;
  let ultimoY = scrollY;
  let direccion = 0; // 1 si el último scroll del usuario bajaba, -1 si subía
  let tocando = false;
  let temporizador = 0;

  const archivo = (e, f) => `${RUTA}/${ancho}/${e + 1}-${String(f + 1).padStart(3, '0')}.${formato}`;

  // ---------- Carga ----------

  function cargar(e, f) {
    return new Promise((resolver, rechazar) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => (img.decode ? img.decode().catch(() => {}) : Promise.resolve()).then(() => resolver(img));
      img.onerror = () => rechazar(new Error(archivo(e, f)));
      img.src = archivo(e, f);
    });
  }

  function empezarCarga() {
    if (cola) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const conexion = navigator.connection;
    const lenta = conexion && (conexion.saveData || /2g|3g/.test(conexion.effectiveType ?? ''));
    ancho = lienzo.clientWidth * dpr > 1100 && !lenta ? 1440 : 960;

    const fijoReducido = Math.round(FIJO_REDUCIDO * (FOTOGRAMAS - 1));
    cola = [];
    for (let e = 0; e < ESCENAS; e++) cola.push([e, reducido ? fijoReducido : 0]);
    if (!reducido) {
      for (let e = 0; e < ESCENAS; e++) for (let f = 1; f < FOTOGRAMAS; f++) cola.push([e, f]);
    }
    adelantarEscena(Math.max(0, modulo));

    const pedir = () => {
      const siguiente = cola.shift();
      if (!siguiente || !raiz.isConnected) return;
      const [e, f] = siguiente;
      cargar(e, f)
        .then((img) => { imagenes[e][f] = img; pintar(); })
        .catch(() => {})
        .finally(pedir);
    };
    // El primero decide el formato: si el AVIF no se puede ver, todo en WebP.
    const [e0, f0] = cola.shift();
    cargar(e0, f0)
      .catch(() => { formato = 'webp'; return cargar(e0, f0); })
      .then((img) => { imagenes[e0][f0] = img; pintar(); })
      .catch(() => {})
      .finally(() => { for (let n = 0; n < EN_PARALELO; n++) pedir(); });
  }

  // Pasa delante en la cola los fotogramas de esa escena (la que se va a ver ya).
  function adelantarEscena(e) {
    if (!cola) return;
    const suyos = cola.filter(([x]) => x === e);
    cola = [...suyos, ...cola.filter(([x]) => x !== e)];
  }

  // ---------- Dibujo ----------

  function masCercano(e, f) {
    const lista = imagenes[e];
    for (let d = 0; d < FOTOGRAMAS; d++) {
      if (lista[f - d]) return lista[f - d];
      if (lista[f + d]) return lista[f + d];
    }
    return null;
  }

  function fotogramaDe(esc, ahora) {
    if (reducido) return Math.round(FIJO_REDUCIDO * (FOTOGRAMAS - 1));
    const t = (ahora - esc.inicio) / DURACION[esc.n];
    return Math.max(0, Math.min(FOTOGRAMAS - 1, Math.floor(t * FOTOGRAMAS)));
  }

  function medir() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(lienzo.clientWidth * dpr);
    const h = Math.round(lienzo.clientHeight * dpr);
    if (lienzo.width !== w || lienzo.height !== h) { lienzo.width = w; lienzo.height = h; }
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

  function pintar() {
    if (!raiz.isConnected) { desmontar(); return false; }
    medir();
    const ahora = performance.now();
    const f = fotogramaDe(escena, ahora);
    const t = reducido ? 1 : Math.min(1, (ahora - inicioFundido) / FUNDIDO);
    const mezcla = saliente ? t * t * (3 - 2 * t) : 1;
    const enfoque = saliente ? saliente.enfoque + (ENFOQUE[escena.n] - saliente.enfoque) * mezcla : ENFOQUE[escena.n];

    if (saliente && mezcla < 1) dibujar(masCercano(saliente.n, saliente.fotograma), enfoque, 1);
    dibujar(masCercano(escena.n, f), enfoque, mezcla);
    if (mezcla >= 1) saliente = null;

    barras.forEach((b, i) => {
      let lleno = 0;
      if (i < modulo) lleno = 1;
      else if (i === modulo) lleno = reducido ? 1 : Math.min(1, (ahora - escena.inicio) / DURACION[i]);
      b.style.setProperty('--lleno', lleno.toFixed(3));
    });
    // Sigue animando mientras la escena avanza o dura el fundido.
    return Boolean(saliente) || (!reducido && modulo >= 0 && ahora - escena.inicio < DURACION[escena.n]);
  }

  function animar() {
    if (animando) return;
    animando = true;
    const paso = () => {
      if (pintar()) requestAnimationFrame(paso);
      else animando = false;
    };
    requestAnimationFrame(paso);
  }

  // ---------- Módulos y scroll ----------

  // Medidas en píxeles de scroll: dónde empieza la sección fija y cuánto mide cada módulo.
  function geometria() {
    const arriba = parseFloat(getComputedStyle(fijo).top) || 0;
    const base = raiz.getBoundingClientRect().top + scrollY - arriba;
    return { base, alto: fijo.offsetHeight };
  }

  // Posición del scroll en módulos: 0 al empezar la sección, ESCENAS al soltarse.
  function posicion() {
    const { base, alto } = geometria();
    return alto > 0 ? (scrollY - base) / alto : 0;
  }

  function irAModulo(n) {
    if (n === modulo) return;
    const ahora = performance.now();
    if (modulo >= 0) {
      saliente = { n: escena.n, fotograma: fotogramaDe(escena, ahora), enfoque: ENFOQUE[escena.n] };
      inicioFundido = ahora;
    }
    modulo = n;
    escena = { n, inicio: ahora };
    adelantarEscena(n);
    pasos.forEach((p, i) => p.classList.toggle('activo', i === n));
    animar();
  }

  function alHacerScroll() {
    if (!raiz.isConnected) { desmontar(); return; }
    if (!deslizando && scrollY !== ultimoY) direccion = Math.sign(scrollY - ultimoY);
    ultimoY = scrollY;
    const pos = posicion();
    // El primer módulo arranca cuando la sección ya está casi entera a la vista. Mientras se
    // desliza hasta un módulo, ese módulo ya está puesto (se cambió al decidir el destino).
    if (pos > -0.35 && !deslizando) irAModulo(Math.max(0, Math.min(ESCENAS - 1, Math.floor(pos + 0.002))));
    if (!('onscrollend' in window)) {
      clearTimeout(temporizador);
      temporizador = setTimeout(alAcabarScroll, ESPERA_FIN_SCROLL);
    }
  }

  // Al acabar un gesto dentro de la sección, encaja en el módulo más cercano en la dirección
  // en la que se iba: si se baja rápido, se avanza todo lo que haya llevado el gesto (o se
  // sale de la sección), sin frenar a nadie.
  function alAcabarScroll() {
    if (!raiz.isConnected || tocando || deslizando) return;
    const pos = posicion();
    // Fuera de la sección el scroll es libre, salvo al llegar desde arriba: se encaja en el
    // primer módulo si ya se ve casi entero.
    const entrando = pos > -0.5 && pos < 0 && direccion > 0;
    if ((pos <= 0.002 && !entrando) || pos >= ESCENAS - 0.002) return;
    if (Math.abs(pos - Math.round(pos)) < 0.003) return;
    const destino = Math.max(0, Math.min(ESCENAS, direccion > 0 ? Math.ceil(pos) : Math.floor(pos)));
    irAModulo(Math.min(ESCENAS - 1, destino)); // la escena empieza ya, mientras se desliza
    deslizarA(destino);
  }

  // Desliza hasta el módulo n (ESCENAS: donde se suelta la sección). Animación propia y corta
  // (la del navegador es más lenta); se corta en cuanto se vuelve a tocar o a hacer scroll.
  function deslizarA(n) {
    const { base, alto } = geometria();
    const y0 = scrollY;
    const y1 = Math.round(base + n * alto);
    const fin = () => { deslizando = false; ultimoY = scrollY; };
    if (reducido) { scrollTo(0, y1); fin(); return; }
    deslizando = true;
    const t0 = performance.now();
    const paso = (ahora) => {
      if (!deslizando) return; // cortado por el usuario
      const k = Math.min(1, (ahora - t0) / DESLIZAMIENTO);
      scrollTo(0, y0 + (y1 - y0) * (1 - (1 - k) ** 3));
      if (k < 1) requestAnimationFrame(paso);
      else fin();
    };
    requestAnimationFrame(paso);
  }

  // Un gesto nuevo corta el deslizamiento en curso: manda el usuario.
  const alIntervenir = () => {
    if (!deslizando) return;
    deslizando = false;
    ultimoY = scrollY;
  };

  // La sección se queda fija entre la cabecera y, en el móvil, la barra de abajo.
  function ajustarHueco() {
    const cabecera = document.querySelector('.cabecera');
    const nav = document.querySelector('.nav');
    const arriba = cabecera ? cabecera.offsetHeight : 0;
    const abajo = nav && getComputedStyle(nav).position === 'fixed' ? nav.offsetHeight : 0;
    raiz.style.setProperty('--recorrido-arriba', `${arriba}px`);
    raiz.style.setProperty('--recorrido-alto', `${innerHeight - arriba - abajo}px`);
    pintar();
  }

  const alTocar = () => { tocando = true; alIntervenir(); };
  const alSoltar = () => {
    tocando = false;
    if (!('onscrollend' in window)) {
      clearTimeout(temporizador);
      temporizador = setTimeout(alAcabarScroll, ESPERA_FIN_SCROLL);
    }
  };

  const observador = new IntersectionObserver((entradas) => {
    if (entradas.some((x) => x.isIntersecting)) empezarCarga();
  }, { rootMargin: '150% 0px' });

  function desmontar() {
    observador.disconnect();
    clearTimeout(temporizador);
    removeEventListener('scroll', alHacerScroll);
    removeEventListener('scrollend', alAcabarScroll);
    removeEventListener('resize', ajustarHueco);
    removeEventListener('touchstart', alTocar);
    removeEventListener('touchend', alSoltar);
    removeEventListener('touchcancel', alSoltar);
    removeEventListener('wheel', alIntervenir);
    removeEventListener('keydown', alIntervenir);
  }

  pasos[0]?.classList.add('activo');
  observador.observe(raiz);
  addEventListener('scroll', alHacerScroll, { passive: true });
  addEventListener('scrollend', alAcabarScroll);
  addEventListener('resize', ajustarHueco);
  addEventListener('touchstart', alTocar, { passive: true });
  addEventListener('touchend', alSoltar, { passive: true });
  addEventListener('touchcancel', alSoltar, { passive: true });
  addEventListener('wheel', alIntervenir, { passive: true });
  addEventListener('keydown', alIntervenir);
  ajustarHueco();
  alHacerScroll();
}
