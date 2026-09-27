// Recorrido por los cuatro módulos en la portada: un socorrista en la misma playa nada,
// vigila, rescata y hace una RCP, y a su lado aparece cada módulo con su Temario y su Test.
//
// Se va de módulo en módulo:
// - Al llegar a la sección, la página se coloca justo en el primer módulo (si se baja de
//   golpe, se para ahí; si se deja casi entera a la vista, termina de colocarse sola) y se
//   ve el principio de su escena.
// - Cada gesto hacia abajo (rueda, trackpad, dedo o teclado) reproduce la escena entera, un
//   pelín más rápida que el vídeo (VELOCIDAD), y termina en el principio de la siguiente, ya
//   con su módulo. Mientras se reproduce no se mueve nada; para seguir hace falta otro gesto
//   (la inercia del anterior no cuenta).
// - En el cuarto, al acabar su escena, la página sigue con normalidad.
// - Hacia arriba el scroll es libre: se vuelve de módulo en módulo (se ve el principio de
//   cada uno) y, desde el primero, se sale por arriba.
// La parte fija de la sección no se mueve con el scroll, así que la página puede quedarse en
// cada módulo sin que se note: solo cambian la escena y el texto. Los gestos solo se
// interceptan mientras se está dentro de la sección; fuera, el scroll es el del navegador.
//
// Técnica: la misma que la intro (js/intro.js), fotogramas dibujados en un <canvas>; un
// <video> no siempre arranca solo en el móvil y las imágenes sí.
// - Cada escena son FOTOGRAMAS[e] imágenes, 20 por segundo de vídeo (AVIF, o WebP si el
//   navegador no tiene AVIF). No se descarga nada hasta acercarse a la sección. Primero llega
//   el principio de cada escena y luego el resto (uno de cada 8, 4, 2…), antes la del módulo
//   en el que se está; si falta alguno se dibuja el más cercano que ya ha llegado.
// - El avance lo marca el reloj (dura siempre lo mismo aunque el móvil vaya justo) y entre
//   dos fotogramas se dibuja la mezcla de ambos, así que se ve fluido. Al final, la escena se
//   funde con el principio de la siguiente (el fondo es el mismo: parece un solo plano).
// - Encuadre: en horizontal la imagen llena el hueco; en vertical ocupa la parte de arriba,
//   centrada en el socorrista de cada escena (ENFOQUE), y el texto va debajo.
// - Con «reducir movimiento» no hay vídeo ni se interceptan gestos: una imagen fija de cada
//   escena, que cambia con el scroll.
//
// Para cambiar las escenas: scripts/recorrido-fotogramas.sh (y subir la versión de RUTA).

