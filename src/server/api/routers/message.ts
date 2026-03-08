import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { createEvent, type EventEnvelope } from "~/lib/aurora/event-envelope";
// Keeping pusher imports temporarily for other things, but removing from message
import {
  pusherServer,
  conversationChannel,
  PUSHER_EVENTS,
} from "~/lib/pusher";

export const messageRouter = createTRPCRouter({
  /**
   * Get all conversations for the current user
   */
  getConversations: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const conversations = await ctx.db.conversation.findMany({
      where: {
        participants: {
          some: {
            userId,
          },
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                image: true,
              },
            },
          },
        },
        messageEvents: {
          orderBy: {
            timestamp: "desc",
          },
          take: 1,
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return conversations.map((conv) => ({
      ...conv,
      otherParticipant: conv.participants.find((p) => p.userId !== userId)?.user,
      // For legacy UI compatibility, we map the last event payload back to a "message"
      lastMessage: conv.messageEvents[0] ? {
        id: conv.messageEvents[0].id,
        content: (conv.messageEvents[0].payload as any).content || "Event",
        createdAt: conv.messageEvents[0].createdAt,
        senderId: conv.messageEvents[0].senderId,
      } : null,
    }));
  }),

  /**
   * Get event history for a specific conversation
   */
  getMessages: protectedProcedure
    .input(z.object({ conversationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const events = await ctx.db.messageEvent.findMany({
        where: {
          conversationId: input.conversationId,
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
            },
          },
        },
        orderBy: {
          timestamp: "asc",
        },
      });

      // The frontend will need to project these events into a message list.
      // For now, we return the raw events.
      return events as unknown as EventEnvelope[];
    }),

  /**
   * Send a message (creates a message:send Event)
   */
  sendMessage: protectedProcedure
    .input(
      z.object({
        conversationId: z.string().optional(),
        recipientId: z.string(),
        content: z.string().min(1),
        // Client can pass its current vector clock, otherwise we start empty
        vectorClock: z.record(z.string(), z.number()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const senderId = ctx.session.user.id;
      const { conversationId, recipientId, content, vectorClock } = input;

      let convId = conversationId;

      // If no conversation ID, find or create one
      if (!convId) {
        const existingConv = await ctx.db.conversation.findFirst({
          where: {
            AND: [
              { participants: { some: { userId: senderId } } },
              { participants: { some: { userId: recipientId } } },
            ],
          },
        });

        if (existingConv) {
          convId = existingConv.id;
        } else {
          const newConv = await ctx.db.conversation.create({
            data: {
              participants: {
                create: [
                  { userId: senderId },
                  { userId: recipientId },
                ],
              },
            },
          });
          convId = newConv.id;
        }
      }

      // Create the Aurora Event Envelope
      const envelope = createEvent(
        "message:send",
        {
          messageId: crypto.randomUUID(),
          content,
        },
        vectorClock || {},
        senderId,
        convId
      );

      // Persist the event to the database
      const savedEvent = await ctx.db.messageEvent.create({
        data: {
          id: envelope.id,
          type: envelope.type,
          // Need to manually cast this to Prisma Json to satisfy type compiler in TRPC
          payload: envelope.payload as any,
          vectorClock: envelope.vectorClock as any,
          timestamp: envelope.timestamp,
          senderId: envelope.senderId,
          conversationId: envelope.conversationId,
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
            },
          },
        },
      });

      // Update conversation timestamp
      await ctx.db.conversation.update({
        where: { id: convId },
        data: { updatedAt: new Date() },
      });

      // 🔴 Deprecated Pusher trigger (Phase 2), will be replaced by the WS Gateway natively
      // But keeping it here temporarily so the UI doesn't completely break before P3.4
      await pusherServer.trigger(
        conversationChannel(convId),
        PUSHER_EVENTS.NEW_MESSAGE,
        savedEvent,
      );

      return savedEvent;
    }),

  /**
   * Mark conversation events as read
   */
  markAsRead: protectedProcedure
    .input(z.object({ conversationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      await ctx.db.conversationParticipant.updateMany({
        where: {
          conversationId: input.conversationId,
          userId,
        },
        data: {
          lastReadAt: new Date(),
        },
      });

      const envelope = createEvent(
        "message:read",
        { lastReadTimestamp: Date.now() },
        {},
        userId,
        input.conversationId
      );

      await ctx.db.messageEvent.create({
        data: {
          id: envelope.id,
          type: envelope.type,
          payload: envelope.payload as any,
          vectorClock: envelope.vectorClock as any,
          timestamp: envelope.timestamp,
          senderId: envelope.senderId,
          conversationId: envelope.conversationId,
        }
      });

      return { success: true };
    }),

  markAsDelivered: protectedProcedure
    .input(z.object({ conversationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // In Event Sourcing, "delivered" is just another event.
      // We can implement this later if needed.
      return { success: true };
    }),
});
