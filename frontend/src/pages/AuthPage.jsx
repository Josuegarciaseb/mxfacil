import { useState } from "react";
import { http }          from "../utils/api";
import { toast }         from "../utils/toast";
import { useBreakpoint } from "../hooks/useBreakpoint";
import Icon              from "../components/ui/Icon";
import Logo              from "../components/ui/Logo";

/* ── Design tokens (ref: login.html / register.html) ── */
const G900 = "#173404";
const G800 = "#27500A";
const G700 = "#2d5a0f";
const G400 = "#639922";
const G100 = "#C0DD97";
const G50  = "#EAF3DE";
const SAND = "#f7f5f0";
const SAND_D = "#ece8e0";
const TEXT  = "#1a1a18";
const MUTED = "#6b6b63";
const BORDER = "#d9d4c8";

const STATS = [
  { value: "",  label: "Comerciantes" },
  { value: "",  label: "Satisfacción"  },
  { value: "", label: "Soporte"       },
];

const FEATURES = [
  "Registro en menos de 2 minutos",
  "Sin comisiones ocultas",
  "Gestión de inventario en tiempo real",
];

/* ── Icono de casa (brand) ── */
const HomeIcon = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

/* ── Círculo de verificación ── */
const CheckCircle = () => (
  <div style={{
    width: 20, height: 20, borderRadius: "50%", background: G400,
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  }}>
    <svg width={11} height={11} viewBox="0 0 24 24" fill="none"
      stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  </div>
);

/* ── Spinner inline ── */
const Spin = () => (
  <div style={{
    width: 18, height: 18,
    border: "2px solid rgba(255,255,255,.3)",
    borderTop: "2px solid #fff",
    borderRadius: "50%",
    animation: "spin 0.7s linear infinite",
  }} />
);

/* ── Input con icono izquierdo ── */
const Field = ({ label, hint, icon, type = "text", value, onChange, onKeyDown, placeholder, extra = {}, right = null }) => (
  <div style={{ marginBottom: 14 }}>
    <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 500, color: MUTED, marginBottom: 6, letterSpacing: "0.02em", fontFamily: "'Sora', sans-serif" }}>
      {label}
    </label>
    <div style={{ position: "relative" }}>
      <Icon name={icon} size={16} style={{
        position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
        color: BORDER, pointerEvents: "none", zIndex: 1, transition: "color .2s",
      }} />
      <input
        type={type}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        style={{
          width: "100%", height: 48,
          background: "#fff", border: `1.5px solid ${BORDER}`,
          borderRadius: 10, padding: "0 14px 0 42px",
          fontFamily: "'Sora', sans-serif", fontSize: "0.9rem", color: TEXT,
          outline: "none", transition: "border-color .2s, box-shadow .2s",
          ...extra,
        }}
        onFocus={(e) => { e.target.style.borderColor = G400; e.target.style.boxShadow = "0 0 0 3px rgba(99,153,34,.12)"; }}
        onBlur={(e)  => { e.target.style.borderColor = BORDER; e.target.style.boxShadow = "none"; }}
      />
      {right}
    </div>
    {hint && <p style={{ fontSize: "0.72rem", color: MUTED, marginTop: 4, fontFamily: "'Sora',sans-serif" }}>{hint}</p>}
  </div>
);

