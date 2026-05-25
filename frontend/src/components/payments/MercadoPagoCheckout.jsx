import { useState } from "react";
import { http } from "../../utils/api";
import Btn from "../ui/Btn";
import Icon from "../ui/Icon";

/* ── Logo MercadoPago (intenta CDN oficial, cae a local si falla) ── */
const MP_CDN  = "https://http2.mlstatic.com/frontend-assets/mp-web-navigation/ui-navigation/6.7.0/mercadopago/logo__large@2x.png";
const MP_LOCAL = "/mp-logo.svg";

function MpLogoIcon() {
  const [src, setSrc] = useState(MP_CDN);

  return (
    <img
      src={src}
      alt="MercadoPago"
      onError={() => setSrc(MP_LOCAL)}
      style={{ width: "100%", height: "100%", objectFit: "contain", filter: "brightness(0) invert(1)" }}
      draggable={false}
    />
  );
}

export default function MercadoPagoCheckout({ pedidoId, monto, onError, token }) {
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    setLoading(true);
    try {
      const data = await http("/pagos/mercadopago/preference", {
        method: "POST",
        body: JSON.stringify({ pedido_id: pedidoId }),
      }, token);

      const url = import.meta.env.DEV ? data.sandbox_init_point : data.init_point;

      /* ── Abrir ventana emergente de MercadoPago ── */
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

      /* Fallback: si el navegador bloqueó el popup, redirigir normalmente */
      if (!popup || popup.closed || typeof popup.closed === "undefined") {
        window.location.href = url;
      }
    } catch (err) {
      onError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* ── Tarjeta de método ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        background: "#f0fdf4", border: "1px solid #bbf7d0",
        borderRadius: 10, padding: "12px 16px",
      }}>
        {/* Logo MP */}
        <div style={{
          width: 44, height: 44, borderRadius: 10,
          background: "#009ee3",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, overflow: "hidden", padding: 8,
          boxShadow: "0 2px 8px rgba(0,158,227,.35)",
        }}>
          <MpLogoIcon />
        </div>

        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: "var(--gray-900)" }}>MercadoPago</div>
          <div style={{ fontSize: 11, color: "var(--gray-500)" }}>Tarjeta, OXXO, transferencia y más</div>
        </div>
      </div>

      {/* ── Botón de pago ── */}
      <Btn
        onClick={handlePay}
        disabled={loading}
        style={{ justifyContent: "center", background: "#009ee3", border: "none" }}
      >
        {loading
          ? <>
              <div style={{ width: 15, height: 15, border: "2px solid rgba(255,255,255,.3)", borderTop: "2px solid #fff", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
              Abriendo MercadoPago…
            </>
          : <>
              <Icon name="arrowRight" size={16} />
              Pagar ${Number(monto).toLocaleString("es-MX", { minimumFractionDigits: 2 })} con MercadoPago
            </>}
      </Btn>

      <p style={{ fontSize: 11, color: "var(--gray-400)", textAlign: "center", margin: 0 }}>
        Se abrirá una ventana emergente de MercadoPago para completar el pago de forma segura.
      </p>
    </div>
  );
}
