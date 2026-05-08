import { useState } from "react";
import { http } from "../../utils/api";
import { toast } from "../../utils/toast";
import PageHeader from "../../components/ui/PageHeader";
import Btn from "../../components/ui/Btn";
import { InputField } from "../../components/ui/FormFields";
import Icon from "../../components/ui/Icon";

const ClientPerfil = ({ token, user, onUpdate }) => {
  const [form,   setForm]   = useState({ nombre: user.nombre, email: user.email, telefono: user.telefono || "" });
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const save = async () => {
    setSaving(true);
    try {
      const updated = await http("/usuario/me", { method: "PUT", body: JSON.stringify(form) }, token);
      localStorage.setItem("user", JSON.stringify(updated));
      onUpdate(updated);
      toast("Perfil actualizado");
    } catch (e) { toast(e.message, "error"); }
    finally { setSaving(false); }
  };

  const ROL_LABEL = { admin: "Administrador", vendedor: "Vendedor", cliente: "Cliente" };
  const ROL_BADGE = { admin: "badge-red", vendedor: "badge-blue", cliente: "badge-gray" };

  return (
    <div className="fade-up" style={{ maxWidth: 520 }}>
      <PageHeader title="Mi Perfil" subtitle="Tu informacion personal" />

      {/* Profile card */}
      <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 18 }}>
        <div style={{ background: "linear-gradient(135deg, var(--red) 0%, #9b111a 100%)", padding: "24px 24px 40px", position: "relative" }}>
          <div style={{ position: "absolute", top: -30, right: -30, width: 100, height: 100, borderRadius: "50%", background: "rgba(255,255,255,.07)" }} />
        </div>
        <div style={{ padding: "0 24px 20px" }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 14, marginTop: -24, marginBottom: 14 }}>
            <div style={{ width: 56, height: 56, background: "var(--white)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 900, color: "var(--red)", border: "3px solid var(--white)", boxShadow: "var(--shadow)", flexShrink: 0 }}>
              {user.nombre?.[0]?.toUpperCase()}
            </div>
            <div style={{ paddingBottom: 4 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: "var(--gray-900)" }}>{user.nombre}</h3>
              <span className={"badge " + (ROL_BADGE[user.rol] || "badge-gray")}>{ROL_LABEL[user.rol] || user.rol}</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "var(--gray-500)" }}>
              <Icon name="mail" size={13} />{user.email}
            </div>
            {user.telefono && (
              <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "var(--gray-500)" }}>
                <Icon name="phone" size={13} />{user.telefono}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit form */}
      <div className="card" style={{ padding: 22 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 18, color: "var(--gray-800)" }}>Editar informacion</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <InputField label="Nombre completo"       value={form.nombre}   onChange={set("nombre")} />
          <InputField label="Correo electronico" type="email" value={form.email} onChange={set("email")} />
          <InputField label="Telefono (10 digitos)" value={form.telefono} onChange={set("telefono")} placeholder="5512345678" />
          <Btn onClick={save} disabled={saving} style={{ alignSelf: "flex-start" }}>
            {saving ? "Guardando..." : <><Icon name="check" size={16} />Guardar cambios</>}
          </Btn>
        </div>
      </div>
    </div>
  );
};

export default ClientPerfil;
