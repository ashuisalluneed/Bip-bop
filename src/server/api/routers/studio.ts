/**
 * Creator Studio router — analytics for the authenticated user's own videos.
 * Provides per-video stats plus aggregated totals.
 */
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const studioRouter = createTRPCRouter({
    /**
     * Aggregated stats for the creator's dashboard header.
     */
    getOverview: protectedProcedure.query(async ({ ctx }) => {
        const userId = ctx.session.user.id;

        const [totalViews, totalLikes, totalComments, totalFollowers, videoCount] =
            await Promise.all([
                ctx.db.video.aggregate({
                    where: { userId },
                    _sum: { viewCount: true },
                }),
                ctx.db.like.count({
                    where: { video: { userId } },
                }),
                ctx.db.comment.count({
                    where: { video: { userId } },
                }),
                ctx.db.follow.count({
                    where: { followingId: userId },
                }),
                ctx.db.video.count({ where: { userId } }),
            ]);

        return {
            totalViews: totalViews._sum.viewCount ?? 0,
            totalLikes,
            totalComments,
            totalFollowers,
            videoCount,
        };
    }),

    /**
     * List of all videos with per-video analytics, newest first.
     */
    getVideoStats: protectedProcedure
        .input(
            z.object({
                limit: z.number().min(1).max(50).default(10),
                cursor: z.number().optional(),
            }),
        )
        .query(async ({ ctx, input }) => {
            const userId = ctx.session.user.id;

            const videos = await ctx.db.video.findMany({
                take: input.limit + 1,
                cursor: input.cursor ? { id: input.cursor } : undefined,
                where: { userId },
                orderBy: { createdAt: "desc" },
                include: {
                    _count: {
                        select: { likes: true, comments: true, bookmarks: true, views: true },
                    },
                },
            });

            let nextCursor: number | undefined = undefined;
            if (videos.length > input.limit) {
                const next = videos.pop();
                nextCursor = next!.id;
            }

            return { videos, nextCursor };
        }),

    /**
     * 7-day / 30-day view trends for a specific video.
     */
    getVideoTrend: protectedProcedure
        .input(z.object({ videoId: z.number(), days: z.number().min(1).max(30).default(7) }))
        .query(async ({ ctx, input }) => {
            const userId = ctx.session.user.id;

            // Ensure creator owns the video
            const video = await ctx.db.video.findFirst({
                where: { id: input.videoId, userId },
            });
            if (!video) throw new Error("Video not found");

            const since = new Date(Date.now() - input.days * 24 * 60 * 60 * 1000);

            const views = await ctx.db.videoView.findMany({
                where: { videoId: input.videoId, viewedAt: { gte: since } },
                select: { viewedAt: true },
                orderBy: { viewedAt: "asc" },
            });

            // Group by date string
            const grouped: Record<string, number> = {};
            for (let d = 0; d < input.days; d++) {
                const date = new Date(since.getTime() + d * 24 * 60 * 60 * 1000);
                const key = date.toISOString().slice(0, 10);
                grouped[key] = 0;
            }
            for (const v of views) {
                const key = v.viewedAt.toISOString().slice(0, 10);
                if (key in grouped) grouped[key]! += 1;
            }

            return Object.entries(grouped).map(([date, count]) => ({ date, count }));
        }),
});
