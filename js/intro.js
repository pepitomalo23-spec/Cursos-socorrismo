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
const ESPERA_MAXIMA = 12000; // ms de descarga (con la página visible) antes de rendirse
const AVISO_CARGA = 900; // ms de descarga tras los que aparece la barra de progreso
const COLOR_FONDO = '#f6f5f4'; // fondo del vídeo, también para la barra del navegador

// El vídeo se descarga entero antes de reproducirlo: pesa poco y así se ve siempre
// completo y fluido, sin paradas a mitad ni cortes por mala cobertura.
const VIDEOS = {
  webm: { alta: 'assets/intro/intro-1080.webm', baja: 'assets/intro/intro-720.webm' },
  mp4: { alta: 'assets/intro/intro-1080.mp4', baja: 'assets/intro/intro-720.mp4' },
};

const raiz = document.getElementById('intro');
const html = document.documentElement;

function elegirVideo(video) {
  // WebM (más ligero) solo si el navegador asegura que lo reproduce; si no, MP4 (H.264),
  // que funciona en todos, incluido el iPhone.
  const formato = video.canPlayType('video/webm; codecs="vp9"') === 'probably' ? 'webm' : 'mp4';
  // 1080p solo en pantallas grandes con buena conexión; en el móvil basta 720p.
  const conexion = navigator.connection;
  const lenta = conexion && (/2g|3g/.test(conexion.effectiveType ?? '') || conexion.downlink < 2);
  const grande = Math.max(innerWidth, innerHeight) >= 1100 && Math.min(innerWidth, innerHeight) >= 600;
  return VIDEOS[formato][grande && !lenta ? 'alta' : 'baja'];
}

// Descarga el vídeo avisando del progreso (0 a 1). Devuelve un Blob.
async function descargar(url, alProgreso, senal) {
  const respuesta = await fetch(url, { signal: senal });
  if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
  const total = Number(respuesta.headers.get('content-length')) || 0;
  if (!respuesta.body || !total) return respuesta.blob();
  const lector = respuesta.body.getReader();
  const trozos = [];
  let recibido = 0;
  for (;;) {
    const { done, value } = await lector.read();
    if (done) break;
    trozos.push(value);
    recibido += value.length;
    alProgreso(recibido / total);
  }
  return new Blob(trozos, { type: respuesta.headers.get('content-type') || 'video/mp4' });
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
      <video class="intro-video" muted playsinline preload="none"
             disablepictureinpicture disableremoteplayback tabindex="-1" aria-hidden="true"></video>
      <div class="intro-carga" hidden><span></span></div>`}
    <img class="intro-fija" src="assets/intro/poster.jpg" alt="" aria-hidden="true" ${sinVideo ? '' : 'hidden'}>
    <button type="button" class="intro-saltar" tabindex="0">Saltar</button>`;

  const video = raiz.querySelector('video');
  const fija = raiz.querySelector('.intro-fija');
  const carga = raiz.querySelector('.intro-carga');
  const controlador = new AbortController();
  let cerrada = false;
  let urlVideo = null;

  function cerrar(retardo = 0) {
    if (cerrada) return;
    cerrada = true;
    controlador.abort();
    document.removeEventListener('keydown', alPulsarTecla);
    document.removeEventListener('visibilitychange', alCambiarVisibilidad);
    setTimeout(() => {
      raiz.classList.add('saliendo');
      if (colorAnterior) meta?.setAttribute('content', colorAnterior);
      setTimeout(() => {
        video?.pause();
        raiz.remove();
        if (urlVideo) URL.revokeObjectURL(urlVideo);
        html.removeAttribute('data-intro');
        document.getElementById('principal')?.focus({ preventScroll: true });
      }, 700);
    }, retardo);
  }

  // Imagen fija (el logo terminado) cuando el vídeo no se puede o no se debe reproducir.
  function imagenFija() {
    if (cerrada) return;
    if (video) video.hidden = true;
    if (carga) carga.hidden = true;
    fija.hidden = false;
    raiz.classList.add('reproduciendo');
    cerrar(1400);
  }

  function alPulsarTecla(e) {
    if (e.key === 'Escape') cerrar();
  }
  document.addEventListener('keydown', alPulsarTecla);
  raiz.querySelector('.intro-saltar').addEventListener('click', () => cerrar());

  // Si se abre la web con la pestaña en segundo plano (o se cambia de app), el navegador
  // pausa el vídeo: al volver, sigue donde estaba en vez de quedarse parado.
  function alCambiarVisibilidad() {
    if (document.visibilityState === 'visible' && video?.src && video.paused && !video.ended) reproducir();
  }
  document.addEventListener('visibilitychange', alCambiarVisibilidad);

  if (!video) {
    imagenFija();
    return;
  }

  function reproducir() {
    video.muted = true;
    video.play()?.catch((error) => {
      // AbortError: el navegador interrumpió el arranque (y lo reintenta solo). Solo se
      // renuncia si no deja reproducir (NotAllowedError, p. ej. iPhone en ahorro de energía).
      if (error?.name === 'NotAllowedError') imagenFija();
    });
  }

  video.addEventListener('playing', () => raiz.classList.add('reproduciendo'), { once: true });
  video.addEventListener('ended', () => cerrar(PAUSA_FINAL));
  video.addEventListener('error', imagenFija);
  // Por si algún navegador no avisa del final: se da por terminado en la última décima.
  video.addEventListener('timeupdate', () => {
    if (video.duration && video.currentTime >= video.duration - 0.1) {
      setTimeout(() => { if (!cerrada) cerrar(PAUSA_FINAL); }, 150);
    }
  });

  // Tiempo máximo de descarga, contando solo mientras la página está a la vista.
  let esperado = 0;
  const reloj = setInterval(() => {
    if (cerrada || video.src) return clearInterval(reloj);
    if (document.visibilityState !== 'visible') return;
    esperado += 250;
    if (esperado >= AVISO_CARGA) carga.hidden = false;
    if (esperado >= ESPERA_MAXIMA) {
      clearInterval(reloj);
      imagenFija();
    }
  }, 250);

  descargar(elegirVideo(video), (parte) => carga.firstElementChild.style.width = `${Math.round(parte * 100)}%`, controlador.signal)
    .then((blob) => {
      if (cerrada) return;
      clearInterval(reloj);
      carga.hidden = true;
      urlVideo = URL.createObjectURL(blob);
      video.src = urlVideo;
      if (document.visibilityState === 'visible') reproducir();
      // Si con el vídeo ya descargado no llega a arrancar, se enseña el logo terminado.
      let sinArrancar = 0;
      const vigilante = setInterval(() => {
        if (cerrada || raiz.classList.contains('reproduciendo')) return clearInterval(vigilante);
        if (document.visibilityState !== 'visible') return;
        sinArrancar += 250;
        if (sinArrancar >= 4000) {
          clearInterval(vigilante);
          imagenFija();
        }
      }, 250);
    })
    .catch(() => {
      if (!cerrada) imagenFija();
    });
}

iniciar();
