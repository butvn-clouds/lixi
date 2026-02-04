export type Prize =
  | { id: string; type: "cash"; value: number; formatted_value: string; remaining: number }
  | { id: string; type: "troll"; name: string; remaining: number };

export type Player = {
  playerId: string;
  playerName: string;
  hasWon: boolean;
};

export type Room = {
  code: string;
  hostName: string;
  started: boolean;
  ended: boolean;

  localMode: boolean;
  turnOrder: string[];
  currentTurnIndex: number;

  players: Map<string, Player>;
  prizes: Prize[];

  clients: Set<{ res: any; id: string }>;
};
