import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../components/Card";
import Button from "../components/Button";
import Input from "../components/Input";
import PrizeRow from "../components/PrizeRow";
import type { Prize, RoomMode } from "../api";
import { api } from "../api";
import { moneyVND, toastErr } from "../ui";

function makeCash(label: string, value: number, remaining: number): Prize {
  return { id: crypto.randomUUID(), type: "cash", label, value, formatted: moneyVND(value), remaining };
}

export default function HostCreate() {
  const nav = useNavigate();

  const [hostName, setHostName] = useState("Chủ Xị");
  const [mode, setMode] = useState<RoomMode>("online");
  const [shakes, setShakes] = useState(1);

  const [prizes, setPrizes] = useState<Prize[]>([
    makeCash("Lì xì 500k", 500000, 1),
    makeCash("Lì xì 200k", 200000, 1),
    makeCash("Lì xì 100k", 100000, 2),
    makeCash("Lì xì 50k", 50000, 5)
  ]);

  const budget = useMemo(() => prizes.reduce((s, p) => (p.type === "cash" ? s + p.value * p.remaining : s), 0), [prizes]);
  const totalGifts = useMemo(() => prizes.reduce((s, p) => s + p.remaining, 0), [prizes]);

  const quick = (v: number) => {
    const label = `Lì xì ${Math.round(v / 1000)}k`;
    setPrizes((x) => {
      const found = x.find(p => p.type === "cash" && p.value === v);
      if (found) return x.map(p => p.id === found.id ? { ...p, remaining: p.remaining + 1 } : p);
      return [...x, makeCash(label, v, 1)];
    });
  };

  const inc = (id: string) => setPrizes(x => x.map(p => p.id === id ? { ...p, remaining: p.remaining + 1 } : p));
  const dec = (id: string) => setPrizes(x => x.map(p => p.id === id ? { ...p, remaining: Math.max(0, p.remaining - 1) } : p).filter(p => p.remaining > 0));
  const del = (id: string) => setPrizes(x => x.filter(p => p.id !== id));

  const create = async () => {
    try {
      const r = await api.createRoom({
        hostName,
        mode,
        shakesPerPlayer: shakes,
        prizes
      });
      // mark host in session
      sessionStorage.setItem(`sumvay.host.${r.code}`, "1");
      nav(`/host/lobby/${r.code}`);
    } catch (e: any) {
      toastErr(e?.message ?? "Create room failed");
    }
  };

  return (
    <div className="sv-screen sv-mobile-stack">
      <div className="sv-top-mini-pill">✦ MỞ KHO LÌ XÌ - VUI TẾT MÊ LY ✦</div>

      <Card>
        <div className="sv-section-title">👑 THÔNG TIN</div>

        <div className="sv-field">
          <div className="sv-field-label">TÊN CHỦ PHÒNG</div>
          <Input value={hostName} onChange={(e) => setHostName(e.target.value)} />
        </div>

        <div className="sv-grid-2">
          <div className="sv-field">
            <div className="sv-field-label">CHẾ ĐỘ</div>
            <select className="sv-select" value={mode} onChange={(e) => setMode(e.target.value as any)}>
              <option value="online">Online (QR)</option>
              <option value="local">Local (truyền tay)</option>
            </select>
            <div className="sv-help">ℹ Khách quét QR hoặc nhập mã phòng để tham gia.</div>
          </div>

          <div className="sv-field">
            <div className="sv-field-label">SỐ LƯỢT LẮC</div>
            <Input type="number" min={1} max={50} value={shakes} onChange={(e) => setShakes(Number(e.target.value))} />
          </div>
        </div>
      </Card>

      <Card>
        <div className="sv-section-title">🎁 KHO LÌ XÌ</div>

        <div className="sv-chip-row">
          {[10000, 20000, 50000, 100000, 200000, 500000].map(v => (
            <button key={v} className="sv-chip" onClick={() => quick(v)}>
              {Math.round(v / 1000)}K
            </button>
          ))}
          <button
            className="sv-chip sv-chip-add"
            onClick={() => quick(100000)}
            title="Thêm"
          >
            + Thêm
          </button>
        </div>

        <div className="sv-prize-list">
          {prizes.map(p => (
            <PrizeRow
              key={p.id}
              prize={p}
              onMinus={() => dec(p.id)}
              onPlus={() => inc(p.id)}
              onRemove={() => del(p.id)}
            />
          ))}
        </div>
      </Card>

      <Card>
        <div className="sv-budget-row">
          <div>
            <div className="sv-budget-label">TỔNG NGÂN SÁCH</div>
            <div className="sv-budget">{moneyVND(budget)}</div>
          </div>
          <div className="sv-badge-pill">{totalGifts} giải</div>
        </div>

        <Button variant="red" onClick={create}>
          ✅ TẠO PHÒNG
        </Button>
      </Card>

      <div className="sv-back-home" onClick={() => nav("/")}>← về trang chủ</div>
    </div>
  );
}
