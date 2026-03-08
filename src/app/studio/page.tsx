"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
    Eye, Heart, MessageCircle, Users, PlaySquare, TrendingUp,
    BarChart2, Trash2, MoreVertical, Upload,
} from "lucide-react";
import { api } from "~/trpc/react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Avatar } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { formatNumber } from "~/lib/utils";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import toast from "react-hot-toast";

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({
    icon: Icon,
    label,
    value,
    color,
    delay = 0,
}: {
    icon: React.ElementType;
    label: string;
    value: number;
    color: string;
    delay?: number;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.4 }}
            className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm"
        >
            <div className={`mb-4 inline-flex rounded-xl p-3 ${color}`}>
                <Icon className="h-6 w-6 text-white" />
            </div>
            <p className="text-sm text-gray-400">{label}</p>
            <p className="mt-1 text-3xl font-bold tracking-tight text-white">
                {formatNumber(value)}
            </p>
            {/* Decorative glow */}
            <div className={`pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-20 blur-2xl ${color}`} />
        </motion.div>
    );
}

// ─── Main page component ─────────────────────────────────────────────────────
export default function StudioPage() {
    const { data: session, status } = useSession();
    const [selectedTab, setSelectedTab] = useState<"overview" | "videos">("overview");

    if (status === "unauthenticated") redirect("/auth/signin");

    const { data: overview, isLoading: overviewLoading } = api.studio.getOverview.useQuery(
        undefined,
        { enabled: !!session },
    );

    const { data: videoData, isLoading: videosLoading } =
        api.studio.getVideoStats.useQuery(
            { limit: 20 },
            { enabled: !!session && selectedTab === "videos" },
        );

    const utils = api.useUtils();
    const deleteVideoMutation = api.video.deleteVideo?.useMutation?.({
        onSuccess: () => {
            toast.success("Video deleted");
            void utils.studio.invalidate();
        },
        onError: (e) => toast.error(e.message),
    });

    if (!session) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
                <div className="h-12 w-12 animate-spin rounded-full border-2 border-pink-500 border-t-transparent" />
            </div>
        );
    }

    const stats = [
        { icon: Eye, label: "Total Views", value: overview?.totalViews ?? 0, color: "bg-cyan-500/20", delay: 0 },
        { icon: Heart, label: "Total Likes", value: overview?.totalLikes ?? 0, color: "bg-[#FE2C55]/20", delay: 0.05 },
        { icon: MessageCircle, label: "Comments", value: overview?.totalComments ?? 0, color: "bg-violet-500/20", delay: 0.1 },
        { icon: Users, label: "Followers", value: overview?.totalFollowers ?? 0, color: "bg-pink-500/20", delay: 0.15 },
        { icon: PlaySquare, label: "Videos", value: overview?.videoCount ?? 0, color: "bg-amber-500/20", delay: 0.2 },
    ];

    return (
        <main className="min-h-screen bg-[#0a0a0a] text-white">
            {/* Header */}
            <div className="border-b border-white/10 bg-white/5 backdrop-blur-xl">
                <div className="mx-auto max-w-6xl px-4 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Avatar
                                src={session.user.image ?? undefined}
                                fallback={(session.user.name ?? "U").charAt(0).toUpperCase()}
                                size="lg"
                                className="ring-2 ring-pink-500/40"
                            />
                            <div>
                                <h1 className="text-2xl font-bold">Creator Studio</h1>
                                <p className="text-sm text-gray-400">
                                    @{(session.user as { username?: string }).username ?? session.user.name}
                                </p>
                            </div>
                        </div>
                        <Link href="/upload">
                            <Button variant="primary" size="sm">
                                <Upload className="mr-2 h-4 w-4" />
                                Upload Video
                            </Button>
                        </Link>
                    </div>

                    {/* Tabs */}
                    <div className="mt-6 flex gap-1 rounded-xl bg-white/5 p-1">
                        {(["overview", "videos"] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setSelectedTab(tab)}
                                className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium capitalize transition-all ${selectedTab === tab
                                        ? "bg-white/10 text-white"
                                        : "text-gray-400 hover:text-white"
                                    }`}
                            >
                                {tab === "overview" ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <TrendingUp className="h-4 w-4" /> Overview
                                    </span>
                                ) : (
                                    <span className="flex items-center justify-center gap-2">
                                        <BarChart2 className="h-4 w-4" /> My Videos
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-6xl px-4 py-8">
                {/* ── Overview tab ── */}
                {selectedTab === "overview" && (
                    <>
                        {overviewLoading ? (
                            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <div key={i} className="h-36 animate-pulse rounded-2xl bg-white/5" />
                                ))}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
                                {stats.map((s) => (
                                    <StatCard key={s.label} {...s} />
                                ))}
                            </div>
                        )}

                        {/* Tips */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className="mt-8 rounded-2xl border border-pink-500/20 bg-pink-500/5 p-6"
                        >
                            <h2 className="mb-3 text-lg font-semibold text-pink-400">💡 Growth Tips</h2>
                            <ul className="space-y-2 text-sm text-gray-300">
                                <li>• Post consistently — aim for 3-5 videos per week</li>
                                <li>• Engage with comments within the first hour of posting</li>
                                <li>• Use trending sounds and hashtags to reach the FYP</li>
                                <li>• Videos 15-30s long perform best on the For You feed</li>
                            </ul>
                        </motion.div>
                    </>
                )}

                {/* ── Videos tab ── */}
                {selectedTab === "videos" && (
                    <div>
                        {videosLoading ? (
                            <div className="space-y-3">
                                {Array.from({ length: 4 }).map((_, i) => (
                                    <div key={i} className="h-20 animate-pulse rounded-2xl bg-white/5" />
                                ))}
                            </div>
                        ) : !videoData?.videos.length ? (
                            <div className="flex flex-col items-center justify-center py-24 text-center">
                                <PlaySquare className="mb-4 h-16 w-16 text-gray-600" />
                                <h3 className="mb-2 text-xl font-semibold">No videos yet</h3>
                                <p className="mb-6 text-gray-400">Upload your first video to see analytics here.</p>
                                <Link href="/upload">
                                    <Button variant="primary">Upload your first video</Button>
                                </Link>
                            </div>
                        ) : (
                            <div className="overflow-hidden rounded-2xl border border-white/10">
                                {/* Table header */}
                                <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 border-b border-white/10 bg-white/5 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                                    <span>Video</span>
                                    <span className="text-center">Views</span>
                                    <span className="text-center">Likes</span>
                                    <span className="text-center">Comments</span>
                                    <span className="text-center">Saves</span>
                                    <span />
                                </div>

                                {videoData.videos.map((video, i) => (
                                    <motion.div
                                        key={video.id}
                                        initial={{ opacity: 0, x: -16 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.04 }}
                                        className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] items-center gap-4 border-b border-white/5 px-6 py-4 transition-colors hover:bg-white/5"
                                    >
                                        {/* Thumbnail + title */}
                                        <div className="flex items-center gap-3">
                                            <div className="h-14 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-white/10">
                                                {video.thumbnailUrl ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img
                                                        src={video.thumbnailUrl}
                                                        alt={video.title ?? "Video"}
                                                        className="h-full w-full object-cover"
                                                    />
                                                ) : (
                                                    <video
                                                        src={video.filePath}
                                                        className="h-full w-full object-cover"
                                                        muted
                                                    />
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-medium">
                                                    {video.title ?? "Untitled"}
                                                </p>
                                                <p className="text-xs text-gray-400">
                                                    {formatDistanceToNow(new Date(video.createdAt), { addSuffix: true })}
                                                </p>
                                            </div>
                                        </div>

                                        <span className="text-center text-sm font-semibold">
                                            {formatNumber(video._count.views)}
                                        </span>
                                        <span className="text-center text-sm font-semibold text-[#FE2C55]">
                                            {formatNumber(video._count.likes)}
                                        </span>
                                        <span className="text-center text-sm font-semibold text-cyan-400">
                                            {formatNumber(video._count.comments)}
                                        </span>
                                        <span className="text-center text-sm font-semibold text-amber-400">
                                            {formatNumber(video._count.bookmarks)}
                                        </span>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => deleteVideoMutation?.mutate?.({ videoId: video.id })}
                                                className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
                                                title="Delete video"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                            <MoreVertical className="h-4 w-4 text-gray-500" />
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </main>
    );
}
