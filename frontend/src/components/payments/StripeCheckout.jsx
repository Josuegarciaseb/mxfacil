import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { http } from "../../utils/api";
import Btn from "../ui/Btn";
import Icon from "../ui/Icon";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const CARD_STYLE = {
  style: {
    base: {
      fontSize: "15px",
      color: "var(--gray-900)",
      "::placeholder": { color: "var(--gray-400)" },
    },
    invalid: { color: "#dc2626" },
  },
};

function StripeForm({ pedidoId, monto, onSuccess, onError, token }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setProcessing(true);
    try {
      const { client_secret } = await http("/pagos/stripe/intent", {
        method: "POST",
        body: JSON.stringify({ pedido_id: pedidoId }),
      }, token);

      const result = await stripe.confirmCardPayment(client_secret, {
        payment_method: { card: elements.getElement(CardElement) },
      });

      if (result.error) {
        onError(result.error.message);
      } else if (result.paymentIntent.status === "succeeded") {
        /* Confirmar en el backend directamente (no depender solo del webhook) */
        try {
          await http("/pagos/stripe/confirm", {
            method: "POST",
            body: JSON.stringify({ pedido_id: pedidoId }),
          }, token);
        } catch (confirmErr) {
          /* No bloquear — el pago ya fue procesado por Stripe */
          console.warn("Stripe confirm error:", confirmErr.message);
        }
        onSuccess();
      }
    } catch (err) {
      onError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ background: "var(--gray-50)", border: "1.5px solid var(--gray-200)", borderRadius: 10, padding: "14px 16px" }}>
        <CardElement options={CARD_STYLE} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "8px 12px" }}>
        <Icon name="shield" size={14} style={{ color: "#16a34a", flexShrink: 0 }} />
        <span style={{ fontSize: 11, color: "#15803d" }}>Pago seguro con cifrado SSL — tus datos nunca se almacenan.</span>
      </div>
      <Btn type="submit" disabled={!stripe || processing} style={{ justifyContent: "center" }}>
        {processing
          ? <><div style={{ width: 15, height: 15, border: "2px solid rgba(255,255,255,.3)", borderTop: "2px solid #fff", borderRadius: "50%", animation: "spin 1s linear infinite" }} />Procesando...</>
          : <><Icon name="creditCard" size={16} />Pagar ${Number(monto).toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN</>}
      </Btn>
    </form>
  );
}

export default function StripeCheckout({ pedidoId, monto, onSuccess, onError, token }) {
  return (
    <Elements stripe={stripePromise}>
      <StripeForm pedidoId={pedidoId} monto={monto} onSuccess={onSuccess} onError={onError} token={token} />
    </Elements>
  );
}
