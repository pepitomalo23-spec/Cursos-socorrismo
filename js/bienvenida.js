// Bienvenida de la portada: el logo grande y difuminado de fondo, detrás del «Bienvenido».
// Al hacer scroll, el logo vuela hasta su sitio en la esquina de la cabecera, y la cabecera
// (menú, perfil o tema) aparece a la vez que aterriza.
//
// Para que vaya fluido solo se animan transform y opacity (los hace la tarjeta gráfica):
// - .portada-logo: el logo difuminado de fondo. Se difumina una vez (css) y se va apagando.
// - .logo-vuelo: el mismo logo, nítido, en un <svg> fijo que se enciende a la vez y vuela
//   desde el hueco de la portada hasta el logo de la cabecera (.marca-logo), que mientras
//   tanto no se ve (css: :has). Al aterrizar se esconde y vuelve el de la cabecera, así que no
//   hay salto.
// - La cabecera: su borde, el menú y el botón de perfil o tema siguen --aparece (0-1).
// El vuelo ocupa VUELO de la altura de la portada.
// Con «reducir movimiento» no vuela: el logo se queda de fondo y la cabecera, como siempre.

const VUELO = 0.75; // parte de la altura de la portada en la que el logo llega a la esquina
const CAMBIO = 0.3; // parte del vuelo en la que el difuminado da paso al nítido
const APARECE_DESDE = 0.55; // desde qué parte del vuelo empieza a verse la cabecera

export function montarBienvenida(portada) {
  const hueco = portada.querySelector('.portada-logo');
  const logo = portada.querySelector('.logo-vuelo');
  const aviso = portada.querySelector('.portada-deslizar');
  if (!hueco || !logo) return;

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) logo.classList.add('quieto');
  const quieto = logo.classList.contains('quieto');

  // Ancho del logo sin escalar (el del css); los <svg> no tienen offsetWidth.
  const anchoBase = parseFloat(getComputedStyle(logo).width) || 980;
  let pedido = false;
  let ultimoP = -1;
  const suavizar = (t) => 1 - (1 - t) ** 3;

  function colocar() {
    pedido = false;
    if (!portada.isConnected) { desmontar(); return; }
    if (quieto) return;
    const recorrido = portada.offsetHeight * VUELO;
    const p = Math.min(1, Math.max(0, scrollY / recorrido));
    if (p === ultimoP && p >= 1) return; // aterrizado y quieto: nada que hacer
    ultimoP = p;

    const cabecera = document.querySelector('.cabecera');
    const marca = document.querySelector('.marca-logo');
    const fin = marca?.getBoundingClientRect();
    const aterrizado = p >= 1 || !fin || !fin.width;
    logo.classList.toggle('aterrizado', aterrizado);
    cabecera?.style.setProperty('--aparece', Math.min(1, Math.max(0, (p - APARECE_DESDE) / (1 - APARECE_DESDE))).toFixed(3));
    if (aviso) aviso.style.opacity = String(Math.max(0, 1 - p * 3));
    hueco.style.opacity = String(Math.max(0, 1 - p / CAMBIO));
    if (aterrizado) return;

    const inicio = hueco.getBoundingClientRect();
    const k = suavizar(p);
    const x = inicio.left + (fin.left - inicio.left) * k;
    const y = inicio.top + (fin.top - inicio.top) * k;
    const escala = (inicio.width + (fin.width - inicio.width) * k) / anchoBase;
    logo.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${escala})`;
    logo.style.opacity = String(Math.min(1, p / CAMBIO));
    // Detrás del texto mientras es fondo; por encima de la cabecera al acercarse a la esquina.
    logo.classList.toggle('encima', p > 0.35);
  }

  function pedir() {
    if (pedido) return;
    pedido = true;
    requestAnimationFrame(colocar);
  }

  // La portada ocupa justo lo que se ve entre la cabecera y, en el móvil, la barra de abajo.
  function ajustarAlto() {
    const cabecera = document.querySelector('.cabecera');
    const nav = document.querySelector('.nav');
    const arriba = cabecera ? cabecera.offsetHeight : 0;
    const abajo = nav && getComputedStyle(nav).position === 'fixed' ? nav.offsetHeight : 0;
    portada.style.minHeight = `${innerHeight - arriba - abajo}px`;
  }

  function alCambiarTamano() {
    ajustarAlto();
    ultimoP = -1;
    pedir();
  }

  function desmontar() {
    removeEventListener('scroll', pedir);
    removeEventListener('resize', alCambiarTamano);
  }

  addEventListener('scroll', pedir, { passive: true });
  addEventListener('resize', alCambiarTamano);
  ajustarAlto();
  colocar();
}
