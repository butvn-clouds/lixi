import { nanoid } from "nanoid";
import { formatVND, genRoomCode6, now, upper } from "./utils.js";

const rooms = new Map();

export function createRoom(payload) {
  let code = genRoomCode6();
  while (rooms.has(code)) code = genRoomCode6();

  const room = {
    code,
    hostName: payload.hostName || "Chủ Xị",
    mode: payload.mode || "online",
    shakesPerPlayer: Math.max(1, Math.min(50, Number(payload.shakesPerPlayer || 1))),
    started: false,
    ended: false,
    prizes: Array.isArray(payload.prizes) ? payload.prizes : [],
    players: new Map(),
    winners: [],
    clients: new Map()
  };

  rooms.set(code, room);
  return room;
}

export function getRoom(code) {
  return rooms.get(upper(code)) ?? null;
}

export function roomStatus(room) {
  const totalPlayers = room.players.size;
  const totalPrizes = room.prizes.reduce((s, p) => s + Math.max(0, p.remaining), 0);
  const totalBudget = room.prizes.reduce((s, p) => {
    if (p.type === "cash") return s + p.value * p.remaining;
    return s;
  }, 0);

  return {
    code: room.code,
    hostName: room.hostName,
    mode: room.mode,
    shakesPerPlayer: room.shakesPerPlayer,
    started: room.started,
    ended: room.ended,
    totalPlayers,
    totalPrizes,
    totalBudget,
    prizes: room.prizes,
    players: Array.from(room.players.values()).map(p => ({
      id: p.id,
      name: p.name,
      shakesUsed: p.shakesUsed
    })),
    winners: room.winners.slice(0, 20)
  };
}

export function joinRoom(room, name) {
  const nm = (name ?? "").toString().trim();
  if (!nm) throw new Error("NAME_REQUIRED");

  const p = {
    id: nanoid(10),
    name: nm,
    joinedAt: now(),
    shakesUsed: 0,
    receipts: []
  };

  room.players.set(p.id, p);
  return p;
}

export function startGame(room) {
  room.started = true;
  room.ended = false;
}

export function endGame(room) {
  room.ended = true;
  room.started = false;
}

export function addPrize(room, prize) {
  room.prizes.push(prize);
}

export function updatePrizeQty(room, prizeId, qty) {
  const p = room.prizes.find(x => x.id === prizeId);
  if (!p) throw new Error("PRIZE_NOT_FOUND");
  p.remaining = Math.max(0, Math.min(9999, Number(qty)));
}

export function removePrize(room, prizeId) {
  const idx = room.prizes.findIndex(x => x.id === prizeId);
  if (idx >= 0) room.prizes.splice(idx, 1);
}

export function claim(room, playerId, energy) {
  const p = room.players.get(playerId);
  if (!p) throw new Error("PLAYER_NOT_FOUND");
  if (!room.started || room.ended) throw new Error("GAME_NOT_RUNNING");

  const e = Number(energy);
  if (!Number.isFinite(e) || e < 12) throw new Error("SHAKE_TOO_WEAK");

  if (p.shakesUsed >= room.shakesPerPlayer) throw new Error("Tối đa 1 lần mỗi người");

  const pool = room.prizes.filter(x => x.remaining > 0);
  if (!pool.length) throw new Error("NO_PRIZE_LEFT");

  const picked = pool[Math.floor(Math.random() * pool.length)];
  picked.remaining -= 1;

  p.shakesUsed += 1;

  const prizeText = picked.type === "cash" ? picked.formatted : picked.label;
  p.receipts.unshift({ at: now(), prizeText });

  const win = {
    at: now(),
    playerId: p.id,
    playerName: p.name,
    prizeText: picked.label
  };
  room.winners.unshift(win);

  return { prize: picked, prizeText, winner: win, player: p };
}

export function makeCashPrize(value, qty) {
  const v = Number(value);
  const k = Math.round(v / 1000);
  return {
    id: nanoid(),
    type: "cash",
    label: `Lì xì ${k}k`,
    value: v,
    formatted: formatVND(v),
    remaining: Math.max(0, Number(qty))
  };
}

export function makeTrollPrize(label, qty) {
  return {
    id: nanoid(),
    type: "troll",
    label: (label ?? "").toString(),
    remaining: Math.max(0, Number(qty))
  };
}
