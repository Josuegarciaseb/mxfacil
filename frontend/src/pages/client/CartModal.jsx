import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { http } from "../../utils/api";
import { toast } from "../../utils/toast";
import { useBreakpoint } from "../../hooks/useBreakpoint";
import { PAYMENT_METHODS } from "../../constants";
import Btn from "../../components/ui/Btn";
import EmptyState from "../../components/ui/EmptyState";
import { SelectField } from "../../components/ui/FormFields";
import Icon from "../../components/ui/Icon";
import StripeCheckout from "../../components/payments/StripeCheckout";
import PayPalCheckout from "../../components/payments/PayPalCheckout";
import MercadoPagoCheckout from "../../components/payments/MercadoPagoCheckout";

const DIGITAL_METHODS = ["tarjeta", "paypal", "mercadopago"];

const CartModal = ({ open, onClose, cart, setCart, token }) => {
  const [direcciones, setDirecciones]   = useState([]);
  const [orderForm,   setOrderForm]     = useState({ direccion_id: "", metodo_pago: "tarjeta" });
  const [placing,     setPlacing]       = useState(false);
  const [paymentStep, setPaymentStep]   = useState(null); // { pedidoId, monto, metodo }
  const { isMobile } = useBreakpoint();

  useEffect(() => {
    if (!open) return;
    http("/direcciones", {}, token)
      .then((d) => {
        setDirecciones(d);
        if (d.length) setOrderForm((f) => ({ ...f, direccion_id: d[0].id }));
      })
      .catch(() => {});
  }, [open, token]);

  useEffect(() => {
    if (!open) {
      setPaymentStep(null);
    }
  }, [open]);

  const updateQty = (id, qty) => {
    if (qty <= 0) setCart((c) => c.filter((i) => i.id !== id));
    else setCart((c) => c.map((i) => (i.id === id ? { ...i, qty } : i)));
  };

  const cartSubtotal = cart.reduce((s, i) => s + i.precio * i.qty, 0);
  const cartIva      = parseFloat((cartSubtotal * 0.16).toFixed(2));
  const cartTotal    = parseFloat((cartSubtotal + cartIva).toFixed(2));
  const cartCount    = cart.reduce((s, i) => s + i.qty, 0);

  const handleConfirm = async () => {
    if (!orderForm.direccion_id) return toast("Selecciona una dirección", "warn");
    setPlacing(true);
    try {
      const result = await http("/pedidos", {
        method: "POST",
        body: JSON.stringify({
          direccion_id: parseInt(orderForm.direccion_id),
          metodo_pago:  orderForm.metodo_pago,
          items:        cart.map((i) => ({ producto_id: i.id, cantidad: i.qty })),
        }),
      }, token);

      if (!DIGITAL_METHODS.includes(orderForm.metodo_pago)) {
        toast("Pedido confirmado!");
        setCart([]);
        onClose();
        return;
      }

      setPaymentStep({
        pedidoId: result.pedido.id,
        monto:    result.pedido.total,
        metodo:   orderForm.metodo_pago,
      });
      setCart([]);
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setPlacing(false);
    }
  };

  const handlePaymentSuccess = () => {
    toast("Pago completado. ¡Gracias por tu compra!");
    setPaymentStep(null);
    onClose();
  };

  const handlePaymentError = (msg) => {
    toast(msg || "Error al procesar el pago", "error");
  };

  if (!open) return null;

  /* ── Estilos dinámicos según tamaño de pantalla ── */
  const overlayStyle = isMobile
    ? { display: "flex", alignItems: "flex-end", padding: 0 }
    : {};

  const modalStyle = isMobile
    ? {
        maxWidth: "100%",
        width: "100%",
        borderRadius: "20px 20px 0 0",
        maxHeight: "92dvh",
        overflowY: "auto",
        margin: 0,
        paddingBottom: 28,
        animation: "slideUp .32s cubic-bezier(.22,1,.36,1)",
      }
    : { maxWidth: 520 };

  return createPortal(
    <div className="modal-overlay" style={overlayStyle} onClick={paymentStep ? undefined : onClose}>
      <div
        className="modal"
        style={modalStyle}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle decorativo en mobile */}
        {isMobile && (
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 14, marginTop: -4 }}>
            <div style={{ width: 40, height: 4, borderRadius: 99, background: "var(--gray-200)" }} />
          </div>
        )}

        {/* ── HEADER ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {paymentStep && (
              <button
                onClick={() => setPaymentStep(null)}
                className="btn-ghost"
                style={{ padding: 6, borderRadius: "50%", marginRight: 2 }}
              >
                <Icon name="arrowLeft" size={16} />
              </button>
            )}
            <h3 style={{ fontSize: 17, color: "var(--gray-900)" }}>
              {paymentStep ? "Completar pago" : "Mi carrito"}
            </h3>
            {!paymentStep && cartCount > 0 && (
              <span className="badge badge-red-solid">{cartCount}</span>
            )}
          </div>
          <button onClick={onClose} className="btn-ghost" style={{ padding: 6, borderRadius: "50%" }}>
            <Icon name="x" size={18} />
          </button>
        </div>

        {/* ── PASO 2: PAGO ── */}
        {paymentStep ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{
              background: "linear-gradient(135deg, #173404, #1e4205)",
              borderRadius: 10, padding: "12px 16px",
              display: "flex", justifyContent: "space-between", alignItems: "center",
              flexWrap: "wrap", gap: 8,
            }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,.5)", textTransform: "uppercase", letterSpacing: ".06em" }}>
                Total a pagar
              </span>
              <span style={{ fontWeight: 900, color: "#FDE68A", fontSize: isMobile ? 18 : 20 }}>
                ${Number(paymentStep.monto).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                <span style={{ fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,.4)", marginLeft: 4 }}>MXN</span>
              </span>
            </div>

            {paymentStep.metodo === "tarjeta" && (
              <StripeCheckout
                pedidoId={paymentStep.pedidoId}
                monto={paymentStep.monto}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
                token={token}
              />
            )}

            {paymentStep.metodo === "paypal" && (
              <PayPalCheckout
                pedidoId={paymentStep.pedidoId}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
                token={token}
              />
            )}

            {paymentStep.metodo === "mercadopago" && (
              <MercadoPagoCheckout
                pedidoId={paymentStep.pedidoId}
                monto={paymentStep.monto}
                onError={handlePaymentError}
                token={token}
              />
            )}
          </div>
        ) : cart.length === 0 ? (
          /* ── CARRITO VACÍO ── */
          <EmptyState
            icon="cart"
            title="Carrito vacío"
            sub="Agrega productos para continuar"
            action={
              <Btn onClick={onClose} variant="secondary">
                <Icon name="arrowLeft" size={16} />Ver catálogo
              </Btn>
            }
          />
        ) : (
          /* ── PASO 1: CARRITO + FORM ── */
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Items */}
            <div style={{
              display: "flex", flexDirection: "column", gap: 8,
              maxHeight: isMobile ? "38vh" : 260,
              overflowY: "auto",
              paddingRight: 2,
            }}>
              {cart.map((i) => (
                <div
                  key={i.id}
                  style={{
                    background: "var(--gray-50)",
                    padding: isMobile ? "9px 10px" : "10px 12px",
                    borderRadius: 10,
                    border: "1px solid var(--gray-100)",
                  }}
                >
                  {isMobile ? (
                    /* ── Fila mobile: 2 filas ── */
                    <>
                      {/* Fila 1: nombre + total */}
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: "var(--gray-900)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {i.nombre}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--gray-500)", marginTop: 1 }}>
                            ${parseFloat(i.precio).toLocaleString("es-MX", { minimumFractionDigits: 2 })} c/u
                          </div>
                        </div>
                        <div style={{ fontWeight: 800, color: "var(--red)", fontSize: 14, flexShrink: 0 }}>
                          ${(i.precio * i.qty).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                      {/* Fila 2: controles cantidad + eliminar */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <button onClick={() => updateQty(i.id, i.qty - 1)} style={{ width: 28, height: 28, border: "1.5px solid var(--gray-200)", borderRadius: 6, background: "var(--white)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "var(--gray-600)", fontSize: 16 }}>−</button>
                          <span style={{ fontWeight: 700, minWidth: 22, textAlign: "center", fontSize: 14 }}>{i.qty}</span>
                          <button onClick={() => updateQty(i.id, i.qty + 1)} style={{ width: 28, height: 28, border: "1.5px solid var(--gray-200)", borderRadius: 6, background: "var(--white)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "var(--gray-600)", fontSize: 16 }}>+</button>
                        </div>
                        <button onClick={() => setCart((c) => c.filter((x) => x.id !== i.id))} className="btn-ghost" style={{ padding: "4px 8px", color: "#dc2626" }}>
                          <Icon name="trash" size={14} />
                        </button>
                      </div>
                    </>
                  ) : (
                    /* ── Fila desktop: 1 fila ── */
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 38, height: 38, background: "var(--red-pale)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--red)", flexShrink: 0 }}>
                        <Icon name="package" size={17} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: "var(--gray-900)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{i.nombre}</div>
                        <div style={{ fontSize: 11, color: "var(--gray-500)" }}>${parseFloat(i.precio).toLocaleString("es-MX", { minimumFractionDigits: 2 })} c/u</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                        <button onClick={() => updateQty(i.id, i.qty - 1)} style={{ width: 26, height: 26, border: "1.5px solid var(--gray-200)", borderRadius: 6, background: "var(--white)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "var(--gray-600)" }}>-</button>
                        <span style={{ fontWeight: 700, minWidth: 20, textAlign: "center", fontSize: 14 }}>{i.qty}</span>
                        <button onClick={() => updateQty(i.id, i.qty + 1)} style={{ width: 26, height: 26, border: "1.5px solid var(--gray-200)", borderRadius: 6, background: "var(--white)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "var(--gray-600)" }}>+</button>
                      </div>
                      <div style={{ minWidth: 70, textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontWeight: 800, color: "var(--red)", fontSize: 14 }}>${(i.precio * i.qty).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</div>
                      </div>
                      <button onClick={() => setCart((c) => c.filter((x) => x.id !== i.id))} className="btn-ghost" style={{ padding: 5, color: "#dc2626", flexShrink: 0 }}>
                        <Icon name="trash" size={14} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Desglose IVA + Total */}
            <div style={{ background: "linear-gradient(135deg, #173404, #1e4205)", borderRadius: 12, padding: isMobile ? "12px 14px" : "14px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,.55)" }}>Subtotal</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,.75)" }}>
                  ${cartSubtotal.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,.55)" }}>IVA (16%)</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,.75)" }}>
                  +${cartIva.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div style={{ borderTop: "1px solid rgba(255,255,255,.15)", paddingTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,.5)", letterSpacing: ".06em", textTransform: "uppercase" }}>
                  Total del pedido
                </div>
                <span style={{ fontWeight: 900, color: "#FDE68A", fontSize: isMobile ? 19 : 22, letterSpacing: "-.025em" }}>
                  ${cartTotal.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                  <span style={{ fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,.5)", marginLeft: 4 }}>MXN</span>
                </span>
              </div>
            </div>

            {/* Form */}
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
              <SelectField
                label="Dirección de entrega"
                value={orderForm.direccion_id}
                onChange={(e) => setOrderForm((f) => ({ ...f, direccion_id: e.target.value }))}
              >
                {direcciones.length === 0
                  ? <option value="">Sin direcciones</option>
                  : direcciones.map((d) => <option key={d.id} value={d.id}>{d.linea1}, {d.ciudad}</option>)}
              </SelectField>

              <SelectField
                label="Método de pago"
                value={orderForm.metodo_pago}
                onChange={(e) => setOrderForm((f) => ({ ...f, metodo_pago: e.target.value }))}
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </SelectField>
            </div>

            {!direcciones.length && (
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 9, padding: "10px 12px" }}>
                <Icon name="alert" size={16} style={{ color: "#d97706", flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontSize: 12, color: "#92400e" }}>Agrega una dirección en "Mis Direcciones" para continuar.</span>
              </div>
            )}

            {DIGITAL_METHODS.includes(orderForm.metodo_pago) && (
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 9, padding: "10px 12px" }}>
                <Icon name="info" size={16} style={{ color: "#2563eb", flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontSize: 12, color: "#1d4ed8" }}>Al confirmar se creará tu pedido y podrás completar el pago en el siguiente paso.</span>
              </div>
            )}

            {/* Botones de acción */}
            <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 10 }}>
              <Btn variant="secondary" onClick={onClose} style={{ flex: isMobile ? "unset" : 1, justifyContent: "center" }}>
                <Icon name="arrowLeft" size={15} />Continuar comprando
              </Btn>
              <Btn
                onClick={handleConfirm}
                disabled={placing || !direcciones.length}
                style={{ flex: isMobile ? "unset" : 2, justifyContent: "center" }}
              >
                {placing
                  ? <><div style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,.3)", borderTop: "2px solid #fff", borderRadius: "50%", animation: "spin 1s linear infinite" }} />Procesando...</>
                  : DIGITAL_METHODS.includes(orderForm.metodo_pago)
                    ? <><Icon name="arrowRight" size={16} />Continuar al pago</>
                    : <><Icon name="check" size={16} />Confirmar pedido</>}
              </Btn>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default CartModal;
