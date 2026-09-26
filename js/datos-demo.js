// Datos de demostración. Se cargan la primera vez que se abre la web en un navegador
// (o al pulsar «Restablecer datos de demostración» en Administración).
// Cuando la web use Supabase, estos datos solo servirán para rellenar la base de datos.

// Crea una pregunta. La respuesta correcta se escribe siempre la primera y aquí se
// coloca en una posición distinta en cada pregunta para que el editor no las muestre
// todas en la «a» (en el test las opciones se barajan igualmente).
function pregunta(temaId, n, enunciado, [correcta, ...incorrectas], explicacion) {
  const posicion = (n - 1) % 4;
  const opciones = [...incorrectas];
  opciones.splice(posicion, 0, correcta);
  return { id: `${temaId}-p${n}`, temaId, enunciado, opciones, correcta: posicion, explicacion };
}

const cursos = [
  {
    id: 'modulo-1',
    modulo: 1,
    titulo: 'Natación',
    descripcion: 'Técnica de nado y preparación física del socorrista: estilos, respiración y nado de aproximación.',
    horas: null,
  },
  {
    id: 'modulo-2',
    modulo: 2,
    titulo: 'Prevención de accidentes en instalaciones acuáticas',
    descripcion: 'Funciones del socorrista, vigilancia, cadena de supervivencia y cómo reconocer a una persona en apuros.',
    horas: null,
  },
  {
    id: 'modulo-3',
    modulo: 3,
    titulo: 'Rescate de accidentados en instalaciones acuáticas',
    descripcion: 'Entradas al agua, aproximación, material de rescate, remolques, zafaduras y extracción.',
    horas: null,
  },
  {
    id: 'modulo-4',
    modulo: 4,
    titulo: 'Primeros auxilios',
    descripcion: 'Soporte vital básico, uso del desfibrilador (DEA) y primeros auxilios en la instalación acuática.',
    horas: null,
  },
];

