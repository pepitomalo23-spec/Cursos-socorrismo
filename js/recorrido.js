// Recorrido por los cuatro módulos en la portada: un socorrista en la misma playa nada,
// vigila, rescata y hace una RCP, y a su lado aparece cada módulo con su Temario y su Test.
//
// Se va de módulo en módulo:
// - Al llegar a la sección, la página se coloca justo en el primer módulo (si se baja de
//   golpe, se para ahí; si se deja casi entera a la vista, termina de colocarse sola) y se
//   ve el principio de su escena.
// - Cada gesto hacia abajo (rueda, trackpad, dedo o teclado) reproduce la escena entera, más
//   rápida que el vídeo (VELOCIDAD: 2 s), y termina en el principio de la siguiente, ya con
//   su módulo. Mientras se reproduce no se mueve nada; para seguir hace falta otro gesto (la
//   inercia del anterior no cuenta).
// - Mientras se reproduce, un aviso arriba dice cuál es el módulo siguiente; en el cuarto, al
//   acabar su escena, dice «Sigue bajando» y la página sigue con normalidad.
// - De la escena de natación solo se reproduce el principio (PARTE), para que no se haga larga.
// - Hacia arriba, cada gesto vuelve un módulo (a su principio, sin vídeo) y desde el primero
//   se sale por arriba.
// Dentro de la sección la página no se mueve (ni da saltos de un módulo a otro): solo
// cambian la escena y el texto. La sección mide poco más de una pantalla (clase por-pasos);
// lo que sobra solo sirve para frenar la inercia al llegar sin que se note. Los gestos solo se
// interceptan dentro; fuera, el scroll es el del navegador.
//
// Técnica: la misma que la intro (js/intro.js), fotogramas dibujados en un <canvas>; un
// <video> no siempre arranca solo en el móvil y las imágenes sí.
// - Cada escena son FOTOGRAMAS[e] imágenes, 20 por segundo de vídeo (AVIF, o WebP si el
//   navegador no tiene AVIF); a esta velocidad basta uno de cada PASO. Se empiezan a
//   descargar en cuanto se abre la portada (tras la intro): primero el principio de cada
//   escena y luego cada escena entera, en orden y antes la del módulo en el que se está.
// - El avance lo marca el reloj (dura siempre lo mismo aunque el móvil vaya justo) y entre
//   dos fotogramas se dibuja la mezcla de ambos, así que se ve fluido. Nunca se salta un
//   fotograma que no ha llegado: si falta, la escena espera en el último hasta que llega (sin
//   saltos ni fogonazos). Al final se funde con el principio de la siguiente (el fondo es el
//   mismo: parece un solo plano).
// - Encuadre: en horizontal la imagen llena el hueco; en vertical ocupa la parte de arriba,
//   centrada en el socorrista de cada escena (ENFOQUE), y el texto va debajo.
// - Con «reducir movimiento» no hay vídeo ni se interceptan gestos: la sección es larga y se
//   ve una imagen fija de cada escena, que cambia con el scroll.
//
// Para cambiar las escenas: scripts/recorrido-fotogramas.sh (y subir la versión de RUTA).

