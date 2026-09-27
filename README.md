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

El curso de socorrista está dividido en cuatro módulos (cada uno es un «curso» con su número
de módulo): 1 Natación, 2 Prevención de accidentes en instalaciones acuáticas, 3 Rescate de
accidentados en instalaciones acuáticas y 4 Primeros auxilios.

**Administración**
- Cursos y módulos: crear, editar (incluido el número de módulo) y borrar.
- Temas: ordenar, editar el contenido (con vista previa) y el material.
- Preguntas: crear, editar y borrar (de 2 a 6 opciones, con explicación).
- Alumnos: alta, a qué cursos tienen acceso, baja y ficha con sus notas.
- Notas de todos los alumnos, con filtro por curso y por alumno.

## Estructura

```
index.html              esqueleto de la página
css/estilos.css         todos los estilos (tema oscuro por defecto y claro)
js/tema-previo.js       aplica el tema guardado antes de pintar (script normal, en <head>)
js/intro-previo.js      decide antes de pintar si toca la intro (una vez por visita)
js/intro.js, css/intro.css  intro del logo a pantalla completa (fotogramas en <canvas>)
assets/intro/           fotogramas de la intro e imagen fija del final
js/bienvenida.js        bienvenida de la portada: el logo de fondo que vuela a la cabecera al bajar
js/recorrido.js         recorrido por los 4 módulos en la portada (una escena por gesto, de módulo en módulo)
assets/recorrido/       fotogramas del recorrido
fuentes/                vídeos originales de la intro y del recorrido (no se publican)
scripts/                genera los fotogramas desde los vídeos (no se publica)
js/config.js            nombre de la escuela, contacto, nota de aprobado, penalización
js/app.js               arranque y navegación entre pantallas (direcciones #/…)
js/almacen.js           lectura y guardado de datos (el único archivo que cambiará con Supabase)
js/sesion.js            inicio de sesión, alta de alumnos y cierre de sesión
js/datos-demo.js        cursos, temas, preguntas y alumnos de ejemplo
js/estadisticas.js      medias y aciertos por tema
js/utiles.js            utilidades comunes (escapar HTML, formato de notas, iconos…)
js/vistas/              una pantalla por archivo
  inicio.js             portada: presentación, recorrido por los módulos («Mis cursos») y contacto
  acceso.js             inicio de sesión y crear cuenta
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

## Intro

Al entrar en la web sale la animación del logo a pantalla completa, antes que nada; al
terminar se funde con la web. Sale una vez por visita (para volver a verla: `/?intro`).

**Técnica: secuencia de fotogramas en `<canvas>`** (como las páginas de producto de Apple),
no un `<video>`: los móviles pueden bloquear que un vídeo arranque solo (iPhone en ahorro de
energía) y unas imágenes no, así que la animación se ve siempre entera y exacta.

- 121 fotogramas (5 s a 24 por segundo) en `assets/intro/fotogramas/v1/`, en AVIF (el que
  se usa) y WebP (respaldo si el navegador no tiene AVIF), a 1080 px de ancho (móviles,
  ~0,8 MB) y 1600 px (pantallas grandes, ~1,2 MB). Se guardan en caché un año.
- Se cargan en orden y la animación empieza cuando, al ritmo al que llegan, el resto estará
  antes de hacer falta (con 4G, al momento; con 3G, a los ~3 s). Si la red se frena a mitad,
  espera en el último fotograma sin saltos. El reloj marca el avance: dura siempre 5 s.
- Con una conexión tan lenta que habría que esperar demasiado, se enseña el logo terminado
  (`assets/intro/poster.jpg`) y se entra en la web.
- Encuadre: en pantallas horizontales llena la pantalla (el logo final queda en el centro);
  en verticales se ve entera, algo ampliada, sobre el color de su fondo (`#f6f5f4`).
- Sin botón para saltarla; con teclado, Esc la cierra. Se pausa si la pestaña deja de verse.
- Diagnóstico en el móvil: `/?intro=depurar` enseña en pantalla qué va pasando.

**Cambiar la animación:** poner el vídeo nuevo en `fuentes/` (no se publica: `.vercelignore`)
y ejecutar `scripts/intro-fotogramas.sh fuentes/nuevo.mp4 v2`; después cambiar `RUTA` en
`js/intro.js` a `v2` (y `TOTAL`/`FPS` si el vídeo no tiene 121 fotogramas a 24 por segundo).

## Bienvenida (portada)

