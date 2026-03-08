"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Comments from './comments';
import { api } from "~/trpc/react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { Heart, MessageCircle, Share2, Bookmark, Volume2, VolumeX, Play, Eye } from "lucide-react";
import { cn, formatNumber } from "~/lib/utils";
import { Avatar } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import VideoOptionsMenu from "./video-options-menu";
import ShinyText from "~/components/ui/shiny-text";

interface VideoCardProps {
  id: number;
  videoUrl: string;
  thumbnailUrl?: string;
  username: string;
  userId: string;
  description: string;
  likesCount?: number;
  commentsCount?: number;
  viewsCount?: number;
  isLiked?: boolean;
  isBookmarked?: boolean;
  isActive?: boolean;
}

export default function VideoCard({
  id,
  videoUrl,
  thumbnailUrl,
  username,
  userId,
  description,
  likesCount = 0,
  commentsCount = 0,
  viewsCount = 0,
  isLiked = false,
  isBookmarked = false,
  isActive = false,
}: VideoCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { data: session } = useSession();
  const [liked, setLiked] = useState(isLiked);
  const [likes, setLikes] = useState(likesCount);
  const [bookmarked, setBookmarked] = useState(isBookmarked);
  const [comments, setComments] = useState(commentsCount);
  const [views, setViews] = useState(viewsCount);
  const [following, setFollowing] = useState(false);
  const viewRecordedRef = useRef(false);
  const [showComments, setShowComments] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  const toggleLikeMutation = api.video.toggleLike.useMutation({
    onSuccess: (data) => {
      setLiked(data.liked);
      setLikes(prev => data.liked ? prev + 1 : prev - 1);
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    }
  });

  const toggleBookmarkMutation = api.video.toggleBookmark.useMutation({
    onSuccess: (data) => {
      setBookmarked(data.bookmarked);
      toast.success(data.bookmarked ? "Video saved!" : "Video removed from saved");
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    }
  });

  const toggleFollowMutation = api.follow.toggleFollow.useMutation({
    onSuccess: (data) => {
      setFollowing(data.following);
      toast.success(data.following ? `Following @${username}` : `Unfollowed @${username}`);
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    }
  });

  const recordViewMutation = api.video.recordView.useMutation({
    onSuccess: () => setViews(v => v + 1),
  });

  // Check if following
  const { data: followData } = api.follow.isFollowing.useQuery(
    { userId },
    { enabled: !!session && userId !== session.user.id }
  );

  useEffect(() => {
    if (followData) {
      setFollowing(followData.following);
    }
  }, [followData]);

  // Handle video playback based on active state
  useEffect(() => {
    if (videoRef.current) {
      if (isActive) {
        videoRef.current.play().catch(() => console.error("Video play error"));
        setIsPlaying(true);

        // Record view after 2s of active playback (prevents swipe-through inflation)
        const timer = setTimeout(() => {
          if (!viewRecordedRef.current) {
            viewRecordedRef.current = true;
            recordViewMutation.mutate({ videoId: id });
          }
        }, 2000);

        return () => clearTimeout(timer);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
        viewRecordedRef.current = false; // reset so re-watch counts again
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, id]);



  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: 'Check out this video on bip bop!',
        url: window.location.href,
      });
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

  const handleLike = () => {
    if (!session) {
      toast.error("You must be signed in to like videos");
      return;
    }
    toggleLikeMutation.mutate({ videoId: id });
  };

  const handleComment = () => {
    if (!session) {
      toast.error("You must be signed in to comment");
      return;
    }
    setShowComments(!showComments);
  };

  const handleBookmark = () => {
    if (!session) {
      toast.error("You must be signed in to save videos");
      return;
    }
    toggleBookmarkMutation.mutate({ videoId: id });
  };

  const handleFollow = () => {
    if (!session) {
      toast.error("You must be signed in to follow users");
      return;
    }
    if (userId === session.user.id) {
      toast.error("You cannot follow yourself");
      return;
    }
    toggleFollowMutation.mutate({ userId });
  };

  // Double tap to like
  const [lastTap, setLastTap] = useState(0);
  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTap < 300) { // 300ms between taps
      if (!liked) {
        handleLike();
      }
    }
    setLastTap(now);
  };

  return (
    <div className="relative h-full w-full bg-black overflow-hidden">
      {/* Video */}
      <div className="absolute inset-0 z-0">
        <video
          ref={videoRef}
          src={videoUrl}
          poster={thumbnailUrl}
          className="h-full w-full object-cover"
          loop
          playsInline
          muted={isMuted}
          onClick={handleDoubleTap}
        />

        {/* Double tap heart animation */}
        <AnimatePresence>
          {!isPlaying && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.6, repeat: Infinity }}
                className="rounded-full bg-black/30 backdrop-blur-sm p-6"
              >
                <Play className="h-16 w-16 text-white fill-white" />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Top gradient overlay */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/60 to-transparent z-10 pointer-events-none" />

      {/* Full screen gradient overlay for consistent contrast */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/80 z-10 pointer-events-none" />

      {/* User info and description */}
      <div className="absolute bottom-20 left-4 right-20 z-20 text-white">
        <div className="flex items-center gap-3 mb-3">
          <motion.div 
            whileHover={{ scale: 1.1 }}
            className="rounded-full border-2 border-[#7c3aed] shadow-[0_0_10px_rgba(124,58,237,0.5)] p-[2px]"
          >
            <Avatar
              fallback={username.charAt(0).toUpperCase()}
              size="lg"
            />
          </motion.div>
          <div className="flex-1">
            <ShinyText text={`@${username}`} className="text-lg font-bold drop-shadow-md" speed={3} />
          </div>
          {session && userId !== session.user.id && (
            <Button
              variant={following ? "secondary" : "primary"}
              size="sm"
              onClick={handleFollow}
              disabled={toggleFollowMutation.isPending}
              className="px-3 py-1 rounded-full bg-transparent border border-white/30 text-white text-xs font-semibold backdrop-blur-md hover:bg-white/10"
            >
              {following ? "Following" : "Follow"}
            </Button>
          )}
        </div>

        {description && (
          <p className="text-sm leading-relaxed mb-3 drop-shadow-md line-clamp-2">{description}</p>
        )}

        <div className="flex items-center gap-2 mt-3 bg-white/10 w-fit px-3 py-1.5 rounded-full backdrop-blur-md border border-white/20 shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
          <span className="text-white text-xs opacity-80 animate-bounce">♫</span>
          <ShinyText text={`Original sound - ${username}`} className="text-xs font-medium truncate w-48 drop-shadow-md" />
        </div>
      </div>

      {/* Action buttons sidebar */}
      <div className="absolute right-3 bottom-24 z-20 flex flex-col gap-6">
        {/* Like button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleLike}
          disabled={toggleLikeMutation.isPending}
          className="flex flex-col items-center gap-1 group"
        >
          <motion.div
            animate={liked ? { scale: [1, 1.3, 1] } : {}}
            transition={{ duration: 0.3 }}
            className="relative"
          >
            <div className={cn(
              "flex items-center justify-center rounded-full p-3 backdrop-blur-md border shadow-[0_4px_30px_rgba(0,0,0,0.1)] transition-all",
              liked ? "bg-[#ec4899]/20 border-[#ec4899]/50 shadow-[0_0_15px_rgba(236,72,153,0.3)]" : "bg-white/10 border-white/20 group-hover:bg-white/20 group-hover:border-white/40"
            )}>
              <Heart
                className={cn(
                  "h-7 w-7 transition-all",
                  liked ? "fill-[#ec4899] text-[#ec4899]" : "text-white"
                )}
              />
            </div>
          </motion.div>
          <span className="text-white text-xs font-bold drop-shadow-md">
            {formatNumber(likes)}
          </span>
        </motion.button>

        {/* Comment button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleComment}
          className="flex flex-col items-center gap-1 group"
        >
          <div className="flex items-center justify-center rounded-full p-3 bg-white/10 backdrop-blur-md border border-white/20 shadow-[0_4px_30px_rgba(0,0,0,0.1)] group-hover:bg-white/20 group-hover:border-white/40 transition-all">
            <MessageCircle className="h-7 w-7 text-white" />
          </div>
          <span className="text-white text-xs font-bold drop-shadow-md">
            {formatNumber(comments)}
          </span>
        </motion.button>

        {/* Views */}
        <div className="flex flex-col items-center gap-1 group">
          <div className="flex items-center justify-center rounded-full p-3 bg-white/10 backdrop-blur-md border border-white/20 shadow-[0_4px_30px_rgba(0,0,0,0.1)] group-hover:bg-white/20 group-hover:border-white/40 transition-all">
            <Eye className="h-7 w-7 text-white" />
          </div>
          <span className="text-white text-xs font-bold drop-shadow-md">
            {formatNumber(views)}
          </span>
        </div>

        {/* Bookmark button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleBookmark}
          disabled={toggleBookmarkMutation.isPending}
          className="flex flex-col items-center gap-1 group"
        >
          <motion.div
            animate={bookmarked ? { scale: [1, 1.3, 1] } : {}}
            transition={{ duration: 0.3 }}
          >
            <div className={cn(
              "flex items-center justify-center rounded-full p-3 backdrop-blur-md border shadow-[0_4px_30px_rgba(0,0,0,0.1)] transition-all",
              bookmarked ? "bg-yellow-500/20 border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.3)]" : "bg-white/10 border-white/20 group-hover:bg-white/20 group-hover:border-white/40"
            )}>
              <Bookmark
                className={cn(
                  "h-7 w-7 transition-all",
                  bookmarked ? "fill-yellow-500 text-yellow-500" : "text-white"
                )}
              />
            </div>
          </motion.div>
        </motion.button>

        {/* Share button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleShare}
          className="flex flex-col items-center gap-1 group"
        >
          <div className="flex items-center justify-center rounded-full p-3 bg-white/10 backdrop-blur-md border border-white/20 shadow-[0_4px_30px_rgba(0,0,0,0.1)] group-hover:bg-white/20 group-hover:border-white/40 transition-all">
            <Share2 className="h-7 w-7 text-white" />
          </div>
        </motion.button>

        {/* More options */}
        <VideoOptionsMenu
          videoId={id}
          videoUrl={videoUrl}
          userId={userId}
          username={username}
        />

        {/* Rotating disc avatar */}
        <motion.div
          animate={{ rotate: isPlaying ? 360 : 0 }}
          transition={{ duration: 3, repeat: isPlaying ? Infinity : 0, ease: "linear" }}
          className="mt-2"
        >
          <Avatar
            fallback={username.charAt(0).toUpperCase()}
            size="lg"
          />
        </motion.div>
      </div>

      {/* Volume control */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsMuted(m => !m)}
        className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/30 backdrop-blur-sm"
      >
        {isMuted ? (
          <VolumeX className="h-5 w-5 text-white" />
        ) : (
          <Volume2 className="h-5 w-5 text-white" />
        )}
      </motion.button>

      {/* Comments drawer */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="absolute inset-0 z-30 bg-black/95 backdrop-blur-xl"
          >
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h3 className="text-white font-semibold text-lg">Comments</h3>
                <button
                  type="button"
                  onClick={() => setShowComments(false)}
                  className="text-white/70 hover:text-white transition-colors"
                  aria-label="Close comments"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <Comments
                  videoId={id}
                  onCommentAdded={() => setComments(prev => prev + 1)}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
