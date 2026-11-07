import { useState, useEffect } from "react";
import { setToastFn } from "../../utils/toast";
import Icon from "./Icon";

const ToastContainer = () => {
  const [toasts, setToasts] = useState([]);

  useEffect(()=>{
    const timers = new Set();
    let sequence = 0;
    setToastFn((msg, type) => {
    const id = ++sequence;
    setToasts((p) => [...p, { id, msg, type }]);
    const timer = setTimeout(() => { setToasts((p) => p.filter((t) => t.id !== id)); timers.delete(timer); }, 3500);
    timers.add(timer);
    });
    return ()=>{setToastFn(null);timers.forEach(clearTimeout);};
  },[]);

  return (
    <div
      style={{
        position: "fixed",
        bottom: 16,
        right: 16,
        left: 16,
        zIndex: 10001,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        pointerEvents: "none",
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role={t.type === 'error' ? 'alert' : 'status'}
          style={{
            background:
              t.type === "error"
                ? "#dc2626"
                : t.type === "warn"
                ? "#d97706"
                : "#16a34a",
            color: "#fff",
            padding: "12px 16px",
            borderRadius: 12,
            fontSize: 14,
            fontFamily: "'Sora', sans-serif",
            fontWeight: 500,
            boxShadow: "0 8px 32px rgba(0,0,0,.2)",
            animation: "toastIn .3s cubic-bezier(.34,1.56,.64,1)",
            display: "flex",
            alignItems: "center",
            gap: 10,
            maxWidth: 420,
            marginLeft: "auto",
            pointerEvents: "all",
          }}
        >
          <Icon
            name={
              t.type === "error" ? "x" : t.type === "warn" ? "alert" : "check"
            }
            size={16}
          />
          {t.msg}
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;