const RUTA = 'assets/recorrido/v3'; // cambiar la versión al cambiar los fotogramas
const ESCENAS = 4;
const FOTOGRAMAS = [100, 100, 50, 100]; // por escena (20 por segundo; la 3 dura 2,5 s)
const FPS = 20;
const VELOCIDAD = 1.25; // la escena va un pelín más rápida que el vídeo (5 s → 4 s)
const ENFOQUE = [0.47, 0.47, 0.47, 0.5]; // x del socorrista (0-1) en cada escena
const FUNDIDO = 450; // ms del fundido entre escenas
const SOLAPE = 200; // ms antes del final de la escena en los que empieza a fundirse
const EN_PARALELO = 6;
const FIJO_REDUCIDO = 0.55; // con «reducir movimiento», qué parte de cada escena se enseña
const PAUSA_GESTO = 200; // ms sin rueda para que lo siguiente cuente como un gesto nuevo
const UMBRAL_DEDO = 10; // px que hay que subir el dedo para avanzar
const RETENCION = 1500; // ms, como mucho, que se frena la inercia al llegar a la sección
const QUIETO = 160; // ms sin scroll para darlo por acabado (si no hay evento scrollend)
const COLOCACION = 380; // ms que tarda en colocarse la sección al llegar
const COLOCAR_DESDE = 0.3; // si se para a menos de esta parte de pantalla de su sitio, se coloca

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
  let cola = null; // fotogramas pendientes de pedir, en orden: [escena, fotograma]

  // Dónde se está: 'arriba' (antes de la sección), 'dentro' o 'abajo' (ya pasada).
  let fase = 'arriba';
  let modulo = 0; // el módulo en el que se está (o al que se va)
  let completados = 0; // barras de progreso llenas
  let vista = { e: 0, t: 0 }; // lo que se enseña en reposo: escena y momento (0-1)
  let fundido = null; // { desde, t0 }: cambio de vista en curso
  let reproduccion = null; // { n, t0, dur }: escena que se está reproduciendo
  let retencion = null; // { hasta, ultimo }: al llegar de golpe, la página no pasa del módulo
  let pendiente = null; // módulo al que lleva irA mientras la página baja hasta la sección
  let libreHasta = 0; // hasta cuándo el scroll manda (barra de scroll, Inicio/Fin)
  let deslizando = false;
  let escuchando = false;
  let ultimoY = scrollY;
  let direccion = 0;
  let ultimaRueda = -Infinity;
  let signoRueda = 0;
  let gastado = false; // el gesto de rueda en curso ya ha hecho algo
  let dedo = null; // gesto táctil en curso: { y, decidido, usado }
  let tocando = false;
  let temporizador = 0;
  let animando = false;
  let visible = false;
  let sucio = true;
  let pintado = '';
  let pasoActivo = -1;
  const llenas = barras.map(() => -1);

  const archivo = (e, f) => `${RUTA}/${ancho}/${e + 1}-${String(f + 1).padStart(3, '0')}.${formato}`;
  const fijoReducido = (e) => Math.round(FIJO_REDUCIDO * (FOTOGRAMAS[e] - 1));

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

  // Orden de carga: lo que antes hace falta para que no haya huecos.
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

  // Pasa delante en la cola lo que falta de esa escena (la que se va a ver ya), detrás solo
  // del principio de cada escena (poco y hace falta para los fundidos).
  function adelantarEscena(e) {
    if (!cola || reducido || e < 0 || e >= ESCENAS) return;
    const antes = cola.filter(([x, f]) => f === 0 || x === e);
    cola = [...antes.filter(([, f]) => f === 0), ...antes.filter(([, f]) => f !== 0), ...cola.filter(([x, f]) => f !== 0 && x !== e)];
  }

  function empezarCarga() {
    if (cola) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const conexion = navigator.connection;
    const lenta = conexion && (conexion.saveData || /2g|3g/.test(conexion.effectiveType ?? ''));
    ancho = lienzo.clientWidth * dpr > 1100 && !lenta ? 1440 : 960;

    cola = ordenDeCarga();
    const [e0, f0] = cola.shift();
    adelantarEscena(vista.e);
    const llega = (e, f) => (img) => { imagenes[e][f] = img; sucio = true; animar(); };
    const pedir = () => {
      const siguiente = cola.shift();
      if (!siguiente || !raiz.isConnected) return;
      const [e, f] = siguiente;
      cargar(e, f).then(llega(e, f)).catch(() => {}).finally(pedir);
    };
    // El primero decide el formato: si el AVIF no se puede ver, todo en WebP.
    cargar(e0, f0)
      .catch(() => { formato = 'webp'; return cargar(e0, f0); })
      .then(llega(e0, f0))
      .catch(() => {})
      .finally(() => { for (let n = 0; n < EN_PARALELO; n++) pedir(); });
  }

  // ---------- Dibujo ----------

  // El fotograma cargado más cercano al que toca (para no dejar huecos mientras llegan).
  function masCercano(e, f) {
    const lista = imagenes[e];
    for (let d = 0; d < lista.length; d++) {
      if (lista[f - d]) return lista[f - d];
      if (lista[f + d]) return lista[f + d];
    }
    return null;
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

  const progresoFundido = (ahora) => (fundido ? Math.min(1, (ahora - fundido.t0) / FUNDIDO) : 1);

  // Lo que toca enseñar ahora: una escena (a) en un momento y, fundiéndose encima, otra (b).
  function momento(ahora) {
    if (reproduccion) {
      const { n, t0, dur } = reproduccion;
      const pasado = ahora - t0;
      const t = Math.min(1, pasado / dur);
      const ultima = n === ESCENAS - 1;
      const mezcla = ultima ? 0 : Math.min(1, Math.max(0, (pasado - dur + SOLAPE) / FUNDIDO));
      return { a: { e: n, t }, b: ultima ? null : { e: n + 1, t: 0 }, mezcla, acabada: ultima ? t >= 1 : mezcla >= 1 };
    }
    const k = progresoFundido(ahora);
    if (k < 1) return { a: fundido.desde, b: vista, mezcla: k };
    fundido = null;
    return { a: vista, b: null, mezcla: 0 };
  }

  function pintar(ahora) {
    const m = momento(ahora);
    const suave = m.mezcla * m.mezcla * (3 - 2 * m.mezcla);
    // Solo se dibuja si la sección está a la vista y algo ha cambiado.
    if (visible) {
      medir();
      const clave = `${m.a.e} ${m.a.t.toFixed(4)} ${m.b?.e} ${m.b?.t} ${suave.toFixed(3)}`;
      if (sucio || clave !== pintado) {
        const enfoque = m.b ? ENFOQUE[m.a.e] + (ENFOQUE[m.b.e] - ENFOQUE[m.a.e]) * suave : ENFOQUE[m.a.e];
        dibujarMomento(m.a.e, m.a.t, enfoque, 1);
        if (m.b && suave > 0) dibujarMomento(m.b.e, m.b.t, enfoque, suave);
        pintado = clave;
        sucio = false;
      }
    }
    const activo = m.b && m.mezcla > 0.5 ? m.b.e : m.a.e;
    if (activo !== pasoActivo) {
      pasoActivo = activo;
      pasos.forEach((p, i) => p.classList.toggle('activo', i === activo));
    }
    barras.forEach((b, i) => {
      const lleno = i < completados ? 1 : reproduccion && i === reproduccion.n ? Math.round(m.a.t * 1000) / 1000 : 0;
      if (llenas[i] !== lleno) { llenas[i] = lleno; b.style.setProperty('--lleno', String(lleno)); }
    });
    return m;
  }

  function cuadro(ahora) {
    if (!raiz.isConnected) { animando = false; desmontar(); return; }
    const m = pintar(ahora);
    if (reproduccion && m.acabada) terminarReproduccion();
    if (reproduccion || fundido) requestAnimationFrame(cuadro);
    else animando = false;
  }

  function animar() {
    if (animando) return;
    animando = true;
    requestAnimationFrame(cuadro);
  }

  // Cambia lo que se enseña en reposo, fundiéndolo con lo que se veía.
  function mostrar(e, t = 0) {
    if (vista.e === e && vista.t === t) { animar(); return; }
    const ahora = performance.now();
    if (!reducido) fundido = { desde: fundido && progresoFundido(ahora) < 0.5 ? fundido.desde : vista, t0: ahora };
    vista = { e, t };
    adelantarEscena(e);
    animar();
  }

  // ---------- Reproducción ----------

  function reproducir() {
    if (reproduccion || reducido) return;
    const n = modulo;
    fundido = null;
    vista = { e: n, t: 0 };
    reproduccion = { n, t0: performance.now(), dur: (FOTOGRAMAS[n] / FPS) * 1000 / VELOCIDAD };
    adelantarEscena(n);
    animar();
  }

  // Al acabar, se queda en el principio del módulo siguiente; tras el último, se suelta.
  function terminarReproduccion() {
    const { n } = reproduccion;
    reproduccion = null;
    if (n < ESCENAS - 1) {
      modulo = n + 1;
      completados = modulo;
      vista = { e: modulo, t: 0 };
      adelantarEscena(modulo);
      fijar(modulo);
    } else {
      completados = ESCENAS;
      vista = { e: n, t: 1 };
      fijar(ESCENAS);
      salir('abajo');
    }
  }

  // ---------- Posición de la página ----------

  // Medidas en px de scroll: dónde se queda fija la sección (módulo 0) y cuánto va de un
  // módulo a otro. En ESCENAS se suelta.
  function geometria() {
    const arriba = parseFloat(getComputedStyle(fijo).top) || 0;
    const base = raiz.getBoundingClientRect().top + scrollY - arriba;
    return { base, paso: Math.max(1, (raiz.offsetHeight - fijo.offsetHeight) / ESCENAS) };
  }
  const posicionDe = (n, g = geometria()) => Math.round(g.base + n * g.paso);
  const posicion = (g = geometria()) => (scrollY - g.base) / g.paso;

  // Deja la página en el módulo n (no se nota: la parte fija no se mueve).
  function fijar(n) {
    const y = posicionDe(n);
    if (Math.abs(scrollY - y) > 1) scrollTo({ top: y, behavior: 'instant' });
    ultimoY = scrollY;
  }

  function retenida(ahora) {
    if (retencion && (ahora > retencion.hasta || ahora - retencion.ultimo > QUIETO)) retencion = null;
    return Boolean(retencion);
  }

  function entrar(n, retener) {
    fase = 'dentro';
    modulo = n;
    completados = n;
    pendiente = null;
    const ahora = performance.now();
    retencion = retener ? { hasta: ahora + RETENCION, ultimo: ahora } : null;
    // El gesto que ha traído hasta aquí ya ha hecho lo suyo: para avanzar hace falta otro.
    gastado = true;
    ultimaRueda = ahora;
    if (dedo) dedo.usado = true;
    mostrar(n);
    fijar(n);
    escuchar(true);
  }

  function salir(lado) {
    fase = lado;
    retencion = null;
    escuchar(false);
    if (lado === 'arriba') {
      modulo = 0;
      completados = 0;
      mostrar(0);
    } else {
      modulo = ESCENAS - 1;
      completados = ESCENAS;
      animar();
    }
  }

  // Con el scroll libre (hacia arriba, barra de scroll…), el módulo es el de la posición.
  function seguir(pos) {
    if (pos < -0.01) { salir('arriba'); return; }
    if (pos > ESCENAS + 0.01) { salir('abajo'); return; }
    const n = Math.min(ESCENAS - 1, Math.max(0, Math.floor(pos + 0.01)));
    if (n !== modulo) {
      modulo = n;
      completados = n;
      mostrar(n);
    }
  }

  function alHacerScroll() {
    if (!raiz.isConnected) { desmontar(); return; }
    const y = scrollY;
    if (y !== ultimoY) direccion = Math.sign(y - ultimoY);
    ultimoY = y;
    if (!('onscrollend' in window)) {
      clearTimeout(temporizador);
      temporizador = setTimeout(alAcabarScroll, QUIETO);
    }
    if (deslizando) return;
    const pos = posicion();
    const ahora = performance.now();

    if (reducido) {
      const n = Math.min(ESCENAS - 1, Math.max(0, Math.floor(pos + 0.01)));
      if (n !== vista.e) { modulo = n; completados = n; vista = { e: n, t: 0 }; sucio = true; animar(); }
      return;
    }

    if (fase === 'dentro') {
      // Mientras se reproduce una escena o se frena la llegada, la página no se mueve del módulo.
      if (reproduccion || retenida(ahora)) {
        if (retencion) retencion.ultimo = ahora;
        fijar(modulo);
      } else if (direccion < 0 || ahora < libreHasta) {
        seguir(pos);
      } else if (pos > modulo + 0.01) {
        // Hacia abajo sin un gesto de avance (inercia que venía de antes…): no se pasa del módulo.
        fijar(modulo);
      }
      return;
    }
    if (fase === 'arriba') {
      if (pos >= ESCENAS - 0.01) fase = 'abajo'; // ha saltado entera (tecla Fin…)
      else if (pos >= -0.002) entrar(pendiente ?? 0, true);
      return;
    }
    // Abajo: al volver a subir, se entra por el último módulo con el scroll libre.
    if (pos < 0) salir('arriba');
    else if (pos < ESCENAS - 0.01) {
      fase = 'dentro';
      escuchar(true);
      seguir(pos);
    }
  }

  // Al acabar un gesto: dentro, la página vuelve al sitio del módulo; llegando desde arriba con
  // la sección casi entera a la vista, termina de colocarse en el primero.
  function alAcabarScroll() {
    if (!raiz.isConnected || tocando || deslizando || reducido) return;
    if (fase === 'dentro') {
      if (!reproduccion && performance.now() >= libreHasta) fijar(modulo);
      return;
    }
    if (fase === 'arriba' && direccion > 0) {
      const pos = posicion();
      if (pos > -COLOCAR_DESDE && pos < 0) colocar(pendiente ?? 0);
    }
  }

  // Desliza hasta donde se queda fija la sección y entra en el módulo n. Animación propia y
  // corta; se corta en cuanto se vuelve a tocar, a mover la rueda o a pulsar una tecla.
  function colocar(n) {
    const y0 = scrollY;
    const y1 = posicionDe(0);
    const t0 = performance.now();
    deslizando = true;
    const paso = (ahora) => {
      if (!deslizando) return;
      const k = Math.min(1, (ahora - t0) / COLOCACION);
      scrollTo({ top: y0 + (y1 - y0) * (1 - (1 - k) ** 3), behavior: 'instant' });
      if (k < 1) { requestAnimationFrame(paso); return; }
      deslizando = false;
      ultimoY = scrollY;
      entrar(n, false);
    };
    requestAnimationFrame(paso);
  }

  // ---------- Gestos ----------

  function intervenir() {
    pendiente = null;
    if (deslizando) { deslizando = false; ultimoY = scrollY; }
  }

  // Rueda y trackpad (solo dentro de la sección). Un gesto nuevo es el que llega tras una
  // pausa o en el sentido contrario: la inercia del anterior no cuenta.
  function alRueda(e) {
    if (e.ctrlKey) return; // zoom
    const ahora = performance.now();
    const signo = Math.sign(e.deltaY);
    if (ahora - ultimaRueda > PAUSA_GESTO || (signo && signo !== signoRueda)) gastado = false;
    ultimaRueda = ahora;
    if (signo) signoRueda = signo;
    if (reproduccion || retenida(ahora)) {
      if (retencion) retencion.ultimo = ahora;
      if (e.cancelable) e.preventDefault();
      gastado = true;
      return;
    }
    if (e.deltaY <= 0) return; // hacia arriba (o de lado): scroll libre
    if (e.cancelable) e.preventDefault();
    if (!gastado) { gastado = true; reproducir(); }
  }

  const alTocar = (e) => {
    intervenir();
    tocando = true;
    retencion = null; // tocar para la inercia
    dedo = { y: e.touches[0]?.clientY ?? 0, decidido: null, usado: false };
  };
  const alSoltar = (e) => {
    if (e.touches.length) return;
    tocando = false;
    dedo = null;
    if (!('onscrollend' in window)) {
      clearTimeout(temporizador);
      temporizador = setTimeout(alAcabarScroll, QUIETO);
    }
  };

  // El dedo (solo dentro de la sección): se decide con el primer movimiento. Hacia abajo
  // (el dedo sube) avanza y la página no se mueve; hacia arriba, scroll libre.
  function alMoverDedo(e) {
    if (!dedo || e.touches.length !== 1) return;
    if (reproduccion || retenida(performance.now())) { if (e.cancelable) e.preventDefault(); return; }
    const dy = dedo.y - e.touches[0].clientY;
    if (!dedo.decidido) dedo.decidido = dy < 0 ? 'arriba' : 'abajo';
    if (dedo.decidido === 'arriba') return;
    if (e.cancelable) e.preventDefault();
    if (dy >= UMBRAL_DEDO && !dedo.usado) { dedo.usado = true; reproducir(); }
  }

  function alPulsarTecla(e) {
    intervenir();
    if (e.key === 'Home' || e.key === 'End') { libreHasta = performance.now() + 1500; return; }
    if (fase !== 'dentro' || reducido || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.target.closest?.('input, textarea, select, [contenteditable]')) return;
    if (e.key === ' ' && e.target.closest?.('button')) return;
    const abajo = e.key === 'ArrowDown' || e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey);
    const arriba = e.key === 'ArrowUp' || e.key === 'PageUp' || (e.key === ' ' && e.shiftKey);
    if (reproduccion || retenida(performance.now())) {
      if (abajo || arriba) e.preventDefault();
      return;
    }
    if (abajo) {
      e.preventDefault();
      if (!e.repeat) reproducir();
    }
  }

  // Arrastrar la barra de scroll: manda la barra, sin retener nada.
  const alPulsar = (e) => {
    if (e.clientX >= document.documentElement.clientWidth) libreHasta = Infinity;
  };
  const alLevantar = () => {
    if (libreHasta === Infinity) libreHasta = performance.now() + QUIETO * 2;
  };

  // Los gestos solo se interceptan dentro de la sección: fuera, el navegador desplaza la
  // página sin esperar a JavaScript.
  function escuchar(si) {
    if (si === escuchando || reducido) return;
    escuchando = si;
    const cambiar = si ? addEventListener : removeEventListener;
    cambiar('wheel', alRueda, { passive: false });
    cambiar('touchmove', alMoverDedo, { passive: false });
  }

  // ---------- Montaje ----------

  // Lleva al módulo n (0-3): baja hasta la sección, ya con su escena y su texto.
  function irA(n) {
    if (reducido) { scrollTo({ top: posicionDe(n), behavior: 'instant' }); return; }
    if (reproduccion) return;
    if (fase === 'dentro') { modulo = n; completados = n; mostrar(n); fijar(n); return; }
    completados = n;
    mostrar(n);
    scrollTo({ top: posicionDe(0), behavior: 'smooth' });
    pendiente = n; // después de pedir el scroll: cualquier gesto del usuario lo anula
  }

  const alCambiarTamano = () => { sucio = true; animar(); };
  const carga = new IntersectionObserver((entradas) => {
    if (entradas.some((x) => x.isIntersecting)) empezarCarga();
  }, { rootMargin: '150% 0px' });
  const vigia = new IntersectionObserver((entradas) => {
    visible = entradas.some((x) => x.isIntersecting);
    if (visible) { sucio = true; animar(); }
  });

  function desmontar() {
    carga.disconnect();
    vigia.disconnect();
    clearTimeout(temporizador);
    escuchar(false);
    deslizando = false;
    reproduccion = null;
    removeEventListener('scroll', alHacerScroll);
    removeEventListener('scrollend', alAcabarScroll);
    removeEventListener('resize', alCambiarTamano);
    removeEventListener('wheel', intervenir);
    removeEventListener('touchstart', alTocar);
    removeEventListener('touchend', alSoltar);
    removeEventListener('touchcancel', alSoltar);
    removeEventListener('keydown', alPulsarTecla);
    removeEventListener('pointerdown', alPulsar);
    removeEventListener('pointerup', alLevantar);
  }

  carga.observe(raiz);
  vigia.observe(raiz);
  addEventListener('scroll', alHacerScroll, { passive: true });
  addEventListener('scrollend', alAcabarScroll);
  addEventListener('resize', alCambiarTamano);
  addEventListener('wheel', intervenir, { passive: true });
  addEventListener('touchstart', alTocar, { passive: true });
  addEventListener('touchend', alSoltar, { passive: true });
  addEventListener('touchcancel', alSoltar, { passive: true });
  addEventListener('keydown', alPulsarTecla);
  addEventListener('pointerdown', alPulsar, { passive: true });
  addEventListener('pointerup', alLevantar, { passive: true });

  // Si la página ya está dentro o más abajo (al volver a la portada), se empieza ahí.
  const pos = posicion();
  if (pos >= ESCENAS - 0.01) salir('abajo');
  else if (pos >= 0) { fase = 'dentro'; escuchar(true); seguir(pos); }
  pasos.forEach((p, i) => p.classList.toggle('activo', i === modulo));
  pasoActivo = modulo;
  animar();
  return { irA, desmontar };
}
