import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./Page/Home";
import HostCreate from "./Page/HostCreate";
import HostLobby from "./Page/HostLobby";
import Join from "./Page/Join";
import Play from "./Page/Play";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/host/create" element={<HostCreate />} />
      <Route path="/host/lobby/:code" element={<HostLobby />} />
      <Route path="/join/:code" element={<Join />} />
      <Route path="/play/:code" element={<Play />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
