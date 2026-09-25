// Acceso a los datos. Todas las pantallas leen y guardan a través de este archivo.
//
// De momento los datos viven en el navegador (localStorage), así que cada navegador
// tiene su propia copia. Cuando se conecte Supabase solo habrá que cambiar el interior
// de estas funciones: por eso todas son asíncronas y devuelven copias.

import { DATOS_DEMO } from './datos-demo.js';

const CLAVE = 'escuela.datos.v1';

let bd = cargar();

function copia(valor) {
  return valor == null ? valor : structuredClone(valor);
}

function cargar() {
  try {
    const guardado = localStorage.getItem(CLAVE);
    if (guardado) return JSON.parse(guardado);
  } catch {
    // Sin acceso al almacenamiento (modo privado estricto): se trabaja en memoria.
  }
  return copia(DATOS_DEMO);
}

function guardar() {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(bd));
  } catch {
    // Los cambios duran hasta cerrar la pestaña.
  }
}

// Guarda un elemento en una colección: lo sustituye si ya existe o lo añade.
function poner(coleccion, elemento) {
  const lista = bd[coleccion];
  const i = lista.findIndex((e) => e.id === elemento.id);
  if (i >= 0) lista[i] = copia(elemento);
  else lista.push(copia(elemento));
  guardar();
  return copia(elemento);
}

function quitar(coleccion, id) {
  bd[coleccion] = bd[coleccion].filter((e) => e.id !== id);
  guardar();
}

const porOrden = (a, b) => a.orden - b.orden;

// ---------- Cursos ----------

export async function cursos() {
  return copia(bd.cursos);
}

export async function curso(id) {
  return copia(bd.cursos.find((c) => c.id === id));
}

export async function guardarCurso(c) {
  return poner('cursos', c);
}

export async function borrarCurso(id) {
  const temaIds = new Set(bd.temas.filter((t) => t.cursoId === id).map((t) => t.id));
  bd.preguntas = bd.preguntas.filter((p) => !temaIds.has(p.temaId));
  bd.temas = bd.temas.filter((t) => t.cursoId !== id);
  for (const u of bd.usuarios) u.cursos = u.cursos.filter((c) => c !== id);
  quitar('cursos', id);
}

// ---------- Temas ----------

export async function temas(cursoId) {
  return copia(bd.temas.filter((t) => t.cursoId === cursoId).sort(porOrden));
}

export async function tema(id) {
  return copia(bd.temas.find((t) => t.id === id));
}

export async function guardarTema(t) {
  return poner('temas', t);
}

export async function borrarTema(id) {
  bd.preguntas = bd.preguntas.filter((p) => p.temaId !== id);
  quitar('temas', id);
}

// Cambia el orden de los temas de un curso según la lista de ids recibida.
export async function ordenarTemas(ids) {
  ids.forEach((id, i) => {
    const t = bd.temas.find((x) => x.id === id);
    if (t) t.orden = i + 1;
  });
  guardar();
}

// ---------- Preguntas ----------

export async function preguntas(temaIds) {
  const ids = new Set(temaIds);
  return copia(bd.preguntas.filter((p) => ids.has(p.temaId)));
}

export async function preguntasPorId(ids) {
  const buscadas = new Set(ids);
  return copia(bd.preguntas.filter((p) => buscadas.has(p.id)));
}

export async function contarPreguntas(temaIds) {
  const ids = new Set(temaIds);
  const cuenta = Object.fromEntries(temaIds.map((id) => [id, 0]));
  for (const p of bd.preguntas) if (ids.has(p.temaId)) cuenta[p.temaId]++;
  return cuenta;
}

export async function guardarPregunta(p) {
  return poner('preguntas', p);
}

export async function borrarPregunta(id) {
  quitar('preguntas', id);
}

// ---------- Usuarios ----------

export async function usuarios() {
  return copia(bd.usuarios);
}

export async function usuario(id) {
  return copia(bd.usuarios.find((u) => u.id === id));
}

export async function usuarioPorEmail(email) {
  const buscado = email.trim().toLowerCase();
  return copia(bd.usuarios.find((u) => u.email.toLowerCase() === buscado));
}

export async function guardarUsuario(u) {
  return poner('usuarios', u);
}

export async function borrarUsuario(id) {
  bd.intentos = bd.intentos.filter((i) => i.usuarioId !== id);
  quitar('usuarios', id);
}

// ---------- Intentos (tests hechos) ----------

// Filtros opcionales: { usuarioId, cursoId }. Los más recientes primero.
export async function intentos(filtro = {}) {
  return copia(
    bd.intentos
      .filter((i) => (!filtro.usuarioId || i.usuarioId === filtro.usuarioId)
        && (!filtro.cursoId || i.cursoId === filtro.cursoId))
      .sort((a, b) => b.fecha.localeCompare(a.fecha)),
  );
}

export async function intento(id) {
  return copia(bd.intentos.find((i) => i.id === id));
}

export async function guardarIntento(i) {
  return poner('intentos', i);
}

// ---------- Demostración ----------

export async function restablecerDemo() {
  bd = copia(DATOS_DEMO);
  guardar();
}
