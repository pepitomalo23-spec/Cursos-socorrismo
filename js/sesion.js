// Sesión del usuario.
//
// En la demostración basta con el correo (la contraseña no se comprueba). Con Supabase
// se usará Supabase Auth y aquí solo cambiarán entrar() y salir().

import * as almacen from './almacen.js';

const CLAVE = 'escuela.sesion.v1';

let actual = leer();

function leer() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE)) ?? null;
  } catch {
    return null;
  }
}

function escribir(valor) {
  actual = valor;
  try {
    if (valor) localStorage.setItem(CLAVE, JSON.stringify(valor));
    else localStorage.removeItem(CLAVE);
  } catch {
    // La sesión dura hasta cerrar la pestaña.
  }
}

export function usuario() {
  return actual;
}

export function esAdmin() {
  return actual?.rol === 'admin';
}

// ¿Puede el usuario actual ver este curso?
export function puedeVerCurso(cursoId) {
  return esAdmin() || Boolean(actual?.cursos?.includes(cursoId));
}

export async function entrar(email, _clave) {
  const u = await almacen.usuarioPorEmail(email);
  if (!u) throw new Error('No hay ninguna cuenta con ese correo.');
  escribir(u);
  return u;
}

export function salir() {
  escribir(null);
}

// Vuelve a leer el usuario (por si el administrador ha cambiado sus cursos o su nombre).
export async function refrescar() {
  if (!actual) return null;
  const u = await almacen.usuario(actual.id);
  escribir(u ?? null);
  return actual;
}
