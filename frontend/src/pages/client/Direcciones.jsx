import { useState, useEffect, useCallback } from "react";
import { http } from "../../utils/api";
import { toast } from "../../utils/toast";
import Spinner from "../../components/ui/Spinner";
import EmptyState from "../../components/ui/EmptyState";
import PageHeader from "../../components/ui/PageHeader";
import Modal from "../../components/ui/Modal";
import Btn from "../../components/ui/Btn";
import { InputField } from "../../components/ui/FormFields";
import Icon from "../../components/ui/Icon";

const ClientDirecciones = ({ token }) => {
  const [dirs,   setDirs]   = useState([]);
  const [loading,setLoading]= useState(true);
  const [modal,  setModal]  = useState(null);
  const [form,   setForm]   = useState({ linea1: "", ciudad: "", estado: "", cp: "", pais: "Mexico", es_principal: false });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setDirs(await http("/direcciones", {}, token)); }
    catch (e) { toast(e.message, "error"); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.type === "checkbox" ? e.target.checked : e.target.value }));

  const save = async () => {
    setSaving(true);
    try {
      const body = { ...form, es_principal: form.es_principal ? 1 : 0 };
      if (modal === "create") {
        await http("/direcciones", { method: "POST", body: JSON.stringify(body) }, token);
        toast("Direccion agregada");
      } else {
        await http("/direcciones/" + modal.id, { method: "PUT", body: JSON.stringify(body) }, token);
        toast("Actualizada");
      }
      setModal(null); load();
    } catch (e) { toast(e.message, "error"); }
    finally { setSaving(false); }
  };

  const del = async (id) => {
    if (!confirm("Eliminar direccion?")) return;
    try { await http("/direcciones/" + id, { method: "DELETE" }, token); toast("Eliminada"); load(); }
    catch (e) { toast(e.message, "error"); }
  };

  return (
    <div className="fade-up">
      <PageHeader
        title="Mis Direcciones"
        subtitle="Direcciones de entrega"
        actions={
          <Btn onClick={() => { setForm({ linea1: "", ciudad: "", estado: "", cp: "", pais: "Mexico", es_principal: false }); setModal("create"); }}>
            <Icon name="plus" size={16} />Nueva
          </Btn>
        }
      />

      {loading ? <Spinner /> : dirs.length === 0 ? (
        <EmptyState
          icon="mapPin"
          title="Sin direcciones"
          sub="Agrega una para poder comprar"
          action={
            <Btn onClick={() => { setForm({ linea1: "", ciudad: "", estado: "", cp: "", pais: "Mexico", es_principal: false }); setModal("create"); }}>
              <Icon name="plus" size={16} />Agregar
            </Btn>
          }
        />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
          {dirs.map((d, i) => (
            <div key={d.id} className="card fade-up" style={{ animationDelay: i * 0.05 + "s", padding: 18, border: d.es_principal ? "1.5px solid var(--red)" : "1px solid var(--gray-200)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <div style={{ width: 38, height: 38, background: d.es_principal ? "var(--red)" : "var(--gray-100)", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", color: d.es_principal ? "#fff" : "var(--gray-500)" }}>
                    <Icon name="mapPin" size={17} />
                  </div>
                  {d.es_principal && <span className="badge badge-red-solid" style={{ fontSize: 10 }}>Principal</span>}
                </div>
                <div style={{ display: "flex", gap: 3 }}>
                  <button className="btn-ghost" style={{ padding: 6 }} onClick={() => { setForm({ linea1: d.linea1, ciudad: d.ciudad, estado: d.estado, cp: d.cp, pais: d.pais, es_principal: !!d.es_principal }); setModal(d); }}>
                    <Icon name="edit" size={14} style={{ color: "var(--gray-400)" }} />
                  </button>
                  <button className="btn-ghost" style={{ padding: 6 }} onClick={() => del(d.id)}>
                    <Icon name="trash" size={14} style={{ color: "#dc2626" }} />
                  </button>
                </div>
              </div>
              <div style={{ fontWeight: 700, color: "var(--gray-900)", fontSize: 14, marginBottom: 3 }}>{d.linea1}</div>
              <div style={{ fontSize: 13, color: "var(--gray-500)" }}>{d.ciudad}, {d.estado} {d.cp}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 5, fontSize: 12, color: "var(--gray-400)" }}>
                <Icon name="map" size={11} />{d.pais}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === "create" ? "Nueva Direccion" : "Editar Direccion"}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <InputField label="Calle y numero" value={form.linea1} onChange={set("linea1")} placeholder="Av. Reforma 123, Col. Centro" />
          <div className="form-grid">
            <InputField label="Ciudad" value={form.ciudad} onChange={set("ciudad")} placeholder="Ciudad de Mexico" />
            <InputField label="Estado" value={form.estado} onChange={set("estado")} placeholder="CDMX" />
          </div>
          <div className="form-grid">
            <InputField label="Codigo Postal" value={form.cp} onChange={set("cp")} placeholder="06600" maxLength={5} />
            <InputField label="Pais" value={form.pais} onChange={set("pais")} placeholder="Mexico" />
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 14, color: "var(--gray-700)", background: "var(--gray-50)", padding: "11px 13px", borderRadius: 8, border: "1px solid var(--gray-200)" }}>
            <input type="checkbox" checked={form.es_principal} onChange={set("es_principal")} style={{ width: 16, height: 16, accentColor: "var(--red)" }} />
            <span>Direccion principal</span>
          </label>
          <div className="modal-footer" style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 14, borderTop: "1px solid var(--gray-100)" }}>
            <Btn variant="secondary" onClick={() => setModal(null)}>Cancelar</Btn>
            <Btn onClick={save} disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ClientDirecciones;
