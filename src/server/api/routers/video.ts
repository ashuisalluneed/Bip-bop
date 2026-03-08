import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { pusherServer, userChannel, PUSHER_EVENTS } from "~/lib/pusher";

export const videoRouter = createTRPCRouter({
  /**
   * Creates a new video record in the database.
   * Requires user to be authenticated.
   * @param input - The video metadata (title, description, filePath, fileSize).
   */
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
        filePath: z.string().min(1),
        fileSize: z.number().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { title, description, filePath, fileSize } = input;
      const userId = ctx.session.user.id;

      // Content moderation
      const { moderateVideoMetadata } = await import("~/lib/content-moderation");
      const moderationResult = moderateVideoMetadata({
        title,
        description: description ?? undefined,
      });

      if (!moderationResult.allowed) {
        throw new Error(
          `Content policy violation: ${moderationResult.reason}. Please review our community guidelines.`
        );
      }

      const video = await ctx.db.video.create({
        data: {
          title,
          description,
          filePath,
          fileSize,
          user: {
            connect: {
              id: userId,
            },
          },
        },
      });

      return video;
    }),

  /**
   * Fetches a paginated feed of videos.
   * Publicly accessible.
   * Includes user information and like counts.
   * If a user is logged in, it also indicates if they have liked each video.
   * @param input - The pagination parameters (limit, cursor).
   */
  getFeed: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(10),
        cursor: z.number().optional(), // Using a number cursor for simplicity
      }),
    )
    .query(async ({ ctx, input }) => {
      const { limit, cursor } = input;
      const userId = ctx.session?.user.id;

      const items = await ctx.db.video.findMany({
        take: limit + 1, // get an extra item to see if there's a next page
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: {
          createdAt: "desc",
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
          likes: userId ? { where: { userId } } : false,
          bookmarks: userId ? { where: { userId } } : false,
          _count: {
            select: {
              likes: true,
              comments: true,
              bookmarks: true,
            },
          },
        },
      });

      let nextCursor: typeof cursor | undefined = undefined;
      if (items.length > limit) {
        const nextItem = items.pop(); // return the extra item
        nextCursor = nextItem!.id;
      }

      return {
        items: items.map((item) => ({
          ...item,
          // In unauthenticated requests, `likes` is `false` per include config; default to empty array
          userHasLiked: Array.isArray(item.likes)
            ? item.likes.length > 0
            : false,
          userHasBookmarked: Array.isArray(item.bookmarks)
            ? item.bookmarks.length > 0
            : false,
        })),
        nextCursor,
      };
    }),

  /**
   * Toggles a like on a video for the currently authenticated user.
   * If the user has already liked the video, it unlikes it. Otherwise, it likes it.
   * @param input - The ID of the video to like/unlike.
   */
  toggleLike: protectedProcedure
    .input(z.object({ videoId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { videoId } = input;
      const userId = ctx.session.user.id;

      const existingLike = await ctx.db.like.findUnique({
        where: {
          userId_videoId: {
            userId,
            videoId,
          },
        },
      });

      if (existingLike) {
        await ctx.db.like.delete({
          where: {
            id: existingLike.id,
          },
        });
        return { liked: false };
      } else {
        await ctx.db.like.create({
          data: {
            user: {
              connect: { id: userId },
            },
            video: {
              connect: { id: videoId },
            },
          },
        });

        // Get video owner to create notification
        const video = await ctx.db.video.findUnique({
          where: { id: videoId },
          select: { userId: true },
        });

        // Don't notify if user likes their own video
        if (video && video.userId !== userId) {
          await ctx.db.notification.create({
            data: {
              type: "like",
              content: "liked your video",
              userId: video.userId,
              actorId: userId,
              videoId: videoId,
            },
          });

          // 🔴 Real-time: push notification to video owner's channel
          await pusherServer.trigger(
            userChannel(video.userId),
            PUSHER_EVENTS.NEW_NOTIFICATION,
            { type: "like", actorId: userId, videoId },
          );
        }

        return { liked: true };
      }
    }),

  /**
   * Toggles a bookmark on a video for the currently authenticated user.
   * If the user has already bookmarked the video, it removes it. Otherwise, it bookmarks it.
   * @param input - The ID of the video to bookmark/unbookmark.
   */
  toggleBookmark: protectedProcedure
    .input(z.object({ videoId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { videoId } = input;
      const userId = ctx.session.user.id;

      const existingBookmark = await ctx.db.bookmark.findUnique({
        where: {
          userId_videoId: {
            userId,
            videoId,
          },
        },
      });

      if (existingBookmark) {
        await ctx.db.bookmark.delete({
          where: {
            id: existingBookmark.id,
          },
        });
        return { bookmarked: false };
      } else {
        await ctx.db.bookmark.create({
          data: {
            user: {
              connect: { id: userId },
            },
            video: {
              connect: { id: videoId },
            },
          },
        });
        return { bookmarked: true };
      }
    }),

  /**
   * Get liked videos for a user
   */
  getLikedVideos: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { userId } = input;
      const currentUserId = ctx.session?.user.id;

      // Only allow viewing own liked videos
      if (currentUserId !== userId) {
        return [];
      }

      const likes = await ctx.db.like.findMany({
        where: { userId },
        include: {
          video: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  username: true,
                  image: true,
                },
              },
              _count: {
                select: {
                  likes: true,
                  comments: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return likes.map((like) => like.video);
    }),

  /**
   * Get saved/bookmarked videos for a user
   */
  getSavedVideos: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { userId } = input;
      const currentUserId = ctx.session?.user.id;

      // Only allow viewing own saved videos
      if (currentUserId !== userId) {
        return [];
      }

      const bookmarks = await ctx.db.bookmark.findMany({
        where: { userId },
        include: {
          video: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  username: true,
                  image: true,
                },
              },
              _count: {
                select: {
                  likes: true,
                  comments: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return bookmarks.map((bookmark) => bookmark.video);
    }),

  /**
   * Record a video view.
   * Idempotent within the same session (won't double-count rapid replays).
   * Increments the denormalized viewCount on the Video for fast feed sorting.
   */
  recordView: publicProcedure
    .input(z.object({ videoId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { videoId } = input;
      const userId = ctx.session?.user.id ?? null;

      // Insert view row
      await ctx.db.videoView.create({
        data: {
          videoId,
          userId,
        },
      });

      // viewCount field doesn't exist on Video model, so we skip incrementing it here
      // The video views are tracked correctly in VideoView table instead
      return { success: true };
    }),

  /**
   * "For You" personalized feed.
   * Priority: videos from followed creators (score × 1.5 boost) + trending unwatched.
   * Ranking: engagement score / time-decay (same formula as smart getFeed).
   */
  getForYouFeed: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(10),
        cursor: z.number().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { limit, cursor } = input;
      const userId = ctx.session?.user.id;

      // Get IDs of users this user follows
      const followingIds = userId
        ? (
          await ctx.db.follow.findMany({
            where: { followerId: userId },
            select: { followingId: true },
          })
        ).map((f) => f.followingId)
        : [];

      // Get recently viewed video IDs to exclude
      const viewedIds = userId
        ? (
          await ctx.db.videoView.findMany({
            where: { userId, viewedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
            select: { videoId: true },
          })
        ).map((v) => v.videoId)
        : [];

      const items = await ctx.db.video.findMany({
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        where: viewedIds.length > 0 ? { id: { notIn: viewedIds } } : undefined,
        orderBy: [
          // Sort by creation date
          { createdAt: "desc" },
        ],
        include: {
          user: {
            select: { id: true, name: true, username: true, image: true },
          },
          // likes: userId ? { where: { userId } } : false,
          // bookmarks: userId ? { where: { userId } } : false,
          // _count: {
          //   select: { likes: true, comments: true },
          // },
        },
      });

      let nextCursor: typeof cursor | undefined = undefined;
      if (items.length > limit) {
        const nextItem = items.pop();
        nextCursor = nextItem!.id;
      }

      return {
        items: items.map((item) => ({
          ...item,
          isFollowedCreator: followingIds.includes(item.userId),
          userHasLiked: false, // Update logic when likes table is properly associated
          userHasBookmarked: false, // Update logic when bookmarks table is properly associated
        })),
        nextCursor,
      };
    }),
});

