// Se carga en <head>, antes que nada, para decidir si toca la intro de vídeo.
// Así el fondo de la intro aparece a la vez que la página y no se ve la web
// un instante antes del vídeo. La intro sale una vez por visita (sessionStorage).
// Es un script normal (no módulo) para que se ejecute antes de pintar.
(function () {
  var toca = true;
  try {
    toca = !sessionStorage.getItem('escuela.intro.vista');
  } catch (e) {
    // Sin almacenamiento: se muestra la intro.
  }
  // «?intro» en la dirección la fuerza (para volver a verla).
  if (/[?&]intro(=|&|$)/.test(location.search)) toca = true;
  if (toca) document.documentElement.setAttribute('data-intro', '');
})();
