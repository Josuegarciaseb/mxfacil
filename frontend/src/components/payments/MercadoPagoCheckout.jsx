import { useState } from "react";
import { http } from "../../utils/api";
import Btn from "../ui/Btn";
import Icon from "../ui/Icon";

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
      window.location.href = url;
    } catch (err) {
      onError(err.message);
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "12px 16px" }}>
        <div style={{ width: 40, height: 40, borderRadius: 8, background: "#009ee3", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ color: "#fff", fontWeight: 900, fontSize: 12 }}>MP</span>
        </div>
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
          ? <><div style={{ width: 15, height: 15, border: "2px solid rgba(255,255,255,.3)", borderTop: "2px solid #fff", borderRadius: "50%", animation: "spin 1s linear infinite" }} />Redirigiendo...</>
          : <><Icon name="arrowRight" size={16} />Pagar ${Number(monto).toLocaleString("es-MX", { minimumFractionDigits: 2 })} con MercadoPago</>}
      </Btn>

      <p style={{ fontSize: 11, color: "var(--gray-400)", textAlign: "center", margin: 0 }}>
        Serás redirigido a MercadoPago para completar el pago de forma segura.
      </p>
    </div>
  );
}
