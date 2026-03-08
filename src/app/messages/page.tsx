"use client";

import { useState, useEffect, useRef, useCallback, Suspense, useMemo } from "react";
import { api } from "~/trpc/react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Send, ArrowLeft, Loader2, Search, Video, Phone } from "lucide-react";
import { Avatar } from "~/components/ui/avatar";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { formatTimeAgo } from "~/lib/utils";
import toast from "react-hot-toast";
import Link from "next/link";
import { MessageStatus } from "~/app/_components/message-status";
import { getPusherClient, conversationChannel, PUSHER_EVENTS } from "~/lib/pusher";
import type { EventEnvelope, MessageSendPayload, MessageReadPayload } from "~/lib/aurora/types";

function MessagesContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const recipientId = searchParams.get("recipientId");
  const conversationId = searchParams.get("conversationId");

  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [newRecipientId, setNewRecipientId] = useState<string | null>(recipientId);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversations, refetch: refetchConversations } = api.message.getConversations.useQuery(
    undefined,
    { enabled: !!session }
  );

  const { data: events, refetch: refetchMessages } = api.message.getMessages.useQuery(
    { conversationId: selectedConversation! },
    { enabled: !!selectedConversation }
  );

  // Local event state for optimistic/real-time updates
  const [localEvents, setLocalEvents] = useState<EventEnvelope[]>([]);

  // Sync server events into local array
  useEffect(() => {
    if (events?.items) {
      const mappedEvents: EventEnvelope[] = events.items.map(msg => ({
        id: msg.id,
        type: "message:send",
        payload: {
          messageId: msg.id,
          content: msg.content,
        },
        vectorClock: {},
        timestamp: new Date(msg.createdAt).getTime(),
        senderId: msg.senderId,
        conversationId: msg.conversationId,
      }));
      setLocalEvents(mappedEvents);
    }
  }, [events]);

  const markAsDeliveredMutation = api.message.markAsDelivered.useMutation();
  const markAsReadMutation = api.message.markAsRead.useMutation({
    onSuccess: () => {
      void refetchMessages();
      void refetchConversations();
    },
  });

  // Get recipient user info if starting new conversation
  const { data: recipientUser } = api.user.getById.useQuery(
    { userId: newRecipientId ?? "" },
    { enabled: !!newRecipientId && newRecipientId.length > 0 }
  );

  const sendMessageMutation = api.message.sendMessage.useMutation({
    onSuccess: (data) => {
      setMessageText("");
      setNewRecipientId(null);
      void refetchConversations();
      scrollToBottom();

      // Update URL to show conversation
      if (data.conversationId) {
        window.history.replaceState({}, "", `/messages?conversationId=${data.conversationId}`);
        setSelectedConversation(data.conversationId);
      }
    },
    onError: (error) => {
      toast.error(`Error sending message: ${error.message}`);
    },
  });

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [localEvents, scrollToBottom]);

  // ─── Pusher: real-time subscription per conversation ───────────────────────
  // Note: This operates on Aurora Events now, not raw messages
  useEffect(() => {
    if (!selectedConversation || !session?.user?.id) return;

    const pusher = getPusherClient();
    const channel = pusher.subscribe(conversationChannel(selectedConversation));

    // New event arrives → append to localEvents
    channel.bind(PUSHER_EVENTS.NEW_MESSAGE, (newEvent: EventEnvelope) => {
      setLocalEvents((prev) => {
        if (!prev) return [newEvent];
        // Avoid duplicates via ULID
        if (prev.some((e) => e.id === newEvent.id)) return prev;
        return [...prev, newEvent];
      });
      void refetchConversations();
      scrollToBottom();
    });

    // We can handle read/delivered via standard events now, but here's the legacy hook just in case
    channel.bind(PUSHER_EVENTS.MESSAGE_STATUS, () => {
      void refetchMessages();
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(conversationChannel(selectedConversation));
    };
  }, [selectedConversation, session?.user?.id, refetchMessages, refetchConversations, scrollToBottom]);

  // Handle URL parameters
  useEffect(() => {
    if (conversationId && conversations) {
      setSelectedConversation(conversationId);
    } else if (recipientId && conversations) {
      // Find existing conversation with this user
      const existingConv = conversations.find(
        (c) => c.otherParticipant?.id === recipientId
      );
      if (existingConv) {
        setSelectedConversation(existingConv.id);
      } else {
        // Start new conversation
        setNewRecipientId(recipientId);
      }
    }
  }, [conversationId, recipientId, conversations]);

  // Mark messages as delivered when conversation is opened
  useEffect(() => {
    if (selectedConversation) {
      // Fire-and-forget
      markAsDeliveredMutation.mutate({ conversationId: selectedConversation });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversation]);

  // Mark messages as read when user is viewing them
  useEffect(() => {
    if (selectedConversation && localEvents && localEvents.length > 0) {
      const timer = setTimeout(() => {
        markAsReadMutation.mutate({ conversationId: selectedConversation });
      }, 1000); // Wait 1 second before marking as read

      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversation, localEvents]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    // If starting new conversation
    if (newRecipientId && !selectedConversation) {
      sendMessageMutation.mutate({
        recipientId: newRecipientId,
        content: messageText.trim(),
      });
      return;
    }

    // If in existing conversation
    if (!selectedConversation) return;

    const conversation = conversations?.find((c) => c.id === selectedConversation);
    if (!conversation?.otherParticipant) return;

    sendMessageMutation.mutate({
      conversationId: selectedConversation,
      recipientId: conversation.otherParticipant.id,
      content: messageText.trim(),
    });
  };

  // -------------------------------------------------------------------------------- //
  //  Aurora Projection & Materialization Logic
  // -------------------------------------------------------------------------------- //

  // Project raw events into UI 'Message' blocks
  const materializedMessages = useMemo(() => {
    if (!localEvents || localEvents.length === 0) return [];

  type MapMessage = {
    id: string;
    content: string;
    senderId: string;
    createdAt: Date;
    status: 'sent' | 'delivered' | 'read' | 'failed';
    readAt: Date | null;
    deliveredAt: Date | null;
  };

  // Map messageId to final display object
  const msgMap = new Map<string, MapMessage>();

    // Sort array by time to replay events in order
    const sorted = [...localEvents].sort((a, b) => a.timestamp - b.timestamp);

    for (const ev of sorted) {
      if (ev.type === "message:send") {
        const payload = ev.payload as MessageSendPayload;
        msgMap.set(payload.messageId, {
          id: payload.messageId,
          content: payload.content,
          senderId: ev.senderId,
          createdAt: new Date(ev.timestamp),
          status: "sent",
          readAt: null,
          deliveredAt: null
        });
      }

      if (ev.type === "message:delete") {
        // Stub implementation, extend if feature requested
      }

      if (ev.type === "message:read") {
        const payload = ev.payload as MessageReadPayload;
        // The read event denotes everything BEFORE this point was read.
        for (const [mid, msg] of msgMap.entries()) {
          // If the message was sent by someone ELSE, and was sent BEFORE this read payload...
          if (msg.senderId !== ev.senderId && msg.id <= payload.lastReadEventId) {
            msgMap.set(mid, { ...msg, status: "read", readAt: new Date(ev.timestamp) });
          }
        }
      }
    }

    // Output array sorted chronologically
    return Array.from(msgMap.values()).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }, [localEvents]);


  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a] text-white">
        <div className="text-center">
          <MessageCircle className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Sign in to view messages</h2>
          <p className="text-white/60 mb-6">Connect with your friends and creators</p>
          <Link href="/auth/signin">
            <Button variant="primary" size="lg">
              Sign In
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const selectedConv = conversations?.find((c) => c.id === selectedConversation);

  return (
    <main className="fixed inset-0 top-0 bg-[#0a0a0a] text-white flex overflow-hidden">
      {/* Conversations List */}
      <div
        className={`${selectedConversation ? "hidden md:flex" : "flex"
          } flex-col w-full md:w-96 md:max-w-[400px] border-r border-white/10 flex-shrink-0`}
      >
        {/* Header */}
        <div className="p-4 border-b border-white/10">
          <h1 className="text-2xl font-bold mb-4">Messages</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <Input
              type="text"
              placeholder="Search messages..."
              className="pl-10 bg-white/10 border-white/20"
            />
          </div>
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto">
          {conversations && conversations.length > 0 ? (
            <div>
              {conversations.map((conversation) => (
                <motion.button
                  key={conversation.id}
                  whileHover={{ backgroundColor: "rgba(255, 255, 255, 0.05)" }}
                  onClick={() => setSelectedConversation(conversation.id)}
                  className={`w-full p-4 flex items-center gap-3 border-b border-white/5 transition-colors ${selectedConversation === conversation.id ? "bg-white/10" : ""
                    }`}
                >
                  <Avatar
                    src={conversation.otherParticipant?.image ?? undefined}
                    fallback={
                      conversation.otherParticipant?.username?.charAt(0).toUpperCase() ?? "U"
                    }
                    size="lg"
                  />
                  <div className="flex-1 min-w-0 text-left">
                    <h3 className="font-semibold truncate">
                      {conversation.otherParticipant?.name ??
                        conversation.otherParticipant?.username ??
                        "User"}
                    </h3>
                    <div className="flex items-center gap-1">
                      {conversation.lastMessage?.senderId === session.user.id && (
                        <MessageStatus
                          status={conversation.lastMessage?.status as "sent" | "delivered" | "read" ?? "sent"}
                          isOwn={true}
                          readAt={conversation.lastMessage?.readAt as Date | undefined}
                        />
                      )}
                      <p className="text-sm text-white/60 truncate">
                        {conversation.lastMessage?.content ?? "No messages yet"}
                      </p>
                    </div>
                  </div>
                  {conversation.lastMessage && (
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs text-white/40">
                        {formatTimeAgo(new Date(conversation.lastMessage.createdAt))}
                      </span>
                    </div>
                  )}
                </motion.button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
              <MessageCircle className="w-16 h-16 text-white/20 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No messages yet</h3>
              <p className="text-white/60 text-sm">
                Start a conversation by visiting a user&apos;s profile
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div
        className={`${selectedConversation || newRecipientId ? "flex" : "hidden md:flex"
          } flex-col flex-1 min-w-0`}
      >
        {selectedConv || newRecipientId ? (
          <div className="flex flex-col h-full">
            {/* Chat Header */}
            <div className="p-4 border-b border-white/10 flex items-center gap-3 flex-shrink-0">
              <button
                onClick={() => {
                  setSelectedConversation(null);
                  setNewRecipientId(null);
                  window.history.replaceState({}, "", "/messages");
                }}
                className="md:hidden"
                title="Back to conversations"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <Avatar
                src={
                  selectedConv?.otherParticipant?.image ??
                  recipientUser?.image ??
                  undefined
                }
                fallback={
                  (selectedConv?.otherParticipant?.username ??
                    recipientUser?.username ??
                    selectedConv?.otherParticipant?.name ??
                    recipientUser?.name ??
                    "U")
                    .charAt(0)
                    .toUpperCase()
                }
                size="md"
              />
              <div className="flex-1">
                <h2 className="font-semibold">
                  {selectedConv?.otherParticipant?.name ??
                    selectedConv?.otherParticipant?.username ??
                    recipientUser?.name ??
                    recipientUser?.username ??
                    "Loading..."}
                </h2>
                <p className="text-sm text-white/60">
                  @
                  {selectedConv?.otherParticipant?.username ??
                    recipientUser?.username ??
                    "..."}
                </p>
              </div>

              {/* Call Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toast("Voice call feature coming soon!")}
                  className="rounded-full p-2 transition-colors hover:bg-white/10"
                  title="Voice call"
                >
                  <Phone className="h-5 w-5" />
                </button>
                <button
                  onClick={() => toast("Video call feature coming soon!")}
                  className="rounded-full p-2 transition-colors hover:bg-white/10"
                  title="Video call"
                >
                  <Video className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
              {materializedMessages && materializedMessages.length > 0 ? (
                <>
                  {materializedMessages.map((message) => {
                    const isOwn = message.senderId === session.user.id;
                    return (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-2xl px-4 py-2 ${isOwn
                            ? "bg-gradient-to-r from-pink-500 to-cyan-400 text-white"
                            : "bg-white/10 text-white"
                            }`}
                        >
                          <p className="break-words">{message.content}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-xs opacity-70">
                              {formatTimeAgo(new Date(message.createdAt))}
                            </span>
                            <MessageStatus
                              status={message.status as "sent" | "delivered" | "read"}
                              isOwn={isOwn}
                              readAt={message.readAt}
                            />
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <MessageCircle className="w-16 h-16 text-white/20 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Start the conversation</h3>
                    <p className="text-white/60">
                      Send a message to{" "}
                      {selectedConv?.otherParticipant?.name ?? recipientUser?.name ?? "this user"}
                    </p>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-white/10 flex-shrink-0">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Input
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 rounded-full bg-white/10 border-white/20"
                  disabled={sendMessageMutation.isPending}
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={!messageText.trim() || sendMessageMutation.isPending}
                  className="rounded-full"
                >
                  {sendMessageMutation.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </Button>
              </form>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <MessageCircle className="w-20 h-20 text-white/20 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Select a conversation</h3>
              <p className="text-white/60">
                Choose a conversation from the list to start messaging
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}


export default function MessagesPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-[#0a0a0a]">
        <Loader2 className="h-8 w-8 animate-spin text-[#FE2C55]" />
      </div>
    }>
      <MessagesContent />
    </Suspense>
  );
}

