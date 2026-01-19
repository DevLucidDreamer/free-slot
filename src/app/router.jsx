import React from "react";
import { createHashRouter } from "react-router-dom";
import HomePage from "../pages/HomePage";
import RoomPage from "../pages/RoomPage";
import RecommendPage from "../pages/RecommendPage";

export const router = createHashRouter([
  { path: "/", element: <HomePage /> },
  { path: "/r/:roomId", element: <RoomPage /> },
  { path: "/r/:roomId/recommend", element: <RecommendPage /> },
]);
