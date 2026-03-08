/**
 * Pusher server + client setup for real-time messaging and notifications.
 * Server instance is used inside tRPC mutations (server-only).
 * Client instance is used inside React components (browser).
 */

// ─── Server-side (trigger events) ────────────────────────────────────────────
import PusherServer from "pusher";

export const pusherServer = new PusherServer({
    appId: process.env.PUSHER_APP_ID!,
    key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
    secret: process.env.PUSHER_SECRET!,
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    useTLS: true,
});

// ─── Client-side (subscribe to events) ───────────────────────────────────────
import PusherClient from "pusher-js";

let pusherClientInstance: PusherClient | null = null;

export function getPusherClient(): PusherClient {
    if (!pusherClientInstance) {
        pusherClientInstance = new PusherClient(
            process.env.NEXT_PUBLIC_PUSHER_KEY!,
            {
                cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
                authEndpoint: "/api/pusher-auth",
                auth: {
                    headers: {
                        "Content-Type": "application/json",
                    },
                },
            },
        );
    }
    return pusherClientInstance;
}

// ─── Channel / event name helpers ────────────────────────────────────────────
/** Channel for a specific conversation — private so only participants can access */
export const conversationChannel = (conversationId: string) =>
    `private-conversation-${conversationId}`;

/** Channel for a specific user's notifications/activity */
export const userChannel = (userId: string) => `private-user-${userId}`;

export const PUSHER_EVENTS = {
    NEW_MESSAGE: "new-message",
    MESSAGE_STATUS: "message-status",
    NEW_NOTIFICATION: "new-notification",
    CALL_SIGNALING: "call-signaling",
} as const;
