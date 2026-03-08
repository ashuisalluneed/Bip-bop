import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";


export const followRouter = createTRPCRouter({
  /**
   * Toggles a follow relationship between the current user and another user.
   * If already following, it unfollows. Otherwise, it follows.
   * @param input - The ID of the user to follow/unfollow.
   */
  toggleFollow: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { userId } = input;
      const currentUserId = ctx.session.user.id;

      if (currentUserId === userId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot follow yourself",
        });
      }

      const existingFollow = await ctx.db.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: currentUserId,
            followingId: userId,
          },
        },
      });

      if (existingFollow) {
        await ctx.db.follow.delete({
          where: {
            id: existingFollow.id,
          },
        });
        return { following: false };
      } else {
        await ctx.db.follow.create({
          data: {
            follower: {
              connect: { id: currentUserId },
            },
            following: {
              connect: { id: userId },
            },
          },
        });

        // Create notification for the followed user
        const follower = await ctx.db.user.findUnique({
          where: { id: currentUserId },
          select: { name: true, username: true },
        });

        await ctx.db.notification.create({
          data: {
            type: "follow",
            content: "started following you",
            userId: userId,
            actorId: currentUserId,
          },
        });

        return { following: true };
      }
    }),

  /**
   * Checks if the current user is following a specific user.
   * @param input - The ID of the user to check.
   */
  isFollowing: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.session?.user.id) {
        return { following: false };
      }

      const follow = await ctx.db.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: ctx.session.user.id,
            followingId: input.userId,
          },
        },
      });

      return { following: !!follow };
    }),

  /**
   * Gets the follower count for a user.
   * @param input - The ID of the user.
   */
  getFollowerCount: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const count = await ctx.db.follow.count({
        where: {
          followingId: input.userId,
        },
      });

      return { count };
    }),

  /**
   * Gets the following count for a user.
   * @param input - The ID of the user.
   */
  getFollowingCount: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const count = await ctx.db.follow.count({
        where: {
          followerId: input.userId,
        },
      });

      return { count };
    }),
});
