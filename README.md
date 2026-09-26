# Escuela de Socorrismo

Web propia de la escuela: portada pública con los cursos y, para los alumnos, el temario,
los tests y las notas. Es una web estática (HTML, CSS y JavaScript, sin paso de compilación)
pensada para publicarse en Vercel. El diseño sigue el de pj.fire: fondo negro (con tema claro
opcional), tarjetas con borde fino y las mismas tipografías (Anton, Inter, Source Serif 4 y
JetBrains Mono, desde Google Fonts).

> **Estado: demostración.** Todavía no hay base de datos: todo se guarda en el navegador
> (`localStorage`), así que cada navegador tiene su propia copia de los cursos, alumnos y notas.
> Cuentas de prueba: `alumno@demo.es` y `admin@demo.es` (vale cualquier contraseña).

## Qué hace

**Alumnos**
- Pueden crear su cuenta; entran sin cursos hasta que la escuela les da acceso.
- Ven solo los cursos en los que están matriculados.
- Temario por temas: texto con apartados y listas, y material (PDF, vídeos, enlaces).
- Tests por tema o de varios temas: número de preguntas, modo estudio (corrige al momento
  y enseña la explicación) y penalización opcional de los fallos (−1/3).
- Corrección pregunta a pregunta, con filtro de fallos y un botón para repasar solo los fallos.
- Notas: media, mejor nota, porcentaje de aciertos por tema e historial.

**Administración**
- Cursos: crear, editar y borrar.
- Temas: ordenar, editar el contenido (con vista previa) y el material.
- Preguntas: crear, editar y borrar (de 2 a 6 opciones, con explicación).
- Alumnos: alta, a qué cursos tienen acceso, baja y ficha con sus notas.
- Notas de todos los alumnos, con filtro por curso y por alumno.

## Estructura

```
index.html              esqueleto de la página
css/estilos.css         todos los estilos (tema oscuro por defecto y claro)
js/tema-previo.js       aplica el tema guardado antes de pintar (script normal, en <head>)
js/intro-previo.js      decide antes de pintar si toca la intro de vídeo (una vez por visita)
js/intro.js, css/intro.css  intro de vídeo del logo a pantalla completa
assets/intro/           vídeo de la intro (WebM y MP4, 1080p y 720p) e imagen fija del final
js/config.js            nombre de la escuela, contacto, nota de aprobado, penalización
js/app.js               arranque y navegación entre pantallas (direcciones #/…)
js/almacen.js           lectura y guardado de datos (el único archivo que cambiará con Supabase)
js/sesion.js            inicio de sesión, alta de alumnos y cierre de sesión
js/datos-demo.js        cursos, temas, preguntas y alumnos de ejemplo
js/estadisticas.js      medias y aciertos por tema
js/utiles.js            utilidades comunes (escapar HTML, formato de notas, iconos…)
js/vistas/              una pantalla por archivo
  inicio.js             portada pública
  acceso.js             inicio de sesión y crear cuenta
  panel.js              «Mis cursos»
  curso.js              temario de un curso
  tema.js               un tema
  test.js               preparar y hacer un test
  intento.js            corrección de un test
  notas.js              «Mis notas»
  admin.js, admin/      administración
supabase/esquema.sql    borrador de la base de datos (aún sin aplicar)
vercel.json             cabeceras de seguridad
```

Los `js/` son módulos ES que el navegador carga directamente.

## Intro de vídeo

Al entrar en la web sale la animación del logo a pantalla completa, antes que nada; al
terminar se funde con la web. Sale una vez por visita (para volver a verla: `/?intro`).

- En pantallas horizontales el vídeo llena la pantalla (el logo final queda en el centro).
  En verticales o casi cuadradas se muestra entero y el resto se rellena con el color del
  fondo del vídeo (`#f6f5f4`), para no recortar el logo.
- El vídeo se descarga entero antes de reproducirse (pesa 0,2–0,9 MB), para que se vea
  siempre completo y fluido aunque la cobertura sea mala; si tarda, se ve una barra de
  progreso. 1080p solo en pantallas grandes con buena conexión (en el móvil, 720p); WebM
  (VP9) si el navegador lo asegura y, si no, MP4 (H.264), que funciona en todos.
- Si la web se abre con la pestaña en segundo plano, el vídeo sigue al volver a ella.
- Botón «Saltar» (y tecla Esc). Si el navegador no deja arrancar el vídeo solo (iPhone en
  ahorro de energía), aparece un botón de reproducir. Si el vídeo desde memoria no arranca,
  se reproduce desde su dirección normal. La imagen fija del logo solo sale si todo falla.
- Diagnóstico en el móvil: abrir `/?intro=depurar` enseña en pantalla qué va pasando.
- Para cambiar el vídeo: sustituir los archivos de `assets/intro/` (mismo nombre). Si el
  fondo del nuevo vídeo es de otro color, cambiarlo en `css/intro.css` y `js/intro.js`.

## Probarla en local

```
python3 -m http.server 8000
```

y abrir <http://localhost:8000>. (Abrir `index.html` con doble clic no funciona: los
módulos necesitan un servidor.)

## Próximos pasos

1. **Base de datos (Supabase).** Aplicar `supabase/esquema.sql`, cambiar el interior de
   `js/almacen.js` y `js/sesion.js` para usar Supabase, y añadir su dominio a
   `connect-src` en `vercel.json`.
2. **Subir archivos** (PDF y vídeos) a Supabase Storage en lugar de pegar enlaces.
3. **Importar desde Moodle**: preguntas en formato Moodle XML o GIFT.
4. **Dominio propio** en Vercel.
