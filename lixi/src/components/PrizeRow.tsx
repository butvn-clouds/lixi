import React from "react";
import type { Prize } from "../api";

export default function PrizeRow({
  prize,
  onMinus,
  onPlus,
  onRemove
}: {
  prize: Prize;
  onMinus: () => void;
  onPlus: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="sv-prize-row">
      <div className="sv-prize-left">
        <div className="sv-prize-icon">{prize.type === "cash" ? "💵" : "🎲"}</div>
        <div>
          <div className="sv-prize-title">{prize.label}</div>
          <div className="sv-prize-sub">{prize.type === "cash" ? prize.formatted : "Giải vui"}</div>
        </div>
      </div>

      <div className="sv-prize-right">
        <button className="sv-mini-btn" onClick={onMinus}>−</button>
        <div className="sv-qty">{prize.remaining}</div>
        <button className="sv-mini-btn" onClick={onPlus}>+</button>
        <button className="sv-x" onClick={onRemove}>×</button>
      </div>
    </div>
  );
}