const temas = [
  {
    id: 't0',
    cursoId: 'modulo-1',
    orden: 1,
    titulo: 'Técnica de nado del socorrista',
    resumen: 'Estilos de natación, respiración y nado con la cabeza fuera del agua.',
    contenido: `## Los cuatro estilos
- **Crol**: el más rápido. Brazada alterna y patada de piernas estiradas.
- **Espalda**: se nada boca arriba, con brazada alterna.
- **Braza**: brazada simultánea y patada de rana. Permite ver hacia delante con facilidad.
- **Mariposa**: brazada simultánea y patada ondulatoria con las piernas juntas.

## Respiración
En crol conviene dominar la **respiración bilateral** (a los dos lados): el nado es más equilibrado y permite mirar a ambos lados de la lámina de agua.

## Nado del socorrista
Para acercarse a una víctima se nada **crol con la cabeza fuera del agua** (crol de socorrista o de waterpolo), sin perderla de vista. Exige más esfuerzo, por eso se entrena de forma específica.

## Apnea con seguridad
Nunca se debe **hiperventilar** (respirar muy deprisa) antes de bucear: retrasa las ganas de respirar y puede provocar una pérdida de conocimiento bajo el agua. Las apneas se practican siempre acompañado.`,
    recursos: [],
  },
  {
    id: 't1',
    cursoId: 'modulo-2',
    orden: 1,
    titulo: 'El socorrista y el salvamento acuático',
    resumen: 'Funciones del socorrista, cadena de supervivencia y fases del rescate.',
    contenido: `## Funciones del socorrista
La función principal del socorrista es la **prevención**: vigilar, informar a los usuarios y adelantarse a las situaciones de riesgo. Solo cuando la prevención falla interviene en el rescate y en los primeros auxilios.

- Vigilancia activa y continua de la zona asignada.
- Prevención e información a los usuarios.
- Intervención en rescates y primeros auxilios.
- Revisión del material de salvamento y del botiquín.
- Registro de las incidencias.

## La cadena de supervivencia en el ahogamiento
- Prevenir el ahogamiento.
- Reconocer la situación y pedir ayuda (112).
- Proporcionar flotación para evitar que la víctima se hunda.
- Sacar a la víctima del agua, solo si es seguro hacerlo.
- Proporcionar los cuidados que necesite.

## Fases del rescate acuático
- **Alerta**: detectar que alguien necesita ayuda.
- **Análisis**: valorar la situación, la víctima y el material disponible.
- **Entrada** al agua.
- **Aproximación** a la víctima.
- **Contacto y control**.
- **Remolque** hasta el borde o la orilla.
- **Extracción** del agua.
- **Evaluación** y primeros auxilios.

## Cómo reconocer a una persona que se ahoga
Quien se está ahogando casi nunca grita ni hace señas: suele estar en posición vertical, con la boca a ras del agua, sin avanzar y moviendo los brazos hacia abajo de forma instintiva. Hay que desconfiar de quien parece «jugar» sin desplazarse.`,
    recursos: [
      { tipo: 'pdf', titulo: 'Tema 1 completo (PDF)', url: '' },
    ],
  },
  {
    id: 't2',
    cursoId: 'modulo-3',
    orden: 1,
    titulo: 'Técnicas de rescate acuático',
    resumen: 'Entradas al agua, aproximación, material de rescate, remolques y zafaduras.',
    contenido: `## Entradas al agua
La entrada se elige según la profundidad, lo que se conoce del fondo y la necesidad de no perder de vista a la víctima.

- **Entrada en zancada**: permite entrar sin perder de vista a la víctima. Solo con profundidad suficiente y conocida.
- **Entrada de cabeza (zambullida)**: la más rápida. Solo con el fondo conocido y profundidad suficiente.
- **Entrada deslizándose desde el borde**: cuando no se conoce la profundidad o el fondo.

## Aproximación
Se nada con la cabeza fuera del agua (crol de socorrista) para no perder el contacto visual. Al llegar, hay que detenerse a unos 2 metros, valorar el estado de la víctima y ofrecerle el material de rescate.

## Material de rescate
Siempre que se pueda, se rescata con material: tubo de rescate, aro salvavidas, pértiga o cuerda. El material mantiene la distancia de seguridad y aporta flotación.

## Remolques
- **Con material**: la víctima se agarra al tubo de rescate o queda rodeada por él.
- **Sin material**: remolque de mentón o de axilas, siempre con la boca y la nariz de la víctima fuera del agua.

## Zafaduras
Si la víctima agarra al socorrista, lo primero es **hundirse**: la víctima busca mantenerse fuera del agua y tenderá a soltarlo. Después se aplica la zafadura adecuada y se retoma el control desde atrás.`,
    recursos: [
      { tipo: 'video', titulo: 'Vídeo: entradas al agua', url: '' },
    ],
  },
  {
    id: 't3',
    cursoId: 'modulo-4',
    orden: 1,
    titulo: 'Soporte vital básico (RCP)',
    resumen: 'Secuencia del SVB, compresiones de calidad y RCP en el ahogamiento.',
    contenido: `## Secuencia del soporte vital básico
- Comprobar que la zona es segura.
- Comprobar si responde: estimularle y hablarle en voz alta.
- Si no responde, abrir la vía aérea con la maniobra **frente-mentón**.
- Comprobar si respira con normalidad: ver, oír y sentir, **no más de 10 segundos**.
- Si no respira con normalidad, llamar al 112 y pedir un DEA.
- Iniciar la RCP: **30 compresiones y 2 ventilaciones**.

## Compresiones torácicas de calidad
- En el centro del pecho.
- Profundidad de **5 a 6 cm** en el adulto.
- Ritmo de **100 a 120 compresiones por minuto**.
- Dejar que el pecho se expanda del todo entre compresiones y reducir al mínimo las interrupciones.

## RCP en el ahogamiento
En la víctima de ahogamiento el problema principal es la falta de oxígeno. Por eso, si no respira con normalidad, se empieza con **5 ventilaciones de rescate** y después se sigue con 30 compresiones y 2 ventilaciones.

## Respiración agónica
Las boqueadas lentas y ruidosas (respiración agónica) no son una respiración normal: son un signo de parada cardiaca y hay que iniciar la RCP.`,
    recursos: [],
  },
  {
    id: 't4',
    cursoId: 'modulo-4',
    orden: 2,
    titulo: 'Primeros auxilios en la instalación acuática',
    resumen: 'PLS, atragantamiento, lesión medular, hemorragias e hipotermia.',
    contenido: `## Posición lateral de seguridad (PLS)
Para la víctima **inconsciente que respira con normalidad**. Mantiene la vía aérea abierta y deja salir los vómitos. Hay que vigilar la respiración sin interrupción.

## Atragantamiento
- Si tose con eficacia: animarle a seguir tosiendo.
- Si la tos no es eficaz: **5 golpes en la espalda**, entre los omóplatos.
- Si no se resuelve: **5 compresiones abdominales** (maniobra de Heimlich).
- Alternar 5 golpes y 5 compresiones. Si pierde el conocimiento: llamar al 112 e iniciar la RCP.

## Sospecha de lesión medular
Se sospecha tras zambullidas en aguas poco profundas, golpes o caídas. En el agua hay que mantener alineados cabeza, cuello y tronco, moverla lo mínimo y extraerla con tabla espinal entre varios socorristas.

## Hemorragias
Presión directa sobre la herida con gasas o un apósito. Si las gasas se empapan, se ponen más encima sin retirar las primeras y se mantiene la presión.

## Hipotermia
Retirar la ropa mojada, secar, abrigar y proteger del viento. Bebidas calientes (nunca alcohol) solo si está consciente y puede tragar.`,
    recursos: [],
  },
  {
    id: 't5',
    cursoId: 'modulo-4',
    orden: 3,
    titulo: 'El DEA paso a paso',
    resumen: 'Qué es el desfibrilador y cómo usarlo, también junto a la piscina.',
    contenido: `## Qué es el DEA
Es un aparato que analiza el ritmo del corazón y, si hace falta, da una descarga eléctrica. Da instrucciones por voz, así que cualquier persona puede usarlo.

## Cómo usarlo
- Encenderlo en cuanto llegue y seguir sus instrucciones.
- Pegar los parches sobre el pecho desnudo y seco: uno **bajo la clavícula derecha** y otro en el costado izquierdo, bajo la axila.
- Nadie debe tocar a la víctima mientras el DEA analiza ni durante la descarga.
- Tras la descarga, **reanudar la RCP de inmediato**.

## Junto a la piscina
Sacar a la víctima del agua y secarle el pecho antes de colocar los parches. Nunca se usa con la víctima dentro del agua.`,
    recursos: [],
  },
];

