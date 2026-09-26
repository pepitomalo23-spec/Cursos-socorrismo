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

  // Con «?intro=depurar» se ve en pantalla qué va haciendo la intro (para móviles).
  const depurar = /[?&]intro=depurar(&|$)/.test(location.search);

  const meta = document.querySelector('meta[name="theme-color"]');
  const colorAnterior = meta?.getAttribute('content');
  meta?.setAttribute('content', COLOR_FONDO);

  raiz.innerHTML = `
    <video class="intro-video" muted playsinline preload="auto"
           disablepictureinpicture disableremoteplayback tabindex="-1" aria-hidden="true"></video>
    <div class="intro-carga" hidden><span></span></div>
    <button type="button" class="intro-tocar" aria-label="Ver la intro" hidden>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>
    </button>
    <img class="intro-fija" src="assets/intro/poster.jpg" alt="" aria-hidden="true" hidden>
    <button type="button" class="intro-saltar">Saltar</button>
    ${depurar ? '<pre class="intro-depurar"></pre>' : ''}`;

  const video = raiz.querySelector('video');
  const fija = raiz.querySelector('.intro-fija');
  const carga = raiz.querySelector('.intro-carga');
  const tocar = raiz.querySelector('.intro-tocar');
  const registro = raiz.querySelector('.intro-depurar');
  const controlador = new AbortController();
  const urlDirecta = elegirVideo(video);
  const inicio = performance.now();
  let cerrada = false;
  let urlBlob = null;
  let vigilante = null;

  function anotar(texto) {
    if (registro) registro.textContent += `${Math.round(performance.now() - inicio)} ms · ${texto}\n`;
  }
  anotar(`${navigator.userAgent.replace(/^Mozilla\/5\.0 /, '')}`);
  anotar(`vídeo: ${urlDirecta.split('/').pop()} · pantalla ${innerWidth}×${innerHeight}`);

  function cerrar(retardo = 0) {
    if (cerrada) return;
    cerrada = true;
    controlador.abort();
    clearInterval(vigilante);
    document.removeEventListener('keydown', alPulsarTecla);
    document.removeEventListener('visibilitychange', alCambiarVisibilidad);
    setTimeout(() => {
      raiz.classList.add('saliendo');
      if (colorAnterior) meta?.setAttribute('content', colorAnterior);
      setTimeout(() => {
        video.pause();
        raiz.remove();
        if (urlBlob) URL.revokeObjectURL(urlBlob);
        html.removeAttribute('data-intro');
        document.getElementById('principal')?.focus({ preventScroll: true });
      }, 700);
    }, depurar ? Math.max(retardo, 8000) : retardo);
  }

  // Último recurso, si el vídeo no se puede reproducir de ninguna forma: el logo terminado.
  function imagenFija(motivo) {
    if (cerrada) return;
    anotar(`imagen fija: ${motivo}`);
    video.hidden = true;
    carga.hidden = true;
    tocar.hidden = true;
    fija.hidden = false;
    raiz.classList.add('reproduciendo');
    cerrar(1400);
  }

  // El navegador no deja arrancar el vídeo solo (p. ej. iPhone en ahorro de energía):
  // se pide un toque, que sí lo permite, y el vídeo se ve entero.
  function pedirToque() {
    if (cerrada || !tocar.hidden) return;
    anotar('el navegador no deja reproducir solo: se pide un toque');
    clearInterval(vigilante);
    carga.hidden = true;
    tocar.hidden = false;
  }
  tocar.addEventListener('click', () => {
    tocar.hidden = true;
    video.muted = true;
    video.play()?.catch((error) => imagenFija(`tras el toque: ${error?.name}`));
  });

  function alPulsarTecla(e) {
    if (e.key === 'Escape') cerrar();
  }
  document.addEventListener('keydown', alPulsarTecla);
  raiz.querySelector('.intro-saltar').addEventListener('click', () => cerrar());

  // Si se abre la web con la pestaña en segundo plano (o se cambia de app), el navegador
  // pausa el vídeo: al volver, sigue donde estaba en vez de quedarse parado.
  function alCambiarVisibilidad() {
    if (document.visibilityState === 'visible' && video.src && video.paused && !video.ended && tocar.hidden) reproducir();
  }
  document.addEventListener('visibilitychange', alCambiarVisibilidad);

  function reproducir() {
    video.muted = true;
    video.play()?.catch((error) => {
      anotar(`play() rechazado: ${error?.name}`);
      // AbortError: el navegador interrumpió el arranque y lo reintenta solo.
      if (error?.name === 'NotAllowedError') pedirToque();
    });
  }

  // Pone el vídeo (en memoria o desde su dirección) y lo arranca. Si en 4 s a la vista
  // no ha empezado: con el de memoria se prueba la dirección normal; con esta, se pide un toque.
  function ponerVideo(url) {
    anotar(`reproducir desde ${url.startsWith('blob:') ? 'memoria' : 'la dirección normal'}`);
    video.src = url;
    video.load();
    if (document.visibilityState === 'visible') reproducir();
    clearInterval(vigilante);
    let sinArrancar = 0;
    vigilante = setInterval(() => {
      if (cerrada || raiz.classList.contains('reproduciendo')) return clearInterval(vigilante);
      if (document.visibilityState !== 'visible' || !tocar.hidden) return;
      sinArrancar += 250;
      if (sinArrancar >= 4000) {
        clearInterval(vigilante);
        anotar('no arranca en 4 s');
        if (url.startsWith('blob:')) ponerVideo(urlDirecta);
        else pedirToque();
      }
    }, 250);
  }

  video.addEventListener('playing', () => {
    anotar(`reproduciendo desde t=${video.currentTime.toFixed(2)}`);
    raiz.classList.add('reproduciendo');
  });
  video.addEventListener('ended', () => {
    anotar('terminado');
    cerrar(PAUSA_FINAL);
  });
  video.addEventListener('error', () => {
    const codigo = video.error?.code;
    anotar(`error del vídeo (código ${codigo})`);
    if (cerrada) return;
    if (video.src.startsWith('blob:')) ponerVideo(urlDirecta);
    else imagenFija(`error ${codigo}`);
  });
  // Por si algún navegador no avisa del final: se da por terminado en la última décima.
  video.addEventListener('timeupdate', () => {
    if (video.duration && video.currentTime >= video.duration - 0.1) {
      setTimeout(() => { if (!cerrada) cerrar(PAUSA_FINAL); }, 150);
    }
  });

  // Se descarga entero antes de reproducirlo. La espera solo cuenta con la página a la
  // vista; si se pasa de ESPERA_MAXIMA, se reproduce directamente desde su dirección.
  let esperado = 0;
  let descargado = false;
  const reloj = setInterval(() => {
    if (cerrada || descargado) return clearInterval(reloj);
    if (document.visibilityState !== 'visible') return;
    esperado += 250;
    if (esperado >= AVISO_CARGA) carga.hidden = false;
    if (esperado >= ESPERA_MAXIMA) {
      clearInterval(reloj);
      descargado = true;
      controlador.abort();
      carga.hidden = true;
      anotar('la descarga tarda demasiado');
      ponerVideo(urlDirecta);
    }
  }, 250);

  descargar(urlDirecta, (parte) => { carga.firstElementChild.style.width = `${Math.round(parte * 100)}%`; }, controlador.signal)
    .then((blob) => {
      if (cerrada || descargado) return;
      descargado = true;
      carga.hidden = true;
      anotar(`descargado (${Math.round(blob.size / 1024)} KB, ${blob.type})`);
      urlBlob = URL.createObjectURL(blob);
      ponerVideo(urlBlob);
    })
    .catch((error) => {
      if (cerrada || descargado) return;
      descargado = true;
      carga.hidden = true;
      anotar(`no se pudo descargar (${error?.name}): se usa la dirección normal`);
      ponerVideo(urlDirecta);
    });
}

iniciar();
