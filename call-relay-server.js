/**
 * Call Signaling Relay Server
 * -----------------------------------------
 * A minimal standalone WebSocket server used ONLY for call signaling
 * (CallInvite / CallResponse) between the family dashboard and the
 * elder dashboard.
 *
 * The main alerts backend (shastra-sync.onrender.com) does not
 * re-broadcast messages that clients send to it, so this small relay
 * fills that gap: whatever one client sends, it forwards to every
 * OTHER connected client.
 *
 * Run with:  npm run relay      (or: node call-relay-server.js)
 * Default port: 8080  (override with PORT env var)
 */

const { WebSocketServer } = require("ws");

const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;

const wss = new WebSocketServer({ port: PORT });

console.log(`📞 Call relay server listening on ws://localhost:${PORT}`);

wss.on("connection", (socket, req) => {
  const clientAddr = req.socket.remoteAddress;
  socket.isAlive = true;
  console.log(`🔌 Client connected (${clientAddr}). Total: ${wss.clients.size}`);

  socket.on("pong", () => {
    socket.isAlive = true;
  });

  socket.on("message", (data, isBinary) => {
    // Log the message type for visibility (best-effort)
    let typeLabel = "unknown";
    try {
      typeLabel = JSON.parse(data.toString()).type || "unknown";
    } catch {
      // non-JSON; forward as-is
    }
    console.log(`📨 Relaying "${typeLabel}" to ${wss.clients.size - 1} other client(s)`);

    // Broadcast to every OTHER open client
    for (const client of wss.clients) {
      if (client !== socket && client.readyState === client.OPEN) {
        client.send(data, { binary: isBinary });
      }
    }
  });

  socket.on("close", () => {
    console.log(`❌ Client disconnected. Total: ${wss.clients.size}`);
  });

  socket.on("error", (err) => {
    console.log("⚠️  Socket error:", err.message);
  });
});

// Heartbeat: drop dead connections every 30s so the client list stays clean.
const heartbeat = setInterval(() => {
  for (const socket of wss.clients) {
    if (socket.isAlive === false) {
      socket.terminate();
      continue;
    }
    socket.isAlive = false;
    socket.ping();
  }
}, 30000);

wss.on("close", () => clearInterval(heartbeat));

process.on("SIGINT", () => {
  console.log("\n👋 Shutting down call relay server...");
  wss.close();
  process.exit(0);
});
