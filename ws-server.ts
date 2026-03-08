import { WebSocketServer, WebSocket } from "ws";
import { parse } from "url";
import { env } from "./src/env";
import { PrismaClient } from "@prisma/client";
import { createEvent } from "./src/lib/aurora/event-envelope";

const port = 3001;
const db = new PrismaClient();
const wss = new WebSocketServer({ port });

console.log(`> Aurora WS attached at ws://localhost:${port}`);

wss.on("connection", (ws, req) => {
    console.log("Client connected");
    ws.on("message", async (message) => {
        try {
            console.log("Received a message:", message.toString());
        } catch (e) {
            console.error(e);
        }
    });
});
