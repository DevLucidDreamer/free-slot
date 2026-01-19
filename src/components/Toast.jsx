import React from "react";

export default function Toast({ message }) {
  if (!message) return null;
  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
      <div className="rounded-2xl bg-black/80 px-4 py-3 text-[13px] text-white shadow-lg">
        {message}
      </div>
    </div>
  );
}
