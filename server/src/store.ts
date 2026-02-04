import { nanoid } from "nanoid";
import { Room, Player, Prize } from "./types";
import { formatMoney } from "./utils";

const rooms = new Map<string, Room>();

export function createRoom(hostName: string): Room {
  const code = nanoid(6).toUpperCase();

  const prizes: Prize[] = [
cd    { id: nanoid(), type: "cash", value: 200000, formatted_value: formatMoney(200000), remaining: 2 },
    { id: nanoid(), type: "troll", name: "Hát 1 bài 🎤", remaining: 5 }
  ];

  const room: Room = {
    code,
    hostName,
    started: false,
    ended: false,
    localMode: true,
    turnOrder: [],
    currentTurnIndex: 0,
    players: new Map(),
    prizes,
    clients: new Set()
  };

  rooms.set(code, room);
  return room;
}

export const getRoom = (c: string) => rooms.get(c.toUpperCase()) ?? null;

export function joinRoom(room: Room, name: string): Player {
  const p: Player = { playerId: nanoid(10), playerName: name, hasWon: false };
  room.players.set(p.playerId, p);
  room.turnOrder.push(p.playerId);
  return p;
}

export function roomStatus(room: Room) {
  return {
    code: room.code,
    hostName: room.hostName,
    started: room.started,
    ended: room.ended,
    localMode: room.localMode,
    prizes: room.prizes,
    currentTurnIndex: room.currentTurnIndex,
    turnOrder: room.turnOrder,
    totalPlayers: room.players.size
  };
}

export function claimPrize(room: Room, pid: string) {
  const p = room.players.get(pid);
  if (!p) throw new Error("PLAYER_NOT_FOUND");
  if (p.hasWon) throw new Error("ALREADY_WON");

  const pool = room.prizes.filter(p => p.remaining > 0);
  if (!pool.length) throw new Error("NO_PRIZE");

  const prize = pool[Math.floor(Math.random() * pool.length)];
  prize.remaining--;
  p.hasWon = true;

  return { player: p, prize };
}

export function nextTurn(room: Room) {
  room.currentTurnIndex =
    (room.currentTurnIndex + 1) % room.turnOrder.length;
  return room.turnOrder[room.currentTurnIndex];
}

export function addPrize(room: Room, payload: any) {
  if (payload.type === "cash") {
    room.prizes.push({
      id: nanoid(),
      type: "cash",
      value: payload.value,
      formatted_value: formatMoney(payload.value),
      remaining: payload.remaining
    });
  } else {
    room.prizes.push({
      id: nanoid(),
      type: "troll",
      name: payload.name,
      remaining: payload.remaining
    });
  }
}
