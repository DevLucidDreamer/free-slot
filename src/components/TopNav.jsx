import React from "react";

export default function TopNav({ left, title, right }) {
  return (
    <header className="sticky top-0 z-20 border-b border-[color:var(--border)] bg-[color:var(--bg)]/90 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-[1080px] items-center justify-between px-4 md:px-6">
        <div className="min-w-[80px]">{left}</div>
        <div className="max-w-[60%] truncate text-[15px] font-semibold">
          {title}
        </div>
        <div className="min-w-[80px] text-right">{right}</div>
      </div>
    </header>
  );
}
