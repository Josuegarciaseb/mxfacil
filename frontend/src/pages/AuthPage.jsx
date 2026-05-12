import { useState } from "react";
import { http }          from "../utils/api";
import { toast }         from "../utils/toast";
import { useBreakpoint } from "../hooks/useBreakpoint";
import Icon              from "../components/ui/Icon";
import { InputField }    from "../components/ui/FormFields";

const FEATURES = [
  { icon: "shield",      text: "Transacciones seguras y verificadas" },
  { icon: "zap",         text: "Pedidos mayoreo en tiempo real"       },
  { icon: "truck",       text: "Red de proveedores certificados"       },
];

const STATS = [
  { value: "muchos",    label: "Proveedores" },
  { value: "muchos", label: "Productos"   },
  { value: "MXN",     label: "Moneda local" },
];

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
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: isMobile ? "column" : "row",
      background: "#0D1B2A",
    }}>
      {/* ── Hero ── */}
      <div style={{
        flex: isMobile ? "none" : 1,
        background: "linear-gradient(155deg, #0D1B2A 0%, #1a0608 40%, #7B0D12 100%)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: isMobile ? "40px 24px 36px" : "64px 56px",
        position: "relative", overflow: "hidden",
      }}>
        {/* Decoración de fondo */}
        <div style={{ position: "absolute", top: -80, right: -80, width: 320, height: 320, borderRadius: "50%", background: "rgba(200,32,42,.08)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -60, left: -60, width: 240, height: 240, borderRadius: "50%", background: "rgba(255,255,255,.03)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: "40%", left: "60%", width: 180, height: 180, borderRadius: "50%", background: "rgba(200,32,42,.05)", pointerEvents: "none" }} />

        <div style={{ position: "relative", zIndex: 1, textAlign: "center", color: "#fff", maxWidth: 380 }}>
          {/* Logo */}
          <div style={{
            width: isMobile ? 60 : 72, height: isMobile ? 60 : 72,
            background: "linear-gradient(135deg,#E53935 0%,#A01820 100%)",
            borderRadius: isMobile ? 16 : 20,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 22px",
            boxShadow: "0 8px 28px rgba(200,32,42,.45)",
          }}>
            <Icon name="store" size={isMobile ? 30 : 36} style={{ color: "#fff" }} />
          </div>

          <h1 style={{
            fontSize: isMobile ? 30 : 40, fontWeight: 900,
            color: "#fff", marginBottom: 8, letterSpacing: "-.025em", lineHeight: 1.1,
          }}>
            Comercio Fácil
          </h1>
          <p style={{ fontSize: isMobile ? 13 : 15, color: "rgba(255,255,255,.6)", marginBottom: isMobile ? 24 : 36, lineHeight: 1.6 }}>
            La plataforma B2B para mayoristas de México
          </p>

          {/* Stats */}
          {!isMobile && (
            <div style={{ display: "flex", gap: 1, marginBottom: 28, borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,.1)" }}>
              {STATS.map(({ value, label }, i) => (
                <div key={label} style={{
                  flex: 1, padding: "14px 8px",
                  background: "rgba(255,255,255,.05)",
                  borderRight: i < STATS.length - 1 ? "1px solid rgba(255,255,255,.07)" : "none",
                  textAlign: "center",
                }}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: "#FCA5A5", letterSpacing: "-.02em" }}>{value}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,.5)", fontWeight: 500, marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Features */}
          {!isMobile && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {FEATURES.map(({ icon, text }) => (
                <div key={text} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  background: "rgba(255,255,255,.06)",
                  borderRadius: 10, padding: "11px 14px",
                  border: "1px solid rgba(255,255,255,.08)",
                  textAlign: "left",
                }}>
                  <div style={{
                    width: 32, height: 32, flexShrink: 0,
                    background: "rgba(200,32,42,.25)",
                    borderRadius: 8,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    border: "1px solid rgba(200,32,42,.3)",
                  }}>
                    <Icon name={icon} size={15} style={{ color: "#FCA5A5" }} />
                  </div>
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,.8)", lineHeight: 1.4 }}>{text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Formulario ── */}
      <div style={{
        width: isMobile ? "100%" : 480,
        background: "#fff",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: isMobile ? "28px 20px 44px" : "52px 48px",
      }}>
        <div style={{ width: "100%", maxWidth: 390 }} className="fade-up">

          {/* Cabecera */}
          <div style={{ marginBottom: 26 }}>
            <h2 style={{ fontSize: isMobile ? 22 : 26, fontWeight: 900, color: "var(--gray-900)", marginBottom: 6, letterSpacing: "-.02em" }}>
              {mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
            </h2>
            <p style={{ color: "var(--gray-500)", fontSize: 14 }}>
              {mode === "login"
                ? "Accede a tu plataforma mayorista"
                : "Únete a la red de comercio B2B"}
            </p>
          </div>

          {/* Tab switcher */}
          <div style={{ display: "flex", background: "var(--gray-100)", borderRadius: 10, padding: 4, marginBottom: 24 }}>
            {["login", "register"].map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  flex: 1, padding: "9px 14px",
                  border: "none", borderRadius: 8, cursor: "pointer",
                  fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 14,
                  transition: "all .2s",
                  background: mode === m ? "#fff" : "transparent",
                  color: mode === m ? "var(--red)" : "var(--gray-500)",
                  boxShadow: mode === m ? "var(--shadow-sm)" : "none",
                }}
              >
                {m === "login" ? "Iniciar Sesión" : "Registrarse"}
              </button>
            ))}
          </div>

          {/* Campos */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {mode === "register" && (
              <InputField label="Nombre completo" placeholder="María García López" value={form.nombre} onChange={set("nombre")} />
            )}
            <InputField label="Correo electrónico" type="email" placeholder="correo@empresa.com.mx" value={form.email} onChange={set("email")} />
            <InputField label="Contraseña" type="password" placeholder="••••••••" value={form.password} onChange={set("password")} />
            {mode === "register" && (
              <InputField label="Teléfono (opcional)" placeholder="55 1234 5678" value={form.telefono} onChange={set("telefono")} />
            )}
            {mode === "register" && form.rol === "vendedor" && (
              <InputField
                label="RFC de la empresa (opcional)"
                placeholder="ej. ABC010101AAA"
                value={form.rfc}
                onChange={set("rfc")}
                style={{ fontFamily: "monospace", textTransform: "uppercase" }}
              />
            )}

            {/* Tipo de cuenta */}
            {mode === "register" && (
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--gray-700)", marginBottom: 8 }}>
                  Tipo de cuenta
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {[
                    { value: "cliente",  icon: "users", label: "Comprador",  desc: "Compra al mayoreo" },
                    { value: "vendedor", icon: "store", label: "Proveedor",  desc: "Vende tus productos" },
                  ].map(({ value, icon, label, desc }) => {
                    const sel = form.rol === value;
                    return (
                      <button
                        key={value} type="button"
                        onClick={() => setForm((p) => ({ ...p, rol: value }))}
                        style={{
                          padding: "12px 10px",
                          border: `2px solid ${sel ? "var(--red)" : "var(--gray-200)"}`,
                          borderRadius: 10,
                          background: sel ? "var(--red-pale)" : "#fff",
                          cursor: "pointer", textAlign: "left",
                          transition: "all .2s",
                          display: "flex", flexDirection: "column", gap: 4,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{
                            width: 24, height: 24,
                            background: sel ? "var(--red-pale)" : "var(--gray-100)",
                            borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                            <Icon name={icon} size={13} style={{ color: sel ? "var(--red)" : "var(--gray-500)" }} />
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 700, color: sel ? "var(--red)" : "var(--gray-700)" }}>
                            {label}
                          </span>
                        </div>
                        <span style={{ fontSize: 11, color: "var(--gray-400)", paddingLeft: 1 }}>{desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Botón submit */}
            <button
              className="btn-primary"
              onClick={submit}
              disabled={loading}
              style={{ width: "100%", padding: "13px", fontSize: 15, marginTop: 4, borderRadius: 10, justifyContent: "center" }}
            >
              {loading ? (
                <>
                  <div style={{ width: 17, height: 17, border: "2px solid rgba(255,255,255,.3)", borderTop: "2px solid #fff", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                  Procesando...
                </>
              ) : (
                mode === "login" ? "Entrar al sistema" : "Crear cuenta gratis"
              )}
            </button>
          </div>

          <p style={{ textAlign: "center", color: "var(--gray-400)", fontSize: 12, marginTop: 24 }}>
            © 2025 Comercio Fácil México · Plataforma Mayorista B2B
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
