"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Home, Compass, Plus, MessageSquare, User, BarChart2 } from "lucide-react";
import { cn } from "~/lib/utils";

export default function Navbar() {
  const { status, data: session } = useSession();
  const pathname = usePathname();

  const navItems = [
    { icon: Home, label: "For You", href: "/" },
    { icon: Compass, label: "Discover", href: "/search" },
    { icon: MessageSquare, label: "Messages", href: "/messages" },
    ...(session ? [{ icon: BarChart2, label: "Studio", href: "/studio" }] : []),
  ];

  return (
    <header className="fixed top-0 right-0 left-0 z-50 border-b border-white/5 bg-black/80 backdrop-blur-2xl">
      <div className="mx-auto max-w-screen-2xl">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link href="/" className="group flex items-center gap-3">
            <div className="relative">
              <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-pink-500 to-cyan-400 opacity-25 blur transition duration-200 group-hover:opacity-50" />
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-cyan-400">
                {/* Custom BB Logo */}
                <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7 3h4a4 4 0 014 4 4 4 0 01-1.5 3.1A4 4 0 0115 14a4 4 0 01-4 4H7V3zm4 7a2 2 0 100-4H9v4h2zm0 6a2 2 0 100-4H9v4h2z" />
                  <circle cx="18" cy="18" r="3" opacity="0.8" />
                </svg>
              </div>
            </div>
            <span className="text-xl font-bold tracking-tight">
              bip<span className="gradient-text">bop</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group relative"
                >
                  <motion.div
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-4 py-2 transition-all duration-200",
                      isActive
                        ? "bg-white/10 text-white"
                        : "text-gray-400 hover:bg-white/5 hover:text-white",
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </motion.div>

                  {isActive && (
                    <motion.div
                      layoutId="navbar-indicator"
                      className="absolute right-0 -bottom-[17px] left-0 h-0.5 bg-gradient-to-r from-pink-500 to-cyan-400"
                      transition={{
                        type: "spring",
                        stiffness: 380,
                        damping: 30,
                      }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Upload Button */}
            <Link href="/upload">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-pink-500 to-cyan-400 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-pink-500/25 transition-shadow hover:shadow-pink-500/40"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Upload</span>
              </motion.button>
            </Link>

            {/* User Menu */}
            {status === "authenticated" ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="hidden px-3 py-2 text-sm text-gray-400 transition-colors hover:text-white lg:block"
                >
                  Sign out
                </button>
                <Link href={`/${session.user?.username ?? "profile"}`}>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="h-9 w-9 rounded-full bg-gradient-to-br from-pink-500 to-cyan-400 p-0.5"
                  >
                    <div className="flex h-full w-full items-center justify-center rounded-full bg-black text-sm font-bold">
                      {session.user?.name?.charAt(0)?.toUpperCase() ?? "U"}
                    </div>
                  </motion.div>
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/auth/signin"
                  className="px-4 py-2 text-sm font-medium text-gray-400 transition-colors hover:text-white"
                >
                  Log in
                </Link>
                <Link
                  href="/auth/signup"
                  className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-gray-100"
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="pb-safe fixed right-0 bottom-0 left-0 z-50 border-t border-white/5 bg-black/95 backdrop-blur-2xl md:hidden">
        <div className="flex items-center justify-around px-2 py-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-1 px-4 py-2"
              >
                <Icon
                  className={cn(
                    "h-6 w-6 transition-colors",
                    isActive ? "text-white" : "text-gray-500",
                  )}
                />
                <span
                  className={cn(
                    "text-xs font-medium transition-colors",
                    isActive ? "text-white" : "text-gray-500",
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}

          <Link
            href={
              session?.user
                ? `/${session.user.username ?? "profile"}`
                : "/auth/signin"
            }
            className="flex flex-col items-center gap-1 px-4 py-2"
          >
            <User
              className={cn(
                "h-6 w-6 transition-colors",
                pathname.includes("profile") ? "text-white" : "text-gray-500",
              )}
            />
            <span
              className={cn(
                "text-xs font-medium transition-colors",
                pathname.includes("profile") ? "text-white" : "text-gray-500",
              )}
            >
              Profile
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}
