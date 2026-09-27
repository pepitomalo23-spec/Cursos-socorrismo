// Bienvenida de la portada: el logo grande y difuminado de fondo, detrás del «Bienvenido».
// Al hacer scroll se enfoca y vuela hasta su sitio en la esquina de la cabecera, y la cabecera
// (menú, perfil o tema) aparece a la vez que aterriza.
//
// Es un solo logo: .logo-vuelo lleva dentro la copia difuminada (la de fondo) y la nítida,
// una encima de otra, y se mueven juntas. Al empezar a bajar, la difuminada da paso a la
// nítida casi sin moverse del sitio: se ve un logo que se enfoca, nunca dos. .portada-logo
// solo marca dónde empieza (y es el que se ve con «reducir movimiento», que no vuela).
//
// Para que vaya fluido:
// - Solo se animan transform y opacity, con animaciones del propio navegador (Web Animations).
// - Donde se puede (Chrome, Edge, Safari 26…), esas animaciones van atadas al scroll
//   (ScrollTimeline): el navegador las mueve a la vez que la página, sin pasar por
//   JavaScript, así que no se retrasan ni dan tirones aunque la página esté ocupada.
//   En el resto, cada fotograma solo pone las animaciones en su punto según el scroll;
//   nada se mide mientras se baja (las medidas se toman al montar y si cambia el tamaño).
// - El logo va en línea recta con una curva suave: arranca despacio, se desliza y se posa
//   frenando justo encima del logo de la cabecera, que toma su sitio en ese mismo fotograma.
// - La cabecera no enseña nada más que su fondo (el mismo que el de la portada) hasta que el
//   logo se acerca: el texto sube por encima de ella y el logo pasa entre los dos, sin
//   cambiar de capa a mitad de camino.

const VUELO = 0.75; // parte de la altura de la portada en la que el logo llega a la esquina
const ENFOQUE = 0.3; // parte del vuelo en la que el difuminado da paso al nítido
const TEXTO_HASTA = 0.45; // parte del vuelo en la que el «Bienvenido» termina de apartarse
const AVISO_HASTA = 0.33; // ídem para «Desliza para empezar»
const APARECE_DESDE = 0.55; // desde qué parte del vuelo empieza a verse la cabecera
const CURVA = 'cubic-bezier(0.42, 0, 0.58, 1)'; // arranca y llega frenando, sin acelerones
const DURACION = 1000; // sin ScrollTimeline: cada animación dura 1 s y se coloca a mano

const conScrollTimeline = typeof ScrollTimeline === 'function' && 'rangeStart' in Animation.prototype;

