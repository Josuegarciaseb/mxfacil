import { API_ROOT as API } from './config';

let _token = null;
let inflight = null;

// Obtiene un token CSRF fresco del servidor y lo almacena en memoria
export async function fetchCsrfToken() {
  const res = await fetch(`${API}/csrf-token`, { credentials: 'include' });
  if (!res.ok) {
    throw new Error(`No se pudo obtener el token CSRF (HTTP ${res.status}). ¿Está el servidor corriendo?`);
  }
  const data = await res.json();
  _token = data.csrfToken ?? null;
  return _token;
}

// Devuelve el token cacheado o lo solicita si no existe
export async function ensureCsrfToken() {
  if (_token) return _token;
  return inflight ||= fetchCsrfToken().finally(() => { inflight = null; });
}

// Fuerza renovación (usado tras error 403 CSRF)
export function invalidateCsrfToken() {
  _token = null;
}
