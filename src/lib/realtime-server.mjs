export const NOTIFICATION_EVENT = "notification:new";

export function getRoomNameForUser(userId) {
  return `user:${String(userId)}`;
}

export function setRealtimeServer(io) {
  globalThis.__bellaVoceRealtimeIo = io;
}

export function getRealtimeServer() {
  return globalThis.__bellaVoceRealtimeIo ?? null;
}

export function emitNotificationToUser(userId, payload) {
  const io = getRealtimeServer();
  if (!io) {
    return false;
  }

  io.to(getRoomNameForUser(userId)).emit(NOTIFICATION_EVENT, payload);
  return true;
}
