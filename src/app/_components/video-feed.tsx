
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useInView } from "react-intersection-observer";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "~/trpc/react";
import VideoCard from "./video-card";
import { ChevronUp, ChevronDown, Loader2 } from "lucide-react";
import { Skeleton } from "~/components/ui/skeleton";

/**
 * A client-side component that displays a TikTok-like vertical-scrolling feed of videos.
 * It fetches video data using a tRPC infinite query and renders individual video cards.
 */
export default function VideoFeed() {
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const { data, fetchNextPage, hasNextPage, isLoading, isError } = api.video.getFeed.useInfiniteQuery(
    {
      limit: 5,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );

  const { ref, inView } = useInView({
    threshold: 0.5,
  });

  // Flatten video data from all pages
  const videos = data?.pages.flatMap(page => page.items) ?? [];

  useEffect(() => {
    if (inView && hasNextPage) {
      void fetchNextPage();
    }
  }, [inView, hasNextPage, fetchNextPage]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [isScrolling, setIsScrolling] = useState(false);

  // Handle scroll navigation
  const scrollToVideo = useCallback((index: number) => {
    if (containerRef.current) {
      const videoHeight = window.innerHeight;
      containerRef.current.scrollTo({
        top: index * videoHeight,
        behavior: 'smooth'
      });
    }
  }, []);

  // Handle wheel/scroll events
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let scrollTimeout: NodeJS.Timeout;
    const handleScroll = () => {
      setIsScrolling(true);
      clearTimeout(scrollTimeout);

      scrollTimeout = setTimeout(() => {
        setIsScrolling(false);
        const scrollTop = container.scrollTop;
        const videoHeight = window.innerHeight;
        const newIndex = Math.round(scrollTop / videoHeight);

        if (newIndex !== activeVideoIndex && newIndex >= 0 && newIndex < videos.length) {
          setActiveVideoIndex(newIndex);
          scrollToVideo(newIndex);
        }
      }, 150);
    };

    container.addEventListener('scroll', handleScroll);
    return () => {
      container.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [activeVideoIndex, videos.length, scrollToVideo]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' && activeVideoIndex < videos.length - 1) {
        setActiveVideoIndex(prev => prev + 1);
        scrollToVideo(activeVideoIndex + 1);
      } else if (e.key === 'ArrowUp' && activeVideoIndex > 0) {
        setActiveVideoIndex(prev => prev - 1);
        scrollToVideo(activeVideoIndex - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeVideoIndex, videos.length, scrollToVideo]);

  if (isLoading) {
    return (
      <div className="h-screen w-full bg-black">
        <div className="relative h-full w-full">
          {/* Skeleton video card */}
          <div className="absolute inset-0">
            <Skeleton className="h-full w-full" />

            {/* Skeleton user info */}
            <div className="absolute bottom-20 left-4 right-20 space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-8 w-20 ml-auto" />
              </div>
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>

            {/* Skeleton action buttons */}
            <div className="absolute right-3 bottom-24 space-y-6">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <Skeleton className="h-3 w-8" />
                </div>
              ))}
            </div>
          </div>

          {/* Loading indicator */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-[#FE2C55] animate-spin mx-auto" />
              <p className="text-white/60 mt-4 text-sm">Loading videos...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-black">
        <div className="text-center">
          <p className="text-red-500 text-xl mb-2">Oops! Something went wrong</p>
          <p className="text-white/60 text-sm">Unable to load videos</p>
        </div>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a]">
        <div className="text-center px-6 max-w-2xl">
          {/* Animated Icon */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="mb-8 inline-block"
          >
            <div className="relative">
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-cyan-400 rounded-3xl blur-3xl opacity-20 animate-pulse-glow" />

              {/* Icon container */}
              <div className="relative bg-gradient-to-br from-pink-500/10 to-cyan-400/10 p-12 rounded-3xl border border-white/10">
                <svg
                  className="w-24 h-24 text-white/80"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </div>
            </div>
          </motion.div>

          {/* Text Content */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              No videos yet
            </h1>
            <p className="text-lg text-gray-400 mb-10 max-w-md mx-auto">
              Be the first to share your creativity with the world. Upload your first video and start your journey!
            </p>

            {/* CTA Button */}
            <Link href="/upload">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="group relative inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-pink-500 to-cyan-400 rounded-xl font-semibold text-white text-lg shadow-2xl shadow-pink-500/20 hover:shadow-pink-500/40 transition-all"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Upload Your First Video</span>
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </motion.button>
            </Link>
          </motion.div>

          {/* Feature Cards */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {[
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                ),
                title: "Create",
                description: "Share your unique perspective"
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                ),
                title: "Connect",
                description: "Build your community"
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                ),
                title: "Inspire",
                description: "Make an impact"
              }
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 + i * 0.1, duration: 0.5 }}
                className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500/20 to-cyan-400/20 flex items-center justify-center mb-4 text-white group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-400">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full bg-black overflow-hidden">
      {/* Video container with snap scrolling */}
      <div
        ref={containerRef}
        className="h-full w-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
      >
        {videos.map((video, index) => (
          <div
            key={video.id}
            className="h-screen w-full snap-start snap-always"
          >
            <VideoCard
              id={video.id}
              videoUrl={video.filePath}
              thumbnailUrl={video.thumbnailUrl ?? undefined}
              username={video.user.username ?? video.user.name ?? 'Anonymous'}
              userId={video.user.id}
              description={video.description ?? video.title ?? ''}
              likesCount={video._count.likes}
              commentsCount={video._count.comments}
              viewsCount={video.viewCount}
              isLiked={video.userHasLiked}
              isBookmarked={video.userHasBookmarked}
              isActive={index === activeVideoIndex}
            />
          </div>
        ))}

        {/* Loading more indicator */}
        {hasNextPage && (
          <div ref={ref} className="h-20 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-white/50 animate-spin" />
          </div>
        )}
      </div>


    </div>
  );
}
