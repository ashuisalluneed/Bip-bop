import { WebSocketServer, type WebSocket, type RawData } from "ws";
import { PrismaClient } from "@prisma/client";
import PusherServer from "pusher";

const port = 3001;
const db = new PrismaClient();
const wss = new WebSocketServer({ port });

// Pusher server instance for relaying events to clients
const pusher = new PusherServer({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
});

console.log(`> Aurora WS attached at ws://localhost:${port}`);

wss.on("connection", (ws: WebSocket) => {
  console.log("WS client connected");

  ws.on("message", async (raw: RawData) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      const event = JSON.parse(raw.toString()) as {
        type: string;
        payload: Record<string, unknown>;
        senderId: string;
        conversationId: string;
        vectorClock?: Record<string, number>;
        id?: string;
      };

      // Persist the event to the MessageEvent log
      const persisted = await db.messageEvent.create({
        data: {
          id: event.id ?? crypto.randomUUID(),
          type: event.type,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
          payload: event.payload as any,
          vectorClock: event.vectorClock ?? {},
          timestamp: BigInt(Date.now()),
          senderId: event.senderId,
          conversationId: event.conversationId,
        },
      });

      // Relay to Pusher so browser clients receive it in real-time
      await pusher.trigger(
        `private-conversation-${event.conversationId}`,
        event.type,
        { ...event.payload, eventId: persisted.id }
      );

      console.log(`[WS] Relayed event ${event.type} for conversation ${event.conversationId}`);
    } catch (e) {
      console.error("[WS] Error processing message:", e);
    }
  });

  ws.on("close", () => console.log("WS client disconnected"));
  ws.on("error", (err: Error) => console.error("[WS] Socket error:", err));
});
