import { useCallback, useEffect, useState } from "react";
import { http } from "../../utils/api";
import { toast } from "../../utils/toast";
import { ORDER_STATES, PAYMENT_METHOD_LABELS } from "../../constants";
import Spinner from "../ui/Spinner";
import StatusBadge from "../ui/StatusBadge";
import Modal from "../ui/Modal";
import { SelectField } from "../ui/FormFields";
import Icon from "../ui/Icon";
import SeguimientoCastores from "../shipping/SeguimientoCastores";
import { money } from "../../utils/cart";
const totalVisible = total => total == null ? "Sin desglose histórico" : "$" + money(total);

function RegistroPago({ token, pedido, pago, onRecorded }) {
  const [referencia, setReferencia] = useState("");
  const [guardando, setGuardando] = useState(false);
  const esReembolso = pago.estado === "aprobado";
  const puedeCobrar = pago.estado === "pendiente" && pedido.estado !== "cancelado" &&
    (["transferencia", "plataforma"].includes(pago.metodo) || (pago.metodo === "contra_entrega" && pedido.estado === "entregado"));
  if (!puedeCobrar && !esReembolso) return null;

  async function registrar(event) {
    event.preventDefault();
    if (guardando || !referencia.trim()) return;
    setGuardando(true);
    try {
      const cambio = esReembolso
        ? { estado: "reembolsado", referencia_reembolso: referencia.trim() }
        : { estado: "aprobado", referencia: referencia.trim() };
      await http(`/pagos/${pago.id}/estado`, {method: "PATCH", body: JSON.stringify(cambio)}, token);
      await onRecorded();
      toast(esReembolso ? "Reembolso registrado" : "Cobro registrado");
    } catch (e) { toast(e.message, "error"); }
    finally { setGuardando(false); }
  }
  return (
    <form onSubmit={registrar} className="input-group">
      <label htmlFor="referencia-operacion">{esReembolso ? "Comprobante del reembolso total realizado" : "Comprobante del cobro recibido"}</label>
      <input id="referencia-operacion" maxLength={100} required value={referencia}
        onChange={event => setReferencia(event.target.value)} />
      <button className="btn-primary" disabled={guardando || !referencia.trim()}>
        {esReembolso ? "Registrar reembolso total" : "Registrar cobro"}
      </button>
    </form>
  );
}


export default function DetalleGestion({ selected, token, gestionarPagos = false, onClose, onChange }) {
  const [detalle,setDetalle] = useState(null);
  const [error,setError] = useState("");
  const [revision,setRevision] = useState(0);
  const recargar = useCallback(()=>setRevision(n=>n+1),[]);
  useEffect(()=>{
    let active=true;
    http("/pedidos/"+selected,{},token).then(data=>{if(active){setDetalle(data);setError("");}})
      .catch(err=>{if(active)setError(err.message);});
    return ()=>{active=false;};
  },[selected,token,revision]);
  function actualizar(){recargar();return onChange?.();}
  async function cambiarEstado(id,estado) {
    try { await http("/pedidos/"+id+"/estado",{method:"PATCH", body:JSON.stringify({estado})},token); toast("Estado actualizado"); actualizar(); }
    catch(e){toast(e.message,"error");}
  }
  return (      <Modal open onClose={onClose} title={`Pedido #${selected}`}>
        {error ? <p role="alert">{error} <button className="btn-secondary" onClick={recargar}>Reintentar</button></p> : !detalle ? <Spinner size={28} /> : detalle && detalle.pedido.id === selected ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {!detalle.pedido.cotizacion_castores_id && <SelectField label="Cambiar estado" value={detalle.pedido.estado} onChange={(e) => cambiarEstado(selected, e.target.value)}>
              {ORDER_STATES.map((e) => <option key={e} value={e}>{e}</option>)}
            </SelectField>}
            {detalle.pedido.cotizacion_castores_id && <><p>Estado del pedido <StatusBadge estado={detalle.pedido.estado} /></p>
              <p>Entregar a {detalle.pedido.direccion_linea1}, {detalle.pedido.direccion_ciudad}, {detalle.pedido.direccion_estado}, CP {detalle.pedido.direccion_cp}.</p>
              {!detalle.pedido.domicilio_id && ['pendiente','esperando_pago'].includes(detalle.pedido.estado) && <button type="button" className="btn-secondary"
                onClick={() => { if (window.confirm('¿Cancelar este pedido y conciliar su pago?')) cambiarEstado(selected,'cancelado'); }}>Cancelar pedido</button>}</>}
            <div style={{ background: "var(--gray-50)", borderRadius: 10, padding: 14, border: "1px solid var(--gray-100)" }}>
              <div style={{ fontSize: 11, color: "var(--gray-400)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 10 }}>Productos</div>
              {detalle.items.map((i) => (
                <div key={i.id} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13 }}>
                  <div>
                    <span style={{ color: "var(--gray-700)" }}>{i.producto_nombre} <span style={{ color: "var(--gray-400)" }}>×{i.cantidad}</span></span>
                    {i.proveedor_nombre && (
                      <div style={{ fontSize: 11, color: "var(--gray-400)", marginTop: 1 }}>{i.proveedor_nombre}</div>
                    )}
                  </div>
                  <span style={{ fontWeight: 700, flexShrink: 0, marginLeft: 8 }}>${(i.precio_unitario * i.cantidad).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
                </div>
              ))}
              {!!detalle.pedido.cotizacion_castores_id && !detalle.pedido.domicilio_id && <p>Flete incluido {totalVisible(detalle.pedido.flete)}</p>}
              <div style={{ borderTop: "1px solid var(--gray-200)", marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between", fontWeight: 800 }}>
                <span>{detalle.pedido.domicilio_id ? 'Total de mercancía con IVA' : 'Total'}</span><span style={{ color: "var(--red)" }}>{totalVisible(detalle.pedido.total)}</span>
              </div>
            </div>
            {detalle.pago && (
              <div style={{ background: "var(--gray-50)", borderRadius: 10, padding: 12, border: "1px solid var(--gray-100)", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
                <span style={{ color: "var(--gray-700)" }}><Icon name="creditCard" size={14} style={{ marginRight: 6, color: "var(--gray-400)", verticalAlign: "middle" }} />{PAYMENT_METHOD_LABELS[detalle.pago.metodo] || detalle.pago.metodo}</span>
                <StatusBadge estado={detalle.pago.estado} />
              </div>
            )}
            {gestionarPagos && detalle.pago && (
              <RegistroPago key={detalle.pago.id + detalle.pago.estado} token={token}
                pedido={detalle.pedido} pago={detalle.pago} onRecorded={recargar} />
            )}
            {detalle.pedido.cotizacion_castores_id ? <SeguimientoCastores key={selected} detalle={detalle} token={token} operador administrador={gestionarPagos}
              actualizar={actualizar} /> : detalle.envio && (
              <div style={{ background: "var(--gray-50)", borderRadius: 10, padding: 12, border: "1px solid var(--gray-100)", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
                <span style={{ color: "var(--gray-700)" }}><Icon name="truck" size={14} style={{ marginRight: 6, color: "var(--gray-400)", verticalAlign: "middle" }} />{detalle.envio.transportista || "Sin asignar"}</span>
                <StatusBadge estado={detalle.envio.estado} />
              </div>
            )}
          </div>
        ) : null}
      </Modal>);
}
