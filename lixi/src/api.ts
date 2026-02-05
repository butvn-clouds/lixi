import { API_BASE } from "./constants";

export type RoomMode = "online" | "local";

export type Prize =
  | { id: string; type: "cash"; label: string; value: number; formatted: string; remaining: number }
  | { id: string; type: "troll"; label: string; remaining: number };

export type RoomStatus = {
  code: string;
  hostName: string;
  mode: RoomMode;
  shakesPerPlayer: number;
  started: boolean;
  ended: boolean;
  totalPlayers: number;
  totalPrizes: number;
  totalBudget: number;
  prizes: Prize[];
  players: Array<{ id: string; name: string; shakesUsed: number }>;
  winners: Array<{ at: number; playerId: string; playerName: string; prizeText: string }>;
};

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init
  });
  if (!res.ok) throw new Error(await res.text().catch(() => `HTTP ${res.status}`));
  return (await res.json()) as T;
}

export const api = {
  createRoom: (payload: { hostName: string; mode: RoomMode; shakesPerPlayer: number; prizes: Prize[] }) =>
    http<{ code: string; room: RoomStatus }>(`/api/rooms`, { method: "POST", body: JSON.stringify(payload) }),

  status: (code: string) => http<RoomStatus>(`/api/rooms/${code}/status`),

  join: (code: string, payload: { name: string }) =>
    http<{ playerId: string; playerName: string; room: RoomStatus }>(`/api/rooms/${code}/join`, {
      method: "POST",
      body: JSON.stringify(payload)
    }),

  start: (code: string) => http(`/api/rooms/${code}/start`, { method: "POST" }),
  end: (code: string) => http(`/api/rooms/${code}/end`, { method: "POST" }),

  addCash: (code: string, payload: { label?: string; value: number; qty: number }) =>
    http(`/api/rooms/${code}/prizes/cash`, { method: "POST", body: JSON.stringify(payload) }),

  addTroll: (code: string, payload: { label: string; qty: number }) =>
    http(`/api/rooms/${code}/prizes/troll`, { method: "POST", body: JSON.stringify(payload) }),

  setQty: (code: string, prizeId: string, qty: number) =>
    http(`/api/rooms/${code}/prizes/${prizeId}`, { method: "PATCH", body: JSON.stringify({ qty }) }),

  delPrize: (code: string, prizeId: string) =>
    http(`/api/rooms/${code}/prizes/${prizeId}`, { method: "DELETE" }),

  shake: (code: string, payload: { playerId: string; energy: number }) =>
    http<{ prize: Prize; prizeText: string; receipts: Array<{ at: number; prizeText: string }> }>(
      `/api/rooms/${code}/shake`,
      { method: "POST", body: JSON.stringify(payload) }
    )
};