// Devuelve la función que lo desmonta (al salir de la portada).
export function montarBienvenida(portada) {
  const hueco = portada?.querySelector('.portada-logo');
  const logo = portada?.querySelector('.logo-vuelo');
  const cabecera = document.querySelector('.cabecera');
  if (!hueco || !logo || !cabecera || matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};

  const difuminado = logo.querySelector('.logo-vuelo-difuminado');
  const nitido = logo.querySelector('.logo-vuelo-nitido');
  const texto = portada.querySelector('.portada-texto');
  const aviso = portada.querySelector('.portada-deslizar');
  let linea = conScrollTimeline
    ? new ScrollTimeline({ source: document.scrollingElement ?? document.documentElement, axis: 'block' })
    : null;

  let animaciones = [];
  let recorrido = 1; // px de scroll que dura el vuelo
  let firma = '';
  let pedido = false;
  let montado = true;

  function animar(el, fotogramas, opciones = {}) {
    if (!el) return;
    const a = el.animate(fotogramas, linea
      ? { ...opciones, fill: 'both', timeline: linea, rangeStart: '0px', rangeEnd: `${recorrido}px` }
      : { ...opciones, fill: 'both', duration: DURACION });
    if (!linea) a.pause();
    animaciones.push(a);
  }

  // Mide dónde empieza y dónde acaba el vuelo y (re)hace las animaciones si algo ha cambiado.
  // Hasta que se puede medir, se queda el logo de fondo quieto, como con «reducir movimiento».
  function construir(forzar = false) {
    const marca = cabecera.querySelector('.marca-logo');
    const inicio = hueco.getBoundingClientRect();
    const fin = marca?.getBoundingClientRect();
    if (!inicio.width || !fin?.width) return;
    // Posiciones en pantalla con la página arriba del todo; la cabecera no se mueve (sticky).
    const x0 = inicio.left + scrollX;
    const y0 = inicio.top + scrollY;
    const conMenu = matchMedia('(min-width: 641px)').matches; // en el móvil el menú es el botón ☰
    const medidas = [x0, y0, inicio.width, fin.left, fin.top, fin.width, portada.offsetHeight, conMenu].join();
    if (medidas === firma && !forzar) return;
    firma = medidas;

    for (const a of animaciones) a.cancel();
    animaciones = [];
    recorrido = Math.max(1, portada.offsetHeight * VUELO);
    try {
      crear(x0, y0, inicio.width, fin, marca, conMenu);
    } catch (error) {
      // Si el navegador no acepta las animaciones atadas al scroll, se colocan a mano.
      for (const a of animaciones) a.cancel();
      animaciones = [];
      if (!linea) throw error;
      linea = null;
      crear(x0, y0, inicio.width, fin, marca, conMenu);
    }
    portada.classList.add('con-vuelo');
    cabecera.classList.add('con-vuelo');
    colocar();
  }

  function crear(x0, y0, ancho, fin, marca, conMenu) {
    logo.style.width = `${ancho}px`;
    animar(logo, [
      { transform: `translate3d(${x0}px, ${y0}px, 0) scale(1)` },
      { transform: `translate3d(${fin.left}px, ${fin.top}px, 0) scale(${fin.width / ancho})` },
    ], { easing: CURVA });
    animar(difuminado, [{ opacity: 1, easing: 'ease-in-out' }, { opacity: 0, offset: ENFOQUE }, { opacity: 0 }]);
    animar(nitido, [{ opacity: 0, easing: 'ease-in-out' }, { opacity: 1, offset: ENFOQUE }, { opacity: 1 }]);
    // Al posarse, el logo de la cabecera toma su sitio justo en el mismo fotograma.
    animar(logo, [{ opacity: 1, easing: 'step-end' }, { opacity: 0 }]);
    animar(marca, [{ opacity: 0, easing: 'step-end' }, { opacity: 1 }]);

    animar(texto, [
      { opacity: 1, transform: 'translate3d(0, 0, 0)' },
      { opacity: 0, transform: 'translate3d(0, -40px, 0)', offset: TEXTO_HASTA },
      { opacity: 0, transform: 'translate3d(0, -40px, 0)' },
    ]);
    animar(aviso, [{ opacity: 1 }, { opacity: 0, offset: AVISO_HASTA }, { opacity: 0 }]);

    const aparece = [{ opacity: 0 }, { opacity: 0, offset: APARECE_DESDE }, { opacity: 1 }];
    for (const el of cabecera.querySelectorAll(conMenu ? '.nav, .usuario, .tema-suelto' : '.menu-movil')) animar(el, aparece);
    animar(cabecera, aparece, { pseudoElement: '::after' }); // su borde
  }

  // Punto del vuelo según el scroll: la cabecera no se puede pulsar hasta que el logo aterriza
  // y, sin ScrollTimeline, cada animación se pone en su sitio.
  function colocar() {
    pedido = false;
    if (!montado || !animaciones.length) return;
    const p = Math.min(1, Math.max(0, scrollY / recorrido));
    cabecera.classList.toggle('sin-aterrizar', p < 1);
    if (!linea) for (const a of animaciones) a.currentTime = p * DURACION;
  }

  function alDesplazar() {
    if (!portada.isConnected) { desmontar(); return; }
    if (pedido) return;
    pedido = true;
    requestAnimationFrame(colocar);
  }

  const alCambiarTamano = () => construir();
  // La portada cambia de tamaño con la ventana, al cargar las fuentes o al quitarse la intro.
  const vigia = new ResizeObserver(alCambiarTamano);
  // La cabecera se vuelve a pintar entera al cambiar de tema: sus piezas son nuevas.
  const pintor = new MutationObserver(() => construir(true));

  function desmontar() {
    if (!montado) return;
    montado = false;
    for (const a of animaciones) a.cancel();
    animaciones = [];
    vigia.disconnect();
    pintor.disconnect();
    removeEventListener('scroll', alDesplazar);
    removeEventListener('resize', alCambiarTamano);
    cabecera.classList.remove('con-vuelo', 'sin-aterrizar');
    portada.classList.remove('con-vuelo');
  }

  construir(true);
  vigia.observe(portada);
  pintor.observe(cabecera, { childList: true });
  addEventListener('scroll', alDesplazar, { passive: true });
  addEventListener('resize', alCambiarTamano);
  return desmontar;
}
