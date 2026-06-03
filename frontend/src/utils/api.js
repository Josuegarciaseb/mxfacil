import { ensureCsrfToken, fetchCsrfToken } from './csrf';

const API = (import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Petición JSON autenticada con protección CSRF.
 * • Adjunta Authorization: Bearer <token> si hay JWT en localStorage.
 * • Adjunta X-CSRF-Token en métodos mutantes (POST/PUT/PATCH/DELETE).
 * • Renueva el token CSRF automáticamente si el servidor lo rechaza (403).
 */
export const http = async (path, opts = {}, token = null) => {
  const method  = (opts.method || 'GET').toUpperCase();
  const headers = { 'Content-Type': 'application/json' };

  const jwt = token || localStorage.getItem('token');
  if (jwt) headers['Authorization'] = `Bearer ${jwt}`;

  if (MUTATING.has(method)) {
    try {
      headers['X-CSRF-Token'] = await ensureCsrfToken();
    } catch {
      throw new Error('Error de seguridad: no se pudo obtener el token CSRF. Recarga la página e intenta de nuevo.');
    }
  }

  const res  = await fetch(`${API}${path}`, { ...opts, headers });
  const data = await res.json().catch(() => ({}));

  // Token CSRF expirado — renovar y reintentar una vez
  if (res.status === 403 && data.message?.includes('CSRF')) {
    headers['X-CSRF-Token'] = await fetchCsrfToken();
    const retry     = await fetch(`${API}${path}`, { ...opts, headers });
    const retryData = await retry.json().catch(() => ({}));
    if (!retry.ok) throw new Error(retryData.message || 'Error en la petición');
    return retryData;
  }

  if (!res.ok) {
    const msg = data.message || 'Error en la petición';
    console.warn(`[API] ${method} ${path} → ${res.status}: ${msg}`);
    throw new Error(msg);
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
    body: formData,
    headers,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.message || 'Error al subir archivo';
    console.warn(`[API] POST ${path} → ${res.status}: ${msg}`);
    throw new Error(msg);
  }
  return data;
};
