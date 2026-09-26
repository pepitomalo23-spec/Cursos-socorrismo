// Intro de vídeo a pantalla completa al entrar en la web: la animación del logo.
//
// Sale una vez por visita, antes de que se vea nada: js/intro-previo.js marca
// <html data-intro> en <head> y css/intro.css tapa la página desde el primer instante.
// Al terminar, el último fotograma se mantiene un momento y la intro se funde con la web,
// que ya se ha cargado debajo. Para volver a verla: añadir ?intro a la dirección.
//
// Encuadre (ver css/intro.css): en pantallas horizontales el vídeo llena la pantalla;
// en verticales se muestra entero y el resto se rellena con el color de su fondo,
// para no recortar el logo.

const CLAVE_VISTA = 'escuela.intro.vista';
const PAUSA_FINAL = 700; // ms con el logo quieto antes de fundirse con la web
const ESPERA_MAXIMA = 6000; // ms sin empezar a reproducirse: se enseña la imagen fija
const COLOR_FONDO = '#f6f5f4'; // fondo del vídeo, también para la barra del navegador

const FUENTES = {
  alta: ['assets/intro/intro-1080.webm', 'assets/intro/intro-1080.mp4'],
  baja: ['assets/intro/intro-720.webm', 'assets/intro/intro-720.mp4'],
};

const raiz = document.getElementById('intro');
const html = document.documentElement;

function fuentes() {
  // 1080p solo si la pantalla lo aprovecha y la conexión no es lenta.
  const pixeles = Math.max(screen.width, screen.height) * (window.devicePixelRatio || 1);
  const conexion = navigator.connection;
  const lenta = conexion && (/2g|3g/.test(conexion.effectiveType ?? '') || conexion.downlink < 2);
  return pixeles >= 1600 && !lenta ? FUENTES.alta : FUENTES.baja;
}

function iniciar() {
  if (!raiz || !html.hasAttribute('data-intro')) return;
  try {
    sessionStorage.setItem(CLAVE_VISTA, '1');
  } catch {
    // Sin almacenamiento: volverá a salir en la próxima visita.
  }

  const meta = document.querySelector('meta[name="theme-color"]');
  const colorAnterior = meta?.getAttribute('content');
  meta?.setAttribute('content', COLOR_FONDO);

  const sinVideo = matchMedia('(prefers-reduced-motion: reduce)').matches || navigator.connection?.saveData;

  raiz.innerHTML = `
    ${sinVideo ? '' : `
      <video class="intro-video" muted playsinline autoplay preload="auto"
             disablepictureinpicture disableremoteplayback tabindex="-1" aria-hidden="true">
        ${fuentes().map((f) => `<source src="${f}" type="video/${f.endsWith('.webm') ? 'webm' : 'mp4'}">`).join('')}
      </video>`}
    <img class="intro-fija" src="assets/intro/poster.jpg" alt="" aria-hidden="true" ${sinVideo ? '' : 'hidden'}>
    <button type="button" class="intro-saltar" tabindex="0">Saltar</button>`;

  const video = raiz.querySelector('video');
  const fija = raiz.querySelector('.intro-fija');
  let cerrada = false;
  let espera = null;

  function cerrar(retardo = 0) {
    if (cerrada) return;
    cerrada = true;
    clearTimeout(espera);
    document.removeEventListener('keydown', alPulsarTecla);
    setTimeout(() => {
      raiz.classList.add('saliendo');
      if (colorAnterior) meta?.setAttribute('content', colorAnterior);
      setTimeout(() => {
        video?.pause();
        raiz.remove();
        html.removeAttribute('data-intro');
        document.getElementById('principal')?.focus({ preventScroll: true });
      }, 700);
    }, retardo);
  }

  // Imagen fija (el logo terminado) cuando el vídeo no se puede o no se debe reproducir.
  function imagenFija() {
    if (cerrada) return;
    if (video) video.hidden = true;
    fija.hidden = false;
    raiz.classList.add('reproduciendo');
    cerrar(1400);
  }

  function alPulsarTecla(e) {
    if (e.key === 'Escape') cerrar();
  }
  document.addEventListener('keydown', alPulsarTecla);
  raiz.querySelector('.intro-saltar').addEventListener('click', () => cerrar());

  if (!video) {
    imagenFija();
    return;
  }

  video.addEventListener('playing', () => {
    clearTimeout(espera);
    raiz.classList.add('reproduciendo');
  }, { once: true });
  video.addEventListener('ended', () => cerrar(PAUSA_FINAL));
  video.addEventListener('error', imagenFija);
  video.querySelector('source:last-of-type').addEventListener('error', imagenFija);
  espera = setTimeout(() => {
    if (!raiz.classList.contains('reproduciendo')) imagenFija();
  }, ESPERA_MAXIMA);

  // Algunos navegadores ignoran autoplay (por ejemplo, iPhone en modo ahorro de energía).
  video.muted = true;
  video.play()?.catch(imagenFija);
}

iniciar();
