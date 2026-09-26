// Intro a pantalla completa al entrar en la web: la animación del logo.
//
// Técnica: secuencia de fotogramas dibujada en un <canvas> (como las páginas de producto
// de Apple), no un <video>. Un vídeo depende de que el navegador le deje arrancar solo, y
// los móviles lo bloquean a veces (iPhone en ahorro de energía); unas imágenes no, así que
// la animación se ve siempre entera, igual en todos los navegadores.
//
// - Los 121 fotogramas (AVIF, o WebP si el navegador no tiene AVIF; 24 por segundo) se
//   cargan en orden y el primero se enseña en
//   cuanto llega. La animación empieza cuando, al ritmo al que están llegando, el resto
//   estará antes de hacer falta (con buena conexión, casi al momento). Si la red se frena
//   a mitad, espera en el último fotograma y sigue al llegar el siguiente (sin saltos).
// - El avance lo marca el reloj, no el número de repintados: dura siempre lo mismo aunque
//   el móvil vaya justo (salta fotogramas en vez de ralentizarse).
// - Se pausa si la pestaña deja de verse y sigue al volver.
// - Encuadre: en pantallas horizontales la animación llena la pantalla (el logo final queda
//   en el centro); en verticales se ve entera, algo ampliada, sobre el color de su fondo.
//
// Sale una vez por visita: js/intro-previo.js marca <html data-intro> en <head> y
// css/intro.css tapa la página desde el primer instante. Para volver a verla: ?intro.
// Diagnóstico en el móvil: ?intro=depurar. Para cambiar la animación: scripts/intro-fotogramas.sh.

const CLAVE_VISTA = 'escuela.intro.vista';
const FPS = 24;
const TOTAL = 121;
const RUTA = 'assets/intro/fotogramas/v1'; // cambiar la versión al cambiar los fotogramas
const PROPORCION = 16 / 9;
const AMPLIACION_VERTICAL = 1.18; // en vertical, cuánto más ancha que la pantalla se dibuja
const FUNDIDO = 0.14; // en vertical, parte de arriba y abajo que se funde con el fondo
const PAUSA_FINAL = 700; // ms con el logo quieto antes de fundirse con la web
const ESPERA_MAXIMA = 15000; // ms de carga (con la página a la vista) antes de rendirse
const ESTIMAR_TRAS = 4000; // ms de carga tras los que se estima si merece la pena esperar
const ESPERA_ESTIMADA = 8000; // si para empezar faltarían más de estos ms, se enseña el logo
const AVISO_CARGA = 900; // ms de carga tras los que aparece la barra de progreso
const EN_PARALELO = 8; // fotogramas que se piden a la vez
const MARGEN = 0.8; // se cuenta con el 80 % del ritmo de carga medido, por si baja
const COLOR_FONDO = '#f6f5f4'; // fondo de la animación, también para la barra del navegador

const raiz = document.getElementById('intro');
const html = document.documentElement;

const numero = (i) => String(i + 1).padStart(3, '0');

function horizontal(ancho, alto) {
  return ancho / alto >= 4 / 3;
}

// Resolución de los fotogramas según lo grande que se van a dibujar en píxeles reales.
function resolucion() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const ancho = horizontal(innerWidth, innerHeight)
    ? Math.max(innerWidth, innerHeight * PROPORCION)
    : innerWidth * AMPLIACION_VERTICAL;
  const conexion = navigator.connection;
  const lenta = conexion && (conexion.saveData || /2g|3g/.test(conexion.effectiveType ?? '') || conexion.downlink < 1.5);
  return ancho * dpr > 1200 && !lenta ? 1600 : 1080;
}