Lo primero que se ve (tras la intro) es «Bienvenido» (o «Hola, nombre» con sesión) sobre el
logo grande, difuminado y tenue de fondo, y un aviso animado para deslizar; la cabecera aún
no enseña el menú ni el botón de perfil o tema. Al bajar, el logo vuela hasta su sitio en la
cabecera y la cabecera aparece a la vez que aterriza. Es un solo logo: lleva dentro la copia
difuminada y la nítida, una encima de otra, así que al empezar a bajar se enfoca sin moverse
del sitio y luego vuela (nunca se ven dos). Para que vaya fluido solo se animan `transform` y
`opacity`, con animaciones del navegador atadas al scroll (`ScrollTimeline` en Chrome, Edge
y Safari 26: el navegador las mueve a la vez que la página, sin pasar por JavaScript); en el
resto, cada fotograma solo las pone en su punto, sin medir nada. El logo va en línea recta,
arranca y se posa frenando, y al llegar el de la cabecera toma su sitio en el mismo
fotograma. Con «reducir movimiento» el logo se queda quieto de fondo y la cabecera se ve
desde el principio.

Justo antes del recorrido hay cuatro botones («¿Con prisa? Ve directo a un módulo») que
bajan directamente a cada módulo del recorrido.

## Recorrido por los módulos (portada)

Bajo la presentación de la portada, un socorrista recorre los cuatro módulos en la misma
playa: nada (1), vigila con el silbato (2), entra al agua con el tubo de rescate (3) y hace
una RCP con el DESA (4). Al lado aparece el módulo (título y descripción, sacados de los
datos) con dos recuadros, «Temario» y «Test», que llevan a ese módulo. La portada es también
«Mis cursos» del alumno (ya no hay panel aparte; `#/panel` lleva a la portada): sin sesión,
los recuadros piden entrar; con sesión, enseñan los temas y la media, o «Sin acceso» si el
alumno no está matriculado en ese módulo.

- **De módulo en módulo:** al llegar, la página se coloca en el primer módulo (si se baja de
  golpe se para ahí, y si se deja casi entera a la vista termina de colocarse sola). Cada
  gesto hacia abajo (rueda, trackpad, dedo o flecha/espacio) reproduce la escena entera en
  2 s (`VELOCIDAD` en `js/recorrido.js`: 2,5 veces el vídeo) y se para en el principio del
  módulo siguiente; mientras dura no se mueve nada y la inercia del gesto no cuenta para el
  siguiente. Hacia arriba, cada gesto vuelve un módulo (sin vídeo) y desde el primero se sale.
  Tras el cuarto, la página sigue normal. Dentro de la sección la página no se mueve ni da
  saltos (solo cambian la escena y el texto), y los gestos solo se interceptan ahí (fuera, el
  scroll es el del navegador). «Desliza para empezar» y «Ve directo a un módulo» llevan a su
  módulo.
- De la escena de natación solo se reproduce el principio (`PARTE`: 70 %, 1,4 s), para que no
  se haga larga. Mientras se reproduce una escena, un aviso arriba dice cuál viene («Siguiente:
  Módulo 2 · Prevención»); al acabar la cuarta, «Sigue bajando».
- Fluidez: el avance lo marca el reloj y entre dos fotogramas se dibuja la mezcla de ambos; a
  esta velocidad basta uno de cada dos (10 por segundo de vídeo). Nunca se salta un fotograma
  que no ha llegado: si falta, la escena espera en el último (sin fogonazos). Al final, la
  escena se funde con el principio de la siguiente. El lienzo solo se dibuja si está a la
  vista y algo ha cambiado, y nunca a más resolución que la de los fotogramas.
- Misma técnica que la intro: fotogramas en `<canvas>`. 350 fotogramas en
  `assets/recorrido/v3/`, AVIF (WebP de respaldo), a 960 px (móviles, ~6,7 MB en total) y
  1440 px (pantallas grandes, ~12 MB); se usa la mitad. Se descargan en cuanto se abre la
  portada (tras la intro, para no quitarle red): primero el principio de cada escena y luego
  cada escena entera, en orden y antes la del módulo en el que se está.
- Horizontal: la escena llena el hueco con el texto encima, a la izquierda. Vertical: el
  texto abajo y la escena arriba ocupando lo que queda (centrada en el socorrista), así que
  cabe en cualquier móvil; en pantallas bajas se quita la descripción.
- Sin saltos en el móvil: la portada y el recorrido miden con `svh`, que no cambia al
  esconderse la barra de direcciones (`--hueco`; los altos de la cabecera
  y de la barra de abajo los mide `js/app.js`).
- Con «reducir movimiento» se ven cuatro imágenes fijas que cambian con el scroll (la sección
  es más larga), sin interceptar gestos.

**Cambiar las escenas:** poner los vídeos nuevos como `fuentes/recorrido/1.mp4` … `4.mp4` y
ejecutar `scripts/recorrido-fotogramas.sh fuentes/recorrido v4`; después cambiar `RUTA` en
`js/recorrido.js` a `v4`. La escena 3 se corta a los 2,5 s (al zambullirse), antes de que
empiece a nadar: los segundos de cada vídeo están en el script. Las escenas actuales se
hicieron con IA (GPT Image 2.5 para las imágenes y Kling 3.0 para animarlas), con la cámara
fija para que el fondo encaje entre ellas.

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
