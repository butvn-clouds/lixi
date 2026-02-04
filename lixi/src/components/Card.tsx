import React from "react";
export default function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={`sv-card ${className ?? ""}`}>{children}</div>;
}
