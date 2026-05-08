import { createPortal } from "react-dom";
import Icon from "./Icon";

const Modal = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
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
