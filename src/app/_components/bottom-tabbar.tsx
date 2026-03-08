"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Home, Search, PlusSquare, Bell, MessageCircle, User } from "lucide-react";

export default function BottomTabBar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const tabs = [
    { href: "/", label: "Home", icon: Home },
    { href: "/search", label: "Search", icon: Search },
    { href: "/upload", label: "Upload", icon: PlusSquare },
    { href: "/notifications", label: "Notifications", icon: Bell },
    { href: "/messages", label: "Inbox", icon: MessageCircle },
    { href: session?.user?.name ? `/${session.user.name}` : "/auth/signin", label: "Profile", icon: User },
  ];

  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[96%] max-w-[28rem] bg-black/40 backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] rounded-full px-2 py-2">
      <ul className="flex items-center justify-between px-2">
        {tabs.map((t) => {
          const active = pathname === t.href;
          const Icon = t.icon;

          if (t.label === "Upload") {
            return (
              <li key={t.href} className="relative -mt-8 z-50">
                <div className="absolute inset-0 bg-gradient-to-tr from-[#ec4899] to-[#7c3aed] rounded-full blur-md opacity-60 animate-pulse-glow" />
                <Link
                  href={t.href}
                  className="relative flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-tr from-[#ec4899] to-[#7c3aed] shadow-lg border border-white/30 hover:scale-105 transition-transform"
                >
                  <Icon className="h-7 w-7 text-white" strokeWidth={2.5} />
                </Link>
              </li>
            );
          }

          return (
            <li key={t.href}>
              <Link
                href={t.href}
                className={`flex flex-col items-center gap-1 p-2 transition-all hover:scale-110 ${
                  active ? "text-white glow-pink drop-shadow-md bg-white/10 rounded-full" : "text-white/50 hover:text-white/80"
                }`}
              >
                <Icon className={`h-6 w-6 transition-all ${active ? "fill-white/20" : ""}`} />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}


