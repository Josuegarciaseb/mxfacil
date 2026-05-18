import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import { http } from "../../utils/api";

const PAYPAL_OPTIONS = {
  "client-id": import.meta.env.VITE_PAYPAL_CLIENT_ID,
  currency: "MXN",
  intent: "capture",
};

export default function PayPalCheckout({ pedidoId, onSuccess, onError, token }) {
  const createOrder = async () => {
    const data = await http("/pagos/paypal/create", {
      method: "POST",
      body: JSON.stringify({ pedido_id: pedidoId }),
    }, token);
    return data.paypal_order_id;
  };

  const onApprove = async (data) => {
    try {
      await http("/pagos/paypal/capture", {
        method: "POST",
        body: JSON.stringify({ pedido_id: pedidoId, paypal_order_id: data.orderID }),
      }, token);
      onSuccess();
    } catch (err) {
      onError(err.message);
    }
  };

  return (
    <PayPalScriptProvider options={PAYPAL_OPTIONS}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <PayPalButtons
          style={{ layout: "vertical", shape: "rect", label: "pay", height: 45 }}
          createOrder={createOrder}
          onApprove={onApprove}
          onError={(err) => onError(err?.message || "Error al procesar PayPal")}
        />
        <p style={{ fontSize: 11, color: "var(--gray-400)", textAlign: "center", margin: 0 }}>
          Serás redirigido a PayPal para completar el pago de forma segura.
        </p>
      </div>
    </PayPalScriptProvider>
  );
}
