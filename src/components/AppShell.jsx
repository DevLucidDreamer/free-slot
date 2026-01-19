import React from "react";

export default function AppShell({ top, children }) {
  return (
    <div className="min-h-screen">
      {top}
      <main className="mx-auto w-full max-w-[1080px] px-4 pb-24 pt-4 md:px-6">
        {children}
      </main>
    </div>
  );
}
