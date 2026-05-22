const API = import.meta.env.VITE_API_URL + "/api" || "http://localhost:3000/api"

export const http = async (path, opts = {}, token = null) => {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { ...opts, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Error en la petición");
  return data;
};

// Para subir archivos (multipart/form-data) — NO se añade Content-Type, el browser lo gestiona
export const httpUpload = async (path, formData, token = null) => {
  const headers = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { method: "POST", body: formData, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Error al subir archivo");
  return data;
};
