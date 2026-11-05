import { ensureCsrfToken, fetchCsrfToken } from './csrf';

import { API_ROOT as API } from './config';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function requestError(status, data, jwt) {
  if (status === 401 && data.code === 'SESSION_EXPIRED' && jwt && jwt === localStorage.getItem('token')) {
    window.dispatchEvent(new CustomEvent('tienda:sesion-expirada'));
  }
  return Object.assign(new Error(data.message || 'Error en la petición'), {status,code:data.code});
}

/**
 * Petición JSON autenticada con protección CSRF.
 * • Adjunta Authorization: Bearer <token> si hay JWT en localStorage.
 * • Adjunta X-CSRF-Token en métodos mutantes (POST/PUT/PATCH/DELETE).
 * • Renueva el token CSRF automáticamente si el servidor lo rechaza (403).
 */
export const http = async (path, opts = {}, token = null) => {
  const method  = (opts.method || 'GET').toUpperCase();
  const headers = { ...(opts.body ? {'Content-Type':'application/json'} : {}), ...opts.headers };

  const jwt = token || localStorage.getItem('token');
  if (jwt) headers['Authorization'] = `Bearer ${jwt}`;

  if (MUTATING.has(method)) {
    try {
      headers['X-CSRF-Token'] = await ensureCsrfToken();
    } catch {
      throw new Error('Error de seguridad: no se pudo obtener el token CSRF. Recarga la página e intenta de nuevo.');
    }
  }

  const res  = await fetch(`${API}${path}`, { ...opts, credentials:'include', headers });
  const data = await res.json().catch(() => ({}));

  // Token CSRF expirado — renovar y reintentar una vez
  if (res.status === 403 && data.message?.includes('CSRF')) {
    headers['X-CSRF-Token'] = await fetchCsrfToken();
    const retry     = await fetch(`${API}${path}`, { ...opts, credentials:'include', headers });
    const retryData = await retry.json().catch(() => ({}));
    if (!retry.ok) throw requestError(retry.status,retryData,jwt);
    return retryData;
  }

  if (!res.ok) {
    const msg = data.message || 'Error en la petición';
    console.warn(`[API] ${method} ${path} → ${res.status}: ${msg}`);
    throw requestError(res.status,data,jwt);
  }
  return data;
};

/**
 * Subida de archivos (multipart/form-data) con protección CSRF.
 */
export const httpUpload = async (path, formData, token = null) => {
  const headers = {};
  const jwt = token || localStorage.getItem('token');
  if (jwt) headers['Authorization'] = `Bearer ${jwt}`;
  headers['X-CSRF-Token'] = await ensureCsrfToken();

  const res  = await fetch(`${API}${path}`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
    headers,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.message || 'Error al subir archivo';
    console.warn(`[API] POST ${path} → ${res.status}: ${msg}`);
    throw requestError(res.status,data,jwt);
  }
  return data;
};
