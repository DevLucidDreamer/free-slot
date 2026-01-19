import React, { useEffect } from "react";

export default function Modal({ open, title, children, onClose }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40">
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
      />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-[var(--radius)] border border-[color:var(--border)] bg-white shadow-[var(--shadow)]">
          <div className="flex items-center justify-between border-b border-[color:var(--border)] px-4 py-3">
            <div className="text-[15px] font-semibold">{title}</div>
            <button className="h-9 w-9 rounded-xl hover:bg-black/5" onClick={onClose}>
              ✕
            </button>
          </div>
          <div className="p-4">{children}</div>
        </div>
      </div>
    </div>
  );
}
