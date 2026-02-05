import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Card from "../components/Card";
import Button from "../components/Button";
import Input from "../components/Input";
import { api } from "../api";
import { toastErr } from "../ui";

export default function Join() {
  const { code = "" } = useParams();
  const nav = useNavigate();
  const [name, setName] = useState("");

  const join = async () => {
    try {
      const r = await api.join(code, { name });
      localStorage.setItem(`sumvay.player.${code}`, JSON.stringify({ playerId: r.playerId, playerName: r.playerName }));
      nav(`/play/${code}`);
    } catch (e: any) {
      toastErr(e?.message ?? "Join fail");
    }
  };

  return (
    <div className="sv-screen">
      <div className="sv-hero">
        <div className="sv-logo">Thử vận may</div>
        <div className="sv-hero-pill">✦ PHÒNG: {code} ✦</div>
      </div>

      <Card className="sv-join-card">
        <div className="sv-join-icon">♞</div>
        <div className="sv-join-title">Bạn tên gì?</div>
        <Input
          placeholder="VD: Tôn Thất Đạt"
          style={{ marginBottom: '10px' }}

          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && join()}
        />
        <Button className="sv-btn-full" variant="gold" onClick={() => join()} disabled={!name.trim()}>
          👤 VÀO CHƠI!
        </Button>

        <div className="sv-join-foot">👑 Chủ xị: Chủ Xị</div>
      </Card>
    </div>
  );
}
