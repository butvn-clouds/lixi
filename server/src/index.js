import express from "express";
import cors from "cors";
import { nanoid } from "nanoid";

import {
  addPrize,
  claim,
  createRoom,
  endGame,
  getRoom,
  joinRoom,
  makeCashPrize,
  makeTrollPrize,
  removePrize,
  roomStatus,
  startGame,
  updatePrizeQty
} from "./store.js";

import { formatVND, upper } from "./utils.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

function sseWrite(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function broadcast(room, event, data) {
  for (const res of room.clients.values()) {
    try { sseWrite(res, event, data); } catch {}
  }
}

function broadcastStatus(room) {
  broadcast(room, "room_status", roomStatus(room));
}

app.post("/api/rooms", (req, res) => {
  try {
    const hostName = (req.body?.hostName ?? "Chủ Xị").toString();
    const mode = (req.body?.mode ?? "online").toString();
    const shakesPerPlayer = Number(req.body?.shakesPerPlayer ?? 1);

    const prizes = Array.isArray(req.body?.prizes) ? req.body.prizes : [
      makeCashPrize(500000, 1),
      makeCashPrize(200000, 1),
      makeCashPrize(100000, 2),
      makeCashPrize(50000, 5)
    ];

    const room = createRoom({ hostName, mode, shakesPerPlayer, prizes });
    res.json({ code: room.code, room: roomStatus(room) });
  } catch (e) {
    res.status(400).send(e?.message ?? "CREATE_FAILED");
  }
});

app.get("/api/rooms/:code/status", (req, res) => {
  const room = getRoom(req.params.code);
  if (!room) return res.status(404).send("ROOM_NOT_FOUND");
  res.json(roomStatus(room));
});

app.post("/api/rooms/:code/join", (req, res) => {
  const room = getRoom(req.params.code);
  if (!room) return res.status(404).send("ROOM_NOT_FOUND");

  try {
    const name = (req.body?.name ?? "").toString();
    const player = joinRoom(room, name);
    broadcast(room, "player_joined", { id: player.id, name: player.name });
    broadcastStatus(room);
    res.json({ playerId: player.id, playerName: player.name, room: roomStatus(room) });
  } catch (e) {
    res.status(400).send(e?.message ?? "JOIN_FAILED");
  }
});

app.post("/api/rooms/:code/start", (req, res) => {
  const room = getRoom(req.params.code);
  if (!room) return res.status(404).send("ROOM_NOT_FOUND");
  startGame(room);
  broadcast(room, "game_started", {});
  broadcastStatus(room);
  res.json({ ok: true });
});

app.post("/api/rooms/:code/end", (req, res) => {
  const room = getRoom(req.params.code);
  if (!room) return res.status(404).send("ROOM_NOT_FOUND");
  endGame(room);
  broadcast(room, "game_ended", {});
  broadcastStatus(room);
  res.json({ ok: true });
});

app.post("/api/rooms/:code/prizes/cash", (req, res) => {
  const room = getRoom(req.params.code);
  if (!room) return res.status(404).send("ROOM_NOT_FOUND");

  const value = Number(req.body?.value ?? 0);
  const qty = Number(req.body?.qty ?? 1);
  if (!Number.isFinite(value) || value <= 0) return res.status(400).send("INVALID_VALUE");

  const p = {
    id: nanoid(),
    type: "cash",
    label: (req.body?.label ?? `Lì xì ${Math.round(value / 1000)}k`).toString(),
    value,
    formatted: formatVND(value),
    remaining: Math.max(0, qty)
  };

  addPrize(room, p);
  broadcast(room, "prize_pool_updated", room.prizes);
  broadcastStatus(room);
  res.json(roomStatus(room));
});

app.post("/api/rooms/:code/prizes/troll", (req, res) => {
  const room = getRoom(req.params.code);
  if (!room) return res.status(404).send("ROOM_NOT_FOUND");

  const label = (req.body?.label ?? "").toString().trim();
  const qty = Number(req.body?.qty ?? 1);
  if (!label) return res.status(400).send("INVALID_LABEL");

  addPrize(room, makeTrollPrize(label, qty));
  broadcast(room, "prize_pool_updated", room.prizes);
  broadcastStatus(room);
  res.json(roomStatus(room));
});

app.patch("/api/rooms/:code/prizes/:prizeId", (req, res) => {
  const room = getRoom(req.params.code);
  if (!room) return res.status(404).send("ROOM_NOT_FOUND");

  const qty = Number(req.body?.qty);
  if (!Number.isFinite(qty)) return res.status(400).send("INVALID_QTY");

  updatePrizeQty(room, req.params.prizeId, qty);
  broadcast(room, "prize_pool_updated", room.prizes);
  broadcastStatus(room);
  res.json(roomStatus(room));
});

app.delete("/api/rooms/:code/prizes/:prizeId", (req, res) => {
  const room = getRoom(req.params.code);
  if (!room) return res.status(404).send("ROOM_NOT_FOUND");

  removePrize(room, req.params.prizeId);
  broadcast(room, "prize_pool_updated", room.prizes);
  broadcastStatus(room);
  res.json(roomStatus(room));
});

app.post("/api/rooms/:code/shake", (req, res) => {
  const room = getRoom(req.params.code);
  if (!room) return res.status(404).send("ROOM_NOT_FOUND");

  try {
    const playerId = (req.body?.playerId ?? "").toString();
    const energy = Number(req.body?.energy ?? 0);

    const r = claim(room, playerId, energy);

    broadcast(room, "prize_won", {
      playerId,
      playerName: r.player.name,
      prize: r.prize,
      prizeText: r.prizeText
    });

    broadcast(room, "winner_added", r.winner);
    broadcastStatus(room);

    res.json({ prize: r.prize, prizeText: r.prizeText, receipts: r.player.receipts });
  } catch (e) {
    res.status(400).send(e?.message ?? "SHAKE_FAILED");
  }
});

app.get("/stream/:code", (req, res) => {
  const code = upper(req.params.code);
  const room = getRoom(code);
  if (!room) return res.status(404).end();

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const clientId = nanoid(8);
  room.clients.set(clientId, res);

  sseWrite(res, "room_status", roomStatus(room));

  const hb = setInterval(() => {
    try { sseWrite(res, "ping", { t: Date.now() }); } catch {}
  }, 15000);

  req.on("close", () => {
    clearInterval(hb);
    room.clients.delete(clientId);
  });
});

const PORT = Number(process.env.PORT || 5000);
app.listen(PORT, "0.0.0.0", () => console.log(`✅ Server: http://localhost:${PORT}`));
