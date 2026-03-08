"use client";

import { cn } from "~/lib/utils";

interface ShinyTextProps {
  text: string;
  disabled?: boolean;
  speed?: number;
  className?: string;
}

export default function ShinyText({
  text,
  disabled = false,
  speed = 3,
  className,
}: ShinyTextProps) {
  const animationDuration = `${speed}s`;

  return (
    <div
      className={cn(
        "text-transparent bg-clip-text inline-block bg-no-repeat",
        !disabled && "animate-shine",
        className
      )}
      style={{
        backgroundImage: "linear-gradient(120deg, rgba(255, 255, 255, 0) 40%, rgba(255, 255, 255, 0.8) 50%, rgba(255, 255, 255, 0) 60%)",
        backgroundSize: "200% 100%",
        WebkitBackgroundClip: "text",
        animationDuration: animationDuration,
        color: "rgba(255, 255, 255, 0.6)", // Fallback color
      }}
    >
      {text}
    </div>
  );
}
