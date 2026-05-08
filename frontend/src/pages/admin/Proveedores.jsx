import { useState, useEffect, useCallback } from "react";
import { http }           from "../../utils/api";
import { toast }          from "../../utils/toast";
import { useBreakpoint }  from "../../hooks/useBreakpoint";
import Spinner            from "../../components/ui/Spinner";
import EmptyState         from "../../components/ui/EmptyState";
import PageHeader         from "../../components/ui/PageHeader";
import Modal              from "../../components/ui/Modal";
import Btn                from "../../components/ui/Btn";
import StatusBadge        from "../../components/ui/StatusBadge";
import { InputField, SelectField } from "../../components/ui/FormFields";
import Icon               from "../../components/ui/Icon";

const EMPTY_FORM = { nombre: "", tipo: "local", contacto_email: "", telefono: "", rfc: "" };

const AdminProveedores = ({ token }) => {
  const [provs,        setProvs]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [modal,        setModal]        = useState(null);
  const [form,         setForm]         = useState(EMPTY_FORM);
  const [saving,       setSaving]       = useState(false);
  const [verifyModal,  setVerifyModal]  = useState(null);   // proveedor obj
  const [verifyAccion, setVerifyAccion] = useState(null);   // "aprobar" | "rechazar"
  const [verifyMotivo, setVerifyMotivo] = useState("");
  const [verifying,    setVerifying]    = useState(false);
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
      if (modal === "create") {
        await http("/proveedores", { method: "POST", body: JSON.stringify(form) }, token);
        toast("Creado");
      } else {
        await http(`/proveedores/${modal.id}`, { method: "PUT", body: JSON.stringify(form) }, token);
        toast("Actualizado");
      }
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
    setForm(p
      ? { nombre: p.nombre, tipo: p.tipo, contacto_email: p.contacto_email || "", telefono: p.telefono || "", rfc: p.rfc || "" }
      : EMPTY_FORM
    );
    setModal(p || "create");
  };

  const openVerify = (p) => {
    setVerifyModal(p);
    setVerifyAccion(null);
    setVerifyMotivo("");
  };

  const submitVerify = async () => {
    if (!verifyAccion) return;
    if (verifyAccion === "rechazar" && !verifyMotivo.trim()) {
      toast("El motivo es obligatorio al rechazar", "error"); return;
    }
    setVerifying(true);
    try {
      const body = { accion: verifyAccion, ...(verifyAccion === "rechazar" && { motivo: verifyMotivo }) };
      await http(`/proveedores/${verifyModal.id}/verificacion`, { method: "PATCH", body: JSON.stringify(body) }, token);
      toast(verifyAccion === "aprobar" ? "Proveedor aprobado" : "Proveedor rechazado");
      setVerifyModal(null); load();
    } catch (e) { toast(e.message, "error"); }
    finally { setVerifying(false); }
  };

  return (
    <div className="fade-up">
      <PageHeader title="Proveedores" actions={<Btn onClick={() => open()}><Icon name="plus" size={16} />{!isMobile && "Nuevo"}</Btn>} />

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {loading ? <Spinner /> : provs.length === 0 ? <EmptyState icon="truck" title="Sin proveedores" sub="" /> : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Tipo</th>
                  {!isMobile && <th>RFC</th>}
                  <th>Verificación</th>
                  {!isMobile && <th>Email</th>}
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {provs.map((p) => (
                  <tr key={p.id}>
                    <td data-label="Nombre" style={{ fontWeight: 600 }}>{p.nombre}</td>
                    <td data-label="Tipo">
                      <span className={`badge ${p.tipo === "local" ? "badge-green" : "badge-blue"}`}>{p.tipo}</span>
                    </td>
                    {!isMobile && (
                      <td data-label="RFC" style={{ color: "var(--gray-600)", fontFamily: "monospace", fontSize: 13 }}>
                        {p.rfc || <span style={{ color: "var(--gray-300)" }}>—</span>}
                      </td>
                    )}
                    <td data-label="Verificación">
                      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        <StatusBadge estado={p.verificado || "pendiente"} />
                        {p.verificado === "rechazado" && p.motivo_rechazo && (
                          <span style={{ fontSize: 11, color: "var(--gray-400)", maxWidth: 160, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {p.motivo_rechazo}
                          </span>
                        )}
                      </div>
                    </td>
                    {!isMobile && (
                      <td data-label="Email" style={{ color: "var(--gray-500)" }}>{p.contacto_email || "—"}</td>
                    )}
                    <td>
                      <div style={{ display: "flex", gap: 5 }}>
                        {p.rfc && (
                          <button
                            className="btn-ghost btn-sm"
                            onClick={() => openVerify(p)}
                            title="Verificar empresa"
                            style={{ color: p.verificado === "aprobado" ? "var(--green)" : "var(--gray-500)" }}
                          >
                            <Icon name="shield" size={13} />
                          </button>
                        )}
                        <button className="btn-ghost btn-sm" onClick={() => open(p)}><Icon name="edit" size={13} /></button>
                        <button className="btn-danger btn-sm" onClick={() => del(p.id)}><Icon name="trash" size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal crear / editar ── */}
      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === "create" ? "Nuevo Proveedor" : "Editar Proveedor"}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <InputField label="Nombre" value={form.nombre} onChange={set("nombre")} />
          <SelectField label="Tipo" value={form.tipo} onChange={set("tipo")}>
            <option value="local">Local</option>
            <option value="dropshipping">Dropshipping</option>
          </SelectField>
          <InputField label="RFC (opcional)" placeholder="ej. ABC010101AAA" value={form.rfc} onChange={set("rfc")} style={{ fontFamily: "monospace" }} />
          <InputField label="Email de contacto" type="email" value={form.contacto_email} onChange={set("contacto_email")} />
          <InputField label="Teléfono (10 dígitos)" value={form.telefono} onChange={set("telefono")} />
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 14, borderTop: "1px solid var(--gray-100)" }}>
            <Btn variant="secondary" onClick={() => setModal(null)}>Cancelar</Btn>
            <Btn onClick={save} disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Btn>
          </div>
        </div>
      </Modal>

      {/* ── Modal verificar empresa ── */}
      <Modal open={!!verifyModal} onClose={() => setVerifyModal(null)} title="Verificar Empresa">
        {verifyModal && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Info del proveedor */}
            <div style={{ background: "var(--gray-50)", borderRadius: 10, padding: 14, border: "1px solid var(--gray-100)" }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: "var(--gray-900)", marginBottom: 6 }}>{verifyModal.nombre}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                <Icon name="shield" size={14} style={{ color: "var(--gray-400)" }} />
                <span style={{ fontFamily: "monospace", color: "var(--gray-700)", fontWeight: 600 }}>{verifyModal.rfc}</span>
              </div>
              <div style={{ marginTop: 8 }}>
                <StatusBadge estado={verifyModal.verificado || "pendiente"} />
              </div>
              {verifyModal.verificado === "rechazado" && verifyModal.motivo_rechazo && (
                <div style={{ marginTop: 8, fontSize: 12, color: "var(--gray-500)", background: "#fee2e2", borderRadius: 7, padding: "6px 10px" }}>
                  Motivo anterior: {verifyModal.motivo_rechazo}
                </div>
              )}
            </div>

            {/* Selector de acción */}
            {!verifyAccion && (
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => setVerifyAccion("aprobar")}
                  style={{
                    flex: 1, padding: "12px 0", borderRadius: 10, border: "2px solid #16a34a",
                    background: "transparent", cursor: "pointer", fontFamily: "'Outfit',sans-serif",
                    fontWeight: 700, fontSize: 14, color: "#16a34a",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    transition: "all .15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#f0fdf4"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <Icon name="check" size={16} /> Aprobar
                </button>
                <button
                  onClick={() => setVerifyAccion("rechazar")}
                  style={{
                    flex: 1, padding: "12px 0", borderRadius: 10, border: "2px solid var(--red)",
                    background: "transparent", cursor: "pointer", fontFamily: "'Outfit',sans-serif",
                    fontWeight: 700, fontSize: 14, color: "var(--red)",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    transition: "all .15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#fff1f2"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <Icon name="x" size={16} /> Rechazar
                </button>
              </div>
            )}

            {/* Confirmar aprobar */}
            {verifyAccion === "aprobar" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ background: "#f0fdf4", borderRadius: 9, padding: "10px 14px", fontSize: 13, color: "#15803d", border: "1px solid #bbf7d0" }}>
                  Se marcará este proveedor como <strong>aprobado</strong>.
                </div>
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <Btn variant="secondary" onClick={() => setVerifyAccion(null)}>Atrás</Btn>
                  <Btn onClick={submitVerify} disabled={verifying}
                    style={{ background: "#16a34a", borderColor: "#16a34a" }}>
                    {verifying ? "Guardando..." : "Confirmar aprobación"}
                  </Btn>
                </div>
              </div>
            )}

            {/* Confirmar rechazar */}
            {verifyAccion === "rechazar" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div className="input-group">
                  <label className="input-label">Motivo del rechazo *</label>
                  <textarea
                    value={verifyMotivo}
                    onChange={(e) => setVerifyMotivo(e.target.value)}
                    placeholder="Describe el motivo del rechazo..."
                    rows={3}
                    style={{ resize: "vertical", fontFamily: "'Outfit',sans-serif", fontSize: 13 }}
                  />
                </div>
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <Btn variant="secondary" onClick={() => setVerifyAccion(null)}>Atrás</Btn>
                  <Btn onClick={submitVerify} disabled={verifying || !verifyMotivo.trim()}
                    style={{ background: "var(--red)", borderColor: "var(--red)" }}>
                    {verifying ? "Guardando..." : "Confirmar rechazo"}
                  </Btn>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminProveedores;
