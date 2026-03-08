"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Scissors,
  Type,
  Music,
  Sparkles,
  Palette,
  ArrowLeft,
  ArrowRight,
  Filter,
} from "lucide-react";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { api } from "~/trpc/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface VideoEditorProps {
  videoFile: File;
  onBack: () => void;
  onNext: () => void;
}

export default function VideoEditor({
  videoFile,
  onBack,
  onNext,
}: VideoEditorProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);

  // Editor states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTab, setSelectedTab] = useState<
    "text" | "music" | "effects" | "filters"
  >("text");

  // API mutation
  const createVideoMutation = api.video.create.useMutation({
    onSuccess: () => {
      toast.success("Video published successfully!");
      onNext();
      router.push("/");
    },
    onError: (error) => {
      toast.error(`Failed to publish: ${error.message}`);
      setIsUploading(false);
    },
  });

  // Text overlay
  const [textOverlay, setTextOverlay] = useState("");
  const [textColor, setTextColor] = useState("#ffffff");
  const [textPosition, setTextPosition] = useState<"top" | "center" | "bottom">(
    "center",
  );

  // Filters
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);

  useEffect(() => {
    const url = URL.createObjectURL(videoFile);
    setVideoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [videoFile]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        void videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const editorTabs = [
    { id: "text", label: "Text", icon: Type },
    { id: "music", label: "Music", icon: Music },
    { id: "effects", label: "Effects", icon: Sparkles },
    { id: "filters", label: "Filters", icon: Filter },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Video Preview */}
        <div className="lg:col-span-2">
          <div className="overflow-hidden rounded-2xl bg-black">
            {/* Video Container */}
            <div className="relative mx-auto aspect-[9/16] max-h-[70vh] bg-black">
              {videoUrl && (
                <video
                  ref={videoRef}
                  src={videoUrl}
                  className="h-full w-full object-contain"
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  muted={isMuted}
                  style={{
                    filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`,
                  }}
                />
              )}

              {/* Text Overlay */}
              {textOverlay && (
                <div
                  className={`absolute right-0 left-0 px-4 ${
                    textPosition === "top"
                      ? "top-8"
                      : textPosition === "center"
                        ? "top-1/2 -translate-y-1/2"
                        : "bottom-8"
                  }`}
                >
                  <p
                    className="text-center text-2xl font-bold"
                    style={{
                      color: textColor,
                      textShadow: "2px 2px 4px rgba(0,0,0,0.8)",
                    }}
                  >
                    {textOverlay}
                  </p>
                </div>
              )}

              {/* Play/Pause Overlay */}
              <div
                className="absolute inset-0 flex cursor-pointer items-center justify-center"
                onClick={togglePlay}
              >
                {!isPlaying && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="flex h-20 w-20 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm"
                  >
                    <Play className="ml-1 h-10 w-10 text-white" />
                  </motion.div>
                )}
              </div>
            </div>

            {/* Video Controls */}
            <div className="bg-black/50 p-4">
              {/* Progress Bar */}
              <div className="mb-4">
                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  value={currentTime}
                  onChange={(e) => {
                    if (videoRef.current) {
                      videoRef.current.currentTime = Number(e.target.value);
                    }
                  }}
                  className="h-1 w-full cursor-pointer appearance-none rounded-lg bg-white/20"
                  style={{
                    background: `linear-gradient(to right, #ec4899 0%, #ec4899 ${(currentTime / duration) * 100}%, rgba(255,255,255,0.2) ${(currentTime / duration) * 100}%, rgba(255,255,255,0.2) 100%)`,
                  }}
                />
                <div className="mt-1 flex justify-between text-xs text-gray-400">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Control Buttons */}
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={togglePlay}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
                >
                  {isPlaying ? (
                    <Pause className="h-5 w-5" />
                  ) : (
                    <Play className="ml-0.5 h-5 w-5" />
                  )}
                </button>
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
                >
                  {isMuted ? (
                    <VolumeX className="h-5 w-5" />
                  ) : (
                    <Volume2 className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Editor Panel */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h3 className="mb-6 text-xl font-bold">Customize Video</h3>

            {/* Basic Info */}
            <div className="mb-6 space-y-4">
              <Input
                label="Title"
                placeholder="Give your video a catchy title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Description
                </label>
                <textarea
                  placeholder="Tell viewers about your video..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="h-24 w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white placeholder:text-white/40 focus:ring-2 focus:ring-pink-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Editor Tabs */}
            <div className="mb-6 flex gap-2 overflow-x-auto">
              {editorTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setSelectedTab(tab.id as typeof selectedTab)}
                    className={`flex items-center gap-2 rounded-lg px-4 py-2 whitespace-nowrap transition-all ${
                      selectedTab === tab.id
                        ? "bg-gradient-to-r from-pink-500 to-cyan-400 text-white"
                        : "bg-white/5 text-gray-400 hover:bg-white/10"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-sm font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab Content */}
            <div className="space-y-4">
              {selectedTab === "text" && (
                <div className="space-y-4">
                  <Input
                    label="Text Overlay"
                    placeholder="Add text to your video"
                    value={textOverlay}
                    onChange={(e) => setTextOverlay(e.target.value)}
                  />
                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Text Color
                    </label>
                    <input
                      type="color"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="h-10 w-full cursor-pointer rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Position
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["top", "center", "bottom"] as const).map((pos) => (
                        <button
                          key={pos}
                          onClick={() => setTextPosition(pos)}
                          className={`rounded-lg px-4 py-2 capitalize transition-all ${
                            textPosition === pos
                              ? "bg-pink-500 text-white"
                              : "bg-white/5 text-gray-400 hover:bg-white/10"
                          }`}
                        >
                          {pos}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {selectedTab === "music" && (
                <div className="py-8 text-center">
                  <Music className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                  <p className="mb-4 text-gray-400">Add music to your video</p>
                  <button className="rounded-lg bg-white/10 px-6 py-2 transition-colors hover:bg-white/20">
                    Browse Music Library
                  </button>
                </div>
              )}

              {selectedTab === "effects" && (
                <div className="py-8 text-center">
                  <Sparkles className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                  <p className="mb-4 text-gray-400">
                    Apply effects to your video
                  </p>
                  <button className="rounded-lg bg-white/10 px-6 py-2 transition-colors hover:bg-white/20">
                    Browse Effects
                  </button>
                </div>
              )}

              {selectedTab === "filters" && (
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Brightness
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="200"
                      value={brightness}
                      onChange={(e) => setBrightness(Number(e.target.value))}
                      className="w-full"
                    />
                    <span className="text-xs text-gray-400">{brightness}%</span>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Contrast
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="200"
                      value={contrast}
                      onChange={(e) => setContrast(Number(e.target.value))}
                      className="w-full"
                    />
                    <span className="text-xs text-gray-400">{contrast}%</span>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Saturation
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="200"
                      value={saturation}
                      onChange={(e) => setSaturation(Number(e.target.value))}
                      className="w-full"
                    />
                    <span className="text-xs text-gray-400">{saturation}%</span>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex gap-3">
              <Button
                variant="secondary"
                onClick={onBack}
                className="flex-1"
                disabled={isUploading}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                variant="primary"
                onClick={async () => {
                  if (!title.trim()) {
                    toast.error("Please add a title");
                    return;
                  }

                  setIsUploading(true);

                  // Upload video file first
                  const formData = new FormData();
                  formData.append("file", videoFile);

                  try {
                    const uploadResponse = await fetch("/api/upload", {
                      method: "POST",
                      body: formData,
                    });

                    if (!uploadResponse.ok) {
                      throw new Error("Upload failed");
                    }

                    const { filePath } = (await uploadResponse.json()) as {
                      filePath: string;
                    };

                    // Create video record
                    createVideoMutation.mutate({
                      title: title.trim(),
                      description: description.trim() || undefined,
                      filePath,
                      fileSize: videoFile.size,
                    });
                  } catch (error) {
                    toast.error("Failed to upload video");
                    setIsUploading(false);
                  }
                }}
                className="flex-1"
                isLoading={isUploading}
                disabled={isUploading || !title.trim()}
              >
                {isUploading ? "Publishing..." : "Publish"}
                {!isUploading && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
