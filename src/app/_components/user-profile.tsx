"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Settings, Share2, MoreHorizontal, Grid, Heart, Bookmark, Lock } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Avatar } from "~/components/ui/avatar";

export interface UserProfileProps {
  user: {
    name: string | null;
    id: string;
    createdAt: Date;
    username: string | null;
    image: string | null;
    videos?: { 
      id: number; 
      title: string | null; 
      filePath: string; 
      createdAt: Date; 
      _count: { comments?: number; likes: number; }; 
    }[];
    _count?: { followers?: number; following?: number; videos?: number; };
    bio?: string | null;
  };
}

export default function UserProfile({ user }: UserProfileProps) {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<'videos' | 'liked' | 'saved'>('videos');
  const isOwnProfile = session?.user?.id === user.id;
  const utils = api.useUtils();

  // Check if following
  const { data: followStatus } = api.follow.isFollowing.useQuery(
    { userId: user.id },
    { enabled: !isOwnProfile }
  );

  // Optimistic local follow state
  const [optimisticFollowing, setOptimisticFollowing] = useState<boolean | null>(null);
  const [optimisticFollowerCount, setOptimisticFollowerCount] = useState(
    user._count?.followers ?? 0
  );

  // Derived follow status: prefer optimistic state, fall back to server
  const isFollowing = optimisticFollowing ?? followStatus?.following ?? false;

  // Follow mutation with optimistic UI
  const toggleFollowMutation = api.follow.toggleFollow.useMutation({
    onMutate: () => {
      const wasFollowing = isFollowing;
      setOptimisticFollowing(!wasFollowing);
      setOptimisticFollowerCount((prev) => prev + (wasFollowing ? -1 : 1));
    },
    onSuccess: () => {
      void utils.follow.isFollowing.invalidate();
      void utils.user.getByUsername.invalidate();
      toast.success(isFollowing ? "Unfollowed" : "Following!");
    },
    onError: (error) => {
      // Roll back on error
      setOptimisticFollowing(followStatus?.following ?? false);
      setOptimisticFollowerCount(user._count?.followers ?? 0);
      toast.error(error.message);
    },
  });

  // Removed unused sendMessageMutation

  const handleFollow = () => {
    if (!session) {
      toast.error("Please sign in to follow users");
      return;
    }
    toggleFollowMutation.mutate({ userId: user.id });
  };

  const handleMessage = () => {
    if (!session) {
      toast.error("Please sign in to send messages");
      return;
    }
    // Navigate to messages with recipient ID
    window.location.href = `/messages?recipientId=${user.id}`;
  };

  const handleShare = async () => {
    const profileUrl = `${window.location.origin}/${user.username ?? user.name}`;
    const shareData = {
      title: `${user.name ?? user.username}'s Profile`,
      text: `Check out @${user.username ?? user.name} on bip bop!`,
      url: profileUrl,
    };

    // Check if Web Share API is supported
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        toast.success('Profile shared successfully!');
      } catch (err) {
        // User cancelled or error occurred
        if ((err as Error).name !== 'AbortError') {
          // Fallback to clipboard
          await navigator.clipboard.writeText(profileUrl);
          toast.success('Profile link copied to clipboard!');
        }
      }
    } else {
      // Fallback to clipboard
      await navigator.clipboard.writeText(profileUrl);
      toast.success('Profile link copied to clipboard!');
    }
  };

  // Fetch liked videos (no args — server derives userId from session)
  const { data: likedVideos } = api.video.getLikedVideos.useQuery(
    undefined,
    { enabled: activeTab === 'liked' && isOwnProfile }
  );

  // Fetch saved videos (no args — server derives userId from session)
  const { data: savedVideos } = api.video.getSavedVideos.useQuery(
    undefined,
    { enabled: activeTab === 'saved' && isOwnProfile }
  );

  const stats = [
    { label: 'Following', value: user._count?.following ?? 0 },
    { label: 'Followers', value: optimisticFollowerCount },
    { label: 'Likes', value: user.videos?.reduce((acc, v) => acc + v._count.likes, 0) ?? 0 },
  ];

  const tabs = [
    { id: 'videos', label: 'Videos', icon: Grid },
    { id: 'liked', label: 'Liked', icon: Heart },
    { id: 'saved', label: 'Saved', icon: Bookmark },
  ];

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white pb-20 md:pb-0">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 mb-6">
            {/* Avatar */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Avatar
                src={user.image ?? undefined}
                fallback={user.username?.charAt(0).toUpperCase() ?? user.name?.charAt(0).toUpperCase() ?? 'U'}
                size="xl"
                className="ring-4 ring-[#7c3aed] shadow-[0_0_20px_rgba(124,58,237,0.6)]"
              />
            </motion.div>

            {/* Info */}
            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-4 mb-4">
                <div>
                  <h1 className="text-3xl font-bold mb-1 text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500">
                    {user.name ?? user.username ?? 'User'}
                  </h1>
                  <p className="text-gray-400">@{user.username ?? 'username'}</p>
                </div>

                <div className="flex items-center gap-2">
                  {isOwnProfile ? (
                    <>
                      <Link href="/settings">
                        <Button variant="secondary" size="md">
                          <Settings className="w-4 h-4 mr-2" />
                          Edit Profile
                        </Button>
                      </Link>
                      <Button variant="secondary" size="md" onClick={handleShare}>
                        <Share2 className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button 
                        variant={isFollowing ? "secondary" : "primary"} 
                        size="md"
                        onClick={handleFollow}
                        isLoading={toggleFollowMutation.isPending}
                      >
                        {isFollowing ? "Following" : "Follow"}
                      </Button>
                      <Button 
                        variant="secondary" 
                        size="md"
                        onClick={handleMessage}
                      >
                        Message
                      </Button>
                      <Button variant="secondary" size="md" onClick={handleShare}>
                        <Share2 className="w-4 h-4" />
                      </Button>
                      <Button variant="secondary" size="md">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center justify-center md:justify-start gap-6 mb-4">
                <Link href={`/${user.username ?? user.name}/followers`}>
                  <button className="flex flex-col items-center hover:opacity-80 transition-opacity">
                    <span className="text-xl font-bold">{stats[0]?.value.toLocaleString()}</span>
                    <span className="text-sm text-gray-400">{stats[0]?.label}</span>
                  </button>
                </Link>
                <Link href={`/${user.username ?? user.name}/followers`}>
                  <button className="flex flex-col items-center hover:opacity-80 transition-opacity">
                    <span className="text-xl font-bold">{stats[1]?.value.toLocaleString()}</span>
                    <span className="text-sm text-gray-400">{stats[1]?.label}</span>
                  </button>
                </Link>
                <Link href={`/${user.username ?? user.name}/likes`}>
                  <button className="flex flex-col items-center hover:opacity-80 transition-opacity">
                    <span className="text-xl font-bold">{stats[2]?.value.toLocaleString()}</span>
                    <span className="text-sm text-gray-400">{stats[2]?.label}</span>
                  </button>
                </Link>
              </div>

              {/* Bio */}
              {user.bio && (
                <p className="text-gray-300 mb-4 max-w-md">
                  {user.bio}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-white/10 mb-6">
          <div className="flex items-center justify-center gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`relative flex items-center gap-2 px-6 py-3 transition-colors ${
                    isActive ? 'text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{tab.label}</span>
                  
                  {isActive && (
                    <motion.div
                      layoutId="activeProfileTab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-pink-500 to-cyan-400"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div>
          {activeTab === 'videos' && (
            <div>
              {user.videos && user.videos.length > 0 ? (
                <div className="grid grid-cols-3 gap-1">
                  {user.videos.map((video) => (
                    <Link key={video.id} href={`/?videoId=${video.id}`}>
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        className="relative aspect-[9/16] bg-white/5 rounded-lg overflow-hidden cursor-pointer group"
                      >
                        <video
                          src={video.filePath}
                          className="w-full h-full object-cover"
                          muted
                          playsInline
                          onMouseEnter={(e) => e.currentTarget.play()}
                          onMouseLeave={(e) => {
                            e.currentTarget.pause();
                            e.currentTarget.currentTime = 0;
                          }}
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="text-center">
                            <Heart className="w-6 h-6 mx-auto mb-1" />
                            <span className="text-sm font-semibold">
                              {video._count.likes.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Grid}
                  title="No videos yet"
                  description="Videos you upload will appear here"
                />
              )}
            </div>
          )}

          {activeTab === 'liked' && (
            <div>
              {!isOwnProfile ? (
                <EmptyState
                  icon={Lock}
                  title="Private content"
                  description="Liked videos are private"
                  isPrivate
                />
              ) : likedVideos?.items && likedVideos.items.length > 0 ? (
                <div className="grid grid-cols-3 gap-1">
                  {likedVideos.items.map((video) => (
                    <Link key={video.id} href={`/?videoId=${video.id}`}>
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        className="relative aspect-[9/16] bg-white/5 rounded-lg overflow-hidden cursor-pointer group"
                      >
                        <video
                          src={video.filePath}
                          className="w-full h-full object-cover"
                          muted
                          playsInline
                          onMouseEnter={(e) => e.currentTarget.play()}
                          onMouseLeave={(e) => {
                            e.currentTarget.pause();
                            e.currentTarget.currentTime = 0;
                          }}
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="text-center">
                            <Heart className="w-6 h-6 mx-auto mb-1 fill-[#FE2C55] text-[#FE2C55]" />
                            <span className="text-sm font-semibold">
                              {video._count.likes.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Heart}
                  title="No liked videos"
                  description="Videos you like will appear here"
                />
              )}
            </div>
          )}

          {activeTab === 'saved' && (
            <div>
              {!isOwnProfile ? (
                <EmptyState
                  icon={Lock}
                  title="Private content"
                  description="Saved videos are private"
                  isPrivate
                />
              ) : savedVideos?.items && savedVideos.items.length > 0 ? (
                <div className="grid grid-cols-3 gap-1">
                  {savedVideos.items.map((video) => (
                    <Link key={video.id} href={`/?videoId=${video.id}`}>
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        className="relative aspect-[9/16] bg-white/5 rounded-lg overflow-hidden cursor-pointer group"
                      >
                        <video
                          src={video.filePath}
                          className="w-full h-full object-cover"
                          muted
                          playsInline
                          onMouseEnter={(e) => e.currentTarget.play()}
                          onMouseLeave={(e) => {
                            e.currentTarget.pause();
                            e.currentTarget.currentTime = 0;
                          }}
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="text-center">
                            <Bookmark className="w-6 h-6 mx-auto mb-1 fill-yellow-500 text-yellow-500" />
                            <span className="text-sm font-semibold">
                              {video._count.likes.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Bookmark}
                  title="No saved videos"
                  description="Videos you save will appear here"
                />
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
  isPrivate = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  isPrivate?: boolean;
}) {
  return (
    <div className="text-center py-16">
      <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
        {isPrivate ? (
          <Lock className="w-10 h-10 text-gray-400" />
        ) : (
          <Icon className="w-10 h-10 text-gray-400" />
        )}
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-400">{description}</p>
      {isPrivate && (
        <p className="text-sm text-gray-500 mt-2">This content is private</p>
      )}
    </div>
  );
}
