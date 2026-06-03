import { useState, useEffect } from "react";
import { http } from "../../utils/api";
import { toast } from "../../utils/toast";
import { useBreakpoint } from "../../hooks/useBreakpoint";
import PageHeader from "../../components/ui/PageHeader";
import Btn from "../../components/ui/Btn";
import StatusBadge from "../../components/ui/StatusBadge";
import { InputField } from "../../components/ui/FormFields";
import Icon from "../../components/ui/Icon";

/* ── Sección MFA ── */
const MfaPanel = ({ token }) => {
  const [mfaEnabled,  setMfaEnabled]  = useState(null);   // null=cargando
  const [view,        setView]        = useState("idle");  // idle | setup | disable
  const [qrData,      setQrData]      = useState(null);    // { qrCode, secret }
  const [totpCode,    setTotpCode]    = useState("");
  const [disablePwd,  setDisablePwd]  = useState("");
  const [busy,        setBusy]        = useState(false);

  useEffect(() => {
    http("/auth/mfa/status", {}, token)
      .then((d) => setMfaEnabled(d.mfa_enabled))
      .catch(() => setMfaEnabled(false));
  }, [token]);

  /* Iniciar configuración — obtener QR */
  const startSetup = async () => {
    setBusy(true);
    try {
      const d = await http("/auth/mfa/setup", { method: "POST" }, token);
      setQrData({ qrCode: d.qrCode, secret: d.secret });
      setView("setup");
      setTotpCode("");
    } catch (e) { toast(e.message, "error"); }
    finally { setBusy(false); }
  };

  /* Confirmar código y activar MFA */
  const confirmSetup = async () => {
    if (totpCode.length !== 6) { toast("El código debe tener 6 dígitos", "error"); return; }
    setBusy(true);
    try {
      await http("/auth/mfa/verify", { method: "POST", body: JSON.stringify({ totp_code: totpCode }) }, token);
      toast("MFA activado correctamente");
      setMfaEnabled(true);
      setView("idle");
      setQrData(null);
      setTotpCode("");
    } catch (e) { toast(e.message, "error"); setTotpCode(""); }
    finally { setBusy(false); }
  };

  /* Desactivar MFA con contraseña */
  const confirmDisable = async () => {
    if (!disablePwd) { toast("Ingresa tu contraseña", "error"); return; }
    setBusy(true);
    try {
      await http("/auth/mfa/disable", { method: "POST", body: JSON.stringify({ password: disablePwd }) }, token);
      toast("MFA desactivado");
      setMfaEnabled(false);
      setView("idle");
      setDisablePwd("");
    } catch (e) { toast(e.message, "error"); }
    finally { setBusy(false); }
  };

  const cancel = () => { setView("idle"); setTotpCode(""); setDisablePwd(""); setQrData(null); };

  if (mfaEnabled === null) return null;

  return (
    <div className="card" style={{ padding: 22 }}>
      {/* Encabezado */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none"
            stroke="var(--gray-400)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--gray-800)" }}>
            Autenticación de dos factores (MFA)
          </h3>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
          background: mfaEnabled ? "#dcfce7" : "#f1f5f9",
          color:      mfaEnabled ? "#15803d" : "#64748b",
          border:     mfaEnabled ? "1px solid #bbf7d0" : "1px solid #e2e8f0",
        }}>
          {mfaEnabled ? "● Activo" : "○ Inactivo"}
        </span>
      </div>

      {/* ── Vista: inactivo / botón activar ── */}
      {view === "idle" && !mfaEnabled && (
        <>
          <p style={{ fontSize: 13, color: "var(--gray-500)", marginBottom: 16, lineHeight: 1.6 }}>
            Protege tu cuenta con un código temporal generado por Google Authenticator, Authy u otra app compatible.
          </p>
          <Btn onClick={startSetup} disabled={busy}>
            {busy ? "Iniciando..." : <><svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:6}}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>Activar MFA</>}
          </Btn>
        </>
      )}

      {/* ── Vista: activo / botón desactivar ── */}
      {view === "idle" && mfaEnabled && (
        <>
          <div style={{ background: "#f0fdf4", borderRadius: 9, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#15803d", border: "1px solid #bbf7d0" }}>
            Tu cuenta está protegida con MFA. Necesitarás tu app autenticadora cada vez que inicies sesión.
          </div>
          <Btn
            onClick={() => setView("disable")}
            style={{ background: "var(--gray-100)", color: "var(--gray-700)", border: "1px solid var(--gray-200)" }}
          >
            <Icon name="x" size={14} /> Desactivar MFA
          </Btn>
        </>
      )}

      {/* ── Vista: setup — escanear QR y confirmar ── */}
      {view === "setup" && qrData && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <p style={{ fontSize: 13, color: "var(--gray-600)", lineHeight: 1.6 }}>
            <strong>Paso 1:</strong> Escanea este código QR con tu app autenticadora.
          </p>

          {/* QR */}
          <div style={{ display: "flex", justifyContent: "center" }}>
            <div style={{ background: "#fff", border: "2px solid var(--gray-100)", borderRadius: 12, padding: 12, display: "inline-block" }}>
              <img src={qrData.qrCode} alt="QR MFA" style={{ width: 180, height: 180, display: "block" }} />
            </div>
          </div>

          {/* Clave manual */}
          <div style={{ background: "var(--gray-50)", borderRadius: 9, padding: "10px 14px", border: "1px solid var(--gray-100)" }}>
            <p style={{ fontSize: 11, color: "var(--gray-500)", marginBottom: 4, fontWeight: 600 }}>CLAVE MANUAL (si no puedes escanear)</p>
            <code style={{ fontSize: 13, fontFamily: "monospace", color: "var(--gray-800)", letterSpacing: "0.1em", wordBreak: "break-all" }}>
              {qrData.secret}
            </code>
          </div>

          {/* Paso 2: ingresar código */}
          <p style={{ fontSize: 13, color: "var(--gray-600)", lineHeight: 1.6 }}>
            <strong>Paso 2:</strong> Ingresa el código de 6 dígitos que aparece en tu app para confirmar.
          </p>

          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={totpCode}
            autoFocus
            onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            style={{
              width: "100%", height: 56, boxSizing: "border-box",
              border: `2px solid ${totpCode.length === 6 ? "#639922" : "var(--gray-200)"}`,
              borderRadius: 10, background: "#fff",
              fontFamily: "monospace", fontSize: "1.7rem", fontWeight: 700,
              letterSpacing: "0.3em", textAlign: "center", color: "var(--gray-900)",
              outline: "none", transition: "border-color .2s",
            }}
            onFocus={(e) => { e.target.style.borderColor = "#639922"; e.target.style.boxShadow = "0 0 0 3px rgba(99,153,34,.12)"; }}
            onBlur={(e)  => { e.target.style.borderColor = totpCode.length === 6 ? "#639922" : "var(--gray-200)"; e.target.style.boxShadow = "none"; }}
            onKeyDown={(e) => { if (e.key === "Enter") confirmSetup(); }}
          />

          <div style={{ display: "flex", gap: 10 }}>
            <Btn onClick={confirmSetup} disabled={busy || totpCode.length !== 6} style={{ flex: 1 }}>
              {busy ? "Verificando..." : <><Icon name="check" size={14} /> Confirmar y activar</>}
            </Btn>
            <Btn onClick={cancel} disabled={busy} style={{ background: "var(--gray-100)", color: "var(--gray-700)", border: "1px solid var(--gray-200)" }}>
              Cancelar
            </Btn>
          </div>
        </div>
      )}

      {/* ── Vista: confirmar desactivación ── */}
      {view === "disable" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ background: "#fef2f2", borderRadius: 9, padding: "10px 14px", fontSize: 13, color: "#b91c1c", border: "1px solid #fecaca" }}>
            Desactivar MFA reduce la seguridad de tu cuenta. Confirma con tu contraseña para continuar.
          </div>
          <InputField
            label="Contraseña actual"
            type="password"
            value={disablePwd}
            onChange={(e) => setDisablePwd(e.target.value)}
            placeholder="••••••••"
          />
          <div style={{ display: "flex", gap: 10 }}>
            <Btn
              onClick={confirmDisable}
              disabled={busy || !disablePwd}
              style={{ flex: 1, background: "#dc2626", border: "none" }}
            >
              {busy ? "Desactivando..." : "Confirmar desactivación"}
            </Btn>
            <Btn onClick={cancel} disabled={busy} style={{ background: "var(--gray-100)", color: "var(--gray-700)", border: "1px solid var(--gray-200)" }}>
              Cancelar
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────── */
const ClientPerfil = ({ token, user, onUpdate }) => {
  const [form,      setForm]      = useState({ nombre: user.nombre, email: user.email, telefono: user.telefono || "" });
  const [saving,    setSaving]    = useState(false);
  const [proveedor, setProveedor] = useState(null);
  const [rfcInput,  setRfcInput]  = useState("");
  const [savingRfc, setSavingRfc] = useState(false);
  const { isDesktop } = useBreakpoint();

  useEffect(() => {
    if (user.rol !== "vendedor") return;
    http("/proveedores/me", {}, token)
      .then((p) => { setProveedor(p); setRfcInput(p.rfc || ""); })
      .catch(() => {});
  }, [token, user.rol]);

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

  const saveRfc = async () => {
    setSavingRfc(true);
    try {
      const updated = await http("/proveedores/me", { method: "PATCH", body: JSON.stringify({ rfc: rfcInput }) }, token);
      setProveedor(updated);
      toast("RFC guardado — pendiente de verificación por el administrador");
    } catch (e) { toast(e.message, "error"); }
    finally { setSavingRfc(false); }
  };

  const ROL_LABEL = { admin: "Administrador", vendedor: "Vendedor", cliente: "Cliente" };
  const ROL_BADGE = { admin: "badge-red", vendedor: "badge-blue", cliente: "badge-gray" };

  return (
    <div className="fade-up" style={{ maxWidth: isDesktop ? 1080 : 560 }}>
      <PageHeader title="Mi Perfil" subtitle="Tu informacion personal" />

      <div style={{
        display: isDesktop ? "grid" : "flex",
        gridTemplateColumns: isDesktop ? "300px 1fr" : undefined,
        flexDirection: isDesktop ? undefined : "column",
        gap: 18,
        alignItems: "start",
      }}>

        {/* ── Columna izquierda: Profile card ── */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ background: "linear-gradient(135deg, #639922 0%, #27500A 100%)", padding: "24px 24px 40px", position: "relative" }}>
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
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
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

        {/* ── Columna derecha ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

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

          {/* MFA */}
          <MfaPanel token={token} />

          {/* RFC / Verificación (solo vendedores) */}
          {user.rol === "vendedor" && proveedor && (
            <div className="card" style={{ padding: 22 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 18 }}>
                <Icon name="shield" size={16} style={{ color: "var(--gray-400)" }} />
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--gray-800)" }}>Verificación de empresa</h3>
              </div>

              <div style={{ background: "var(--gray-50)", borderRadius: 9, padding: "10px 14px", border: "1px solid var(--gray-100)", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <div style={{ fontSize: 13, color: "var(--gray-600)" }}>
                  {proveedor.rfc
                    ? <span style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--gray-800)" }}>{proveedor.rfc}</span>
                    : <span style={{ color: "var(--gray-400)" }}>Sin RFC registrado</span>
                  }
                </div>
                <StatusBadge estado={proveedor.verificado || "pendiente"} />
              </div>

              {proveedor.verificado === "rechazado" && proveedor.motivo_rechazo && (
                <div style={{ background: "#fee2e2", borderRadius: 9, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#b91c1c", border: "1px solid #fecaca" }}>
                  <strong>Motivo del rechazo:</strong> {proveedor.motivo_rechazo}
                </div>
              )}

              {proveedor.verificado === "aprobado" && (
                <div style={{ background: "#f0fdf4", borderRadius: 9, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#15803d", border: "1px solid #bbf7d0" }}>
                  Tu empresa está verificada. Si actualizas el RFC, volverá a estado pendiente para re-verificación.
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <InputField
                  label={proveedor.rfc ? "Actualizar RFC" : "Ingresar RFC"}
                  placeholder="ej. ABC010101AAA"
                  value={rfcInput}
                  onChange={(e) => setRfcInput(e.target.value.toUpperCase())}
                  style={{ fontFamily: "monospace" }}
                />
                <Btn
                  onClick={saveRfc}
                  disabled={savingRfc || !rfcInput.trim() || rfcInput.trim() === proveedor.rfc}
                  style={{ alignSelf: "flex-start" }}
                >
                  {savingRfc ? "Guardando..." : <><Icon name="shield" size={15} />Enviar para verificación</>}
                </Btn>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default ClientPerfil;
