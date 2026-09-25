// Aplica el tema guardado (claro u oscuro) antes de pintar nada, para no arrancar en
// un tema y saltar al otro un instante después. Por defecto, oscuro.
// Es un script normal (no módulo) para que se ejecute antes de pintar.
(function () {
  try {
    if (localStorage.getItem('escuela.tema') === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', '#FFFFFF');
    }
  } catch (e) {
    // Sin almacenamiento: tema oscuro.
  }
})();
