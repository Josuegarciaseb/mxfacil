import { createPortal } from "react-dom";
import Icon from "./Icon";
import { useDialog } from '../../hooks/useDialog';

const Modal = ({ open, onClose, title, children }) => {
  const dialog = useDialog(open,onClose);
  if (!open) return null;
  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" ref={dialog} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} onClick={(e) => e.stopPropagation()}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <h3 style={{ fontSize: 17, color: "var(--gray-900)" }}>{title}</h3>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="btn-ghost"
            style={{ padding: 6, borderRadius: "50%" }}
          >
            <Icon name="x" size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
};

export default Modal;
