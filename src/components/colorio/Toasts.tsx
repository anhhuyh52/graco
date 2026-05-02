import { For } from "solid-js";
import { useColorIO } from "../../context/ColorIOContext";

export function Toasts() {
  const { toasts, removeToast } = useColorIO();

  const toastStyles = {
    success: {
      background: "rgba(77,219,142,.15)",
      border: "1px solid rgba(77,219,142,.3)",
      color: "#4ddb8e",
    },
    error: {
      background: "rgba(255,92,92,.15)",
      border: "1px solid rgba(255,92,92,.3)",
      color: "#ff5c5c",
    },
    info: {
      background: "rgba(29,29,35,.85)",
      border: "1px solid rgba(255,255,255,0.1)",
      color: "rgb(226, 226, 233)",
    },
  };

  return (
    <div class="toast-container">
      <style>{`
        .toast-container {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          flex-direction: column;
          gap: 4px;
          z-index: 2000;
          pointer-events: none;
          align-items: center;
        }
        .toast {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
          pointer-events: all;
          cursor: pointer;
          backdrop-filter: blur(12px);
          box-shadow: 0 4px 20px rgba(0,0,0,.4);
          animation: toast-in 200ms ease-out forwards;
        }
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .toast:hover {
          opacity: 0.8;
        }
      `}</style>

      <For each={toasts()}>
        {(toast) => (
          <div
            class="toast"
            style={toastStyles[toast.type]}
            onClick={() => removeToast(toast.id)}
          >
            {toast.msg}
          </div>
        )}
      </For>
    </div>
  );
}
