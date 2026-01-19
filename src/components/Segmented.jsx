import React from "react";

export default function Segmented({ options, value, onChange, className = "" }) {
  return (
    <div
      className={`flex rounded-2xl border border-[color:var(--border)] bg-white p-1 ${className}`}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`h-9 flex-1 rounded-xl text-[14px] font-semibold transition ${
              active
                ? "bg-black/5"
                : "bg-transparent hover:bg-black/5"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
