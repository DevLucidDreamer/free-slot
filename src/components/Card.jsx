import React from "react";

export default function Card({ children, className = "" }) {
  return (
    <div
      className={`rounded-[var(--radius)] bg-[color:var(--card)] shadow-[var(--shadow)] border border-[color:var(--border)] ${className}`}
    >
      {children}
    </div>
  );
}
