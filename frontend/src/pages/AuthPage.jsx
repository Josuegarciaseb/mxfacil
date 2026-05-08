import { useState } from "react";
import { http }          from "../utils/api";
import { toast }         from "../utils/toast";
import { useBreakpoint } from "../hooks/useBreakpoint";
import Icon              from "../components/ui/Icon";
import { InputField }    from "../components/ui/FormFields";

const AuthPage = ({ onLogin }) => {
  const [mode,    setMode]    = useState("login");
  const [form,    setForm]    = useState({ nombre: "", email: "", password: "", telefono: "", rol: "cliente", rfc: "" });
  const [loading, setLoading] = useState(false);
  const { isMobile } = useBreakpoint();

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const submit = async () => {
    setLoading(true);
    try {
      if (mode === "login") {
        const data = await http("/auth/login", {
          method: "POST",
          body: JSON.stringify({ email: form.email, password: form.password }),
        });
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        toast("¡Bienvenido de vuelta!");
        onLogin(data.user, data.token);
      } else {
        const body = { nombre: form.nombre, email: form.email, password: form.password, rol: form.rol };
        if (form.telefono) body.telefono = form.telefono;
        if (form.rol === "vendedor" && form.rfc) body.rfc = form.rfc;
        const data = await http("/auth/register", { method: "POST", body: JSON.stringify(body) });
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        toast("¡Cuenta creada!");
        onLogin(data.user, data.token);
      }
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: isMobile ? "column" : "row", background: "var(--white)" }}>
      {/* Hero */}
      <div style={{ flex: isMobile ? "none" : 1, background: "linear-gradient(150deg, var(--red) 0%, #9b111a 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: isMobile ? "36px 24px" : "60px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -60, right: -60, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,.06)" }} />
        <div style={{ position: "absolute", bottom: -40, left: -40, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,.04)" }} />
        <div style={{ position: "relative", zIndex: 1, textAlign: "center", color: "white", maxWidth: 360 }}>
          <div style={{ width: isMobile ? 56 : 68, height: isMobile ? 56 : 68, background: "rgba(255,255,255,.15)", backdropFilter: "blur(10px)", borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", border: "1px solid rgba(255,255,255,.2)" }}>
            <Icon name="store" size={isMobile ? 28 : 34} />
          </div>
          <h1 style={{ fontSize: isMobile ? 28 : 36, fontWeight: 900, marginBottom: 10, letterSpacing: "-.02em", color: "white" }}>Comercio Fácil</h1>
          {!isMobile && (
            <>
              <p style={{ fontSize: 15, opacity: .85, lineHeight: 1.7, marginBottom: 32 }}>La plataforma que conecta proveedores y comerciantes de México</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[{ icon: "shield", text: "Transacciones seguras" }, { icon: "zap", text: "Pedidos en tiempo real" }, { icon: "users", text: "Red de proveedores" }].map(({ icon, text }) => (
                  <div key={text} style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(255,255,255,.1)", borderRadius: 10, padding: "10px 14px", border: "1px solid rgba(255,255,255,.15)" }}>
                    <div style={{ width: 28, height: 28, background: "rgba(255,255,255,.15)", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon name={icon} size={14} />
                    </div>
                    <span style={{ fontSize: 13, opacity: .9 }}>{text}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Form */}
      <div style={{ width: isMobile ? "100%" : 460, display: "flex", alignItems: "center", justifyContent: "center", padding: isMobile ? "24px 20px 40px" : "48px" }}>
        <div style={{ width: "100%", maxWidth: 380 }} className="fade-up">
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: isMobile ? 22 : 24, fontWeight: 800, color: "var(--gray-900)", marginBottom: 6 }}>
              {mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
            </h2>
            <p style={{ color: "var(--gray-500)", fontSize: 14 }}>
              {mode === "login" ? "Bienvenido de vuelta" : "Únete a nuestra comunidad"}
            </p>
          </div>

          {/* Tab switcher */}
          <div style={{ display: "flex", background: "var(--gray-100)", borderRadius: 10, padding: 4, marginBottom: 24 }}>
            {["login", "register"].map((m) => (
              <button key={m} onClick={() => setMode(m)} style={{ flex: 1, padding: "8px 14px", border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "'Outfit',sans-serif", fontWeight: 600, fontSize: 14, transition: "all .2s", background: mode === m ? "var(--white)" : "transparent", color: mode === m ? "var(--red)" : "var(--gray-500)", boxShadow: mode === m ? "var(--shadow-sm)" : "none" }}>
                {m === "login" ? "Iniciar Sesión" : "Registrarse"}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {mode === "register" && <InputField label="Nombre completo" placeholder="María García" value={form.nombre} onChange={set("nombre")} />}
            <InputField label="Correo electrónico" type="email" placeholder="correo@ejemplo.com" value={form.email} onChange={set("email")} />
            <InputField label="Contraseña" type="password" placeholder="••••••••" value={form.password} onChange={set("password")} />
            {mode === "register" && <InputField label="Teléfono (opcional)" placeholder="5512345678" value={form.telefono} onChange={set("telefono")} />}
            {mode === "register" && form.rol === "vendedor" && (
              <InputField
                label="RFC de la empresa (opcional)"
                placeholder="ej. ABC010101AAA"
                value={form.rfc}
                onChange={set("rfc")}
                style={{ fontFamily: "monospace", textTransform: "uppercase" }}
              />
            )}
            {mode === "register" && (
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--gray-700)", marginBottom: 6 }}>Tipo de cuenta</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {[{ value: "cliente", icon: "user", label: "Cliente", desc: "Compra productos" }, { value: "vendedor", icon: "store", label: "Vendedor", desc: "Vende productos" }].map(({ value, icon, label, desc }) => (
                    <button key={value} type="button" onClick={() => setForm((p) => ({ ...p, rol: value }))} style={{ padding: "12px 10px", border: `2px solid ${form.rol === value ? "var(--red)" : "var(--gray-200)"}`, borderRadius: 10, background: form.rol === value ? "var(--red-pale)" : "var(--white)", cursor: "pointer", textAlign: "left", transition: "all .2s", display: "flex", flexDirection: "column", gap: 4 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Icon name={icon} size={14} style={{ color: form.rol === value ? "var(--red)" : "var(--gray-400)" }} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: form.rol === value ? "var(--red)" : "var(--gray-700)" }}>{label}</span>
                      </div>
                      <span style={{ fontSize: 11, color: "var(--gray-400)", paddingLeft: 20 }}>{desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <button className="btn-primary" onClick={submit} disabled={loading} style={{ width: "100%", padding: 13, fontSize: 15, marginTop: 4, borderRadius: 10, justifyContent: "center" }}>
              {loading
                ? <><div style={{ width: 17, height: 17, border: "2px solid rgba(255,255,255,.3)", borderTop: "2px solid #fff", borderRadius: "50%", animation: "spin 1s linear infinite" }} />Procesando...</>
                : mode === "login" ? "Entrar" : "Crear cuenta"}
            </button>
          </div>
          <p style={{ textAlign: "center", color: "var(--gray-400)", fontSize: 12, marginTop: 24 }}>© 2025 Comercio Fácil México</p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
