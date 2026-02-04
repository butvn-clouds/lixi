import { nanoid } from "nanoid";
import type { Player, Prize, Room, RoomMode, WinnerItem } from "./types.js";
import { formatVND, genRoomCode6, now, upper } from "./utils.js";


const rooms = new Map<string, Room>();

export function createRoom(payload: {
  hostName: string;
  mode: RoomMode;
  shakesPerPlayer: number;
  prizes: Prize[];
}): Room {
  let code = genRoomCode6();
  while (rooms.has(code)) code = genRoomCode6();

  const room: Room = {
    code,
    hostName: payload.hostName || "Chủ Xị",
    mode: payload.mode,
    shakesPerPlayer: Math.max(1, Math.min(50, payload.shakesPerPlayer || 1)),
    started: false,
    ended: false,
    prizes: payload.prizes ?? [],
    players: new Map(),
    winners: [],
    clients: new Map()
  };

  rooms.set(code, room);
  return room;
}

export function getRoom(code: string): Room | null {
  return rooms.get(upper(code)) ?? null;
}

export function roomStatus(room: Room) {
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

export function joinRoom(room: Room, name: string): Player {
  const nm = (name ?? "").toString().trim();
  if (!nm) throw new Error("NAME_REQUIRED");

  // allow same name, different id
  const p: Player = {
    id: nanoid(10),
    name: nm,
    joinedAt: now(),
    shakesUsed: 0,
    receipts: []
  };
  room.players.set(p.id, p);
  return p;
}

export function startGame(room: Room) {
  room.started = true;
  room.ended = false;
}

export function endGame(room: Room) {
  room.ended = true;
  room.started = false;
}

export function addPrize(room: Room, prize: Prize) {
  room.prizes.push(prize);
}

export function updatePrizeQty(room: Room, prizeId: string, qty: number) {
  const p = room.prizes.find(x => x.id === prizeId);
  if (!p) throw new Error("PRIZE_NOT_FOUND");
  p.remaining = Math.max(0, Math.min(9999, qty));
}

export function removePrize(room: Room, prizeId: string) {
  const idx = room.prizes.findIndex(x => x.id === prizeId);
  if (idx >= 0) room.prizes.splice(idx, 1);
}

export function claim(room: Room, playerId: string, energy: number) {
  const p = room.players.get(playerId);
  if (!p) throw new Error("PLAYER_NOT_FOUND");
  if (!room.started || room.ended) throw new Error("GAME_NOT_RUNNING");

  if (!Number.isFinite(energy) || energy < 12) throw new Error("SHAKE_TOO_WEAK");

  if (p.shakesUsed >= room.shakesPerPlayer) throw new Error("OUT_OF_SHAKES");

  const pool = room.prizes.filter(x => x.remaining > 0);
  if (!pool.length) throw new Error("NO_PRIZE_LEFT");

  // random simple
  const picked = pool[Math.floor(Math.random() * pool.length)]!;
  picked.remaining -= 1;

  p.shakesUsed += 1;

  const prizeText =
    picked.type === "cash"
      ? picked.formatted
      : picked.label;

  p.receipts.unshift({ at: now(), prizeText });

  const win: WinnerItem = {
    at: now(),
    playerId: p.id,
    playerName: p.name,
    prizeText: picked.type === "cash" ? picked.label : picked.label
  };
  room.winners.unshift(win);

  return { prize: picked, prizeText, winner: win, player: p };
}

// helpers to create preset cash prizes like screenshot chips
export function makeCashPrize(value: number, qty: number): Prize {
  const k = Math.round(value / 1000);
  return {
    id: nanoid(),
    type: "cash",
    label: `Lì xì ${k}k`,
    value,
    formatted: formatVND(value),
    remaining: Math.max(0, qty)
  };
}

export function makeTrollPrize(label: string, qty: number): Prize {
  return {
    id: nanoid(),
    type: "troll",
    label,
    remaining: Math.max(0, qty)
  };
}
