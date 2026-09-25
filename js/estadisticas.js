// Cálculos sobre los tests hechos (intentos).

import { NOTA_APROBADO } from './config.js';
import { media } from './utiles.js';

export function resumen(intentos) {
  const notas = intentos.map((i) => i.nota);
  return {
    tests: intentos.length,
    media: media(notas),
    mejor: notas.length ? Math.max(...notas) : null,
    aprobados: notas.filter((n) => n >= NOTA_APROBADO).length,
  };
}

// Aciertos y preguntas respondidas de cada tema, sumando todos los tests.
// Un test puede mezclar varios temas: cada pregunta cuenta para el suyo.
export function porTema(intentos) {
  const cuenta = new Map();
  for (const i of intentos) {
    for (const p of i.preguntas) {
      const c = cuenta.get(p.temaId) ?? { aciertos: 0, total: 0 };
      c.total++;
      if (p.elegida === p.correcta) c.aciertos++;
      cuenta.set(p.temaId, c);
    }
  }
  return cuenta;
}

export function porcentaje(c) {
  return c && c.total ? Math.round((c.aciertos / c.total) * 100) : null;
}
