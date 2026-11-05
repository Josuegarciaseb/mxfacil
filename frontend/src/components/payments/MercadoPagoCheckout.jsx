import { useState, useEffect, useRef, useCallback } from "react";
import { http } from "../../utils/api";
import Btn from "../ui/Btn";
import Icon from "../ui/Icon";

/* ── Logo MercadoPago (CDN → local fallback) ── */
const MP_LOCAL = "/mp-logo.svg";

function MpLogoIcon() {
  const src = MP_LOCAL;
  return (
    <img
      src={src}
      alt="MercadoPago"
      style={{ width: "150%", height: "150%", objectFit: "contain" }}
      draggable={false}
    />
  );
}

function MpBadge() {
  return (
    <div style={{
      width: 44, height: 44, borderRadius: 10,
      background: "#009ee3",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0, overflow: "hidden", padding: 8,
      boxShadow: "0 2px 8px rgba(0,158,227,.35)",
    }}>
      <MpLogoIcon />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */

export default function MercadoPagoCheckout({ pedidoId, monto, onSuccess, onError, token }) {
  /* null | 'waiting' | 'success' | 'pending' | 'failure' | 'closed' */
  const [paymentState, setPaymentState] = useState(null);
  const [loading,      setLoading]      = useState(false);

  const popupRef    = useRef(null);  // ventana popup
  const resolvedRef = useRef(false); // evitar doble resolución
  const mpUrlRef    = useRef(null);  // URL guardada para reabrir

  // Only a read from the authenticated API can resolve a payment.
  const [watching, setWatching] = useState(false);
  useEffect(() => {
    if (!watching) return;
    let active = true, checking = false;
    let timer;
    const deadline = Date.now() + 15 * 60 * 1000;
    const check = async () => {
      if (!active || checking || resolvedRef.current) return;
      clearTimeout(timer);
      checking = true;
      try {
        const payment = await http(`/pagos/pedido/${pedidoId}`, {}, token);
        if (!active) return;
        if (payment.estado === 'aprobado' || payment.estado === 'rechazado') {
          resolvedRef.current = true;
          setWatching(false);
          setPaymentState(payment.estado === 'aprobado' ? 'success' : 'failure');
          if (payment.estado === 'aprobado') onSuccess();
          return;
        }
        if (popupRef.current?.closed) setPaymentState('closed');
      } catch { /* retry a transient network failure within the time limit */ }
      finally { checking = false; }
      if (!active) return;
      if (Date.now() < deadline) timer = setTimeout(check, 12000);
      else { setWatching(false); setPaymentState('pending'); }
    };
    const returned = message => {
      if (message?.type === 'MP_PAYMENT_RETURN' && String(message.pedidoId) === String(pedidoId)) check();
    };
    const onMessage = event => { if (event.origin === window.location.origin) returned(event.data); };
    let channel;
    try { channel = new BroadcastChannel('mp_payment_channel'); channel.onmessage = e=>returned(e.data); } catch { /* optional */ }
    window.addEventListener('message', onMessage);
    check();
    return () => { active=false; clearTimeout(timer); channel?.close(); window.removeEventListener('message',onMessage); };
  }, [watching,pedidoId,token,onSuccess]);

  /* ──────────────────────────────────────────────────────────────────────
     Abrir (o reabrir) la ventana popup
  ─────────────────────────────────────────────────────────────────────── */
  const openPopup = useCallback((url) => {
    const popup = window.open(
      url,
      "mercadopago_checkout",
      [
        "width=960",
        "height=720",
        "left=" + Math.round((window.screen.width  - 960) / 2),
        "top="  + Math.round((window.screen.height - 720) / 2),
        "scrollbars=yes",
        "resizable=yes",
        "toolbar=no",
        "menubar=no",
        "location=no",
        "status=no",
      ].join(",")
    );

    /* Popup bloqueado → redirigir en la misma ventana */
    if (!popup || popup.closed || typeof popup.closed === "undefined") {
      window.location.href = url;
      return;
    }

    popupRef.current = popup;
    setPaymentState("waiting");
    setWatching(true);
  }, []);

  /* ──────────────────────────────────────────────────────────────────────
     Handlers de UI
  ─────────────────────────────────────────────────────────────────────── */
  const handlePay = async () => {
    resolvedRef.current = false;
    setLoading(true);
    setPaymentState(null);
    try {
      const data = await http("/pagos/mercadopago/preference", {
        method: "POST",
        body: JSON.stringify({ pedido_id: pedidoId }),
      }, token);

      const url = data.checkout_url;
      if (!url) throw new Error('Mercado Pago no está disponible.');
      mpUrlRef.current = url;
      openPopup(url);
    } catch (err) {
      onError?.(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReopen = () => {
    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.focus();
      setPaymentState("waiting");
    } else if (mpUrlRef.current) {
      resolvedRef.current = false;
      openPopup(mpUrlRef.current);
    }
  };

  const handleRetry = () => {
    resolvedRef.current = false;
    mpUrlRef.current    = null;
    popupRef.current    = null;
    setPaymentState(null);
  };

  /* ──────────────────────────────────────────────────────────────────────
     Render según estado
  ─────────────────────────────────────────────────────────────────────── */

  if (paymentState === "success") {
    return (
      <div style={{
        background: "#f0fdf4", border: "1.5px solid #bbf7d0",
        borderRadius: 12, padding: "24px 20px", textAlign: "center",
        display: "flex", flexDirection: "column", gap: 10, alignItems: "center",
      }}>
        <div style={{ fontSize: 40 }}>✅</div>
        <div style={{ fontWeight: 800, color: "#15803d", fontSize: 15 }}>¡Pago completado!</div>
        <div style={{ fontSize: 12, color: "#6b7280" }}>Procesando tu pedido…</div>
      </div>
    );
  }

  if (paymentState === "pending") {
    return (
      <div style={{
        background: "#fffbeb", border: "1.5px solid #fde68a",
        borderRadius: 12, padding: "24px 20px", textAlign: "center",
        display: "flex", flexDirection: "column", gap: 10, alignItems: "center",
      }}>
        <div style={{ fontSize: 40 }}>⏳</div>
        <div style={{ fontWeight: 800, color: "#d97706", fontSize: 15 }}>Pago en proceso</div>
        <div style={{ fontSize: 12, color: "#6b7280" }}>
          Tu pago está siendo verificado. Puedes consultar su estado en Mis pedidos.
        </div>
      </div>
    );
  }

  if (paymentState === "failure") {
    return (
      <div style={{
        background: "#fef2f2", border: "1.5px solid #fecaca",
        borderRadius: 12, padding: "24px 20px", textAlign: "center",
        display: "flex", flexDirection: "column", gap: 12, alignItems: "center",
      }}>
        <div style={{ fontSize: 40 }}>❌</div>
        <div style={{ fontWeight: 800, color: "#dc2626", fontSize: 15 }}>Pago rechazado</div>
        <div style={{ fontSize: 12, color: "#6b7280" }}>
          No fue posible procesar el pago. Verifica tu método de pago e intenta de nuevo.
        </div>
        <Btn onClick={handleRetry} style={{ background: "#dc2626", border: "none", marginTop: 4 }}>
          <Icon name="refresh" size={15} />
          Reintentar pago
        </Btn>
      </div>
    );
  }

  if (paymentState === "closed") {
    return (
      <div style={{
        background: "var(--gray-50)", border: "1.5px solid var(--gray-200)",
        borderRadius: 12, padding: "24px 20px", textAlign: "center",
        display: "flex", flexDirection: "column", gap: 12, alignItems: "center",
      }}>
        <div style={{ fontSize: 40 }}>🪟</div>
        <div style={{ fontWeight: 800, color: "var(--gray-800)", fontSize: 15 }}>
          Ventana cerrada
        </div>
        <div style={{ fontSize: 12, color: "#6b7280" }}>
          Cerraste la ventana de pago sin completarlo. ¿Deseas continuar?
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
          <Btn onClick={handleReopen} style={{ background: "#009ee3", border: "none" }}>
            <Icon name="arrowRight" size={15} />
            Continuar el pago
          </Btn>
          <Btn onClick={handleRetry} variant="secondary">
            <Icon name="refresh" size={15} />
            Nuevo intento
          </Btn>
        </div>
      </div>
    );
  }

  if (paymentState === "waiting") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          background: "#eff6ff", border: "1px solid #bfdbfe",
          borderRadius: 10, padding: "12px 16px",
        }}>
          <MpBadge />
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: "var(--gray-900)" }}>MercadoPago</div>
            <div style={{ fontSize: 11, color: "#3b82f6" }}>
              Ventana de pago abierta — completa el pago ahí
            </div>
          </div>
        </div>

        <div style={{
          background: "#eff6ff", border: "1px solid #bfdbfe",
          borderRadius: 10, padding: "13px 16px",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <div style={{
            width: 14, height: 14, flexShrink: 0,
            border: "2px solid rgba(59,130,246,.25)",
            borderTop: "2px solid #3b82f6",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }} />
          <span style={{ fontSize: 13, color: "#1d4ed8", fontWeight: 600 }}>
            Esperando confirmación de pago…
          </span>
        </div>

        <Btn onClick={handleReopen} variant="secondary" style={{ justifyContent: "center" }}>
          <Icon name="arrowRight" size={15} />
          Volver a la ventana de MercadoPago
        </Btn>

        <p style={{ fontSize: 11, color: "var(--gray-400)", textAlign: "center", margin: 0 }}>
          Esta pantalla se actualizará automáticamente al completarse el pago.
        </p>
      </div>
    );
  }

  /* Estado inicial */
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        background: "#f0fdf4", border: "1px solid #bbf7d0",
        borderRadius: 10, padding: "12px 16px",
      }}>
        <MpBadge />
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: "var(--gray-900)" }}>MercadoPago</div>
          <div style={{ fontSize: 11, color: "var(--gray-500)" }}>Tarjeta, OXXO, transferencia y más</div>
        </div>
      </div>

      <Btn
        onClick={handlePay}
        disabled={loading}
        style={{ justifyContent: "center", background: "#009ee3", border: "none" }}
      >
        {loading
          ? <>
              <div style={{
                width: 15, height: 15,
                border: "2px solid rgba(255,255,255,.3)",
                borderTop: "2px solid #fff",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }} />
              Abriendo MercadoPago…
            </>
          : <>
              <Icon name="arrowRight" size={16} />
              Pagar ${Number(monto).toLocaleString("es-MX", { minimumFractionDigits: 2 })} con MercadoPago
            </>
        }
      </Btn>

      <p style={{ fontSize: 11, color: "var(--gray-400)", textAlign: "center", margin: 0 }}>
        Se abrirá una ventana emergente de MercadoPago para completar el pago de forma segura.
      </p>
    </div>
  );
}
