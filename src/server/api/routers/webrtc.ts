import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { pusherServer, conversationChannel, PUSHER_EVENTS } from "~/lib/pusher";

export const webrtcRouter = createTRPCRouter({
    signal: protectedProcedure
        .input(
            z.object({
                conversationId: z.string(),
                signalType: z.enum(["offer", "answer", "ice-candidate", "end-call"]),
                sdp: z.string().optional(),
                candidate: z.string().optional(),
                sdpMid: z.string().nullable().optional(),
                sdpMLineIndex: z.number().nullable().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            // Validate that the user is part of the conversation
            const conversation = await ctx.db.conversation.findFirst({
                where: {
                    id: input.conversationId,
                    participants: {
                        some: {
                            userId: ctx.session.user.id,
                        },
                    },
                },
            });

            if (!conversation) {
                throw new Error("Conversation not found or access denied");
            }

            // Broadcast the signaling data to the conversation channel
            await pusherServer.trigger(
                conversationChannel(input.conversationId),
                PUSHER_EVENTS.CALL_SIGNALING,
                {
                    senderId: ctx.session.user.id,
                    ...input,
                }
            );

            return { success: true };
        }),
});
