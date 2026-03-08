"use client";

import { use } from "react";
import { motion } from "framer-motion";
import { Heart, MessageCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { api } from "~/trpc/react";
import { Avatar } from "~/components/ui/avatar";

type Props = {
  params: Promise<{
    username: string;
  }>;
};

export default function LikesPage({ params }: Props) {
  const { username } = use(params);

  const { data: user } = api.user.getByUsername.useQuery({ username });
  const { data: videos } = api.user.getLikesBreakdown.useQuery(
    { userId: user?.id ?? "" },
    { enabled: !!user?.id }
  );

  const totalLikes = videos?.reduce((acc, video) => acc + video._count.likes, 0) ?? 0;

  return (
    <main className="min-h-screen bg-[#0a0a0a] pb-20 text-white md:pb-0">
      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/${username}`}
            className="mb-4 inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to profile
          </Link>
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-cyan-400">
              <Heart className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="mb-1 text-3xl font-bold">Likes Breakdown</h1>
              <p className="text-gray-400">
                {totalLikes.toLocaleString()} total likes across {videos?.length ?? 0} videos
              </p>
            </div>
          </div>
        </div>

        {/* Videos List */}
        {!videos || videos.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white/5">
              <Heart className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="mb-2 text-xl font-semibold">No videos yet</h3>
            <p className="text-gray-400">Upload videos to see likes breakdown</p>
          </div>
        ) : (
          <div className="space-y-6">
            {videos.map((video, index) => (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="rounded-2xl border border-white/10 bg-white/5 p-6"
              >
                <div className="mb-4 flex items-start gap-4">
                  {/* Video Thumbnail */}
                  <Link href={`/?videoId=${video.id}`}>
                    <div className="h-32 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-white/5">
                      <video
                        src={video.filePath}
                        className="h-full w-full object-cover"
                        muted
                      />
                    </div>
                  </Link>

                  {/* Video Info */}
                  <div className="flex-1">
                    <Link href={`/?videoId=${video.id}`}>
                      <h3 className="mb-2 text-lg font-semibold hover:underline">
                        {video.title ?? "Untitled Video"}
                      </h3>
                    </Link>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <div className="flex items-center gap-1">
                        <Heart className="h-4 w-4 text-[#FE2C55]" />
                        <span>{video._count.likes.toLocaleString()} likes</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageCircle className="h-4 w-4 text-cyan-400" />
                        <span>{video._count.comments.toLocaleString()} comments</span>
                      </div>
                      <span>
                        {formatDistanceToNow(new Date(video.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>

                  {/* Like Percentage */}
                  <div className="text-right">
                    <div className="mb-1 text-2xl font-bold text-pink-500">
                      {totalLikes > 0
                        ? Math.round((video._count.likes / totalLikes) * 100)
                        : 0}
                      %
                    </div>
                    <div className="text-xs text-gray-400">of total likes</div>
                  </div>
                </div>

                {/* Recent Likers */}
                {video.likes.length > 0 && (
                  <div className="border-t border-white/10 pt-4">
                    <h4 className="mb-3 text-sm font-medium text-gray-400">Recent likes</h4>
                    <div className="flex flex-wrap gap-3">
                      {video.likes.map((like) => (
                        <Link
                          key={like.user.id}
                          href={`/${like.user.username ?? like.user.name}`}
                          className="group flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 transition-all hover:border-white/20"
                        >
                          <Avatar
                            src={like.user.image ?? undefined}
                            fallback={
                              like.user.username?.charAt(0).toUpperCase() ??
                              like.user.name?.charAt(0).toUpperCase() ??
                              "U"
                            }
                            size="sm"
                          />
                          <span className="text-sm group-hover:underline">
                            {like.user.name ?? like.user.username}
                          </span>
                        </Link>
                      ))}
                      {video._count.likes > 10 && (
                        <div className="flex items-center rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-400">
                          +{video._count.likes - 10} more
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
