import { useState, useEffect, useCallback } from "react";
import { http }    from "../../utils/api";
import { toast }   from "../../utils/toast";
import Spinner     from "../../components/ui/Spinner";
import PageHeader  from "../../components/ui/PageHeader";
import Modal       from "../../components/ui/Modal";
import Btn         from "../../components/ui/Btn";
import { InputField } from "../../components/ui/FormFields";
import Icon        from "../../components/ui/Icon";

const AdminCategorias = ({ token }) => {
  const [cats,    setCats]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(null);
  const [nombre,  setNombre]  = useState("");
  const [saving,  setSaving]  = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setCats(await http("/categorias", {}, token)); }
    catch (e) { toast(e.message, "error"); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      if (modal === "create") { await http("/categorias", { method: "POST", body: JSON.stringify({ nombre }) }, token); toast("Creada"); }
      else { await http(`/categorias/${modal.id}`, { method: "PUT", body: JSON.stringify({ nombre }) }, token); toast("Actualizada"); }
      setModal(null); load();
    } catch (e) { toast(e.message, "error"); }
    finally { setSaving(false); }
  };

  const del = async (id) => {
    if (!confirm("¿Eliminar categoría?")) return;
    try { await http(`/categorias/${id}`, { method: "DELETE" }, token); toast("Eliminada"); load(); }
    catch (e) { toast(e.message, "error"); }
  };

  return (
    <div className="fade-up">
      <PageHeader title="Categorías" actions={<Btn onClick={() => { setNombre(""); setModal("create"); }}><Icon name="plus" size={16} />Nueva</Btn>} />
      {loading ? <Spinner /> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
          {cats.map((c) => (
            <div key={c.id} className="card" style={{ padding: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 34, height: 34, background: "var(--red-pale)", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--red)" }}><Icon name="tag" size={16} /></div>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{c.nombre}</span>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                <button className="btn-ghost" style={{ padding: 6 }} onClick={() => { setNombre(c.nombre); setModal(c); }}><Icon name="edit" size={14} style={{ color: "var(--gray-400)" }} /></button>
                <button className="btn-ghost" style={{ padding: 6 }} onClick={() => del(c.id)}><Icon name="trash" size={14} style={{ color: "#dc2626" }} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === "create" ? "Nueva Categoría" : "Editar Categoría"}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <InputField label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Frutas y verduras" />
          <div className="modal-footer" style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 14, borderTop: "1px solid var(--gray-100)" }}>
            <Btn variant="secondary" onClick={() => setModal(null)}>Cancelar</Btn>
            <Btn onClick={save} disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminCategorias;
