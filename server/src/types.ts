export type RoomMode = "online" | "local";

export type Prize =
  | {
      id: string;
      type: "cash";
      label: string;          // "Lì xì 200k"
      value: number;          // 200000
      formatted: string;      // "200.000đ"
      remaining: number;      // qty
    }
  | {
      id: string;
      type: "troll";
      label: string;          // "Uống 1 ly 🍻"
      remaining: number;
    };

export type Player = {
  id: string;
  name: string;
  joinedAt: number;
  shakesUsed: number;
  // receipts shown in Play UI
  receipts: Array<{ at: number; prizeText: string }>;
};

export type WinnerItem = {
  at: number;
  playerId: string;
  playerName: string;
  prizeText: string;
};

export type Room = {
  code: string;              // 6 digits
  hostName: string;

  mode: RoomMode;
  shakesPerPlayer: number;

  started: boolean;
  ended: boolean;

  prizes: Prize[];
  players: Map<string, Player>;
  winners: WinnerItem[];     // recent

  // SSE clients
  clients: Map<string, import("express").Response>;
};
