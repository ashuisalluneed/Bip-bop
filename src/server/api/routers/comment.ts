import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { checkRateLimit } from "~/lib/rate-limit";

export const commentRouter = createTRPCRouter({
  getByVideoId: publicProcedure
    .input(z.object({ videoId: z.number() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.comment.findMany({
        where: { videoId: input.videoId },
        orderBy: { createdAt: "desc" },
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
      });
    }),

  create: protectedProcedure
    .input(z.object({ videoId: z.number(), content: z.string().min(1).max(500) }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Rate limit: 20 comments per minute per user
      checkRateLimit(`comment.create:${userId}`, 20, 60_000);

      const comment = await ctx.db.comment.create({
        data: {
          content: input.content,
          videoId: input.videoId,
          userId,
        },
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
      });

      // Get video owner to create notification
      const video = await ctx.db.video.findUnique({
        where: { id: input.videoId },
        select: { userId: true },
      });

      // Don't notify if user comments on their own video
      if (video && video.userId !== userId) {
        await ctx.db.notification.create({
          data: {
            type: "comment",
            content: "commented on your video",
            userId: video.userId,
            actorId: userId,
            videoId: input.videoId,
          },
        });
      }

      return comment;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const comment = await ctx.db.comment.findUnique({
        where: { id: input.id },
        select: { userId: true },
      });

      if (!comment) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Comment not found" });
      }

      if (comment.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized to delete this comment" });
      }

      await ctx.db.comment.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),
});