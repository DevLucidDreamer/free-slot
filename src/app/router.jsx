import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import HomePage from "../pages/HomePage.jsx";
import RoomPage from "../pages/RoomPage.jsx";

export default function Router() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/r/:roomId" element={<RoomPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
