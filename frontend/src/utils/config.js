const configured = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
export const API_ROOT = configured.endsWith('/api') ? configured : `${configured}/api`;
export const ASSET_BASE = API_ROOT.slice(0, -4);
export const imageUrl = (url) => /^https?:\/\//i.test(url) ? url : url?.startsWith('/uploads/') ? ASSET_BASE + url : null;
