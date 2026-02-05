import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Card from "../components/Card";
import Button from "../components/Button";
import type { RoomStatus } from "../api";
import { api } from "../api";
import { SSEClient } from "../sse";
import { ShakeDetector } from "../shake";
import { showTroll, showWin, toastErr } from "../ui";


const WHEEL_ITEMS: Array<{ key: string; label: string }> = [
  { key: "q1", label: "QUẺ 1" },
  { key: "q2", label: "QUẺ 2" },
  { key: "q3", label: "QUẺ 3" },
  { key: "q4", label: "QUẺ 4" },
  { key: "q5", label: "QUẺ 5" },
  { key: "q6", label: "QUẺ 6" },
  { key: "q7", label: "QUẺ 7" },
  { key: "q8", label: "QUẺ 8" },
  { key: "q9", label: "QUẺ 9" },
  { key: "q10", label: "QUẺ 10" },
];


const SFX_SPIN = "https://your-cdn.com/sfx/spin.mp3";
const SFX_WIN = "https://your-cdn.com/sfx/win.mp3";
const SFX_TROLL = "https://your-cdn.com/sfx/troll.mp3";

type SfxName = "spin" | "win" | "troll";

function useSfx() {
  const audiosRef = useRef<Record<SfxName, HTMLAudioElement> | null>(null);
  const [audioReady, setAudioReady] = useState(false);

  const initAudio = () => {
    if (!SFX_SPIN && !SFX_WIN && !SFX_TROLL) return false;

    if (audiosRef.current) return true;
    try {
      const make = (src: string, vol: number) => {
        const a = new Audio(src);
        a.preload = "auto";
        a.volume = vol;
        return a;
      };
      audiosRef.current = {
        spin: make(SFX_SPIN, 0.6),
        win: make(SFX_WIN, 0.85),
        troll: make(SFX_TROLL, 0.85),
      };
      setAudioReady(true);
      return true;
    } catch {
      return false;
    }
  };

  const play = async (name: SfxName) => {
    const ok = initAudio();
    if (!ok || !audiosRef.current) return;

    const a = audiosRef.current[name];
    try {
      a.pause();
      a.currentTime = 0;
      await a.play();
    } catch {}
  };

  const stop = (name?: SfxName) => {
    if (!audiosRef.current) return;
    const keys: SfxName[] = name ? [name] : ["spin", "win", "troll"];
    keys.forEach((k) => {
      const a = audiosRef.current![k];
      a.pause();
      a.currentTime = 0;
    });
  };

  return { audioReady, initAudio, play, stop };
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function hashStrToInt(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pickIndexFromPrizeText(prizeText: string, len: number) {
  if (!len) return 0;
  const h = hashStrToInt(prizeText || "EMPTY");
  return h % len;
}

type PendingResult =
  | null
  | {
      kind: "cash" | "troll";
      text: string; 
      receipts: Array<{ at: number; prizeText: string }>;
      targetIndex: number;
    };

export default function Play() {
  const { code = "" } = useParams();
  const nav = useNavigate();

  const [st, setSt] = useState<RoomStatus | null>(null);

  const [playerId, setPlayerId] = useState<string>("");
  const [playerName, setPlayerName] = useState<string>("");

  const [receipts, setReceipts] = useState<Array<{ at: number; prizeText: string }>>([]);
  const [motionReady, setMotionReady] = useState(false);

  const wheelRef = useRef<HTMLDivElement | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinDeg, setSpinDeg] = useState(0);

  const spinningLockRef = useRef(false);
  const finalizeOnceRef = useRef(false);
  const finalizeTimerRef = useRef<number | null>(null);

  const pendingRef = useRef<PendingResult>(null);
  const [, forceRerender] = useState(0); 
  const setPending = (p: PendingResult) => {
    pendingRef.current = p;
    forceRerender((x) => x + 1);
  };

  const { initAudio, play: playSfx, stop: stopSfx } = useSfx();

  useEffect(() => {
    return () => {
      if (finalizeTimerRef.current) window.clearTimeout(finalizeTimerRef.current);
    };
  }, []);

  useEffect(() => {
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
      onShake: (energy) => doSpin(energy),
    });
    return () => shakerRef.current?.stop();
  }, [playerId, st?.started, st?.ended]);

  const canSpin = useMemo(() => {
    if (!st) return false;
    if (!playerId) return false;
    if (!st.started || st.ended) return false;
    return true;
  }, [st, playerId]);

  // const enableMotion = async () => {
  //   initAudio();
  //   const ok = await shakerRef.current?.requestPermission();
  //   if (!ok) return toastErr("Thiếu quyền Motion (iOS). Bật permission rồi thử lại.");
  //   shakerRef.current?.start();
  //   setMotionReady(true);
  // };

  const runWheelAnimationToIndex = (targetIndex: number) => {
    const n = WHEEL_ITEMS.length;
    const idx = clamp(targetIndex, 0, n - 1);
    const slice = 360 / n;

    const toAlign = -(idx * slice);

    const extraSpins = 6;
    const normalizedBase = spinDeg % 360;
    const finalDeg = normalizedBase + extraSpins * 360 + (toAlign - normalizedBase);

    setIsSpinning(true);
    setSpinDeg(finalDeg);
  };

  const finalizeSpin = () => {
    if (finalizeOnceRef.current) return;
    finalizeOnceRef.current = true;

    const pending = pendingRef.current;
    pendingRef.current = null;

    stopSfx("spin");

    if (pending) {
      setReceipts(pending.receipts);

      if (pending.kind === "cash") {
        playSfx("win");
        showWin(pending.text);
      } else {
        playSfx("troll");
        showTroll(pending.text);
      }
    }

    setIsSpinning(false);
    spinningLockRef.current = false;
  };

  useEffect(() => {
    const el = wheelRef.current;
    if (!el) return;

    const onEnd = () => {
      finalizeSpin();
    };

    el.addEventListener("transitionend", onEnd);
    return () => el.removeEventListener("transitionend", onEnd);
  }, []);

  const doSpin = async (energy: number) => {
    if (!canSpin) return;
    if (spinningLockRef.current) return;

    spinningLockRef.current = true;
    finalizeOnceRef.current = false;

    if (finalizeTimerRef.current) window.clearTimeout(finalizeTimerRef.current);
    finalizeTimerRef.current = window.setTimeout(() => finalizeSpin(), 4500);

    initAudio();
    playSfx("spin");

    setIsSpinning(true);

    try {
      const r = await api.shake(code, { playerId, energy });

      const prizeText =
        r?.prize?.type === "cash"
          ? r?.prize?.formatted
          : r?.prize?.label ?? (r?.receipts?.[0]?.prizeText ?? "");

      const idx = pickIndexFromPrizeText(prizeText, WHEEL_ITEMS.length);

      setPending({
        kind: r.prize.type === "cash" ? "cash" : "troll",
        text: r.prize.type === "cash" ? r.prize.formatted : r.prize.label,
        receipts: r.receipts,
        targetIndex: idx,
      });

      runWheelAnimationToIndex(idx);
    } catch (e: any) {
      stopSfx("spin");
      spinningLockRef.current = false;
      setIsSpinning(false);
      setPending(null);
      toastErr(e?.message ?? "Spin fail");
    }
  };

  return (
    <div className="sv-play">
      <style>{`
        .sv-wheel-wrap{
          display:flex;
          justify-content:center;
          margin: 18px 0 10px;
        }
        .sv-wheel{
          position:relative;
          width:min(320px, 78vw);
          aspect-ratio: 1/1;
        }
        .sv-wheel-pointer{
          position:absolute;
          top:-10px;
          left:50%;
          transform: translateX(-50%);
          width:0; height:0;
          border-left: 12px solid transparent;
          border-right: 12px solid transparent;
          border-bottom: 22px solid rgba(255,255,255,0.95);
          filter: drop-shadow(0 8px 10px rgba(0,0,0,.25));
          z-index:5;
        }
        .sv-wheel-disk{
          position:absolute;
          inset:0;
          border-radius:999px;
          overflow:hidden;
          box-shadow: 0 18px 45px rgba(0,0,0,.25);
          border: 8px solid rgba(255,255,255,.18);
          background: radial-gradient(circle at 30% 30%, rgba(255,255,255,.22), rgba(255,255,255,.06));
          transform: rotate(${spinDeg}deg);
          transition: transform 4s cubic-bezier(.12,.92,.18,1);
          will-change: transform;
        }
        .sv-wheel-center{
          position:absolute;
          left:50%;
          top:50%;
          transform: translate(-50%,-50%);
          width: 70px;
          height: 70px;
          border-radius: 999px;
          background: rgba(255,255,255,.9);
          display:flex;
          align-items:center;
          justify-content:center;
          font-weight: 800;
          letter-spacing: .5px;
          box-shadow: 0 10px 20px rgba(0,0,0,.25);
          z-index:4;
          user-select:none;
        }
        .sv-wheel-slice{
          position:absolute;
          inset:0;
        }
        .sv-wheel-slice > div{
          position:absolute;
          left:50%;
          top:50%;
          width: 50%;
          height: 50%;
          transform-origin: 0% 0%;
          clip-path: polygon(0 0, 100% 0, 0 100%);
          background: rgba(255,255,255,.08);
          border: 1px solid rgba(255,255,255,.12);
        }
        .sv-wheel-label{
          position:absolute;
          left:50%;
          top:50%;
          transform-origin: 0% 0%;
          width: 46%;
          text-align:right;
          padding-right: 10px;
          font-weight: 800;
          font-size: 12px;
          letter-spacing: .6px;
          color: rgba(255,255,255,.95);
          text-shadow: 0 8px 16px rgba(0,0,0,.35);
          user-select:none;
          white-space:nowrap;
        }
        .sv-wheel-hint{
          margin-top: 8px;
          text-align:center;
          opacity: .85;
          font-size: 13px;
        }
      `}</style>

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

      <div className="sv-wheel-wrap">
        <div className="sv-wheel">
          <div className="sv-wheel-pointer" aria-hidden="true" />

          <div ref={wheelRef} className="sv-wheel-disk" aria-label="Vòng quay">
            {WHEEL_ITEMS.map((it, i) => {
              const n = WHEEL_ITEMS.length;
              const slice = 360 / n;
              const rot = i * slice;

              return (
                <div key={it.key} className="sv-wheel-slice" style={{ transform: `rotate(${rot}deg)` }}>
                  <div />
                  <div
                    className="sv-wheel-label"
                    style={{
                      transform: `rotate(${slice / 2}deg) translate(0px, -10px)`,
                    }}
                  >
                    {it.label}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="sv-wheel-center" aria-hidden="true">
            QUAY
          </div>
        </div>
      </div>

      <div className="sv-play-title">QUAY ĐI CHỜ CHI!! 🎡</div>
      <div className="sv-play-sub">Quay xong mới bật kết quả nha 😏</div>

      <div className="sv-play-actions">
        <Button
          variant="red"
          onClick={() => {
            initAudio(); 
            doSpin(999);
          }}
          disabled={!canSpin || isSpinning}
        >
          {isSpinning ? "⏳ Đang quay..." : "🎡 QUAY"}
        </Button>

        {/* <button className="sv-motion" onClick={enableMotion} type="button">
          {motionReady ? "✅ Đã bật lắc" : "📱 Bật lắc (mobile)"}
        </button> */}
      </div>

      {/* <div className="sv-wheel-hint">Tip: lắc điện thoại cũng = quay nha 🤝</div> */}

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