const RUTA = 'assets/recorrido/v3'; // cambiar la versión al cambiar los fotogramas
const ESCENAS = 4;
const FOTOGRAMAS = [100, 100, 50, 100]; // por escena (20 por segundo; la 3 dura 2,5 s)
const FPS = 20;
const VELOCIDAD = 2.5; // cuánto más rápida que el vídeo va la escena (5 s → 2 s)
const PARTE = [0.7, 1, 1, 1]; // parte de cada escena que se reproduce (la de natación se hacía larga)
const AVISO_DESDE = 0.3; // desde qué parte de la escena se avisa del módulo siguiente
const PASO = 2; // fotogramas que se usan: uno de cada PASO (a esta velocidad sobran los demás)
const ENFOQUE = [0.47, 0.47, 0.47, 0.5]; // x del socorrista (0-1) en cada escena
const FUNDIDO = 350; // ms del fundido entre escenas
const SOLAPE = 150; // ms antes del final de la escena en los que empieza a fundirse
const EN_PARALELO = 6;
const FIJO_REDUCIDO = 0.55; // con «reducir movimiento», qué parte de cada escena se enseña
const PAUSA_GESTO = 200; // ms sin rueda para que lo siguiente cuente como un gesto nuevo
const REPOSO_RUEDA = 350; // ms parado en un módulo tras los que un golpe de rueda fuerte avanza
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
  const aviso = raiz.querySelector('.recorrido-siguiente');
  const avisoTexto = aviso?.querySelector('span');
  let avisoActual = '';
  const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
  raiz.classList.toggle('por-pasos', !reducido);

  // imagenes[escena][fotograma]: la imagen ya decodificada, o undefined si aún no ha llegado.
  const imagenes = FOTOGRAMAS.map((n) => new Array(n));
  // Los fotogramas que se usan de cada escena: uno de cada PASO, y el último.
  const usados = FOTOGRAMAS.map((n) => [...new Set([...Array.from({ length: Math.ceil(n / PASO) }, (_, i) => i * PASO), n - 1])]);
  let formato = 'avif';
  let ancho = 960;
  let cola = null; // fotogramas pendientes de pedir, en orden: [escena, fotograma]

  // Dónde se está: 'arriba' (antes de la sección), 'dentro' o 'abajo' (ya pasada).
  let fase = 'arriba';
  let modulo = 0; // el módulo en el que se está (o al que se va)
  let completados = 0; // barras de progreso llenas
  let vista = { e: 0, t: 0 }; // lo que se enseña en reposo: escena y momento (0-1)
  let fundido = null; // { desde, t0 }: cambio de vista en curso
  let reproduccion = null; // { n, reloj, ultimo, dur }: escena que se está reproduciendo
  let retencion = null; // { hasta, ultimo }: al llegar de golpe, la página no pasa del módulo
  let pendiente = null; // módulo al que lleva irA mientras la página baja hasta la sección
  let casa = 'inicio'; // dentro, dónde se queda la página: 'inicio' o 'fin' de la parte fija
  let libreHasta = 0; // hasta cuándo el scroll manda (barra de scroll, Inicio/Fin)
  let deslizando = false;
  let escuchando = false;
  let ultimoY = scrollY;
  let direccion = 0;
  let ultimaRueda = -Infinity;
  let signoRueda = 0;
  let fuerzaRueda = 0; // tamaño del último golpe de rueda (la inercia va a menos)
  let enReposoDesde = 0; // cuándo acabó la última escena (o se llegó)
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

  // Orden de carga: el principio de cada escena (se ve al llegar a cada módulo) y luego cada
  // escena entera y en orden, porque se reproduce de principio a fin.
  function ordenDeCarga() {
    if (reducido) return FOTOGRAMAS.map((_, e) => [e, fijoReducido(e)]);
    return [
      ...FOTOGRAMAS.map((_, e) => [e, 0]),
      ...usados.flatMap((lista, e) => lista.filter((f) => f > 0).map((f) => [e, f])),
    ];
  }

  // Pone delante en la cola lo que falta de esa escena y las siguientes (las que se van a ver
  // ya), detrás solo del principio de cada escena.
  function adelantarEscena(e) {
    if (!cola || reducido || e < 0 || e >= ESCENAS) return;
    const turno = ([x, f]) => (f === 0 ? -1 : (x - e + ESCENAS) % ESCENAS);
    cola = cola.map((c, i) => [c, i]).sort((a, b) => turno(a[0]) - turno(b[0]) || a[1] - b[1]).map(([c]) => c);
  }

  // Hasta qué momento (0-1) de la escena e han llegado todos los fotogramas, sin huecos.
  function listo(e) {
    let hasta = -1;
    for (const f of usados[e]) {
      if (!imagenes[e][f]) break;
      hasta = f;
    }
    return hasta < 0 ? 0 : hasta / (FOTOGRAMAS[e] - 1);
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

  // Dibuja el momento t (0-1) de la escena e, mezclando los dos fotogramas usados entre los
  // que cae.
  function dibujarMomento(e, t, enfoque, alfa) {
    const n = FOTOGRAMAS[e];
    if (reducido) { dibujar(masCercano(e, fijoReducido(e)), enfoque, alfa); return; }
    const exacto = t * (n - 1);
    const f = Math.min(n - 1, Math.floor(exacto / PASO) * PASO);
    const g = Math.min(n - 1, f + PASO);
    const resto = g > f ? (exacto - f) / (g - f) : 0;
    dibujar(masCercano(e, f), enfoque, alfa);
    if (resto > 0.02 && imagenes[e][g]) dibujar(imagenes[e][g], enfoque, alfa * resto);
  }

  const progresoFundido = (ahora) => (fundido ? Math.min(1, (ahora - fundido.t0) / FUNDIDO) : 1);

  // Lo que toca enseñar ahora: una escena (a) en un momento y, fundiéndose encima, otra (b).
  function momento(ahora) {
    if (reproduccion) {
      const { n, reloj: pasado, dur } = reproduccion;
      const t = Math.min(1, pasado / dur) * PARTE[n];
      const ultima = n === ESCENAS - 1;
      const mezcla = ultima ? 0 : Math.min(1, Math.max(0, (pasado - dur + SOLAPE) / FUNDIDO));
      return { a: { e: n, t }, b: ultima ? null : { e: n + 1, t: 0 }, mezcla, acabada: ultima ? pasado >= dur : mezcla >= 1, avance: Math.min(1, pasado / dur) };
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
      const lleno = i < completados ? 1 : reproduccion && i === reproduccion.n ? Math.round(m.avance * 1000) / 1000 : 0;
      if (llenas[i] !== lleno) { llenas[i] = lleno; b.style.setProperty('--lleno', String(lleno)); }
    });
    ponerAviso(m);
    return m;
  }

  // Aviso arriba de lo que viene: mientras se reproduce una escena, el módulo siguiente; al
  // acabar la última, que se puede seguir bajando.
  function ponerAviso(m) {
    if (!aviso) return;
    let texto = '';
    if (reproduccion && m.avance >= AVISO_DESDE && reproduccion.n < ESCENAS - 1) {
      const n = reproduccion.n + 1;
      texto = `Siguiente: Módulo ${n + 1} · ${pasos[n]?.dataset.corto ?? ''}`;
    } else if (!reproduccion && completados >= ESCENAS && !reducido) {
      texto = 'Sigue bajando';
    }
    if (texto && texto !== avisoActual) avisoTexto.textContent = texto;
    if (texto !== avisoActual) {
      avisoActual = texto;
      aviso.classList.toggle('visible', Boolean(texto));
    }
  }

  function cuadro(ahora) {
    if (!raiz.isConnected) { animando = false; desmontar(); return; }
    // El reloj de la escena avanza con el tiempo, pero nunca más allá de lo que ha llegado.
    if (reproduccion) {
      const r = reproduccion;
      const dt = Math.min(64, Math.max(0, ahora - r.ultimo));
      r.ultimo = ahora;
      const tope = r.reloj >= r.dur ? Infinity : Math.min(1, listo(r.n) / PARTE[r.n]) * r.dur;
      r.reloj = Math.max(r.reloj, Math.min(r.reloj + dt, tope));
    }
    const m = pintar(ahora);
    if (reproduccion && m.acabada) {
      terminarReproduccion();
      pintar(ahora); // ya en su sitio: el texto, las barras y el aviso de lo que viene
    }
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
    reproduccion = { n, reloj: 0, ultimo: performance.now(), dur: (FOTOGRAMAS[n] * PARTE[n] / FPS) * 1000 / VELOCIDAD };
    adelantarEscena(n);
    animar();
  }

  // Al acabar, se queda en el principio del módulo siguiente (la página no se mueve); tras el
  // último, se suelta.
  function terminarReproduccion() {
    const { n } = reproduccion;
    reproduccion = null;
    enReposoDesde = performance.now();
    if (n < ESCENAS - 1) {
      modulo = n + 1;
      completados = modulo;
      vista = { e: modulo, t: 0 };
      adelantarEscena(modulo);
    } else {
      completados = ESCENAS;
      vista = { e: n, t: PARTE[n] };
      // Para soltar la sección no se mueve la página (en Safari, ese salto se veía como un
      // fogonazo): se quita el espacio de sobra de debajo, que no se ve, y el fin pasa a ser
      // donde ya está la página.
      raiz.classList.add('suelta');
      casa = 'fin';
      fijar();
      salir('abajo');
    }
  }

  // ---------- Posición de la página ----------

  // En px de scroll: desde dónde se queda fija la sección (inicio) y hasta dónde (fin). Dentro,
  // la página no se mueve de uno de los dos (casa): solo cambian la escena y el texto.
  function limites() {
    const arriba = parseFloat(getComputedStyle(fijo).top) || 0;
    const inicio = Math.round(raiz.getBoundingClientRect().top + scrollY - arriba);
    return { inicio, fin: inicio + Math.max(0, Math.round(raiz.offsetHeight - fijo.offsetHeight)) };
  }

  // Deja la página en su sitio (no se nota: la parte fija no se mueve).
  function fijar() {
    const l = limites();
    const y = casa === 'fin' ? l.fin : l.inicio;
    if (Math.abs(scrollY - y) > 1) scrollTo(0, y);
    ultimoY = scrollY;
  }

  function retenida(ahora) {
    if (retencion && (ahora > retencion.hasta || ahora - retencion.ultimo > QUIETO)) retencion = null;
    return Boolean(retencion);
  }

  function entrar(n, lado, retener) {
    fase = 'dentro';
    casa = lado;
    modulo = n;
    completados = n;
    pendiente = null;
    const ahora = performance.now();
    retencion = retener ? { hasta: ahora + RETENCION, ultimo: ahora } : null;
    // El gesto que ha traído hasta aquí ya ha hecho lo suyo: para avanzar hace falta otro.
    gastado = true;
    ultimaRueda = ahora;
    enReposoDesde = ahora;
    if (dedo) dedo.usado = true;
    mostrar(n);
    fijar();
    escuchar(true);
  }

  function salir(lado) {
    fase = lado;
    // Al salir por arriba vuelve el espacio de sobra (sirve para frenar la inercia al llegar);
    // está debajo de lo que se ve, así que no mueve nada.
    if (lado === 'arriba') raiz.classList.remove('suelta');
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

  // Un módulo atrás, sin vídeo (con un fundido). Desde el primero se sale por arriba: devuelve
  // false y el gesto sigue su curso (la página sube).
  function retroceder() {
    if (modulo === 0) {
      casa = 'inicio';
      fijar();
      salir('arriba');
      return false;
    }
    modulo -= 1;
    completados = modulo;
    enReposoDesde = performance.now();
    mostrar(modulo);
    // Si se había entrado por abajo, la página pasa al inicio (no se nota, está fija) para que
    // desde el primer módulo se salga en cuanto se sube.
    if (casa === 'fin') { casa = 'inicio'; fijar(); }
    return true;
  }

  // Con «reducir movimiento» no se intercepta nada: la sección es larga y el módulo es el de
  // la posición del scroll (imágenes fijas).
  function seguirReducido() {
    const arriba = parseFloat(getComputedStyle(fijo).top) || 0;
    const base = raiz.getBoundingClientRect().top + scrollY - arriba;
    const paso = Math.max(1, (raiz.offsetHeight - fijo.offsetHeight) / ESCENAS);
    const n = Math.min(ESCENAS - 1, Math.max(0, Math.floor((scrollY - base) / paso + 0.01)));
    if (n !== vista.e) { modulo = n; completados = n; vista = { e: n, t: 0 }; sucio = true; animar(); }
    return { base, paso };
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
    if (reducido) { seguirReducido(); return; }
    if (deslizando) return;
    const ahora = performance.now();
    const l = limites();

    if (fase === 'dentro') {
      // Con la barra de scroll o las teclas Inicio/Fin manda el scroll; si no, la página no se
      // mueve de su sitio (lo que empuje, como la inercia de la llegada, no la mueve).
      if (!reproduccion && ahora < libreHasta) {
        if (y < l.inicio - 2) salir('arriba');
        else if (y > l.fin + 2) salir('abajo');
        return;
      }
      if (retencion) retencion.ultimo = ahora;
      fijar();
      return;
    }
    if (fase === 'arriba') {
      if (y > l.fin + 2) fase = 'abajo'; // ha saltado entera (tecla Fin…)
      else if (y >= l.inicio - 1) entrar(pendiente ?? 0, 'inicio', true);
      return;
    }
    // Abajo (se suelta justo en el fin): al volver a subir, se para en el último módulo.
    if (y < l.inicio - 2) salir('arriba');
    else if (y < l.fin - 1) entrar(ESCENAS - 1, 'fin', true);
  }

  // Al acabar un gesto: dentro, la página vuelve a su sitio; llegando desde arriba con la
  // sección casi entera a la vista, termina de colocarse en el primer módulo.
  function alAcabarScroll() {
    if (!raiz.isConnected || tocando || deslizando || reducido) return;
    if (fase === 'dentro') {
      if (!reproduccion && performance.now() >= libreHasta) fijar();
      return;
    }
    if (fase === 'arriba' && direccion > 0) {
      const falta = (limites().inicio - scrollY) / Math.max(1, fijo.offsetHeight);
      if (falta > 0 && falta < COLOCAR_DESDE) colocar(pendiente ?? 0);
    }
  }

  // Desliza hasta donde se queda fija la sección y entra en el módulo n. Animación propia y
  // corta; se corta en cuanto se vuelve a tocar, a mover la rueda o a pulsar una tecla.
  function colocar(n) {
    const y0 = scrollY;
    const y1 = limites().inicio;
    const t0 = performance.now();
    deslizando = true;
    const paso = (ahora) => {
      if (!deslizando) return;
      const k = Math.min(1, (ahora - t0) / COLOCACION);
      scrollTo(0, y0 + (y1 - y0) * (1 - (1 - k) ** 3));
      if (k < 1) { requestAnimationFrame(paso); return; }
      deslizando = false;
      ultimoY = scrollY;
      entrar(n, 'inicio', false);
    };
    requestAnimationFrame(paso);
  }

  // ---------- Gestos ----------

  function intervenir() {
    pendiente = null;
    if (deslizando) { deslizando = false; ultimoY = scrollY; }
  }

  // Rueda y trackpad (solo dentro de la sección): hacia abajo reproduce la escena, hacia
  // arriba vuelve un módulo. Un gesto nuevo es el que llega tras una pausa, en el sentido
  // contrario o más fuerte que el anterior (la inercia va a menos, así que no cuenta); o un
  // golpe fuerte cuando ya se lleva un rato parado en el módulo (quien sigue girando la rueda).
  function alRueda(e) {
    if (e.ctrlKey) return; // zoom
    const ahora = performance.now();
    const signo = Math.sign(e.deltaY);
    const fuerza = Math.abs(e.deltaY) * (e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 600 : 1);
    if (ahora - ultimaRueda > PAUSA_GESTO || (signo && signo !== signoRueda) || fuerza > fuerzaRueda * 1.5 + 4
      || (!reproduccion && ahora - enReposoDesde > REPOSO_RUEDA && fuerza >= 40)) gastado = false;
    ultimaRueda = ahora;
    fuerzaRueda = fuerza;
    if (signo) signoRueda = signo;
    if (reproduccion || retenida(ahora)) {
      if (retencion) retencion.ultimo = ahora;
      if (e.cancelable) e.preventDefault();
      gastado = true;
      return;
    }
    if (!signo) return; // de lado
    // Hacia arriba desde el primer módulo, un gesto nuevo sale: el scroll sigue normal.
    if (signo < 0 && modulo === 0 && !gastado) { retroceder(); return; }
    if (e.cancelable) e.preventDefault();
    if (gastado) return;
    gastado = true;
    if (signo > 0) reproducir();
    else retroceder();
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

  // El dedo (solo dentro de la sección): se decide con el primer movimiento y la página no se
  // mueve. Hacia abajo (el dedo sube) reproduce la escena; hacia arriba vuelve un módulo, y
  // desde el primero sale (el scroll sigue normal).
  function alMoverDedo(e) {
    if (!dedo || e.touches.length !== 1) return;
    if (reproduccion || retenida(performance.now())) { if (e.cancelable) e.preventDefault(); return; }
    const dy = dedo.y - e.touches[0].clientY;
    if (!dedo.decidido) {
      dedo.decidido = dy < 0 ? 'arriba' : 'abajo';
      if (dedo.decidido === 'arriba' && modulo === 0 && !dedo.usado) { retroceder(); return; }
    }
    if (e.cancelable) e.preventDefault();
    if (dedo.usado || Math.abs(dy) < UMBRAL_DEDO) return;
    dedo.usado = true;
    if (dedo.decidido === 'abajo') reproducir();
    else retroceder();
  }

  function alPulsarTecla(e) {
    intervenir();
    if (e.key === 'Home' || e.key === 'End') { libreHasta = performance.now() + 1500; return; }
    if (fase !== 'dentro' || reducido || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.target.closest?.('input, textarea, select, [contenteditable]')) return;
    if (e.key === ' ' && e.target.closest?.('button')) return;
    const abajo = e.key === 'ArrowDown' || e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey);
    const arriba = e.key === 'ArrowUp' || e.key === 'PageUp' || (e.key === ' ' && e.shiftKey);
    if (!abajo && !arriba) return;
    if (reproduccion || retenida(performance.now())) { e.preventDefault(); return; }
    if (arriba && modulo === 0) { retroceder(); return; } // sale: la tecla sube la página
    e.preventDefault();
    if (e.repeat) return;
    if (abajo) reproducir();
    else retroceder();
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
    if (reducido) {
      const { base, paso } = seguirReducido();
      scrollTo(0, Math.round(base + n * paso));
      return;
    }
    if (reproduccion) return;
    if (fase === 'dentro') { modulo = n; completados = n; mostrar(n); return; }
    completados = n;
    mostrar(n);
    scrollTo({ top: limites().inicio, behavior: 'smooth' });
    pendiente = n; // después de pedir el scroll: cualquier gesto del usuario lo anula
  }

  const alCambiarTamano = () => { sucio = true; animar(); };
  // Si el lienzo cambia de tamaño (p. ej. al esconderse la barra de direcciones del móvil), se
  // redibuja antes de que se vea: un lienzo al que se cambia el tamaño se queda en blanco.
  const alRedimensionar = new ResizeObserver(() => { sucio = true; pintar(performance.now()); });
  // Los fotogramas se piden en cuanto se abre la portada; si está la intro, al acabar (para
  // no quitarle red), o antes si se baja hasta cerca de la sección.
  const carga = new IntersectionObserver((entradas) => {
    if (entradas.some((x) => x.isIntersecting)) empezarCarga();
  }, { rootMargin: '150% 0px' });
  const trasIntro = new MutationObserver(() => {
    if (document.documentElement.hasAttribute('data-intro')) return;
    trasIntro.disconnect();
    empezarCarga();
  });
  const vigia = new IntersectionObserver((entradas) => {
    visible = entradas.some((x) => x.isIntersecting);
    if (visible) { sucio = true; animar(); }
  });

  function desmontar() {
    carga.disconnect();
    trasIntro.disconnect();
    vigia.disconnect();
    alRedimensionar.disconnect();
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
  if (document.documentElement.hasAttribute('data-intro')) {
    trasIntro.observe(document.documentElement, { attributes: true, attributeFilter: ['data-intro'] });
  } else {
    setTimeout(() => raiz.isConnected && empezarCarga(), 250);
  }
  vigia.observe(raiz);
  alRedimensionar.observe(lienzo);
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
  if (reducido) seguirReducido();
  else {
    const l = limites();
    if (scrollY > l.fin + 2) salir('abajo');
    else if (scrollY >= l.inicio - 1) entrar(0, 'inicio', false);
  }
  pasos.forEach((p, i) => p.classList.toggle('activo', i === modulo));
  pasoActivo = modulo;
  animar();
  return { irA, desmontar };
}
