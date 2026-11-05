import { API_ROOT } from './config';
import { http } from './api';

const hex = bytes => Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
export async function startGoogle() {
  const verifier = hex(crypto.getRandomValues(new Uint8Array(32)));
  const digest = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier));
  sessionStorage.setItem('google_verifier',verifier);
  const url = new URL(`${API_ROOT}/auth/google`,window.location.origin);
  url.searchParams.set('challenge',hex(new Uint8Array(digest)));
  url.searchParams.set('origin',window.location.origin);
  window.location.assign(url.href);
}

let pending;
export function exchangeGoogle(code,totpCode) {
  if (pending) return pending; // React StrictMode may mount the callback twice.
  const verifier = sessionStorage.getItem('google_verifier');
  sessionStorage.setItem('google_code',code || '');
  pending = http('/auth/google/exchange',{method:'POST',body:JSON.stringify({code,verifier,totp_code:totpCode})})
    .then(data=>{sessionStorage.removeItem('google_verifier');sessionStorage.removeItem('google_code');return data;})
    .finally(()=>{pending=null;});
  return pending;
}
