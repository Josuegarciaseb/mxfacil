import { useState, useEffect, useCallback } from "react";
import { http }           from "../../utils/api";
import { toast }          from "../../utils/toast";
import { useBreakpoint }  from "../../hooks/useBreakpoint";
import Spinner            from "../../components/ui/Spinner";
import EmptyState         from "../../components/ui/EmptyState";
import PageHeader         from "../../components/ui/PageHeader";
import Modal              from "../../components/ui/Modal";
import Btn                from "../../components/ui/Btn";
import { InputField, SelectField } from "../../components/ui/FormFields";
import Icon               from "../../components/ui/Icon";

const AdminProveedores = ({ token }) => {
  const [provs,   setProvs]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(null);
  const [form,    setForm]    = useState({ nombre: "", tipo: "local", contacto_email: "", telefono: "" });
  const [saving,  setSaving]  = useState(false);
  const { isMobile } = useBreakpoint();

  const load = useCallback(async () => {
    setLoading(true);
    try { setProvs(await http("/proveedores", {}, token)); }
    catch (e) { toast(e.message, "error"); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const save = async () => {
    setSaving(true);
    try {
      if (modal === "create") { await http("/proveedores", { method: "POST", body: JSON.stringify(form) }, token); toast("Creado"); }
      else { await http(`/proveedores/${modal.id}`, { method: "PUT", body: JSON.stringify(form) }, token); toast("Actualizado"); }
      setModal(null); load();
    } catch (e) { toast(e.message, "error"); }
    finally { setSaving(false); }
  };

  const del = async (id) => {
    if (!confirm("¿Eliminar proveedor?")) return;
    try { await http(`/proveedores/${id}`, { method: "DELETE" }, token); toast("Eliminado"); load(); }
    catch (e) { toast(e.message, "error"); }
  };

  const open = (p = null) => {
    setForm(p ? { nombre: p.nombre, tipo: p.tipo, contacto_email: p.contacto_email || "", telefono: p.telefono || "" } : { nombre: "", tipo: "local", contacto_email: "", telefono: "" });
    setModal(p || "create");
  };

  return (
    <div className="fade-up">
      <PageHeader title="Proveedores" actions={<Btn onClick={() => open()}><Icon name="plus" size={16} />{!isMobile && "Nuevo"}</Btn>} />
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {loading ? <Spinner /> : provs.length === 0 ? <EmptyState icon="truck" title="Sin proveedores" sub="" /> : (
          <div className="table-scroll">
            <table>
              <thead><tr><th>Nombre</th><th>Tipo</th>{!isMobile && <th>Email</th>}{!isMobile && <th>Teléfono</th>}<th></th></tr></thead>
              <tbody>
                {provs.map((p) => (
                  <tr key={p.id}>
                    <td data-label="Nombre" style={{ fontWeight: 600 }}>{p.nombre}</td>
                    <td data-label="Tipo"><span className={`badge ${p.tipo === "local" ? "badge-green" : "badge-blue"}`}>{p.tipo}</span></td>
                    {!isMobile && <td data-label="Email"    style={{ color: "var(--gray-500)" }}>{p.contacto_email || "—"}</td>}
                    {!isMobile && <td data-label="Teléfono" style={{ color: "var(--gray-500)" }}>{p.telefono || "—"}</td>}
                    <td><div style={{ display: "flex", gap: 5 }}><button className="btn-ghost btn-sm" onClick={() => open(p)}><Icon name="edit" size={13} /></button><button className="btn-danger btn-sm" onClick={() => del(p.id)}><Icon name="trash" size={13} /></button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === "create" ? "Nuevo Proveedor" : "Editar Proveedor"}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <InputField label="Nombre" value={form.nombre} onChange={set("nombre")} />
          <SelectField label="Tipo" value={form.tipo} onChange={set("tipo")}><option value="local">Local</option><option value="dropshipping">Dropshipping</option></SelectField>
          <InputField label="Email de contacto" type="email" value={form.contacto_email} onChange={set("contacto_email")} />
          <InputField label="Teléfono (10 dígitos)" value={form.telefono} onChange={set("telefono")} />
          <div className="modal-footer" style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 14, borderTop: "1px solid var(--gray-100)" }}>
            <Btn variant="secondary" onClick={() => setModal(null)}>Cancelar</Btn>
            <Btn onClick={save} disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminProveedores;
