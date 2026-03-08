"use client";

import { api } from "~/trpc/react";
import { motion } from "framer-motion";
import { Hash, TrendingUp, Play, Heart } from "lucide-react";
import Link from "next/link";
import { formatNumber } from "~/lib/utils";
import { Avatar } from "~/components/ui/avatar";

interface PageProps {
    params: Promise<{ tag: string }>;
}

export default async function HashtagPage({ params }: PageProps) {
    const { tag } = await params;
    return <HashtagContent tag={tag} />;
}

function HashtagContent({ tag }: { tag: string }) {
    const cleanTag = tag.replace(/^%23/, "").replace(/^#/, "");

    const { data, isLoading } = api.hashtag.getVideosByHashtag.useQuery({
        tag: cleanTag,
        limit: 30,
    });

    return (
        <main className="min-h-screen bg-[#0a0a0a] pb-20 text-white">
            {/* Header */}
            <div className="border-b border-white/10 bg-white/5 backdrop-blur-xl">
                <div className="mx-auto max-w-4xl px-4 py-8">
                    <div className="flex items-center gap-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-cyan-400">
                            <Hash className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold">#{cleanTag}</h1>
                            <p className="mt-1 text-gray-400">
                                {data ? formatNumber(data.items.length) : "…"} videos
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-4xl px-4 py-8">
                {isLoading ? (
                    <div className="grid grid-cols-3 gap-2">
                        {Array.from({ length: 9 }).map((_, i) => (
                            <div key={i} className="aspect-[9/16] animate-pulse rounded-xl bg-white/5" />
                        ))}
                    </div>
                ) : !data?.items.length ? (
                    <div className="py-24 text-center">
                        <Hash className="mx-auto mb-4 h-16 w-16 text-gray-600" />
                        <h3 className="mb-2 text-xl font-semibold">No videos yet</h3>
                        <p className="text-gray-400">
                            Be the first to tag a video with <span className="text-pink-400">#{cleanTag}</span>!
                        </p>
                        <Link
                            href="/upload"
                            className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-cyan-400 px-6 py-3 font-semibold text-white"
                        >
                            Upload a video
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-3 gap-2 sm:gap-3">
                        {data.items.map((video, i) => (
                            <motion.div
                                key={video.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.04 }}
                            >
                                <Link href={`/?videoId=${video.id}`}>
                                    <div className="group relative aspect-[9/16] cursor-pointer overflow-hidden rounded-xl bg-white/5">
                                        {video.thumbnailUrl ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={video.thumbnailUrl}
                                                alt={video.title ?? "Video"}
                                                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                            />
                                        ) : (
                                            <video
                                                src={video.filePath}
                                                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                muted
                                                playsInline
                                            />
                                        )}
                                        {/* Overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                                        <div className="absolute inset-x-2 bottom-2 opacity-0 transition-opacity group-hover:opacity-100">
                                            <div className="flex items-center gap-2">
                                                <Avatar
                                                    src={video.user.image ?? undefined}
                                                    fallback={(video.user.username ?? "U").charAt(0).toUpperCase()}
                                                    size="sm"
                                                />
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-xs font-medium">@{video.user.username ?? video.user.name}</p>
                                                </div>
                                            </div>
                                            <div className="mt-1 flex items-center gap-3 text-xs text-gray-300">
                                                <span className="flex items-center gap-1">
                                                    <Heart className="h-3 w-3 text-[#FE2C55]" />
                                                    {formatNumber(video._count.likes)}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Play className="h-3 w-3" />
                                                    {formatNumber(video._count.comments)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}
