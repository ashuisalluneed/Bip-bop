/**
 * Hashtag router — trending tags + videos by hashtag.
 * Hashtags are extracted from video descriptions on upload.
 */
import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "~/server/api/trpc";

/** Extract all #tags from a string — returns lowercase names without # */
export function extractHashtags(text: string): string[] {
    const matches = text.match(/#(\w+)/g) ?? [];
    return [...new Set(matches.map((t) => t.slice(1).toLowerCase()))];
}

export const hashtagRouter = createTRPCRouter({
    /**
     * Top trending hashtags ranked by number of videos in the last 7 days.
     */
    getTrending: publicProcedure
        .input(z.object({ limit: z.number().min(1).max(50).default(20) }))
        .query(async ({ ctx, input }) => {
            const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

            const trending = await ctx.db.videoHashtag.groupBy({
                by: ["hashtagId"],
                where: { createdAt: { gte: since } },
                _count: { hashtagId: true },
                orderBy: { _count: { hashtagId: "desc" } },
                take: input.limit,
            });

            if (trending.length === 0) return [];

            const hashtags = await ctx.db.hashtag.findMany({
                where: { id: { in: trending.map((t) => t.hashtagId) } },
                select: { id: true, name: true },
            });

            return trending.map((t) => ({
                ...hashtags.find((h) => h.id === t.hashtagId)!,
                videoCount: t._count.hashtagId,
            }));
        }),

    /**
     * All videos tagged with a specific hashtag, newest first.
     */
    getVideosByHashtag: publicProcedure
        .input(
            z.object({
                tag: z.string().min(1),
                limit: z.number().min(1).max(50).default(10),
                cursor: z.number().optional(),
            }),
        )
        .query(async ({ ctx, input }) => {
            const tag = input.tag.toLowerCase().replace(/^#/, "");
            const userId = ctx.session?.user.id;

            const hashtag = await ctx.db.hashtag.findUnique({ where: { name: tag } });
            if (!hashtag) return { items: [], nextCursor: undefined, tag };

            const videoHashtags = await ctx.db.videoHashtag.findMany({
                take: input.limit + 1,
                cursor: input.cursor ? { id: input.cursor } : undefined,
                where: { hashtagId: hashtag.id },
                orderBy: { createdAt: "desc" },
                include: {
                    video: {
                        include: {
                            user: { select: { id: true, name: true, username: true, image: true } },
                            _count: { select: { likes: true, comments: true } },
                        },
                    },
                },
            });

            let nextCursor: number | undefined = undefined;
            if (videoHashtags.length > input.limit) {
                const next = videoHashtags.pop();
                nextCursor = next!.id;
            }

            return {
                tag,
                items: videoHashtags.map((vh) => vh.video),
                nextCursor,
            };
        }),

    /**
     * Attach hashtags to a video (called after video upload, parsed from description).
     */
    attachToVideo: protectedProcedure
        .input(z.object({ videoId: z.number(), description: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const tags = extractHashtags(input.description);
            if (tags.length === 0) return { attached: 0 };

            for (const name of tags) {
                const hashtag = await ctx.db.hashtag.upsert({
                    where: { name },
                    create: { name },
                    update: {},
                });

                await ctx.db.videoHashtag.upsert({
                    where: { videoId_hashtagId: { videoId: input.videoId, hashtagId: hashtag.id } },
                    create: { videoId: input.videoId, hashtagId: hashtag.id },
                    update: {},
                });
            }

            return { attached: tags.length };
        }),
});
