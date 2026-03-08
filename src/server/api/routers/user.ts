import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "~/server/api/trpc";

export const userRouter = createTRPCRouter({
  getById: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: {
          id: input.userId,
        },
        select: {
          id: true,
          name: true,
          username: true,
          image: true,
          bio: true,
        },
      });

      return user;
    }),

  getByUsername: publicProcedure
    .input(z.object({ username: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: {
          username: input.username,
        },
        select: {
          id: true,
          name: true,
          username: true,
          image: true,
          bio: true,
          createdAt: true,
          videos: {
            orderBy: {
              createdAt: "desc",
            },
            select: {
              id: true,
              filePath: true,
              title: true,
              createdAt: true,
              _count: {
                select: { 
                  likes: true,
                  comments: true,
                },
              },
            },
          },
          _count: {
            select: { 
              videos: true,
              followers: true,
              following: true,
            },
          },
        },
      });

      return user;
    }),

  getFollowers: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const followers = await ctx.db.follow.findMany({
        where: {
          followingId: input.userId,
        },
        include: {
          follower: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
              bio: true,
              _count: {
                select: {
                  followers: true,
                  videos: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return followers.map((f) => f.follower);
    }),

  getFollowing: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const following = await ctx.db.follow.findMany({
        where: {
          followerId: input.userId,
        },
        include: {
          following: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
              bio: true,
              _count: {
                select: {
                  followers: true,
                  videos: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return following.map((f) => f.following);
    }),

  getLikesBreakdown: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const videos = await ctx.db.video.findMany({
        where: {
          userId: input.userId,
        },
        select: {
          id: true,
          title: true,
          filePath: true,
          createdAt: true,
          _count: {
            select: {
              likes: true,
              comments: true,
            },
          },
          likes: {
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
            orderBy: {
              createdAt: "desc",
            },
            take: 10,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return videos;
    }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(50).optional(),
        username: z.string().min(3).max(30).optional(),
        email: z.string().email().optional(),
        bio: z.string().max(150).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Check if username is taken by another user
      if (input.username) {
        const existingUser = await ctx.db.user.findUnique({
          where: { username: input.username },
        });

        if (existingUser && existingUser.id !== userId) {
          throw new TRPCError({ code: "CONFLICT", message: "Username is already taken" });
        }
      }

      // Check if email is taken by another user
      if (input.email) {
        const existingUser = await ctx.db.user.findUnique({
          where: { email: input.email },
        });

        if (existingUser && existingUser.id !== userId) {
          throw new TRPCError({ code: "CONFLICT", message: "Email is already in use" });
        }
      }

      const updatedUser = await ctx.db.user.update({
        where: { id: userId },
        data: {
          ...(input.name !== undefined && { name: input.name }),
          ...(input.username && { username: input.username }),
          ...(input.email && { email: input.email }),
          ...(input.bio !== undefined && { bio: input.bio }),
        },
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          image: true,
          bio: true,
        },
      });

      return updatedUser;
    }),
});
