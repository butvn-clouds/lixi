import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../components/Card";
import Button from "../components/Button";
import Input from "../components/Input";

export default function Home() {
  const nav = useNavigate();
  const [code, setCode] = useState("");

  return (
    <div className="sv-screen">
      <div className="sv-hero">
        <div className="sv-logo">Thử vận may</div>
        <div className="sv-hero-pill">✦ LẮC LỘC ĐẦU XUÂN 2026 ✦</div>
      </div>

      <Card className="sv-home-card">
        <Button
          variant="red"
          onClick={() => nav("/host/create")}
        >
          ⭐ TẠO PHÒNG NGAY
        </Button>

        <div className="sv-or">HOẶC THAM GIA</div>

        <div className="sv-join-row">
          <Input
            placeholder="NHẬP MÃ PHÒNG"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\s+/g, ""))}
          />
          <button
            className="sv-go"
            onClick={() => code.trim() && nav(`/join/${code.trim()}`)}
            aria-label="go"
          >
            ➜
          </button>
        </div>
      </Card>
    </div>
  );
}