const preguntas = [
  pregunta('t0', 1, '¿Cuál es el estilo de natación más rápido?',
    ['Crol', 'Braza', 'Espalda', 'Mariposa'],
    'El crol es el estilo más rápido y el más usado en los rescates.'),
  pregunta('t0', 2, '¿En qué estilo se nada boca arriba?',
    ['Espalda', 'Crol', 'Braza', 'Mariposa'],
    'En el estilo espalda el nadador avanza boca arriba con brazada alterna.'),
  pregunta('t0', 3, '¿Qué estilo utiliza la patada de rana?',
    ['Braza', 'Crol', 'Espalda', 'Mariposa'],
    'La braza combina brazada simultánea y patada de rana.'),
  pregunta('t0', 4, '¿Cómo se nada para acercarse a una víctima?',
    ['Crol con la cabeza fuera del agua', 'Braza bajo el agua', 'Espalda', 'Mariposa'],
    'Con la cabeza fuera no se pierde de vista a la víctima.'),
  pregunta('t0', 5, '¿Qué ventaja tiene la respiración bilateral en crol?',
    ['Nado más equilibrado y visión a ambos lados', 'Permite nadar sin respirar', 'Aumenta la flotación', 'Evita tener que girar la cabeza'],
    'Respirar a los dos lados equilibra la brazada y permite vigilar a ambos lados.'),
  pregunta('t0', 6, '¿Por qué no se debe hiperventilar antes de bucear?',
    ['Puede provocar una pérdida de conocimiento bajo el agua', 'Porque gasta más energía', 'Porque impide flotar', 'No hay ningún riesgo'],
    'La hiperventilación retrasa las ganas de respirar y puede causar un desmayo en apnea.'),
  pregunta('t1', 1, '¿Cuál es la función principal del socorrista?',
    ['La prevención de accidentes', 'El rescate de víctimas', 'La aplicación de primeros auxilios', 'El mantenimiento de la instalación'],
    'El rescate y los primeros auxilios son imprescindibles, pero lo que más vidas salva es la prevención.'),
  pregunta('t1', 2, '¿Cuál es el primer eslabón de la cadena de supervivencia en el ahogamiento?',
    ['Prevenir el ahogamiento', 'Sacar a la víctima del agua', 'Iniciar la RCP', 'Proporcionar flotación'],
    'La cadena empieza por la prevención; el resto de eslabones solo son necesarios si esta falla.'),
  pregunta('t1', 3, 'Según la cadena de supervivencia, antes de sacar a la víctima del agua hay que…',
    ['Proporcionarle flotación para que no se hunda', 'Iniciar las compresiones torácicas en el agua', 'Esperar a que llegue la ambulancia', 'Desalojar a los demás bañistas'],
    'Orden de la cadena: prevenir, reconocer y pedir ayuda, proporcionar flotación, sacar del agua y dar los cuidados.'),
  pregunta('t1', 4, '¿Qué número se marca en España para pedir ayuda en una emergencia?',
    ['112', '091', '062', '080'],
    'El 112 es el número único de emergencias: es gratuito y coordina a todos los servicios.'),
  pregunta('t1', 5, '¿Cómo se comporta normalmente una persona que se está ahogando?',
    ['Vertical, con la boca a ras del agua, sin avanzar y sin poder pedir ayuda', 'Grita y agita los brazos por encima de la cabeza', 'Nada con fuerza hacia el borde', 'Flota boca arriba sin moverse'],
    'Es la respuesta instintiva al ahogamiento: la persona no puede gritar ni hacer señas porque usa todo su esfuerzo en respirar.'),
  pregunta('t1', 6, '¿Qué fase del rescate va justo después de la aproximación?',
    ['Contacto y control', 'Remolque', 'Extracción', 'Análisis'],
    'Alerta, análisis, entrada, aproximación, contacto y control, remolque, extracción y evaluación.'),
  pregunta('t1', 7, 'En la fase de análisis, antes de entrar al agua, el socorrista valora…',
    ['La situación, la víctima y el material disponible', 'Solo la distancia hasta la víctima', 'La calidad del agua', 'La identidad de la víctima'],
    'Un buen análisis permite elegir la entrada, la técnica y el material más adecuados.'),
  pregunta('t1', 8, '¿Cuál de estas tareas NO corresponde al socorrista?',
    ['Diagnosticar y dar medicamentos', 'Vigilar la zona asignada', 'Revisar el material de salvamento', 'Registrar las incidencias'],
    'El socorrista presta primeros auxilios, pero diagnosticar y medicar corresponde al personal sanitario.'),

  pregunta('t2', 1, '¿Qué entrada al agua permite no perder de vista a la víctima?',
    ['Entrada en zancada', 'Entrada de cabeza', 'Entrada de espaldas', 'Entrada en bomba'],
    'En la zancada la cabeza queda fuera del agua todo el tiempo.'),
  pregunta('t2', 2, 'Si no se conoce la profundidad ni el fondo, ¿cómo se entra al agua?',
    ['Deslizándose con cuidado desde el borde', 'De cabeza, en zambullida', 'En zancada desde una altura', 'Saltando de pie con los brazos arriba'],
    'Con el fondo desconocido cualquier salto puede causar una lesión al socorrista.'),
  pregunta('t2', 3, '¿Cómo se nada durante la aproximación a la víctima?',
    ['Con la cabeza fuera del agua para no perderla de vista', 'A braza por debajo del agua', 'A espalda para ahorrar energía', 'Buceando para llegar antes'],
    'El crol de socorrista mantiene el contacto visual con la víctima.'),
  pregunta('t2', 4, '¿Dónde conviene detenerse al llegar a una víctima consciente?',
    ['A unos 2 metros, para valorarla y ofrecerle el material', 'Justo a su lado', 'A unos 10 metros', 'No hay que detenerse'],
    'La distancia de seguridad evita que la víctima agarre al socorrista.'),
  pregunta('t2', 5, '¿Por qué se prefiere rescatar con material?',
    ['Mantiene la distancia de seguridad y aporta flotación', 'Siempre es más rápido que nadar', 'Evita tener que entrar al agua', 'Porque no hace falta saber nadar'],
    'El material protege al socorrista y ayuda a mantener a la víctima a flote.'),
  pregunta('t2', 6, 'Si la víctima agarra al socorrista, ¿qué es lo primero que debe hacer?',
    ['Hundirse, porque la víctima tenderá a soltarlo', 'Golpear a la víctima', 'Gritar pidiendo ayuda', 'Nadar con fuerza hacia el borde'],
    'La víctima busca mantenerse fuera del agua: al hundirse el socorrista, suele soltarlo.'),
  pregunta('t2', 7, 'En un remolque sin material, lo más importante es…',
    ['Mantener la boca y la nariz de la víctima fuera del agua', 'Ir lo más rápido posible aunque trague agua', 'Remolcarla boca abajo', 'Sujetarla del pelo'],
    'Los remolques de mentón y de axilas mantienen la vía aérea de la víctima fuera del agua.'),
  pregunta('t2', 8, '¿Cuál de estos NO es material de rescate?',
    ['Gafas de natación', 'Tubo de rescate', 'Aro salvavidas', 'Pértiga'],
    'Tubo, aro, pértiga y cuerda son el material de rescate habitual.'),

  pregunta('t3', 1, '¿Cuál es la relación entre compresiones y ventilaciones en la RCP del adulto?',
    ['30:2', '15:2', '5:1', '30:5'],
    'En el adulto se hacen 30 compresiones seguidas de 2 ventilaciones.'),
  pregunta('t3', 2, '¿A qué ritmo se hacen las compresiones torácicas?',
    ['De 100 a 120 por minuto', 'De 60 a 80 por minuto', 'De 140 a 160 por minuto', 'De 80 a 100 por minuto'],
    'Un ritmo de 100 a 120 por minuto consigue el mejor flujo de sangre.'),
  pregunta('t3', 3, '¿Qué profundidad deben tener las compresiones en un adulto?',
    ['De 5 a 6 cm', 'De 2 a 3 cm', 'De 8 a 10 cm', 'Lo que permita el tórax, sin límite'],
    'Menos de 5 cm no es eficaz y más de 6 cm aumenta el riesgo de lesiones.'),
  pregunta('t3', 4, '¿Cuánto tiempo como máximo se dedica a comprobar si respira?',
    ['10 segundos', '30 segundos', '1 minuto', '3 segundos'],
    'Ver, oír y sentir durante no más de 10 segundos para no retrasar la RCP.'),
  pregunta('t3', 5, 'En una víctima de ahogamiento que no respira, ¿cómo se empieza la RCP?',
    ['Con 5 ventilaciones de rescate', 'Con 30 compresiones', 'Con 2 ventilaciones', 'Colocándola en posición lateral de seguridad'],
    'En el ahogamiento el problema es la falta de oxígeno, así que se empieza ventilando.'),
  pregunta('t3', 6, '¿Qué maniobra se usa para abrir la vía aérea?',
    ['Frente-mentón', 'Heimlich', 'Golpes en la espalda', 'Rautek'],
    'La maniobra frente-mentón separa la lengua de la parte posterior de la garganta.'),
  pregunta('t3', 7, 'Una víctima inconsciente hace boqueadas lentas y ruidosas. ¿Qué hay que hacer?',
    ['Considerarlo una parada cardiaca e iniciar la RCP', 'Colocarla en PLS porque respira', 'Esperar a ver si mejora', 'Darle de beber'],
    'La respiración agónica no es una respiración normal: es un signo de parada cardiaca.'),
  pregunta('t3', 8, '¿Dónde se colocan las manos para hacer las compresiones?',
    ['En el centro del pecho', 'En el lado izquierdo del pecho', 'Sobre el abdomen', 'En la base del cuello'],
    'El talón de la mano va en el centro del pecho, sobre la mitad inferior del esternón.'),

  pregunta('t4', 1, '¿Cuándo se coloca a una víctima en posición lateral de seguridad?',
    ['Cuando está inconsciente y respira con normalidad', 'Cuando está consciente y con dolor', 'Cuando está inconsciente y no respira', 'Cuando tiene una hemorragia'],
    'La PLS mantiene abierta la vía aérea de quien respira pero no responde. Si no respira: RCP.'),
  pregunta('t4', 2, 'Una persona se atraganta y tose con fuerza. ¿Qué hacemos?',
    ['Animarle a seguir tosiendo', 'Darle 5 golpes en la espalda', 'Hacerle la maniobra de Heimlich enseguida', 'Darle agua'],
    'Mientras la tos sea eficaz, es la mejor forma de expulsar el objeto.'),
  pregunta('t4', 3, 'Si la tos deja de ser eficaz, ¿qué se hace primero?',
    ['5 golpes en la espalda, entre los omóplatos', '5 compresiones abdominales', 'RCP', 'Tumbarla boca arriba'],
    'Primero 5 golpes en la espalda; si no se resuelve, 5 compresiones abdominales, y se alternan.'),
  pregunta('t4', 4, 'Si una persona atragantada pierde el conocimiento…',
    ['Se llama al 112 y se inicia la RCP', 'Se siguen haciendo compresiones abdominales', 'Se coloca en PLS', 'Se espera a que vuelva en sí'],
    'Las compresiones torácicas de la RCP también pueden desplazar el objeto.'),
  pregunta('t4', 5, '¿En qué situación hay que sospechar una lesión medular?',
    ['Tras una zambullida en aguas poco profundas', 'Ante un calambre en el gemelo', 'Tras una picadura de avispa', 'Ante una insolación'],
    'Los golpes en la cabeza contra el fondo son una causa típica de lesión medular.'),
  pregunta('t4', 6, 'Ante la sospecha de lesión medular en el agua, hay que…',
    ['Mantener alineados cabeza, cuello y tronco y moverla lo mínimo', 'Sacarla deprisa tirando de los brazos', 'Sentarla en el borde', 'Girarle la cabeza para ver si le duele'],
    'Cualquier movimiento de la columna puede agravar la lesión.'),
  pregunta('t4', 7, '¿Cuál es la primera medida ante una hemorragia externa?',
    ['Presión directa sobre la herida', 'Poner un torniquete', 'Lavar la herida con agua a presión', 'Aplicar hielo directamente'],
    'La presión directa controla la mayoría de las hemorragias externas.'),
  pregunta('t4', 8, 'Si las gasas se empapan de sangre…',
    ['Se ponen más encima sin retirar las primeras', 'Se retiran y se ponen otras nuevas', 'Se quita todo y se deja al aire', 'Se deja de hacer presión'],
    'Retirar las gasas arrancaría el coágulo que se está formando.'),

  pregunta('t5', 1, 'Según las recomendaciones actuales, ¿quién puede usar un DEA?',
    ['Cualquier persona, siguiendo sus instrucciones', 'Solo el personal médico', 'Solo los técnicos de ambulancia', 'Solo con permiso del 112'],
    'El DEA da instrucciones por voz y solo descarga si detecta un ritmo que lo necesita.'),
  pregunta('t5', 2, '¿Dónde se coloca el parche derecho del DEA?',
    ['Bajo la clavícula derecha', 'Sobre el esternón', 'En la espalda', 'En el abdomen'],
    'Un parche bajo la clavícula derecha y el otro en el costado izquierdo, bajo la axila.'),
  pregunta('t5', 3, 'Mientras el DEA analiza el ritmo…',
    ['Nadie debe tocar a la víctima', 'Se siguen haciendo compresiones', 'Se dan ventilaciones', 'Se mueve a la víctima a un lugar cómodo'],
    'El movimiento puede falsear el análisis.'),
  pregunta('t5', 4, 'Después de una descarga…',
    ['Se reanuda la RCP de inmediato', 'Se comprueba el pulso durante un minuto', 'Se retiran los parches', 'Se coloca a la víctima en PLS'],
    'Se sigue con la RCP hasta que el DEA vuelva a analizar, a los 2 minutos.'),
  pregunta('t5', 5, 'Víctima rescatada de la piscina: antes de colocar los parches hay que…',
    ['Sacarla del agua y secarle el pecho', 'Mojar los parches', 'Nada: se pueden poner dentro del agua', 'Esperar 5 minutos'],
    'El agua conduce la corriente y los parches no se pegan sobre la piel mojada.'),
];

const usuarios = [
  { id: 'u-admin', nombre: 'Dirección', email: 'admin@demo.es', rol: 'admin', cursos: [] },
  { id: 'u-laura', nombre: 'Laura García', email: 'alumno@demo.es', rol: 'alumno', cursos: ['modulo-1', 'modulo-2', 'modulo-3', 'modulo-4'] },
  { id: 'u-marcos', nombre: 'Marcos Ruiz', email: 'marcos@demo.es', rol: 'alumno', cursos: ['modulo-1', 'modulo-2'] },
];

export const DATOS_DEMO = { cursos, temas, preguntas, usuarios, intentos: [] };
