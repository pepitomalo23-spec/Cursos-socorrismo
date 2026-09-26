// Bienvenida de la portada: el logo grande y difuminado de fondo, detrás del «Bienvenido».
// Al hacer scroll se enfoca, se encoge y vuela hasta su sitio en la esquina de la cabecera,
// donde se queda como el logo de siempre.
//
// El logo que vuela es un <svg> fijo (.logo-vuelo) que se mueve con transform. Su punto de
// partida es el hueco reservado en la portada (.portada-logo), que sube con la página; su
// destino, el logo de la cabecera (.marca-logo), que mientras tanto no se ve (css: :has). Al
// aterrizar se esconde el que vuela y vuelve el de la cabecera, así que no hay salto.
// El recorrido del vuelo ocupa VUELO de la altura de la portada.
// Con «reducir movimiento» no vuela: el logo se queda de fondo y la cabecera, como siempre.

const VUELO = 0.75; // parte de la altura de la portada en la que el logo llega a la esquina
const DIFUMINADO = 7; // px de desenfoque al principio
const OPACIDAD_INICIAL = 0.2;

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
  const suavizar = (t) => 1 - (1 - t) ** 3;

  function colocar() {
    pedido = false;
    if (!portada.isConnected) { desmontar(); return; }
    if (quieto) return;
    const marca = document.querySelector('.marca-logo');
    const inicio = hueco.getBoundingClientRect();
    const fin = marca?.getBoundingClientRect();
    const recorrido = portada.offsetHeight * VUELO;
    const p = Math.min(1, Math.max(0, scrollY / recorrido));
    const k = suavizar(p);

    // Aterrizado (o sin cabecera a la que ir): se ve el logo de la cabecera.
    const aterrizado = p >= 1 || !fin || !fin.width;
    logo.classList.toggle('aterrizado', aterrizado);
    if (aviso) aviso.style.opacity = String(Math.max(0, 1 - p * 3));
    if (aterrizado) return;

    const x = inicio.left + (fin.left - inicio.left) * k;
    const y = inicio.top + (fin.top - inicio.top) * k;
    const escala = (inicio.width + (fin.width - inicio.width) * k) / anchoBase;
    logo.style.transform = `translate(${x}px, ${y}px) scale(${escala})`;
    logo.style.opacity = String(OPACIDAD_INICIAL + (1 - OPACIDAD_INICIAL) * Math.min(1, p * 1.6));
    logo.style.filter = p < 0.6 ? `blur(${(DIFUMINADO * (1 - p / 0.6)).toFixed(2)}px)` : 'none';
    // Detrás del texto mientras es fondo; por encima de la cabecera al llegar a la esquina.
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
