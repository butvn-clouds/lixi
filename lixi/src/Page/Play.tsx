import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Card from "../components/Card";
import Button from "../components/Button";
import type { RoomStatus } from "../api";
import { api } from "../api";
import { SSEClient } from "../sse";
import { ShakeDetector } from "../shake";
import { showTroll, showWin, toastErr } from "../ui";

const IMG_SAU = "https://sumvay.firet.io/assets/img/sau.png";
const IMG_TRUOC = "https://sumvay.firet.io/assets/img/truoc.png";
const IMG_QUE = "https://sumvay.firet.io/assets/img/que.png";

export default function Play() {
  const { code = "" } = useParams();
  const nav = useNavigate();

  const [st, setSt] = useState<RoomStatus | null>(null);

  const [playerId, setPlayerId] = useState<string>("");
  const [playerName, setPlayerName] = useState<string>("");

  const [receipts, setReceipts] = useState<Array<{ at: number; prizeText: string }>>([]);
  const [motionReady, setMotionReady] = useState(false);

  // animation state
  const [isShakingAnim, setIsShakingAnim] = useState(false);
  const shakeAnimTimer = useRef<number | null>(null);

  const triggerShakeAnim = () => {
    setIsShakingAnim(true);
    if (shakeAnimTimer.current) window.clearTimeout(shakeAnimTimer.current);
    shakeAnimTimer.current = window.setTimeout(() => setIsShakingAnim(false), 450);
  };

  useEffect(() => {
    return () => {
      if (shakeAnimTimer.current) window.clearTimeout(shakeAnimTimer.current);
    };
  }, []);

  useEffect(() => {
    // restore player
    const raw = localStorage.getItem(`sumvay.player.${code}`);
    if (raw) {
      try {
        const p = JSON.parse(raw);
        setPlayerId(p.playerId);
        setPlayerName(p.playerName);
      } catch {}
    }
  }, [code]);

  useEffect(() => {
    api.status(code).then(setSt).catch(() => {});
    const sse = new SSEClient(code, setSt);
    sse.connect();
    return () => sse.disconnect();
  }, [code]);

  const shakerRef = useRef<ShakeDetector | null>(null);

  useEffect(() => {
    shakerRef.current = new ShakeDetector({
      threshold: 15,
      cooldownMs: 1200,
      onShake: (energy) => doShake(energy),
    });
    return () => shakerRef.current?.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId, st?.started, st?.ended]);

  const canShake = useMemo(() => {
    if (!st) return false;
    if (!playerId) return false;
    if (!st.started || st.ended) return false;
    return true;
  }, [st, playerId]);

  const enableMotion = async () => {
    const ok = await shakerRef.current?.requestPermission();
    if (!ok) return toastErr("Thiếu quyền Motion (iOS). Bật permission rồi thử lại.");
    shakerRef.current?.start();
    setMotionReady(true);
  };

  const doShake = async (energy: number) => {
    if (!canShake) return;

    // make UI feel instant
    triggerShakeAnim();

    try {
      const r = await api.shake(code, { playerId, energy });
      setReceipts(r.receipts);

      if (r.prize.type === "cash") showWin(r.prize.formatted);
      else showTroll(r.prize.label);
    } catch (e: any) {
      toastErr(e?.message ?? "Shake fail");
    }
  };

  return (
    <div className="sv-play">
      <div className="sv-play-top">
        <div>
          <div className="sv-play-code">{code}</div>
          <div className="sv-play-host">Chủ xị: {st?.hostName ?? "—"}</div>
        </div>
        <div className="sv-play-right">
          <div className="sv-play-count">{st?.totalPrizes ?? 0}</div>
          <div className="sv-play-money">{st ? (st.totalBudget > 0 ? "" : "0đ") : ""}</div>
        </div>
      </div>

      {/* sticks */}
      <div className={`sv-sticks ${isShakingAnim ? "is-shaking" : ""}`}>
        <div className="sv-sticks-wrap" aria-hidden="true">
          <img className="sv-sticks-sau" src={IMG_SAU} alt="" draggable={false} />
          <img className="sv-sticks-que" src={IMG_QUE} alt="" draggable={false} />
          <img className="sv-sticks-truoc" src={IMG_TRUOC} alt="" draggable={false} />
        </div>
      </div>

      <div className="sv-play-title">LẮC ĐI CHỜ CHI!! 🤘</div>
      <div className="sv-play-sub">Lắc nhiệt tình, vận may thỉnh linh 💫</div>

      <div className="sv-play-actions">
        <Button variant="red" onClick={() => doShake(999)} disabled={!canShake}>
          ☝ XIN QUẺ
        </Button>

        <button className="sv-motion" onClick={enableMotion} type="button">
          {motionReady ? "✅ Đã bật lắc" : "📱 Bật lắc (mobile)"}
        </button>
      </div>

      <Card className="sv-receipt-card">
        <div className="sv-receipt-title">🎁 Bạn vừa nhận</div>
        {receipts.length === 0 ? (
          <div className="sv-empty">Chưa có gì…</div>
        ) : (
          <div className="sv-receipt-list">
            {receipts.slice(0, 6).map((x, i) => (
              <div className="sv-receipt-item" key={`${x.at}-${i}`}>
                <div className="sv-receipt-dot" />
                <div className="sv-receipt-text">{x.prizeText}</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="sv-play-foot">
        <div className="sv-muted">
          Bạn: <b>{playerName || "—"}</b>
        </div>
        {/* <button className="sv-link" onClick={() => nav(`/host/lobby/${code}`)}>Host lobby</button> */}
      </div>
    </div>
  );
}
