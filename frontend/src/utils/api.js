const API = (import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api';

/**
 * Petición JSON autenticada.
 * • Adjunta Authorization: Bearer <token> si hay token en localStorage.
 * • No usa CSRF — la app usa JWT en header, no cookies de sesión.
 */
export const http = async (path, opts = {}, token = null) => {
  const method  = (opts.method || 'GET').toUpperCase();
  const headers = { 'Content-Type': 'application/json' };

  // Token JWT: primero el que se pasa explícito, luego el de localStorage
  const jwt = token || localStorage.getItem('token');
  if (jwt) headers['Authorization'] = `Bearer ${jwt}`;

  const res  = await fetch(`${API}${path}`, { ...opts, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Error en la petición');
  return data;
};

/**
 * Subida de archivos (multipart/form-data).
 * No se fija Content-Type — el browser lo calcula con el boundary correcto.
 */
export const httpUpload = async (path, formData, token = null) => {
  const headers = {};
  const jwt = token || localStorage.getItem('token');
  if (jwt) headers['Authorization'] = `Bearer ${jwt}`;

  const res  = await fetch(`${API}${path}`, {
    method: 'POST',
    body: formData,
    headers,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Error al subir archivo');
  return data;
};
