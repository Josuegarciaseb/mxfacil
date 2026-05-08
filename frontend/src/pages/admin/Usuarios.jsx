import { useState, useEffect, useCallback } from "react";
import { http }           from "../../utils/api";
import { toast }          from "../../utils/toast";
import { useBreakpoint }  from "../../hooks/useBreakpoint";
import Spinner            from "../../components/ui/Spinner";
import PageHeader         from "../../components/ui/PageHeader";
import Modal              from "../../components/ui/Modal";
import Btn                from "../../components/ui/Btn";
import { InputField, SelectField } from "../../components/ui/FormFields";
import Icon               from "../../components/ui/Icon";

const AdminUsuarios = ({ token, currentUser }) => {
  const [usuarios, setUsuarios] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(null);
  const [form,     setForm]     = useState({ nombre: "", email: "", telefono: "", rol: "cliente" });
  const [saving,   setSaving]   = useState(false);
  const { isMobile } = useBreakpoint();

  const load = useCallback(async () => {
    setLoading(true);
    try { setUsuarios(await http("/usuario", {}, token)); }
    catch (e) { toast(e.message, "error"); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const save = async () => {
    setSaving(true);
    try { await http(`/usuario/${modal.id}`, { method: "PUT", body: JSON.stringify(form) }, token); toast("Actualizado"); setModal(null); load(); }
    catch (e) { toast(e.message, "error"); }
    finally { setSaving(false); }
  };

  const deleteUser = async (id) => {
    if (!confirm("¿Eliminar usuario?")) return;
    try { await http(`/usuario/${id}`, { method: "DELETE" }, token); toast("Eliminado"); load(); }
    catch (e) { toast(e.message, "error"); }
  };

  return (
    <div className="fade-up">
      <PageHeader title="Usuarios" subtitle={`${usuarios.length} registrados`} />
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {loading ? <Spinner /> : (
          <div className="table-scroll">
            <table>
              <thead><tr><th>Usuario</th>{!isMobile && <th>Email</th>}{!isMobile && <th>Teléfono</th>}<th>Rol</th><th></th></tr></thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.id}>
                    <td data-label="Usuario">
                      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                        <div style={{ width: 30, height: 30, background: u.rol === "admin" ? "var(--red)" : "var(--gray-200)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: u.rol === "admin" ? "#fff" : "var(--gray-600)", flexShrink: 0 }}>{u.nombre?.[0]?.toUpperCase()}</div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{u.nombre}</div>
                          {isMobile && <div style={{ fontSize: 11, color: "var(--gray-500)" }}>{u.email}</div>}
                        </div>
                      </div>
                    </td>
                    {!isMobile && <td data-label="Email"    style={{ color: "var(--gray-500)", fontSize: 13 }}>{u.email}</td>}
                    {!isMobile && <td data-label="Teléfono" style={{ color: "var(--gray-500)" }}>{u.telefono || "—"}</td>}
                    <td data-label="Rol"><span className={`badge ${u.rol === "admin" ? "badge-red" : u.rol === "vendedor" ? "badge-blue" : "badge-gray"}`}>{u.rol === "admin" ? "Administrador" : u.rol === "vendedor" ? "Vendedor" : "Cliente"}</span></td>
                    <td>
                      <div style={{ display: "flex", gap: 5 }}>
                        <button className="btn-ghost btn-sm" onClick={() => { setForm({ nombre: u.nombre, email: u.email, telefono: u.telefono || "", rol: u.rol }); setModal(u); }}><Icon name="edit" size={13} /></button>
                        {currentUser.id !== u.id && <button className="btn-danger btn-sm" onClick={() => deleteUser(u.id)}><Icon name="trash" size={13} /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Modal open={!!modal} onClose={() => setModal(null)} title="Editar Usuario">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <InputField label="Nombre"   value={form.nombre}   onChange={set("nombre")} />
          <InputField label="Email"    type="email" value={form.email} onChange={set("email")} />
          <InputField label="Teléfono" value={form.telefono} onChange={set("telefono")} />
          <SelectField label="Rol" value={form.rol} onChange={set("rol")}><option value="cliente">Cliente</option><option value="vendedor">Vendedor</option><option value="admin">Administrador</option></SelectField>
          <div className="modal-footer" style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 14, borderTop: "1px solid var(--gray-100)" }}>
            <Btn variant="secondary" onClick={() => setModal(null)}>Cancelar</Btn>
            <Btn onClick={save} disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminUsuarios;
