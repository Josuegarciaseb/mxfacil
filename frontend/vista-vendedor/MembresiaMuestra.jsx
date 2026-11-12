import { useState } from "react";
import PlanPro from "../src/pages/vendor/PlanPro";
import Modal from "../src/components/ui/Modal";
import { toast } from "../src/utils/toast";
import { diaMuestra } from "./datos";

const clave = "mx-previa-vendedor-v1:pro";
function leer() { try { return sessionStorage.getItem(clave) === "activo"; } catch { return false; } }
export default function MembresiaMuestra() {
  const [activa, activar] = useState(leer);
  const [abierto, abrir] = useState(false);
  const vence = new Date(diaMuestra + "T12:00:00Z"); vence.setUTCDate(vence.getUTCDate()+30);
  const datos = {activo:activa,vigente:activa,vence_en:activa ? vence.toISOString() : null,precio_centavos:19900,verificado:true,pago_disponible:true};
  function confirmar() {
    try { sessionStorage.setItem(clave,"activo"); } catch { /* La muestra funciona en memoria. */ }
    activar(true);abrir(false);toast("Membresía Pro de ejemplo activada.");
  }
  return <section className="pro-page"><p className="pro-eyebrow">TU NEGOCIO EN MX FÁCIL</p><h1>Mi membresía</h1><p>Haz que más comercios descubran tus productos.</p>
    <PlanPro data={datos} busy={false} pagoHabilitado onComprar={()=>abrir(true)} onVerificar={()=>toast(activa ? "Pago de ejemplo confirmado." : "Sin pagos de ejemplo pendientes.")}/>
    {abierto && <Modal open title="Revisar membresía Pro" onClose={()=>abrir(false)}>
      <p>30 días Pro por $199.00 MXN. Pago único, sin renovación automática.</p>
      <p className="aviso-demo">Esta vista previa simula la compra. No se pide tarjeta ni se realiza un cargo.</p>
      <div className="acciones-dialogo"><button className="boton boton-claro" onClick={()=>abrir(false)}>Volver sin pagar</button><button className="boton boton-bosque" onClick={confirmar}>Confirmar compra de ejemplo</button></div>
    </Modal>}</section>;
}
