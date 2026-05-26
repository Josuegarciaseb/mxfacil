import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

/* ── Config por estado ── */
const STATUS_CFG = {
  success: {
    emoji: "✅",
    title: "¡Pago completado!",
    text:  "Tu pago fue procesado exitosamente.",
    color:  "#15803d",
    bg:     "#f0fdf4",
    border: "#bbf7d0",
  },
  failure: {
    emoji: "❌",
    title: "Pago no completado",
    text:  "No fue posible procesar el pago. Puedes intentarlo nuevamente.",
    color:  "#dc2626",
    bg:     "#fef2f2",
    border: "#fecaca",
  },
  pending: {
    emoji: "⏳",
    title: "Pago en proceso",
    text:  "Tu pago está siendo verificado. Te notificaremos cuando se acredite.",
    color:  "#d97706",
    bg:     "#fffbeb",
    border: "#fde68a",
  },
};

export default function PaymentReturn() {
  const [params]  = useSearchParams();
  const navigate  = useNavigate();
  const [seconds, setSeconds] = useState(4);

  const status = params.get("status") || "pending";
  const cfg    = STATUS_CFG[status] ?? STATUS_CFG.pending;

  useEffect(() => {
    /* 1 ── Notificar a la ventana principal:
       Se usa BroadcastChannel como canal principal porque MercadoPago
       aplica Cross-Origin-Opener-Policy, lo que anula window.opener
       cuando el popup pasa por su dominio.
       postMessage se intenta igual como fallback por si opener sigue activo. */
    try {
      const bc = new BroadcastChannel("mp_payment_channel");
      bc.postMessage({ type: "MP_PAYMENT_RETURN", status });
      bc.close();
    } catch { /* BroadcastChannel no soportado */ }

    if (window.opener && !window.opener.closed) {
      try {
        window.opener.postMessage(
          { type: "MP_PAYMENT_RETURN", status },
          window.location.origin
        );
      } catch { /* ignore */ }
    }

    /* 2 ── Countdown: intenta cerrar la ventana; si no puede, redirige */
    const interval = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(interval);
          window.close();
          /* Fallback: si window.close() no funcionó (ventana principal),
             redirigir a mis-pedidos después de un breve instante */
          setTimeout(() => {
            navigate("/mis-pedidos", { replace: true });
          }, 400);
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      minHeight: "100vh", padding: 24,
      background: "#f9fafb",
      fontFamily: "'Sora', sans-serif",
    }}>
      <div style={{
        background: cfg.bg,
        border: `1.5px solid ${cfg.border}`,
        borderRadius: 20, padding: "44px 36px",
        maxWidth: 380, width: "100%",
        textAlign: "center",
        boxShadow: "0 4px 32px rgba(0,0,0,.08)",
      }}>
        {/* Emoji grande */}
        <div style={{ fontSize: 56, marginBottom: 18, lineHeight: 1 }}>{cfg.emoji}</div>

        {/* Título */}
        <h2 style={{
          margin: "0 0 10px",
          color: cfg.color, fontSize: 20, fontWeight: 800,
        }}>
          {cfg.title}
        </h2>

        {/* Texto descriptivo */}
        <p style={{
          margin: "0 0 24px",
          color: "#6b7280", fontSize: 13, lineHeight: 1.7,
        }}>
          {cfg.text}
        </p>

        {/* Countdown */}
        <div style={{
          fontSize: 12, color: "#9ca3af",
          background: "rgba(0,0,0,.04)",
          borderRadius: 8, padding: "8px 16px",
          display: "inline-block",
        }}>
          Cerrando en {seconds} segundo{seconds !== 1 ? "s" : ""}…
        </div>
      </div>
    </div>
  );
}