/* ─────────────────────────────────────────── */
const AuthPage = ({ onLogin, onBack }) => {
  const [mode,    setMode]    = useState("login");
  const [form,    setForm]    = useState({ nombre: "", email: "", password: "", telefono: "", rol: "cliente", rfc: "" });
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
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

  const onKey = (e) => { if (e.key === "Enter") submit(); };

  /* ── Panel izquierdo ── */
  const LeftPanel = () => (
    <div style={{
      width: "48%", background: G900,
      display: "flex", flexDirection: "column", justifyContent: "space-between",
      padding: "3rem 3.5rem",
      position: "relative", overflow: "hidden",
    }}>
      {/* Decoraciones */}
      <div style={{ position: "absolute", top: -120, left: -120, width: 480, height: 480, borderRadius: "50%", background: G800, opacity: 0.5 }} />
      <div style={{ position: "absolute", bottom: -80, right: -80, width: 320, height: 320, borderRadius: "50%", background: G400, opacity: 0.12 }} />

      {/* Marca */}
      <div style={{ position: "relative", zIndex: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Logo size={60} />
        {onBack && (
          <button
            onClick={onBack}
            style={{
              background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.15)",
              borderRadius: 8, padding: "6px 12px",
              color: "rgba(255,255,255,.7)", cursor: "pointer",
              fontFamily: "'Sora',sans-serif", fontSize: "0.78rem", fontWeight: 500,
              display: "flex", alignItems: "center", gap: 5,
              transition: "all .15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,.16)"; e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,.1)"; e.currentTarget.style.color = "rgba(255,255,255,.7)"; }}
          >
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Catálogo
          </button>
        )}
      </div>

      {/* Hero text */}
      <div style={{ position: "relative", zIndex: 2 }}>
        {mode === "login" ? (
          <>
            <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "2.8rem", lineHeight: 1.15, color: "#fff", marginBottom: "1.25rem", fontWeight: 400 }}>
              El comercio<br/>mexicano en<br/><em style={{ fontStyle: "italic", color: G100 }}>tus manos.</em>
            </h1>
            <p style={{ fontSize: "0.95rem", lineHeight: 1.7, color: "rgba(255,255,255,.6)", maxWidth: 340, fontFamily: "'Sora',sans-serif" }}>
              Conecta proveedores y comerciantes. Gestiona productos, pedidos e inventarios desde un solo lugar.
            </p>
          </>
        ) : (
          <>
            <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "2.8rem", lineHeight: 1.15, color: "#fff", marginBottom: "1.25rem", fontWeight: 400 }}>
              Tu negocio,<br/>tu plataforma,<br/><em style={{ fontStyle: "italic", color: G100 }}>tu México.</em>
            </h1>
            <p style={{ fontSize: "0.95rem", lineHeight: 1.7, color: "rgba(255,255,255,.6)", maxWidth: 340, fontFamily: "'Sora',sans-serif", marginBottom: "1.5rem" }}>
              Únete a la red de comerciantes y proveedores más grande del país.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {FEATURES.map((f) => (
                <div key={f} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "0.88rem", color: "rgba(255,255,255,.65)", fontFamily: "'Sora',sans-serif" }}>
                  <CheckCircle />
                  {f}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: "2rem", position: "relative", zIndex: 2 }}>
        {STATS.map(({ value, label }) => (
          <div key={label} style={{ borderTop: "1px solid rgba(255,255,255,.15)", paddingTop: "1rem" }}>
            <div style={{ fontSize: "1.6rem", fontWeight: 600, color: "#fff", lineHeight: 1, marginBottom: 4, fontFamily: "'Sora',sans-serif" }}>{value}</div>
            <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,.5)", letterSpacing: "0.04em", textTransform: "uppercase", fontFamily: "'Sora',sans-serif" }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );

  /* ── Formulario ── */
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: isMobile ? "column" : "row", background: SAND }}>

      {/* Panel izquierdo (solo desktop) */}
      {!isMobile && <LeftPanel />}

      {/* Panel derecho */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: isMobile ? "2rem 1.5rem" : "3rem 4rem",
        overflowY: "auto",
      }}>
        <div style={{ width: "100%", maxWidth: 400, animation: "fadeUp 0.5s ease both" }}>

          {/* Botón volver al catálogo */}
          {onBack && (
            <button
              onClick={onBack}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "none", border: "none",
                color: MUTED, cursor: "pointer", padding: "0 0 1.5rem",
                fontFamily: "'Sora',sans-serif", fontSize: "0.82rem",
                fontWeight: 500, transition: "color .15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = G700)}
              onMouseLeave={(e) => (e.currentTarget.style.color = MUTED)}
            >
              <svg width={15} height={15} viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              Volver al catálogo
            </button>
          )}

          {/* Cabecera */}
          <div style={{ marginBottom: "2rem" }}>
            <div style={{ fontSize: "0.72rem", letterSpacing: "0.1em", textTransform: "uppercase", color: G400, fontWeight: 600, marginBottom: "0.5rem", fontFamily: "'Sora',sans-serif" }}>
              {mode === "login" ? "Bienvenido de vuelta" : "Crea tu cuenta"}
            </div>
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "2rem", fontWeight: 400, color: TEXT, lineHeight: 1.2 }}>
              {mode === "login" ? "Inicia sesión" : "Únete gratis"}
            </h2>
            <p style={{ marginTop: "0.6rem", fontSize: "0.88rem", color: MUTED, fontFamily: "'Sora',sans-serif" }}>
              {mode === "login" ? "Accede a tu cuenta para continuar." : "Elige tu tipo de cuenta y completa el formulario."}
            </p>
          </div>

          {/* Tabs modo (login / registro) */}
          <div style={{ display: "flex", background: SAND_D, borderRadius: 10, padding: 4, marginBottom: "1.5rem", gap: 4 }}>
            {[
              { id: "login",    label: "Iniciar sesión" },
              { id: "register", label: "Registrarse"    },
            ].map(({ id, label }) => {
              const active = mode === id;
              return (
                <button
                  key={id}
                  onClick={() => setMode(id)}
                  style={{
                    flex: 1, height: 36, border: "none", borderRadius: 7, cursor: "pointer",
                    fontFamily: "'Sora',sans-serif", fontSize: "0.83rem",
                    fontWeight: active ? 600 : 500,
                    color: active ? G900 : MUTED,
                    background: active ? "#fff" : "transparent",
                    boxShadow: active ? "0 1px 4px rgba(0,0,0,.08)" : "none",
                    transition: "all .2s",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* ── Campos ── */}
          {mode === "register" && (
            <>
              {/* Selector de rol */}
              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 500, color: MUTED, marginBottom: 8, fontFamily: "'Sora',sans-serif" }}>
                  Tipo de cuenta
                </label>
                <div style={{ display: "flex", background: SAND_D, borderRadius: 10, padding: 4, gap: 4 }}>
                  {[
                    { value: "cliente",  label: "Soy Cliente"  },
                    { value: "vendedor", label: "Soy Vendedor" },
                  ].map(({ value, label }) => {
                    const sel = form.rol === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, rol: value }))}
                        style={{
                          flex: 1, height: 36, border: "none", borderRadius: 7, cursor: "pointer",
                          fontFamily: "'Sora',sans-serif", fontSize: "0.83rem",
                          fontWeight: sel ? 600 : 500,
                          color: sel ? G900 : MUTED,
                          background: sel ? "#fff" : "transparent",
                          boxShadow: sel ? "0 1px 4px rgba(0,0,0,.08)" : "none",
                          transition: "all .2s",
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Nombre + Teléfono en fila */}
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <div style={{ flex: 1 }}>
                  <Field label="Nombre completo" icon="user" value={form.nombre} onChange={set("nombre")} onKeyDown={onKey} placeholder="Ana García" />
                </div>
                <div style={{ flex: 1 }}>
                  <Field label="Teléfono (opcional)" icon="phone" type="tel" value={form.telefono} onChange={set("telefono")} onKeyDown={onKey} placeholder="5512345678" extra={{ maxLength: 10 }} />
                </div>
              </div>
            </>
          )}

          <Field label="Correo electrónico" icon="mail" type="email" value={form.email} onChange={set("email")} onKeyDown={onKey} placeholder="correo@ejemplo.com" />

          <Field
            label="Contraseña"
            icon="eye"
            type={showPwd ? "text" : "password"}
            value={form.password}
            onChange={set("password")}
            onKeyDown={onKey}
            placeholder="••••••••"
            hint={mode === "register" ? "Mín. 8 caracteres, 1 mayúscula y 1 carácter especial" : undefined}
            right={
              <button
                type="button"
                onClick={() => setShowPwd((p) => !p)}
                style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 4, color: MUTED, display: "flex" }}
              >
                <Icon name="eye" size={16} />
              </button>
            }
          />

          {mode === "register" && form.rol === "vendedor" && (
            <Field
              label="RFC (opcional)"
              icon="shield"
              value={form.rfc}
              onChange={(e) => setForm((p) => ({ ...p, rfc: e.target.value.toUpperCase() }))}
              onKeyDown={onKey}
              placeholder="ABC010101AAA"
              extra={{ maxLength: 13, textTransform: "uppercase", fontFamily: "monospace" }}
              hint="Persona moral: 12 chars · Persona física: 13 chars"
            />
          )}

          {/* Botón submit */}
          <button
            onClick={submit}
            disabled={loading}
            style={{
              width: "100%", height: 50,
              background: loading ? G700 : G900,
              color: "#fff", border: "none", borderRadius: 10,
              fontFamily: "'Sora',sans-serif", fontSize: "0.92rem", fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              letterSpacing: "0.02em",
              transition: "background .2s, transform .1s",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              marginTop: "0.5rem",
            }}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = G800; }}
            onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = G900; }}
          >
            {loading ? <Spin /> : (mode === "login" ? "Iniciar sesión" : "Crear cuenta")}
          </button>

          {/* Divisor */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "1.25rem 0 1rem" }}>
            <div style={{ flex: 1, height: 1, background: BORDER }} />
            <span style={{ fontSize: "0.75rem", color: MUTED, fontFamily: "'Sora',sans-serif", whiteSpace: "nowrap" }}>
              o continuar con
            </span>
            <div style={{ flex: 1, height: 1, background: BORDER }} />
          </div>

          {/* Botón Google */}
          <button
            type="button"
            onClick={() => { window.location.href = `${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/auth/google`; }}
            style={{
              width: "100%", height: 48,
              background: "#fff", border: `1.5px solid ${BORDER}`,
              borderRadius: 10, cursor: "pointer",
              fontFamily: "'Sora',sans-serif", fontSize: "0.9rem", fontWeight: 500, color: TEXT,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              transition: "border-color .2s, box-shadow .2s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#4285F4"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(66,133,244,.12)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.boxShadow = "none"; }}
          >
            <svg width={20} height={20} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Continuar con Google
          </button>

          {/* Pie */}
          <p style={{ marginTop: "1.5rem", textAlign: "center", fontSize: "0.84rem", color: MUTED, fontFamily: "'Sora',sans-serif" }}>
            {mode === "login"
              ? <><span>¿No tienes cuenta? </span><button onClick={() => setMode("register")} style={{ background: "none", border: "none", color: G700, fontWeight: 600, cursor: "pointer", fontFamily: "'Sora',sans-serif", fontSize: "0.84rem" }}>Regístrate gratis</button></>
              : <><span>¿Ya tienes cuenta? </span><button onClick={() => setMode("login")} style={{ background: "none", border: "none", color: G700, fontWeight: 600, cursor: "pointer", fontFamily: "'Sora',sans-serif", fontSize: "0.84rem" }}>Inicia sesión</button></>
            }
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
