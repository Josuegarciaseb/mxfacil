const API = (import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api';

// ── Token CSRF ────────────────────────────────────────────────────────────────
// Se obtiene UNA vez al iniciar la app (ver App.jsx → fetchCsrfToken).
// Se adjunta automáticamente en todas las peticiones que modifican estado.
// La cookie CSRF la gestiona el browser; aquí solo guardamos el token derivado.
let _csrfToken = null;

/**
 * Llama a GET /api/csrf-token con credentials:'include' para que el backend
 * genere la cookie CSRF y nos devuelva el token.  Se llama en App.jsx al montar.
 */
export const fetchCsrfToken = async () => {
  try {
    const res = await fetch(`${API}/csrf-token`, { credentials: 'include' });
    const data = await res.json();
    if (data.csrfToken) _csrfToken = data.csrfToken;
  } catch {
    // Silencioso — en desarrollo sin backend la app sigue funcionando
  }
};

/**
 * Petición JSON autenticada.
 * • Adjunta Authorization: Bearer <token> si se proporciona.
 * • Adjunta X-CSRF-Token en POST / PUT / PATCH / DELETE.
 * • Envía credentials:'include' para que la cookie CSRF viaje al backend.
 */
export const http = async (path, opts = {}, token = null) => {
  const method  = (opts.method || 'GET').toUpperCase();
  const headers = { 'Content-Type': 'application/json' };

  if (token) headers['Authorization'] = `Bearer ${token}`;

  // Solo métodos que modifican estado necesitan el token CSRF
  if (_csrfToken && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    headers['X-CSRF-Token'] = _csrfToken;
  }

  const res  = await fetch(`${API}${path}`, { ...opts, headers, credentials: 'include' });
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
  if (token)      headers['Authorization'] = `Bearer ${token}`;
  if (_csrfToken) headers['X-CSRF-Token']  = _csrfToken;

  const res  = await fetch(`${API}${path}`, {
    method: 'POST',
    body: formData,
    headers,
    credentials: 'include',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Error al subir archivo');
  return data;
};
