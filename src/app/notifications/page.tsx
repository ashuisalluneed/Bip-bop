"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { Heart, MessageCircle, UserPlus, Bell, Check, Trash2 } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { api } from "~/trpc/react";
import { useSession } from "next-auth/react";
import { Avatar } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import toast from "react-hot-toast";
import { getPusherClient, userChannel, PUSHER_EVENTS } from "~/lib/pusher";

export default function NotificationsPage() {
  const { data: session } = useSession();
  const utils = api.useUtils();
  const { data: notifications, isLoading } = api.notification.getAll.useQuery();
  const { data: unreadCount } = api.notification.getUnreadCount.useQuery();

  // ─── Pusher: subscribe to this user’s notification channel ───────────────────────
  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;

    const pusher = getPusherClient();
    const channel = pusher.subscribe(userChannel(userId));

    // New notification arrives → refresh notification list + count
    channel.bind(PUSHER_EVENTS.NEW_NOTIFICATION, () => {
      void utils.notification.invalidate();
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(userChannel(userId));
    };
  }, [session?.user?.id, utils]);

  const markAsReadMutation = api.notification.markAsRead.useMutation({
    onSuccess: () => {
      void utils.notification.invalidate();
    },
  });

  const markAllAsReadMutation = api.notification.markAllAsRead.useMutation({
    onSuccess: () => {
      toast.success("All notifications marked as read");
      void utils.notification.invalidate();
    },
  });

  const deleteNotificationMutation = api.notification.deleteNotification.useMutation({
    onSuccess: () => {
      toast.success("Notification deleted");
      void utils.notification.invalidate();
    },
  });

  const handleMarkAsRead = (notificationId: string) => {
    markAsReadMutation.mutate({ notificationId });
  };

  const handleDelete = (notificationId: string) => {
    deleteNotificationMutation.mutate({ notificationId });
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "like":
        return <Heart className="h-5 w-5 text-[#FE2C55]" />;
      case "comment":
        return <MessageCircle className="h-5 w-5 text-cyan-400" />;
      case "follow":
        return <UserPlus className="h-5 w-5 text-pink-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-400" />;
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] pb-20 text-white md:pb-0">
        <div className="mx-auto max-w-3xl px-4 py-8">
          <div className="mb-8">
            <h1 className="mb-2 text-3xl font-bold">Notifications</h1>
            <p className="text-gray-400">Loading...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] pb-20 text-white md:pb-0">
      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="mb-2 text-3xl font-bold">Notifications</h1>
            <p className="text-gray-400">
              {unreadCount ? `${unreadCount} unread` : "All caught up!"}
            </p>
          </div>
          {unreadCount && unreadCount > 0 ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => markAllAsReadMutation.mutate()}
              isLoading={markAllAsReadMutation.isPending}
            >
              <Check className="mr-2 h-4 w-4" />
              Mark all read
            </Button>
          ) : null}
        </div>

        {/* Notifications List */}
        {!notifications || notifications.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white/5">
              <Bell className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="mb-2 text-xl font-semibold">No notifications yet</h3>
            <p className="text-gray-400">
              When someone likes, comments, or follows you, you will see it here
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((notification, index) => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`group relative rounded-2xl border p-4 transition-all hover:border-white/20 ${notification.read
                    ? "border-white/5 bg-white/5"
                    : "border-pink-500/20 bg-pink-500/5"
                  }`}
              >
                <div className="flex items-start gap-4">
                  {/* Actor Avatar */}
                  {notification.actor && (
                    <Link href={`/${notification.actor.username ?? notification.actor.name}`}>
                      <Avatar
                        src={notification.actor.image ?? undefined}
                        fallback={
                          notification.actor.username?.charAt(0).toUpperCase() ??
                          notification.actor.name?.charAt(0).toUpperCase() ??
                          "U"
                        }
                        size="md"
                        className="ring-2 ring-white/10"
                      />
                    </Link>
                  )}

                  {/* Content */}
                  <div className="flex-1">
                    <div className="mb-1 flex items-start gap-2">
                      <div className="flex-shrink-0">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm">
                          {notification.actor && (
                            <Link
                              href={`/${notification.actor.username ?? notification.actor.name}`}
                              className="font-semibold hover:underline"
                            >
                              {notification.actor.name ?? notification.actor.username}
                            </Link>
                          )}{" "}
                          {notification.content}
                        </p>
                        <p className="mt-1 text-xs text-gray-400">
                          {formatDistanceToNow(new Date(notification.createdAt), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Video Thumbnail */}
                  {notification.video && (
                    <Link href={`/?videoId=${notification.video.id}`}>
                      <div className="h-16 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-white/5">
                        <video
                          src={notification.video.filePath}
                          className="h-full w-full object-cover"
                          muted
                        />
                      </div>
                    </Link>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                    {!notification.read && (
                      <button
                        onClick={() => handleMarkAsRead(notification.id)}
                        className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
                        title="Mark as read"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(notification.id)}
                      className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Unread Indicator */}
                {!notification.read && (
                  <div className="absolute left-2 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-pink-500" />
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
