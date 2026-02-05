import React from "react";

export default function Button(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "red" | "gold" | "ghost"; full?: boolean }
) {
  const { variant = "red", full = true, className, ...rest } = props;
  return (
    <button
      {...rest}
      className={[
        "sv-btn",
        variant === "red" ? "sv-btn-red" : "",
        variant === "gold" ? "sv-btn-gold" : "",
        variant === "ghost" ? "sv-btn-ghost" : "",
        full ? "" : "",
        className ?? ""
      ].join(" ")}
    />
  );
}
