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
