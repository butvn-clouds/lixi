import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../components/Card";
import Button from "../components/Button";
import Input from "../components/Input";
import PrizeRow from "../components/PrizeRow";
import type { Prize, RoomMode } from "../api";
import { api } from "../api";
import { moneyVND, toastErr } from "../ui";

function uid() {
  const c: any = (globalThis as any).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return `p_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function toPosInt(n: any, fallback = 1) {
  const x = Number(n);
  if (!Number.isFinite(x)) return fallback;
  return Math.max(1, Math.floor(x));
}

function toPosMoney(n: any, fallback = 10000) {
  const x = Number(n);
  if (!Number.isFinite(x)) return fallback;
  return Math.max(1000, Math.floor(x));
}

function makeCash(label: string, value: number, remaining: number): Prize {
  const v = toPosMoney(value, 10000);
  const r = toPosInt(remaining, 1);
  return {
    id: uid(),
    type: "cash",
    label: (label ?? "").trim() || `Lì xì ${Math.round(v / 1000)}k`,
    value: v,
    formatted: moneyVND(v),
    remaining: r
  };
}

function makeTroll(label: string, remaining: number): Prize {
  const r = toPosInt(remaining, 1);
  const name = (label ?? "").trim() || "Uống 1 ly 🍻";
  return {
    id: uid(),
    type: "troll",
    label: name,
    remaining: r
  };
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
    makeCash("Lì xì 50k", 50000, 5),
    makeTroll("Uống 1 ly 🍻", 3)
  ]);

  const [openAdd, setOpenAdd] = useState(false);
  const [addType, setAddType] = useState<Prize["type"]>("troll"); 
  const [addName, setAddName] = useState("Uống 1 ly 🍻");
  const [addValue, setAddValue] = useState<number>(10000); 
  const [addQty, setAddQty] = useState<number>(1);

  const budget = useMemo(
    () => prizes.reduce((s, p) => (p.type === "cash" ? s + p.value * p.remaining : s), 0),
    [prizes]
  );
  const totalGifts = useMemo(() => prizes.reduce((s, p) => s + p.remaining, 0), [prizes]);

 

  const quick = (v: number) => {
    const value = toPosMoney(v, 10000);
    const label = `Lì xì ${Math.round(value / 1000)}k`;

    setPrizes((x) => {
      const found = x.find((p) => p.type === "cash" && p.value === value);
      if (found) {
        return x.map((p) => (p.id === found.id ? { ...p, remaining: (p.remaining ?? 0) + 1 } : p));
      }
      return [...x, makeCash(label, value, 1)];
    });
  };

  const inc = (id: string) =>
    setPrizes((x) => x.map((p) => (p.id === id ? { ...p, remaining: (p.remaining ?? 0) + 1 } : p)));

  const dec = (id: string) =>
    setPrizes((x) =>
      x
        .map((p) => (p.id === id ? { ...p, remaining: Math.max(0, (p.remaining ?? 0) - 1) } : p))
        .filter((p) => (p.remaining ?? 0) > 0)
    );

  const del = (id: string) => setPrizes((x) => x.filter((p) => p.id !== id));

  const openAddModal = () => {
    setAddType("troll");
    setAddName("Uống 1 ly 🍻");
    setAddValue(10000);
    setAddQty(1);
    setOpenAdd(true);
  };

  const addCustomPrize = () => {
    const type = addType;
    const name = (addName ?? "").trim();
    const qty = toPosInt(addQty, 1);

    if (!name) {
      toastErr("Tên giải không được để trống nha bro 😭");
      return;
    }

    if (type === "cash") {
      const value = toPosMoney(addValue, 10000);
      if (!value || value <= 0) {
        toastErr("Số tiền phải > 0 nha bro 😭");
        return;
      }

      setPrizes((x) => {
        const found = x.find((p) => p.type === "cash" && p.value === value && p.label === name);
        if (found) return x.map((p) => (p.id === found.id ? { ...p, remaining: p.remaining + qty } : p));
        return [...x, makeCash(name, value, qty)];
      });
    } else {
      setPrizes((x) => {
        const found = x.find((p) => p.type === "troll" && p.label === name);
        if (found) return x.map((p) => (p.id === found.id ? { ...p, remaining: p.remaining + qty } : p));
        return [...x, makeTroll(name, qty)];
      });
    }

    setOpenAdd(false);
  };


  const create = async () => {
    try {
      const shakesSafe = Math.max(1, Math.min(50, Number(shakes) || 1));

      const validPrizes = prizes
        .map((p) => {
          const label = (p.label ?? "").trim();
          const remaining = toPosInt(p.remaining, 1);

          if (p.type === "cash") {
            return makeCash(label, p.value, remaining);
          }
          return makeTroll(label, remaining);
        })
        .filter((p) => (p.label ?? "").trim().length > 0 && p.remaining > 0 && (p.type !== "cash" || p.value > 0));

      if (!validPrizes.length) {
        toastErr("Kho quà phải có ít nhất 1 giải hợp lệ 😭");
        return;
      }

      const r = await api.createRoom({
        hostName: (hostName ?? "").trim() || "Chủ Xị",
        mode,
        shakesPerPlayer: shakesSafe,
        prizes: validPrizes
      });

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
            </select>
            <div className="sv-help">ℹ Khách quét QR hoặc nhập mã phòng để tham gia.</div>
          </div>

          <div className="sv-field">
            <div className="sv-field-label">SỐ LƯỢT LẮC</div>
            <Input
              type="number"
              min={1}
              max={50}
              value={shakes}
              onChange={(e) => setShakes(toPosInt(e.target.value, 1))}
            />
          </div>
        </div>
      </Card>

      <Card>
        <div className="sv-section-title">🎁 KHO QUÀ</div>

        <div className="sv-chip-row">
          {[10000, 20000, 50000, 100000, 200000, 500000].map((v) => (
            <button key={v} className="sv-chip" onClick={() => quick(v)}>
              {Math.round(v / 1000)}K
            </button>
          ))}

          <button className="sv-chip sv-chip-add" onClick={openAddModal} title="Thêm giải tuỳ chọn">
            + Thêm
          </button>
        </div>

        <div className="sv-prize-list">
          {prizes.map((p) => (
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
            <div className="sv-budget-label">TỔNG NGÂN SÁCH (TIỀN)</div>
            <div className="sv-budget">{moneyVND(budget)}</div>
          </div>
          <div className="sv-badge-pill">{totalGifts} giải</div>
        </div>

        <Button variant="red" onClick={create}>
          ✅ TẠO PHÒNG
        </Button>
      </Card>

      <div className="sv-back-home" onClick={() => nav("/")}>
        ← về trang chủ
      </div>

     
      {openAdd && (
        <div className="sv-modal-backdrop" onClick={() => setOpenAdd(false)} role="dialog" aria-modal="true">
          <div className="sv-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sv-section-title">➕ Thêm giải</div>

            <div className="sv-grid-2">
              <div className="sv-field">
                <div className="sv-field-label">LOẠI GIẢI</div>
                <select className="sv-select" value={addType} onChange={(e) => setAddType(e.target.value as any)}>
                  <option value="troll">Troll / Nhiệm vụ</option>
                  <option value="cash">Tiền</option>
                </select>
              </div>

              <div className="sv-field">
                <div className="sv-field-label">SỐ LƯỢNG</div>
                <Input
                  type="number"
                  min={1}
                  max={999}
                  value={addQty}
                  onChange={(e) => setAddQty(toPosInt(e.target.value, 1))}
                />
              </div>
            </div>

            <div className="sv-field">
              <div className="sv-field-label">TÊN GIẢI</div>
              <Input
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder={addType === "cash" ? "VD: Lì xì may mắn" : "VD: Hát 1 bài / Uống 1 ly 🍻"}
              />
            </div>

            {addType === "cash" && (
              <div className="sv-field">
                <div className="sv-field-label">SỐ TIỀN (VND)</div>
                <Input
                  type="number"
                  min={1000}
                  step={1000}
                  value={addValue}
                  onChange={(e) => setAddValue(toPosMoney(e.target.value, 10000))}
                />
                <div className="sv-help">Preview: {moneyVND(toPosMoney(addValue, 10000))}</div>
              </div>
            )}

            <div className="sv-modal-actions" style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <Button variant="ghost" onClick={() => setOpenAdd(false)}>
                Huỷ
              </Button>
              <Button variant="red" onClick={addCustomPrize}>
                Thêm giải
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
