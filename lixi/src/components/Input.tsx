import React from "react";
export default function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`sv-input ${props.className ?? ""}`} />;
}
