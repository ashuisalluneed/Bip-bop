import { WebSocketServer, WebSocket } from "ws";
import { type EventEnvelope } from "../../lib/aurora/types";

// Keep track of which connection is listening to which conversations
// Map<conversationId, Set<WebSocket>>
const subscriptions = new Map<string, Set<WebSocket>>();

const port = Number(process.env.WS_PORT || 3001);

export function createAuroraGateway() {
    const wss = new WebSocketServer({ port });

    wss.on("connection", (ws, req) => {
        console.log("[Aurora WS] Client connected", req.url);

        // Track which conversations this specific WS connection is subscribed to
        const clientSubscriptions = new Set<string>();

        ws.on("message", (messageData) => {
            try {
                // eslint-disable-next-line @typescript-eslint/no-base-to-string
                const data = JSON.parse(messageData.toString()) as {
                    type?: string;
                    conversationId?: string;
                    envelope?: unknown;
                };

                // 1. Handle Subscriptions
                if (data.type === "subscribe" && data.conversationId) {
                    const { conversationId } = data;

                    if (!subscriptions.has(conversationId)) {
                        subscriptions.set(conversationId, new Set());
                    }
                    subscriptions.get(conversationId)!.add(ws);
                    clientSubscriptions.add(conversationId);

                    console.log(`[Aurora WS] Client subscribed to ${conversationId}`);
                    return;
                }

                // 2. Handle Event Envelopes
                if (data.type === "event" && data.envelope) {
                    const envelope = data.envelope as EventEnvelope;
                    const { conversationId } = envelope;

                    // TODO: Persist the envelope to the database via Prisma here
                    // For now, we just act as a Pub/Sub router

                    // Broadcast to everyone else in the conversation
                    const subscribers = subscriptions.get(conversationId);
                    if (subscribers) {
                        const broadcastPayload = JSON.stringify({
                            type: "event",
                            envelope
                        });

                        for (const client of subscribers) {
                            // Don't echo back to the sender
                            if (client !== ws && client.readyState === WebSocket.OPEN) {
                                client.send(broadcastPayload);
                            }
                        }
                    }
                }
            } catch (err) {
                console.error("[Aurora WS] Error parsing message", err);
            }
        });

        ws.on("close", () => {
            console.log("[Aurora WS] Client disconnected");
            // Clean up subscriptions
            for (const conversationId of clientSubscriptions) {
                const subs = subscriptions.get(conversationId);
                if (subs) {
                    subs.delete(ws);
                    if (subs.size === 0) {
                        subscriptions.delete(conversationId);
                    }
                }
            }
        });
    });

    console.log(`> Aurora WS Gateway attached at ws://localhost:${port}`);
    return wss;
}

// Automatically start if called directly
if (require.main === module) {
    createAuroraGateway();
}