function iniciar() {
  if (!raiz || !html.hasAttribute('data-intro')) return;
  try {
    sessionStorage.setItem(CLAVE_VISTA, '1');
  } catch {
    // Sin almacenamiento: volverá a salir en la próxima visita.
  }

  const depurar = /[?&]intro=depurar(&|$)/.test(location.search);
  const meta = document.querySelector('meta[name="theme-color"]');
  const colorAnterior = meta?.getAttribute('content');
  meta?.setAttribute('content', COLOR_FONDO);

  raiz.innerHTML = `
    <canvas class="intro-lienzo" aria-hidden="true"></canvas>
    <div class="intro-carga" hidden><span></span></div>
    <img class="intro-fija" src="assets/intro/poster.jpg" alt="" aria-hidden="true" hidden>
    ${depurar ? '<pre class="intro-depurar"></pre>' : ''}`;

  const lienzo = raiz.querySelector('canvas');
  const ctx = lienzo.getContext('2d', { alpha: false });
  const carga = raiz.querySelector('.intro-carga');
  const fija = raiz.querySelector('.intro-fija');
  const registro = raiz.querySelector('.intro-depurar');
  const res = resolucion();
  const fotogramas = new Array(TOTAL);
  const t0 = performance.now();
  let formato = 'avif'; // pasa a 'webp' si el navegador no puede con el primero en AVIF
  let cargados = 0;
  let seguidos = 0; // fotogramas cargados sin huecos desde el primero
  let empezada = false;
  let cerrada = false;
  let reproduciendo = false;
  let actual = -1;
  let raf = 0;
  let anterior = null; // instante del repintado anterior
  let transcurrido = 0; // ms de animación ya vistos (no avanza mientras espera a la red)

  function anotar(texto) {
    if (registro) registro.textContent += `${Math.round(performance.now() - t0)} ms · ${texto}\n`;
  }
  anotar(navigator.userAgent.replace(/^Mozilla\/5\.0 /, ''));
  anotar(`fotogramas de ${res} px · pantalla ${innerWidth}×${innerHeight} · dpr ${window.devicePixelRatio}`);

  // ---------- Dibujo ----------

  let ancho = 0;
  let alto = 0;
  function medir() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    ancho = innerWidth;
    alto = innerHeight;
    lienzo.width = Math.round(ancho * dpr);
    lienzo.height = Math.round(alto * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    if (actual >= 0) dibujar(actual);
  }

  function dibujar(i) {
    const img = fotogramas[i];
    if (!img) return;
    ctx.fillStyle = COLOR_FONDO;
    ctx.fillRect(0, 0, ancho, alto);
    let w;
    let h;
    const lleno = horizontal(ancho, alto);
    if (lleno) {
      // Llena la pantalla recortando solo bordes.
      h = Math.max(ancho / PROPORCION, alto);
      w = h * PROPORCION;
    } else {
      w = ancho * AMPLIACION_VERTICAL;
      h = w / PROPORCION;
    }
    const x = (ancho - w) / 2;
    const y = (alto - h) / 2;
    ctx.drawImage(img, x, y, w, h);
    if (!lleno) {
      // Funde los bordes de arriba y abajo con el fondo para que no se note el corte.
      const f = h * FUNDIDO;
      for (const [desde, hasta] of [[y, y + f], [y + h, y + h - f]]) {
        const degradado = ctx.createLinearGradient(0, desde, 0, hasta);
        degradado.addColorStop(0, COLOR_FONDO);
        degradado.addColorStop(1, 'rgba(246, 245, 244, 0)');
        ctx.fillStyle = degradado;
        ctx.fillRect(0, Math.min(desde, hasta), ancho, f);
      }
    }
    actual = i;
  }

  // ---------- Reproducción ----------

  function bucle(ahora) {
    if (cerrada) return;
    const paso = anterior === null ? 0 : Math.min(ahora - anterior, 250);
    anterior = ahora;
    let i = Math.min(TOTAL - 1, Math.floor(((transcurrido + paso) / 1000) * FPS));
    if (i < seguidos) {
      transcurrido += paso;
      carga.hidden = true;
    } else {
      // El fotograma aún no ha llegado: el reloj se para en el último disponible.
      i = seguidos - 1;
      if (i >= 0 && actual !== i) anotar(`esperando al fotograma ${numero(i + 1)}`);
    }
    if (i !== actual) dibujar(i);
    if (i >= TOTAL - 1) {
      anotar('terminado');
      cerrar(PAUSA_FINAL);
      return;
    }
    raf = requestAnimationFrame(bucle);
  }

  function reproducir() {
    if (!empezada || reproduciendo || cerrada || document.visibilityState !== 'visible') return;
    reproduciendo = true;
    anterior = null;
    raf = requestAnimationFrame(bucle);
  }

  function pausar() {
    reproduciendo = false;
    cancelAnimationFrame(raf);
  }

  function alCambiarVisibilidad() {
    if (document.visibilityState === 'visible') {
      reproducir();
    } else {
      pausar();
    }
  }

  // ---------- Cierre ----------

  function cerrar(retardo = 0) {
    if (cerrada) return;
    cerrada = true;
    pausar();
    clearInterval(reloj);
    removeEventListener('resize', medir);
    document.removeEventListener('keydown', alPulsarTecla);
    document.removeEventListener('visibilitychange', alCambiarVisibilidad);
    setTimeout(() => {
      raiz.classList.add('saliendo');
      if (colorAnterior) meta?.setAttribute('content', colorAnterior);
      setTimeout(() => {
        for (const img of fotogramas) if (img) img.src = '';
        raiz.remove();
        html.removeAttribute('data-intro');
        document.getElementById('principal')?.focus({ preventScroll: true });
      }, 700);
    }, depurar ? Math.max(retardo, 8000) : retardo);
  }

  // Último recurso, si los fotogramas no llegan: el logo terminado, un momento.
  function imagenFija(motivo) {
    if (cerrada) return;
    anotar(`imagen fija: ${motivo}`);
    lienzo.hidden = true;
    carga.hidden = true;
    fija.hidden = false;
    raiz.classList.add('visible');
    cerrar(1400);
  }

  function alPulsarTecla(e) {
    if (e.key === 'Escape') cerrar();
  }

  // ---------- Carga ----------

  // La espera hasta empezar solo cuenta con la página a la vista. Si la conexión es tan
  // lenta que tardaría mucho en poder empezar, se enseña el logo en vez de hacer esperar.
  let esperado = 0;
  const reloj = setInterval(() => {
    if (cerrada || empezada) return clearInterval(reloj);
    if (document.visibilityState !== 'visible') return;
    esperado += 250;
    if (esperado >= AVISO_CARGA) carga.hidden = false;
    if (esperado >= ESPERA_MAXIMA) return imagenFija(`carga incompleta (${cargados}/${TOTAL})`);
    const ritmo = ritmoCarga();
    if (esperado >= ESTIMAR_TRAS && ritmo) {
      const necesarios = TOTAL - ((TOTAL - 1) / FPS) * ritmo;
      const falta = Math.max(0, necesarios - seguidos) / ritmo;
      if (falta * 1000 > ESPERA_ESTIMADA) {
        imagenFija(`conexión lenta: faltarían ${Math.round(falta)} s para poder empezar`);
      }
    }
  }, 250);

  function cargar(i) {
    return new Promise((resolver, rechazar) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        // decode() deja la imagen lista para dibujar sin tirones.
        (img.decode ? img.decode().catch(() => {}) : Promise.resolve()).then(() => resolver(img));
      };
      img.onerror = () => rechazar(new Error(`fotograma ${numero(i)}.${formato}`));
      img.src = `${RUTA}/${res}/${numero(i)}.${formato}`;
    });
  }

  // ¿Se puede empezar ya? Sí, si al ritmo de carga medido (con margen) cada fotograma que
  // falta llegará antes de su momento. El peor caso es el último.
  // Ritmo de llegada medido desde que se piden varios a la vez (tras el primero), con
  // margen por si baja. En fotogramas por segundo; 0 mientras no hay datos suficientes.
  let inicioParalelo = 0;
  function ritmoCarga() {
    const llegados = cargados - 1;
    const segundos = (performance.now() - inicioParalelo) / 1000;
    return inicioParalelo && llegados >= EN_PARALELO && segundos > 0 ? (llegados / segundos) * MARGEN : 0;
  }
  function puedeEmpezar() {
    if (seguidos === TOTAL) return true;
    const ritmo = ritmoCarga();
    if (seguidos < Math.min(12, TOTAL) || !ritmo) return false;
    return (TOTAL - seguidos) / ritmo <= (TOTAL - 1) / FPS;
  }

  function alCargar(i, img) {
    if (cerrada) return;
    fotogramas[i] = img;
    cargados++;
    while (seguidos < TOTAL && fotogramas[seguidos]) seguidos++;
    carga.firstElementChild.style.width = `${Math.round((cargados / TOTAL) * 100)}%`;
    // El primer fotograma se enseña en cuanto llega, mientras carga el resto.
    if (i === 0 && !empezada) {
      dibujar(0);
      raiz.classList.add('visible');
    }
    if (!empezada && puedeEmpezar()) {
      empezada = true;
      carga.hidden = true;
      anotar(`empieza con ${seguidos}/${TOTAL} fotogramas`);
      reproducir();
    }
    if (cargados === TOTAL) anotar(`${TOTAL} fotogramas listos`);
  }

  medir();
  addEventListener('resize', medir);
  document.addEventListener('keydown', alPulsarTecla);
  document.addEventListener('visibilitychange', alCambiarVisibilidad);

  // Carga en orden, unos pocos a la vez, para que lleguen antes los que antes se necesitan.
  let siguiente = 1;
  function pedirSiguiente() {
    if (cerrada || siguiente >= TOTAL) return;
    const i = siguiente++;
    cargar(i)
      .then((img) => { alCargar(i, img); pedirSiguiente(); })
      .catch((error) => imagenFija(`no se pudo cargar el ${error.message}`));
  }

  // El primero va solo y decide el formato: si el AVIF no se puede ver, todo en WebP.
  cargar(0)
    .catch(() => {
      formato = 'webp';
      return cargar(0);
    })
    .then((img) => {
      anotar(`formato: ${formato}`);
      inicioParalelo = performance.now();
      alCargar(0, img);
      for (let n = 0; n < EN_PARALELO; n++) pedirSiguiente();
    })
    .catch((error) => imagenFija(`no se pudo cargar el ${error.message}`));
}

iniciar();
