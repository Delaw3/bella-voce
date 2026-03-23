import http from "http";
import next from "next";
import { Server } from "socket.io";
import { validateRealtimeAuthToken } from "./src/lib/realtime-auth-store.mjs";
import { getRoomNameForUser, setRealtimeServer } from "./src/lib/realtime-server.mjs";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = Number(process.env.PORT || 3000);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = http.createServer((request, response) => {
    handle(request, response);
  });

  const io = new Server(server, {
    path: "/socket.io",
    cors: {
      origin: true,
      credentials: true,
    },
  });

  io.use((socket, nextMiddleware) => {
    const token = typeof socket.handshake.auth?.token === "string" ? socket.handshake.auth.token : "";
    const authRecord = validateRealtimeAuthToken(token);

    if (!authRecord) {
      nextMiddleware(new Error("Unauthorized"));
      return;
    }

    socket.data.userId = authRecord.userId;
    nextMiddleware();
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId;
    if (!userId) {
      socket.disconnect(true);
      return;
    }

    socket.join(getRoomNameForUser(userId));
  });

  setRealtimeServer(io);

  server.listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
