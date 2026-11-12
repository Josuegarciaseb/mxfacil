import { useEffect, useRef, useState } from "react";
import { EMPTY_ADDRESS } from "../../constants";
import { http } from "../../utils/api";
import Btn from "../ui/Btn";
import Icon from "../ui/Icon";
import Modal from "../ui/Modal";
import AddressFields from "./AddressFields";
import "./address-picker.css";

export default function AddressPicker({ token, book, onClose }) {
  const { addresses, primary, loading, error: loadError, refresh } = book;
  const [draftId, setDraftId] = useState(null);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const body = useRef(null);
  const selected = addresses.find(address => address.id === draftId) ?? primary ?? addresses[0];
  const editing = form !== null;
  const title = editing ? (form.id ? "Editar dirección" : "Agregar nueva dirección") : "Elige una dirección";

  useEffect(() => {
    const dialog = body.current.closest('[role="dialog"]');
    if (editing) body.current.querySelector("input")?.focus();
    else if (!dialog.contains(document.activeElement)) dialog.focus();
  }, [editing, loading]);

  function openForm(address) {
    setError("");
    setForm(address);
  }

  async function save(action) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await action();
      refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function confirmAddress() {
    save(async () => {
      await http("/direcciones/" + selected.id, {
        method: "PUT", body: JSON.stringify({ es_principal: 1 }),
      }, token);
      if (body.current) onClose();
    });
  }

  function saveForm(event) {
    event.preventDefault();
    const { linea1, ciudad, estado, cp, pais } = form;
    save(async () => {
      const saved = await http(form.id ? "/direcciones/" + form.id : "/direcciones", {
        method: form.id ? "PUT" : "POST", body: JSON.stringify({ linea1, ciudad, estado, cp, pais }),
      }, token);
      setDraftId(saved.id);
      setForm(null);
    });
  }

  function deleteAddress() {
    if (!window.confirm(`¿Eliminar la dirección «${form.linea1}»?`)) return;
    save(async () => {
      await http("/direcciones/" + form.id, { method: "DELETE" }, token);
      setDraftId(null);
      setForm(null);
    });
  }

  return (
    <Modal open title={title} onClose={busy ? undefined : onClose} overlayClassName="address-picker">
      <div className="address-picker-body" ref={body}>
        {error && <p role="alert" className="address-picker-error">{error}</p>}
        {editing ? (
          <form onSubmit={saveForm} className="address-picker-form">
            <fieldset disabled={busy}>
              <AddressFields value={form} onChange={setForm} />
            </fieldset>
            {form.id && (
              <button className="address-picker-delete" type="button" onClick={deleteAddress} disabled={busy}>
                <Icon name="trash" size={14} /> Eliminar dirección
              </button>
            )}
            <div className="address-picker-actions">
              <Btn variant="secondary" onClick={() => openForm(null)} disabled={busy}>Cancelar</Btn>
              <Btn type="submit" disabled={busy}>{busy ? "Guardando…" : "Guardar"}</Btn>
            </div>
          </form>
        ) : loading ? (
          <p className="address-picker-status" role="status">Cargando direcciones…</p>
        ) : loadError ? (
          <div className="address-picker-status">
            <p role="alert">No pudimos cargar tus direcciones.</p>
            <Btn variant="secondary" onClick={refresh}>Reintentar</Btn>
          </div>
        ) : (
          <>
            {addresses.length ? (
              <div className="address-picker-options" role="radiogroup" aria-label="Direcciones de entrega">
                {addresses.map(address => {
                  const checked = address.id === selected.id;
                  return (
                    <div key={address.id} className={`address-picker-option${checked ? " is-selected" : ""}`}>
                      <label>
                        <input type="radio" name="delivery-address" checked={checked} disabled={busy}
                          onChange={() => { setDraftId(address.id); setError(""); }} />
                        <span>
                          <strong>{address.linea1}</strong>{" "}
                          <small>CP {address.cp} · {address.ciudad}, {address.estado}</small>
                        </span>
                      </label>
                      {checked && (
                        <button type="button" className="address-picker-edit" onClick={() => openForm(address)} disabled={busy}>
                          <Icon name="edit" size={13} /> Editar
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="address-picker-empty">
                <Icon name="mapPin" size={25} />
                <p>Aún no tienes direcciones guardadas.</p>
              </div>
            )}
            <div className="address-picker-actions">
              {selected && <Btn onClick={confirmAddress} disabled={busy}>{busy ? "Confirmando…" : "Confirmar"}</Btn>}
              <Btn variant={selected ? "secondary" : "primary"} onClick={() => openForm(EMPTY_ADDRESS)} disabled={busy}>
                Agregar nueva dirección
              </Btn>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
