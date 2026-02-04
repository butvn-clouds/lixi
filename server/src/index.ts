import express from "express";
import cors from "cors";
import {
  createRoom,
  getRoom,
  joinRoom,
  roomStatus,
  claimPrize,
  nextTurn,
  addPrize
} from "./store";

const app = express();
app.use(cors());
app.use(express.json());

function sse(room: any, event: string, data: any) {
  room.clients.forEach((c: any) =>
    c.res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
  );
}

app.post("/api/rooms", (req, res) => {
  const room = createRoom(req.body.hostName || "Chủ xị");
  res.json({ code: room.code });
});

app.post("/api/rooms/:code/join", (req, res) => {
  const room = getRoom(req.params.code);
  if (!room) return res.sendStatus(404);

  const p = joinRoom(room, req.body.playerName);
  sse(room, "player_joined", p);
  sse(room, "room_status", roomStatus(room));
  res.json(p);
});

app.get("/api/rooms/:code/status", (req, res) => {
  const room = getRoom(req.params.code);
  if (!room) return res.sendStatus(404);
  res.json(roomStatus(room));
});

app.post("/api/rooms/:code/shake", (req, res) => {
  const room = getRoom(req.params.code);
  if (!room) return res.sendStatus(404);

  try {
    const r = claimPrize(room, req.body.playerId);
    sse(room, "prize_won", r);
    sse(room, "room_status", roomStatus(room));
    res.json(r);
  } catch (e: any) {
    res.status(400).send(e.message);
  }
});

app.post("/api/rooms/:code/start", (req, res) => {
  const room = getRoom(req.params.code);
  if (!room) return res.sendStatus(404);
  room.started = true;
  sse(room, "game_started", {});
  res.json({ ok: true });
});

app.post("/api/rooms/:code/end", (req, res) => {
  const room = getRoom(req.params.code);
  if (!room) return res.sendStatus(404);
  room.ended = true;
  sse(room, "game_ended", {});
  res.json({ ok: true });
});

app.post("/api/rooms/:code/prizes", (req, res) => {
  const room = getRoom(req.params.code);
  if (!room) return res.sendStatus(404);
  addPrize(room, req.body);
  sse(room, "prize_pool_updated", room.prizes);
  res.json(room.prizes);
});

app.post("/api/rooms/:code/next-turn", (req, res) => {
  const room = getRoom(req.params.code);
  if (!room) return res.sendStatus(404);

  const id = nextTurn(room);
  sse(room, "turn_changed", { id });
  res.json({ id });
});

app.get("/stream/:code", (req, res) => {
  const room = getRoom(req.params.code);
  if (!room) return res.sendStatus(404);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");

  const id = Math.random().toString(36);
  room.clients.add({ res, id });

  res.write(`event: room_status\ndata:${JSON.stringify(roomStatus(room))}\n\n`);

  req.on("close", () => room.clients.forEach((c:any)=>c.id===id&&room.clients.delete(c)));
});

app.listen(5000, () => console.log("SERVER http://localhost:5000"));
