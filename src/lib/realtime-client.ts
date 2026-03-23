"use client";

import { io, Socket } from "socket.io-client";
import { RealtimeNotificationPayload } from "@/types/realtime";

type RealtimeServerEvents = {
  "notification:new": (payload: RealtimeNotificationPayload) => void;
};

let socket: Socket<RealtimeServerEvents> | null = null;
let activeToken = "";

export function getRealtimeSocket(token: string) {
  if (socket && activeToken === token) {
    return socket;
  }

  if (socket) {
    socket.disconnect();
    socket = null;
  }

  activeToken = token;
  socket = io({
    path: "/socket.io",
    transports: ["websocket", "polling"],
    auth: {
      token,
    },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 8000,
  });

  return socket;
}

export function closeRealtimeSocket() {
  if (socket) {
    socket.disconnect();
  }

  socket = null;
  activeToken = "";
}
