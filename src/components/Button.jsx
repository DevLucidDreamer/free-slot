import React from "react";

export default function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl px-4 h-11 text-[15px] font-semibold active:scale-[0.99] transition";
  const styles =
    variant === "primary"
      ? "bg-[color:var(--primary)] text-white"
      : variant === "ghost"
      ? "bg-transparent text-[color:var(--text)] hover:bg-black/5"
      : "bg-white text-[color:var(--text)] border border-[color:var(--border)]";

  return (
    <button className={`${base} ${styles} ${className}`} {...props}>
      {children}
    </button>
  );
}
