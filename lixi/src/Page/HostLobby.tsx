import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Card from "../components/Card";
import Button from "../components/Button";
import Pill from "../components/Pill";
import QRBox from "../components/QRbox";
import type { RoomStatus } from "../api";
import { api } from "../api";
import { SSEClient } from "../sse";
import { moneyVND, toastErr } from "../ui";

export default function HostLobby() {
  const { code = "" } = useParams();
  const nav = useNavigate();
  const [st, setSt] = useState<RoomStatus | null>(null);

  const isHost = sessionStorage.getItem(`sumvay.host.${code}`) === "1";

  useEffect(() => {
    api.status(code).then(setSt).catch(() => {});
    const sse = new SSEClient(code, setSt);
    sse.connect();
    return () => sse.disconnect();
  }, [code]);

  const joinUrl = useMemo(() => `${window.location.origin}/join/${code}`, [code]);

  const start = async () => {
    try { await api.start(code); } catch (e: any) { toastErr(e?.message ?? "Start fail"); }
  };
  const end = async () => {
    try { await api.end(code); } catch (e: any) { toastErr(e?.message ?? "End fail"); }
  };

  if (!st) return <div className="sv-screen"><Card>Loading...</Card></div>;

  return (
    <div className="sv-lobby">
      <div className="sv-lobby-top">
        <div className="sv-brand-left">
          <div className="sv-brand">Sum Vầy</div>
          <div className="sv-roomcode">
            <div className="sv-roomcode-label">PHÒNG</div>
            <div className="sv-roomcode-val">{st.code}</div>
          </div>
        </div>

        <Pill className={st.started ? "sv-pill-live" : "sv-pill-wait"}>
          {st.started ? "ĐANG CHƠI" : "ĐANG CHỜ"}
        </Pill>
      </div>

      <div className="sv-lobby-grid">
        <div className="sv-col">
          <QRBox joinUrl={joinUrl} />

          <Card className="sv-box">
            <div className="sv-box-head">
              <div className="sv-box-head-title">👥 Người chơi</div>
              <Pill>{st.totalPlayers}</Pill>
            </div>

            {st.players.length === 0 ? (
              <div className="sv-empty">👻 Chưa có ai vào...</div>
            ) : (
              <div className="sv-player-list">
                {st.players.map(p => (
                  <div key={p.id} className="sv-player-item">
                    <div className="sv-avatar">{p.name.slice(0, 1).toUpperCase()}</div>
                    <div className="sv-player-name">{p.name}</div>
                    <div className="sv-player-meta">{p.shakesUsed}/{st.shakesPerPlayer}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="sv-col">
          <Card className="sv-box">
            <div className="sv-box-head">
              <div className="sv-box-head-title">🎮 Điều khiển</div>
            </div>

            {!isHost ? (
              <div className="sv-empty">Bạn không phải host của phòng này.</div>
            ) : (
              <>
                {!st.started ? (
                  <Button className="sv-btn-full" variant="red" onClick={start}>▶ BẮT ĐẦU NGAY</Button>
                ) : (
                  <Button className="sv-btn-full" variant="red" onClick={end}>■ KẾT THÚC</Button>
                )}

                <div className="sv-row-2">
                  <Button className="sv-btn-full" variant="ghost" onClick={() => nav(`/play/${code}`)}>👤 Chủ xị chơi</Button>
                  <Button className="sv-btn-full" variant="ghost" onClick={() => navigator.clipboard.writeText(joinUrl)}>📣 Mời bạn bè</Button>
                </div>
              </>
            )}
          </Card>

          <div className="sv-row-2-grid">
            <Card className="sv-box">
              <div className="sv-box-head">
                <div className="sv-box-head-title">🎁 Kho Lì Xì</div>
                <Pill>{st.totalPrizes} giải</Pill>
              </div>

              <div className="sv-kho">
                {st.prizes
                  .filter(p => p.remaining > 0)
                  .slice(0, 8)
                  .map(p => (
                    <div key={p.id} className="sv-kho-item">
                      <div className="sv-kho-left">
                        <span className="sv-kho-ico">💵</span>
                        <span className="sv-kho-name">{p.label}</span>
                      </div>
                      <Pill className="sv-pill-count">{p.remaining}/{p.remaining}</Pill>
                    </div>
                  ))}
              </div>

              <div className="sv-kho-foot">
                <span className="sv-muted">Tổng ngân sách</span>
                <b>{moneyVND(st.totalBudget)}</b>
              </div>
            </Card>

            <Card className="sv-box">
              <div className="sv-box-head">
                <div className="sv-box-head-title">🏆 Vừa trúng giải</div>
              </div>

              {st.winners.length === 0 ? (
                <div className="sv-empty">Chờ cuộc chơi bắt đầu...</div>
              ) : (
                <div className="sv-winner-list">
                  {st.winners.slice(0, 6).map((w, i) => (
                    <div className="sv-winner-item" key={i}>
                      <div className="sv-winner-name">{w.playerName}</div>
                      <div className="sv-winner-prize">🧧 {w.prizeText}</div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
