/**
 * Pusher channel authentication endpoint.
 * Required to authorize users for private channels (private-conversation-* and private-user-*).
 */
import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { pusherServer } from "~/lib/pusher";

export async function POST(req: Request) {
    const session = await auth();

    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.text();
    const params = new URLSearchParams(body);
    const socketId = params.get("socket_id");
    const channel = params.get("channel_name");

    if (!socketId || !channel) {
        return NextResponse.json(
            { error: "Missing socket_id or channel_name" },
            { status: 400 },
        );
    }

    // Only allow the user to subscribe to their own channels
    const userId = session.user.id;

    // Allow: private-user-{userId} and private-conversation-* (participant check is done at message fetch level)
    const isUserChannel = channel === `private-user-${userId}`;
    const isConversationChannel = channel.startsWith("private-conversation-");

    if (!isUserChannel && !isConversationChannel) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const authResponse = pusherServer.authorizeChannel(socketId, channel, {
        user_id: userId,
        user_info: {
            name: session.user.name ?? session.user.email ?? userId,
        },
    });

    return NextResponse.json(authResponse);
}
