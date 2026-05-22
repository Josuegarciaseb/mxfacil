import { useState, useEffect, useCallback, useRef } from "react";
import { http, httpUpload } from "../../utils/api";
import { toast } from "../../utils/toast";
import { useBreakpoint } from "../../hooks/useBreakpoint";
import Spinner from "../../components/ui/Spinner";
import EmptyState from "../../components/ui/EmptyState";
import PageHeader from "../../components/ui/PageHeader";
import Modal from "../../components/ui/Modal";
import Btn from "../../components/ui/Btn";
import { InputField, SelectField } from "../../components/ui/FormFields";
import Icon from "../../components/ui/Icon";

const EMPTY_FORM = {
  categoria_id: "", nombre: "", descripcion: "", precio: "",
  presentacion: "", activo: 1, stock_inicial: "", image_url: "", imagen_modo: "url",
};

const IMG_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000"

// Muestra la imagen del producto o un ícono genérico
const ProductImg = ({ url, size = 36 }) => {
  const [err, setErr] = useState(false);
  const src = url && !err ? (url.startsWith("http") ? url : IMG_BASE + url) : null;
  if (!src) {
    return (
      <div style={{ width: size, height: size, borderRadius: 6, background: "var(--gray-100)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon name="package" size={size * 0.55} />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt=""
      onError={() => setErr(true)}
      style={{ width: size, height: size, borderRadius: 6, objectFit: "cover", flexShrink: 0 }}
    />
  );
};

const VendedorProductos = ({ token, user }) => {
  const [productos,  setProductos]  = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [modal,      setModal]      = useState(null);
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [search,     setSearch]     = useState("");
  const [saving,     setSaving]     = useState(false);
  const [preview,    setPreview]    = useState(null); // preview local file
  const [uploading,  setUploading]  = useState(false);
  const fileRef = useRef(null);
  const { isMobile } = useBreakpoint();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Si el user no trae proveedor_id (sesión antigua), lo resolvemos desde /proveedores/me
      let provId = user.proveedor_id;
      if (!provId) {
        const prov = await http("/proveedores/me", {}, token);
        provId = prov.id;
      }
      const p = await http("/productos?activo=&proveedor_id=" + provId, {}, token);
      setProductos(p);
    } catch (e) { toast(e.message, "error"); }
    finally { setLoading(false); }
  }, [token, user.proveedor_id]);

  // Categorías se cargan independientemente para que un fallo de productos no las afecte
  useEffect(() => {
    http("/categorias", {}, token).then(setCategorias).catch(() => {});
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setPreview(null);
    setModal("create");
  };

  const openEdit = (p) => {
    setForm({
      categoria_id: p.categoria_id, nombre: p.nombre,
      descripcion: p.descripcion || "", precio: p.precio,
      presentacion: p.presentacion || "",
      activo: p.activo, image_url: p.image_url || "",
      imagen_modo: "url",
    });
    setPreview(null);
    setModal(p);
  };

  // Cuando se selecciona un archivo local: mostrar preview y subir al servidor
  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("imagen", file);
      const { url } = await httpUpload("/productos/imagen", fd, token);
      setForm((p) => ({ ...p, image_url: url }));
      toast("Imagen subida correctamente");
    } catch (err) {
      toast(err.message, "error");
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const body = {
        ...form,
        precio: parseFloat(form.precio),
        categoria_id: parseInt(form.categoria_id),
        image_url: form.image_url || null,
      };
      delete body.imagen_modo;

      if (modal === "create") {
        if (form.stock_inicial !== "") body.stock_inicial = parseInt(form.stock_inicial);
        await http("/productos", { method: "POST", body: JSON.stringify(body) }, token);
        toast("Producto creado");
      } else {
        await http("/productos/" + modal.id, { method: "PUT", body: JSON.stringify(body) }, token);
        toast("Producto actualizado");
      }
      setModal(null); setPreview(null); load();
    } catch (e) { toast(e.message, "error"); }
    finally { setSaving(false); }
  };

  const deactivate = async (id) => {
    if (!confirm("Desactivar este producto?")) return;
    try { await http("/productos/" + id, { method: "DELETE" }, token); toast("Desactivado"); load(); }
    catch (e) { toast(e.message, "error"); }
  };

  const filtered = productos.filter((p) => p.nombre.toLowerCase().includes(search.toLowerCase()));

  // Imagen a mostrar en preview del modal
  const previewSrc = preview
    ? preview
    : form.image_url
      ? (form.image_url.startsWith("http") ? form.image_url : IMG_BASE + form.image_url)
      : null;

  return (
    <div className="fade-up">
      <PageHeader
        title="Mis Productos"
        subtitle={productos.length + " productos"}
        actions={
          <Btn onClick={openCreate}>
            <Icon name="plus" size={16} />{!isMobile && "Nuevo"}
          </Btn>
        }
      />

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--gray-100)" }}>
          <div className="search-wrap">
            <Icon name="search" size={16} />
            <input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        {loading ? <Spinner /> : filtered.length === 0 ? (
          <EmptyState icon="package" title="Sin productos" sub="Agrega tu primer producto" />
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Imagen</th>
                  <th>Nombre</th>
                  {!isMobile && <th>Categoria</th>}
                  <th>Precio</th>
                  <th>Stock</th>
                  {!isMobile && <th>Estado</th>}
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id}>
                    <td><ProductImg url={p.image_url} size={38} /></td>
                    <td data-label="Nombre">
                      <div style={{ fontWeight: 600, color: "var(--gray-900)" }}>{p.nombre}</div>
                      {isMobile && (
                        <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                          <span className="badge badge-blue" style={{ fontSize: 11 }}>{p.categoria_nombre}</span>
                          {p.activo ? <span className="badge badge-green" style={{ fontSize: 11 }}>Activo</span> : <span className="badge badge-red" style={{ fontSize: 11 }}>Inactivo</span>}
                        </div>
                      )}
                    </td>
                    {!isMobile && <td data-label="Categoria"><span className="badge badge-blue">{p.categoria_nombre}</span></td>}
                    <td data-label="Precio" style={{ fontWeight: 700 }}>${parseFloat(p.precio).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
                    <td data-label="Stock">
                      <span className={"badge " + (p.stock > 10 ? "badge-green" : p.stock > 0 ? "badge-amber" : "badge-red")}>{p.stock}</span>
                      {p.presentacion && <span style={{ fontSize: 11, color: "var(--gray-400)", marginLeft: 4 }}>{p.presentacion}</span>}
                    </td>
                    {!isMobile && <td data-label="Estado">{p.activo ? <span className="badge badge-green">Activo</span> : <span className="badge badge-red">Inactivo</span>}</td>}
                    <td data-label="Acciones">
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="btn-ghost btn-sm" onClick={() => openEdit(p)}>
                          <Icon name="edit" size={14} />
                        </button>
                        <button className="btn-danger btn-sm" onClick={() => deactivate(p.id)}>
                          <Icon name="trash" size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={!!modal} onClose={() => { setModal(null); setPreview(null); }} title={modal === "create" ? "Nuevo Producto" : "Editar Producto"}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <InputField label="Nombre" value={form.nombre} onChange={set("nombre")} placeholder="Nombre del producto" />
          <SelectField label="Categoria" value={form.categoria_id} onChange={set("categoria_id")}>
            <option value="">Selecciona...</option>
            {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </SelectField>
          <InputField label="Presentación" value={form.presentacion} onChange={set("presentacion")} placeholder="ej. Caja de 20 kg, Botella de 1 L, Paquete de 24 pzas" />
          {modal === "create" ? (
            <div className="form-grid">
              <InputField label="Precio (MXN)" type="number" min="0" step="0.01" value={form.precio} onChange={set("precio")} placeholder="0.00" />
              <InputField label="Stock inicial"  type="number" min="0" value={form.stock_inicial} onChange={set("stock_inicial")} placeholder="0" />
            </div>
          ) : (
            <InputField label="Precio (MXN)" type="number" min="0" step="0.01" value={form.precio} onChange={set("precio")} placeholder="0.00" />
          )}
          <div className="input-group">
            <label className="input-label">Descripcion</label>
            <textarea value={form.descripcion} onChange={set("descripcion")} rows={3} style={{ resize: "vertical" }} />
          </div>

          {/* ── IMAGEN ── */}
          <div className="input-group">
            <label className="input-label">Imagen del producto</label>

            {/* Selector de modo */}
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              {["url", "archivo"].map((modo) => (
                <button
                  key={modo}
                  type="button"
                  onClick={() => { setForm((p) => ({ ...p, imagen_modo: modo })); setPreview(null); }}
                  style={{
                    padding: "5px 14px", borderRadius: 6, border: "1.5px solid",
                    borderColor: form.imagen_modo === modo ? "var(--primary)" : "var(--gray-200)",
                    background: form.imagen_modo === modo ? "var(--primary)" : "transparent",
                    color: form.imagen_modo === modo ? "#fff" : "var(--gray-600)",
                    cursor: "pointer", fontSize: 13, fontWeight: 500,
                  }}
                >
                  {modo === "url" ? "URL / Link" : "Archivo local"}
                </button>
              ))}
            </div>

            {form.imagen_modo === "url" ? (
              <input
                type="url"
                value={form.image_url.startsWith("/uploads/") ? "" : form.image_url}
                onChange={(e) => { setForm((p) => ({ ...p, image_url: e.target.value })); setPreview(null); }}
                placeholder="https://ejemplo.com/imagen.jpg"
              />
            ) : (
              <>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  style={{ display: "none" }}
                  onChange={handleFile}
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  style={{
                    padding: "8px 16px", borderRadius: 6, border: "1.5px dashed var(--gray-300)",
                    background: "var(--gray-50)", cursor: "pointer", fontSize: 13,
                    color: "var(--gray-600)", width: "100%",
                  }}
                >
                  {uploading ? "Subiendo…" : "Seleccionar imagen (jpg, png, webp, gif — máx 5 MB)"}
                </button>
              </>
            )}

            {/* Preview */}
            {previewSrc && (
              <div style={{ marginTop: 10, position: "relative", display: "inline-block" }}>
                <img
                  src={previewSrc}
                  alt="Preview"
                  style={{ maxHeight: 160, maxWidth: "100%", borderRadius: 8, objectFit: "cover", border: "1px solid var(--gray-200)" }}
                  onError={() => setForm((p) => ({ ...p, image_url: "" }))}
                />
                <button
                  type="button"
                  onClick={() => { setForm((p) => ({ ...p, image_url: "" })); setPreview(null); }}
                  style={{
                    position: "absolute", top: 4, right: 4,
                    background: "rgba(0,0,0,0.55)", border: "none", borderRadius: "50%",
                    width: 22, height: 22, cursor: "pointer", color: "#fff", fontSize: 13,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >✕</button>
              </div>
            )}
          </div>

          <SelectField label="Estado" value={form.activo} onChange={set("activo")}>
            <option value={1}>Activo</option><option value={0}>Inactivo</option>
          </SelectField>
          <div className="modal-footer" style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 14, borderTop: "1px solid var(--gray-100)" }}>
            <Btn variant="secondary" onClick={() => { setModal(null); setPreview(null); }}>Cancelar</Btn>
            <Btn onClick={save} disabled={saving || uploading}>{saving ? "Guardando..." : "Guardar"}</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default VendedorProductos;
