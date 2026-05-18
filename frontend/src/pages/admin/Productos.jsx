import { useState, useEffect, useCallback } from "react";
import { http }            from "../../utils/api";
import { toast }           from "../../utils/toast";
import { useBreakpoint }   from "../../hooks/useBreakpoint";
import Spinner             from "../../components/ui/Spinner";
import EmptyState          from "../../components/ui/EmptyState";
import PageHeader          from "../../components/ui/PageHeader";
import Modal               from "../../components/ui/Modal";
import Btn                 from "../../components/ui/Btn";
import { InputField, SelectField } from "../../components/ui/FormFields";
import Icon                from "../../components/ui/Icon";

const EMPTY_ADMIN_FORM = { proveedor_id: "", categoria_id: "", nombre: "", descripcion: "", precio: "", presentacion: "", activo: 1, stock_inicial: "" };

const AdminProductos = ({ token }) => {
  const [productos,   setProductos]   = useState([]);
  const [categorias,  setCategorias]  = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [modal,       setModal]       = useState(null);
  const [form,        setForm]        = useState(EMPTY_ADMIN_FORM);
  const [search,      setSearch]      = useState("");
  const [saving,      setSaving]      = useState(false);
  const { isMobile } = useBreakpoint();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, c, pr] = await Promise.all([
        http("/productos?activo=", {}, token),
        http("/categorias",        {}, token),
        http("/proveedores",       {}, token),
      ]);
      setProductos(p); setCategorias(c); setProveedores(pr);
    } catch (e) { toast(e.message, "error"); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const save = async () => {
    setSaving(true);
    try {
      const body = { ...form, precio: parseFloat(form.precio), proveedor_id: parseInt(form.proveedor_id), categoria_id: parseInt(form.categoria_id) };
      if (modal === "create") {
        if (form.stock_inicial !== "") body.stock_inicial = parseInt(form.stock_inicial);
        await http("/productos", { method: "POST", body: JSON.stringify(body) }, token);
        toast("Producto creado");
      } else {
        await http(`/productos/${modal.id}`, { method: "PUT", body: JSON.stringify(body) }, token);
        toast("Producto actualizado");
      }
      setModal(null); load();
    } catch (e) { toast(e.message, "error"); }
    finally { setSaving(false); }
  };

  const deactivate = async (id) => {
    if (!confirm("¿Desactivar este producto?")) return;
    try { await http(`/productos/${id}`, { method: "DELETE" }, token); toast("Desactivado"); load(); }
    catch (e) { toast(e.message, "error"); }
  };

  const filtered = productos.filter((p) => p.nombre.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="fade-up">
      <PageHeader
        title="Productos" subtitle={`${productos.length} productos`}
        actions={<Btn onClick={() => { setForm(EMPTY_ADMIN_FORM); setModal("create"); }}><Icon name="plus" size={16} />{!isMobile && "Nuevo"}</Btn>}
      />
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--gray-100)" }}>
          <div className="search-wrap"><Icon name="search" size={16} /><input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        </div>
        {loading ? <Spinner /> : filtered.length === 0 ? <EmptyState icon="package" title="Sin productos" sub="" /> : (
          <div className="table-scroll">
            <table>
              <thead><tr><th>Nombre</th>{!isMobile && <th>Categoría</th>}<th>Precio</th><th>Stock</th>{!isMobile && <th>Estado</th>}<th></th></tr></thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id}>
                    <td data-label="Nombre">
                      <div style={{ fontWeight: 600, color: "var(--gray-900)" }}>{p.nombre}</div>
                      {isMobile && <div style={{ display: "flex", gap: 6, marginTop: 4 }}><span className="badge badge-blue" style={{ fontSize: 11 }}>{p.categoria_nombre}</span>{p.activo ? <span className="badge badge-green" style={{ fontSize: 11 }}>Activo</span> : <span className="badge badge-red" style={{ fontSize: 11 }}>Inactivo</span>}</div>}
                    </td>
                    {!isMobile && <td data-label="Categoría"><span className="badge badge-blue">{p.categoria_nombre}</span></td>}
                    <td data-label="Precio" style={{ fontWeight: 700 }}>${parseFloat(p.precio).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
                    <td data-label="Stock">
                      <span className={`badge ${p.stock > 10 ? "badge-green" : p.stock > 0 ? "badge-amber" : "badge-red"}`}>{p.stock}</span>
                      {p.presentacion && <span style={{ fontSize: 11, color: "var(--gray-400)", marginLeft: 4 }}>{p.presentacion}</span>}
                    </td>
                    {!isMobile && <td data-label="Estado">{p.activo ? <span className="badge badge-green">Activo</span> : <span className="badge badge-red">Inactivo</span>}</td>}
                    <td data-label="Acciones">
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="btn-ghost btn-sm" onClick={() => { setForm({ proveedor_id: p.proveedor_id, categoria_id: p.categoria_id, nombre: p.nombre, descripcion: p.descripcion || "", precio: p.precio, presentacion: p.presentacion || "", activo: p.activo }); setModal(p); }}><Icon name="edit" size={14} /></button>
                        <button className="btn-danger btn-sm" onClick={() => deactivate(p.id)}><Icon name="trash" size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === "create" ? "Nuevo Producto" : "Editar Producto"}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <InputField label="Nombre" value={form.nombre} onChange={set("nombre")} placeholder="Nombre del producto" />
          <div className="form-grid">
            <SelectField label="Categoría" value={form.categoria_id} onChange={set("categoria_id")}><option value="">Selecciona...</option>{categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</SelectField>
            <SelectField label="Proveedor" value={form.proveedor_id} onChange={set("proveedor_id")}><option value="">Selecciona...</option>{proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}</SelectField>
          </div>
          <div className="form-grid">
            <InputField label="Precio (MXN)" type="number" min="0" step="0.01" value={form.precio} onChange={set("precio")} placeholder="0.00" />
            <InputField label="Presentación" value={form.presentacion} onChange={set("presentacion")} placeholder="ej. Caja de 20 kg" />
          </div>
          {modal === "create" && <InputField label="Stock inicial" type="number" min="0" value={form.stock_inicial} onChange={set("stock_inicial")} placeholder="0" />}
          <div className="input-group"><label className="input-label">Descripción</label><textarea value={form.descripcion} onChange={set("descripcion")} rows={3} style={{ resize: "vertical" }} /></div>
          <SelectField label="Estado" value={form.activo} onChange={set("activo")}><option value={1}>Activo</option><option value={0}>Inactivo</option></SelectField>
          <div className="modal-footer" style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 14, borderTop: "1px solid var(--gray-100)" }}>
            <Btn variant="secondary" onClick={() => setModal(null)}>Cancelar</Btn>
            <Btn onClick={save} disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminProductos;
