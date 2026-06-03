import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'

console.log(
  '%c¡STOP!',
  'color:#ff0000; font-size:64px; font-weight:900; -webkit-text-stroke:2px #800000;'
);
console.log(
  '%cEsta función del navegador es solo para desarrolladores.',
  'color:#1a1a1a; font-size:16px; font-weight:700;'
);
console.log(
  '%cSi alguien te dijo que copiaras y pegaras algo aquí, es un intento de robar tu cuenta o datos personales.\nEsto se llama ataque %cSelf-XSS%c.',
  'color:#333; font-size:14px;',
  'color:#cc0000; font-size:14px; font-weight:700;',
  'color:#333; font-size:14px;'
);
console.log(
  '%c No pegues código que no entiendas. Cierra esta ventana si alguien te pidió abrirla.',
  'color:#b45309; background:#fffbeb; font-size:13px; padding:6px 10px; border-radius:6px;'
);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
)
