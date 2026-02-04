import React from "react";
export default function Pill({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={`sv-pill ${className ?? ""}`}>{children}</span>;
}
