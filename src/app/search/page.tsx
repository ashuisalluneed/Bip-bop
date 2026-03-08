"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, TrendingUp, Users, Video, Loader2, Hash } from "lucide-react";
import Link from "next/link";
import { Avatar } from "~/components/ui/avatar";
import { Input } from "~/components/ui/input";
import { formatNumber } from "~/lib/utils";

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "users" | "videos">("all");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce search
  const handleSearch = (value: string) => {
    setSearchQuery(value);
    const timer = setTimeout(() => {
      setDebouncedQuery(value);
    }, 300);
    return () => clearTimeout(timer);
  };

  const { data: searchResults, isLoading } = api.search.search.useQuery(
    {
      query: debouncedQuery,
      type: activeTab,
    },
    {
      enabled: debouncedQuery.length > 0,
    },
  );

  const { data: trendingUsers } = api.search.getTrendingUsers.useQuery({
    limit: 10,
  });

  const { data: trendingVideos } = api.search.getTrendingVideos.useQuery({
    limit: 10,
  });

  const { data: trendingHashtags } = api.hashtag.getTrending.useQuery({ limit: 20 });

  const tabs = [
    { id: "all", label: "All", icon: Search },
    { id: "users", label: "Users", icon: Users },
    { id: "videos", label: "Videos", icon: Video },
  ];

  return (
    <main className="min-h-screen bg-[#0a0a0a] pb-20 text-white md:pb-0">
      <div className="mx-auto max-w-4xl px-4 py-6">
        {/* Search Header */}
        <div className="mb-6">
          <h1 className="mb-4 text-3xl font-bold">Discover</h1>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-white/40" />
            <Input
              type="text"
              placeholder="Search users and videos..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full rounded-full border-white/20 bg-white/10 py-3 pr-4 pl-12 text-white placeholder:text-white/40"
            />
          </div>
        </div>

        {/* Tabs */}
        {searchQuery && (
          <div className="mb-6 flex items-center gap-2 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`relative flex items-center gap-2 rounded-full px-4 py-2 whitespace-nowrap transition-colors ${isActive
                      ? "bg-gradient-to-r from-pink-500 to-cyan-400 text-white"
                      : "bg-white/10 text-white/60 hover:bg-white/20 hover:text-white"
                    }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Search Results */}
        {searchQuery ? (
          <div>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#FE2C55]" />
              </div>
            ) : searchResults ? (
              <div className="space-y-8">
                {/* Users Results */}
                {(activeTab === "all" || activeTab === "users") &&
                  searchResults.users.length > 0 && (
                    <div>
                      <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
                        <Users className="h-5 w-5" />
                        Users
                      </h2>
                      <div className="space-y-3">
                        {searchResults.users.map((user) =>
                          user.username ? (
                            <Link key={user.id} href={`/${user.username}`}>
                              <motion.div
                                whileHover={{ scale: 1.01 }}
                                className="flex items-center gap-4 rounded-xl bg-white/5 p-4 transition-colors hover:bg-white/10"
                              >
                                <Avatar
                                  src={user.image ?? undefined}
                                  fallback={
                                    user.username?.charAt(0).toUpperCase() ??
                                    "U"
                                  }
                                  size="lg"
                                />
                                <div className="min-w-0 flex-1">
                                  <h3 className="truncate font-semibold">
                                    {user.name ?? user.username}
                                  </h3>
                                  <p className="truncate text-sm text-white/60">
                                    @{user.username}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-semibold">
                                    {formatNumber(user._count.followers)}
                                  </p>
                                  <p className="text-xs text-white/60">
                                    Followers
                                  </p>
                                </div>
                              </motion.div>
                            </Link>
                          ) : null,
                        )}
                      </div>
                    </div>
                  )}

                {/* Videos Results */}
                {(activeTab === "all" || activeTab === "videos") &&
                  searchResults.videos.length > 0 && (
                    <div>
                      <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
                        <Video className="h-5 w-5" />
                        Videos
                      </h2>
                      <div className="grid grid-cols-3 gap-2">
                        {searchResults.videos.map((video) => (
                          <Link key={video.id} href={`/?videoId=${video.id}`}>
                            <motion.div
                              whileHover={{ scale: 1.02 }}
                              className="group relative aspect-[9/16] cursor-pointer overflow-hidden rounded-lg bg-white/5"
                            >
                              <video
                                src={video.filePath}
                                className="h-full w-full object-cover"
                                muted
                                playsInline
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                              <div className="absolute right-2 bottom-2 left-2">
                                <p className="mb-1 line-clamp-2 text-xs font-semibold">
                                  {video.title ?? video.description ?? "Video"}
                                </p>
                                <p className="text-xs text-white/60">
                                  {formatNumber(video._count.likes)} likes
                                </p>
                              </div>
                            </motion.div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                {/* No Results */}
                {searchResults.users.length === 0 &&
                  searchResults.videos.length === 0 && (
                    <div className="py-12 text-center">
                      <Search className="mx-auto mb-4 h-16 w-16 text-white/20" />
                      <h3 className="mb-2 text-xl font-semibold">
                        No results found
                      </h3>
                      <p className="text-white/60">
                        Try searching for something else
                      </p>
                    </div>
                  )}
              </div>
            ) : null}
          </div>
        ) : (
          /* Trending Content */
          <div className="space-y-8">
            {/* Trending Hashtags */}
            {trendingHashtags && trendingHashtags.length > 0 && (
              <div>
                <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
                  <Hash className="h-5 w-5 text-pink-500" />
                  Trending Hashtags
                </h2>
                <div className="flex flex-wrap gap-2">
                  {trendingHashtags.map((tag, i) => (
                    <motion.div
                      key={tag.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.03 }}
                    >
                      <button
                        onClick={() => handleSearch(`#${tag.name}`)}
                        className="group flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium transition-all hover:border-pink-500/40 hover:bg-pink-500/10 hover:text-pink-400"
                      >
                        <span className="text-pink-500">#</span>
                        <span>{tag.name}</span>
                        <span className="ml-1 text-xs text-gray-500 group-hover:text-pink-500/60">
                          {formatNumber(tag.videoCount)}
                        </span>
                      </button>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Trending Users */}
            {trendingUsers && trendingUsers.length > 0 && (
              <div>
                <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
                  <TrendingUp className="h-5 w-5 text-[#FE2C55]" />
                  Suggested Accounts
                </h2>
                <div className="space-y-3">
                  {trendingUsers.map((user) =>
                    user.username ? (
                      <Link key={user.id} href={`/${user.username}`}>
                        <motion.div
                          whileHover={{ scale: 1.01 }}
                          className="flex items-center gap-4 rounded-xl bg-white/5 p-4 transition-colors hover:bg-white/10"
                        >
                          <Avatar
                            src={user.image ?? undefined}
                            fallback={
                              user.username?.charAt(0).toUpperCase() ?? "U"
                            }
                            size="lg"
                          />
                          <div className="min-w-0 flex-1">
                            <h3 className="truncate font-semibold">
                              {user.name ?? user.username}
                            </h3>
                            <p className="truncate text-sm text-white/60">
                              @{user.username}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold">
                              {formatNumber(user._count.followers)}
                            </p>
                            <p className="text-xs text-white/60">Followers</p>
                          </div>
                        </motion.div>
                      </Link>
                    ) : null,
                  )}
                </div>
              </div>
            )}

            {/* Trending Videos */}
            {trendingVideos && trendingVideos.length > 0 && (
              <div>
                <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
                  <TrendingUp className="h-5 w-5 text-[#FE2C55]" />
                  Trending Videos
                </h2>
                <div className="grid grid-cols-3 gap-2">
                  {trendingVideos.map((video) => (
                    <Link key={video.id} href={`/?videoId=${video.id}`}>
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        className="group relative aspect-[9/16] cursor-pointer overflow-hidden rounded-lg bg-white/5"
                      >
                        <video
                          src={video.filePath}
                          className="h-full w-full object-cover"
                          muted
                          playsInline
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                        <div className="absolute right-2 bottom-2 left-2">
                          <p className="mb-1 line-clamp-2 text-xs font-semibold">
                            {video.title ?? video.description ?? "Video"}
                          </p>
                          <p className="text-xs text-white/60">
                            {formatNumber(video._count.likes)} likes
                          </p>
                        </div>
                      </motion.div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
