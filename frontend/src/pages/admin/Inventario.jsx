import { useState, useEffect, useCallback } from "react";
import { http }          from "../../utils/api";
import { toast }         from "../../utils/toast";
import { useBreakpoint } from "../../hooks/useBreakpoint";
import Spinner           from "../../components/ui/Spinner";
import PageHeader        from "../../components/ui/PageHeader";
import Btn               from "../../components/ui/Btn";
import Icon              from "../../components/ui/Icon";

const AdminInventario = ({ token }) => {
  const [productos, setProductos] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [editing,   setEditing]   = useState({});
  const [saving,    setSaving]    = useState(null);
  const { isMobile } = useBreakpoint();

  const load = useCallback(async () => {
    setLoading(true);
    try { setProductos(await http("/productos?activo=", {}, token)); }
    catch (e) { toast(e.message, "error"); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const saveStock = async (productoId) => {
    const stock = parseInt(editing[productoId]);
    if (isNaN(stock) || stock < 0) return toast("Stock inválido", "error");
    setSaving(productoId);
    try {
      await http(`/inventario/${productoId}`, { method: "PATCH", body: JSON.stringify({ stock }) }, token);
      toast("Stock actualizado"); load();
      setEditing((p) => { const n = { ...p }; delete n[productoId]; return n; });
    } catch (e) { toast(e.message, "error"); }
    finally { setSaving(null); }
  };

  return (
    <div className="fade-up">
      <PageHeader title="Inventario" subtitle="Controla el stock de productos" />
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {loading ? <Spinner /> : (
          <div className="table-scroll">
            <table>
              <thead><tr><th>Producto</th>{!isMobile && <th>Categoría</th>}<th>Stock</th><th>Ajustar</th></tr></thead>
              <tbody>
                {productos.map((p) => (
                  <tr key={p.id}>
                    <td data-label="Producto" style={{ fontWeight: 600 }}>
                      {p.nombre}
                      {isMobile && <div><span className="badge badge-blue" style={{ fontSize: 10 }}>{p.categoria_nombre}</span></div>}
                    </td>
                    {!isMobile && <td data-label="Categoría"><span className="badge badge-blue">{p.categoria_nombre}</span></td>}
                    <td data-label="Stock actual"><span className={`badge ${p.stock > 10 ? "badge-green" : p.stock > 0 ? "badge-amber" : "badge-red"}`}>{p.stock}</span></td>
                    <td data-label="Nuevo stock">
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <input type="number" min="0" placeholder={p.stock} value={editing[p.id] ?? ""} onChange={(e) => setEditing((prev) => ({ ...prev, [p.id]: e.target.value }))} style={{ width: isMobile ? 80 : 100 }} />
                        {editing[p.id] !== undefined && <Btn size="sm" onClick={() => saveStock(p.id)} disabled={saving === p.id}><Icon name="check" size={14} /></Btn>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminInventario;
