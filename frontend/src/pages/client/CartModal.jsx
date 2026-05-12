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

const CartModal = ({ open, onClose, cart, setCart, token }) => {
  const [direcciones, setDirecciones] = useState([]);
  const [orderForm,   setOrderForm]   = useState({ direccion_id: "", metodo_pago: "tarjeta" });
  const [placing,     setPlacing]     = useState(false);
  const { isMobile } = useBreakpoint();

  useEffect(() => {
    if (!open) return;
    http("/direcciones", {}, token)
      .then((d) => { setDirecciones(d); if (d.length) setOrderForm((f) => ({ ...f, direccion_id: d[0].id })); })
      .catch(() => {});
  }, [open, token]);

  const updateQty = (id, qty) => {
    if (qty <= 0) setCart((c) => c.filter((i) => i.id !== id));
    else setCart((c) => c.map((i) => i.id === id ? { ...i, qty } : i));
  };

  const cartTotal = cart.reduce((s, i) => s + i.precio * i.qty, 0);
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  const placeOrder = async () => {
    if (!orderForm.direccion_id) return toast("Selecciona una direccion", "warn");
    setPlacing(true);
    try {
      await http("/pedidos", {
        method: "POST",
        body: JSON.stringify({
          direccion_id: parseInt(orderForm.direccion_id),
          metodo_pago: orderForm.metodo_pago,
          items: cart.map((i) => ({ producto_id: i.id, cantidad: i.qty })),
        }),
      }, token);
      toast("Pedido confirmado!");
      setCart([]); onClose();
    } catch (e) { toast(e.message, "error"); }
    finally { setPlacing(false); }
  };

  if (!open) return null;

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: isMobile ? "100%" : 520 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h3 style={{ fontSize: 17, color: "var(--gray-900)" }}>Mi carrito</h3>
            {cartCount > 0 && <span className="badge badge-red-solid">{cartCount}</span>}
          </div>
          <button onClick={onClose} className="btn-ghost" style={{ padding: 6, borderRadius: "50%" }}>
            <Icon name="x" size={18} />
          </button>
        </div>

        {cart.length === 0 ? (
          <EmptyState
            icon="cart"
            title="Carrito vacio"
            sub="Agrega productos para continuar"
            action={<Btn onClick={onClose} variant="secondary"><Icon name="arrowLeft" size={16} />Ver catalogo</Btn>}
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Items */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 260, overflowY: "auto" }}>
              {cart.map((i) => (
                <div key={i.id} style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--gray-50)", padding: "10px 12px", borderRadius: 10, border: "1px solid var(--gray-100)" }}>
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
              ))}
            </div>

            {/* Total */}
            <div style={{
              background: "linear-gradient(135deg, #0D1B2A, #1a3048)",
              borderRadius: 12, padding: "14px 18px",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,.5)", letterSpacing: ".06em", textTransform: "uppercase" }}>Total del pedido</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,.35)", marginTop: 1 }}>precio mayoreo</div>
              </div>
              <span style={{ fontWeight: 900, color: "#FDE68A", fontSize: 22, letterSpacing: "-.025em" }}>
                ${cartTotal.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                <span style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,.5)", marginLeft: 4 }}>MXN</span>
              </span>
            </div>

            {/* Form */}
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
              <SelectField label="Direccion de entrega" value={orderForm.direccion_id} onChange={(e) => setOrderForm((f) => ({ ...f, direccion_id: e.target.value }))}>
                {direcciones.length === 0
                  ? <option value="">Sin direcciones</option>
                  : direcciones.map((d) => <option key={d.id} value={d.id}>{d.linea1}, {d.ciudad}</option>)}
              </SelectField>
              <SelectField label="Metodo de pago" value={orderForm.metodo_pago} onChange={(e) => setOrderForm((f) => ({ ...f, metodo_pago: e.target.value }))}>
                {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m.replace("_", " ")}</option>)}
              </SelectField>
            </div>

            {!direcciones.length && (
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 9, padding: "10px 12px" }}>
                <Icon name="alert" size={16} style={{ color: "#d97706", flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontSize: 12, color: "#92400e" }}>Agrega una direccion en "Mis Direcciones" para continuar.</span>
              </div>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <Btn variant="secondary" onClick={onClose} style={{ flex: 1 }}><Icon name="arrowLeft" size={15} />Continuar</Btn>
              <Btn onClick={placeOrder} disabled={placing || !direcciones.length} style={{ flex: 2, justifyContent: "center" }}>
                {placing
                  ? <><div style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,.3)", borderTop: "2px solid #fff", borderRadius: "50%", animation: "spin 1s linear infinite" }} />Procesando...</>
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
