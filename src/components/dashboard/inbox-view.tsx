"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";
import {
  ArrowLeft,
  CornerUpLeft,
  MessageCircle,
  Search,
  Send,
  Smile,
  X,
} from "lucide-react";
import dynamic from "next/dynamic";

// Lazy-load emoji picker (heavy bundle)
const EmojiPicker = dynamic(() => import("@emoji-mart/react"), { ssr: false });

// ─── Types ───────────────────────────────────────────────────────────────────

interface OtherUser {
  id: string;
  name: string;
  image?: string | null;
  role: string;
  providerProfile?: { handle: string; businessName: string; avatarUrl?: string | null } | null;
}

interface ConversationSummary {
  id: string;
  updatedAt: string;
  other: OtherUser | null;
  lastMessage: { body: string; senderId: string; senderName: string; createdAt: string } | null;
  unread: boolean;
}

interface Reaction {
  id: string;
  emoji: string;
  user: { id: string; name: string };
}

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
  editedAt?: string | null;
  replyToId?: string | null;
  replyTo?: { id: string; body: string; sender: { name: string } } | null;
  sender: { id: string; name: string; image?: string | null };
  reactions: Reaction[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function avatarLetter(name: string) {
  return name.trim()[0]?.toUpperCase() ?? "?";
}

function displayName(user: OtherUser | null) {
  if (!user) return "Unknown";
  return user.providerProfile?.businessName ?? user.name;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  if (isToday(d)) return format(d, "h:mm a");
  if (isYesterday(d)) return "Yesterday";
  return format(d, "d MMM");
}

function groupByDate(messages: Message[]) {
  const groups: { label: string; messages: Message[] }[] = [];
  let current: { label: string; messages: Message[] } | null = null;
  for (const m of messages) {
    const d = new Date(m.createdAt);
    const label = isToday(d) ? "Today" : isYesterday(d) ? "Yesterday" : format(d, "d MMMM yyyy");
    if (!current || current.label !== label) {
      current = { label, messages: [] };
      groups.push(current);
    }
    current.messages.push(m);
  }
  return groups;
}

// ─── Avatar ──────────────────────────────────────────────────────────────────

function Avatar({ user, size = "md" }: { user: OtherUser | null; size?: "sm" | "md" | "lg" }) {
  const sizeClasses = { sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-sm", lg: "h-12 w-12 text-base" };
  const src = user?.providerProfile?.avatarUrl ?? user?.image;
  const name = displayName(user);
  return (
    <div className={cn("shrink-0 rounded-full overflow-hidden flex items-center justify-center bg-[#E85D2F]/15 font-bold text-[#E85D2F]", sizeClasses[size])}>
      {src ? <img src={src} alt={name} className="h-full w-full object-cover" /> : avatarLetter(name)}
    </div>
  );
}

// ─── Conversation List ────────────────────────────────────────────────────────

function ConversationList({
  conversations,
  activeId,
  onSelect,
  myId,
}: {
  conversations: ConversationSummary[];
  activeId: string | null;
  onSelect: (c: ConversationSummary) => void;
  myId: string;
}) {
  const [search, setSearch] = useState("");
  const filtered = conversations.filter((c) =>
    !search || displayName(c.other).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full border-r border-gray-100 bg-white">
      <div className="px-4 pt-4 pb-3 border-b border-gray-100">
        <h1 className="text-lg font-black mb-3">Messages</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations…"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E85D2F]/30"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
        {filtered.length === 0 && (
          <div className="flex flex-col items-center py-16 text-center px-6">
            <MessageCircle className="h-10 w-10 text-gray-200 mb-3" />
            <p className="text-sm font-semibold text-gray-400">
              {search ? "No conversations match" : "No messages yet"}
            </p>
            {!search && <p className="text-xs text-gray-400 mt-1">Messages from clients will appear here</p>}
          </div>
        )}
        {filtered.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c)}
            className={cn(
              "w-full flex items-start gap-3 px-4 py-3.5 text-left hover:bg-gray-50 transition-colors",
              activeId === c.id && "bg-[#E85D2F]/5 border-l-2 border-[#E85D2F]"
            )}
          >
            <Avatar user={c.other} size="md" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <p className={cn("text-sm truncate", c.unread ? "font-bold text-gray-900" : "font-medium text-gray-700")}>
                  {displayName(c.other)}
                </p>
                {c.lastMessage && (
                  <span className="text-[10px] text-gray-400 shrink-0">{formatTime(c.lastMessage.createdAt)}</span>
                )}
              </div>
              {c.lastMessage && (
                <p className={cn("text-xs truncate mt-0.5", c.unread ? "text-gray-700 font-medium" : "text-gray-400")}>
                  {c.lastMessage.senderId === myId ? "You: " : ""}{c.lastMessage.body}
                </p>
              )}
            </div>
            {c.unread && <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#E85D2F]" />}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({
  message,
  isMe,
  myId,
  onReact,
  onReply,
}: {
  message: Message;
  isMe: boolean;
  myId: string;
  onReact: (messageId: string, emoji: string) => void;
  onReply: (message: Message) => void;
}) {
  const [showReactPicker, setShowReactPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showReactPicker) return;
    function handler(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowReactPicker(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showReactPicker]);

  // Group reactions by emoji
  const reactionGroups: Record<string, { count: number; mine: boolean; users: string[] }> = {};
  for (const r of message.reactions) {
    if (!reactionGroups[r.emoji]) reactionGroups[r.emoji] = { count: 0, mine: false, users: [] };
    reactionGroups[r.emoji].count++;
    reactionGroups[r.emoji].users.push(r.user.name);
    if (r.user.id === myId) reactionGroups[r.emoji].mine = true;
  }

  return (
    <div className={cn("group flex items-end gap-2 max-w-[75%]", isMe ? "ml-auto flex-row-reverse" : "")}>
      {!isMe && (
        <div className="h-7 w-7 shrink-0 rounded-full overflow-hidden flex items-center justify-center bg-[#E85D2F]/15 text-[10px] font-bold text-[#E85D2F] mb-1">
          {message.sender.image
            ? <img src={message.sender.image} alt="" className="h-full w-full object-cover" />
            : avatarLetter(message.sender.name)}
        </div>
      )}

      <div className="flex flex-col gap-1">
        {/* Reply quote */}
        {message.replyTo && (
          <div className={cn(
            "rounded-xl border-l-4 px-3 py-1.5 text-xs mb-0.5",
            isMe ? "border-white/40 bg-white/10 text-white/80" : "border-[#E85D2F]/40 bg-gray-200 text-gray-600"
          )}>
            <p className="font-bold mb-0.5">{message.replyTo.sender.name}</p>
            <p className="truncate">{message.replyTo.body}</p>
          </div>
        )}
        <div
          className={cn(
            "rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed relative",
            isMe
              ? "bg-[#E85D2F] text-white rounded-br-sm"
              : "bg-gray-100 text-gray-900 rounded-bl-sm"
          )}
        >
          {message.body}

          {/* Hover action buttons */}
          <div className={cn(
            "absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1",
            isMe ? "-left-16" : "-right-16"
          )}>
            <button
              onClick={() => onReply(message)}
              className="h-6 w-6 rounded-full bg-white shadow border border-gray-200 flex items-center justify-center text-gray-500 hover:text-[#E85D2F] transition-colors"
              title="Reply"
            >
              <CornerUpLeft className="h-3.5 w-3.5" />
            </button>
            <div className="relative">
              <button
                onClick={() => setShowReactPicker((s) => !s)}
                className="h-6 w-6 rounded-full bg-white shadow border border-gray-200 flex items-center justify-center text-gray-500 hover:text-[#E85D2F] transition-colors"
              >
                <Smile className="h-3.5 w-3.5" />
              </button>
              {showReactPicker && (
                <div
                  ref={pickerRef}
                  className={cn(
                    "absolute z-50 top-8",
                    isMe ? "right-0" : "left-0"
                  )}
                >
                  <EmojiPicker
                    data={async () => (await import("@emoji-mart/data")).default}
                    onEmojiSelect={(e: any) => { onReact(message.id, e.native); setShowReactPicker(false); }}
                    theme="light"
                    previewPosition="none"
                    skinTonePosition="none"
                    perLine={8}
                    maxFrequentRows={2}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Reactions */}
        {Object.keys(reactionGroups).length > 0 && (
          <div className={cn("flex flex-wrap gap-1", isMe ? "justify-end" : "justify-start")}>
            {Object.entries(reactionGroups).map(([emoji, { count, mine, users }]) => (
              <button
                key={emoji}
                onClick={() => onReact(message.id, emoji)}
                title={users.join(", ")}
                className={cn(
                  "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs border transition-colors",
                  mine
                    ? "bg-[#E85D2F]/10 border-[#E85D2F]/30 text-[#E85D2F]"
                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                )}
              >
                <span>{emoji}</span>
                {count > 1 && <span className="font-medium">{count}</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Message Thread ───────────────────────────────────────────────────────────

function MessageThread({
  conversationId,
  other,
  myId,
  onBack,
}: {
  conversationId: string;
  other: OtherUser | null;
  myId: string;
  onBack?: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval>>(null);

  const fetchMessages = useCallback(async () => {
    const res = await fetch(`/api/conversations/${conversationId}/messages`);
    if (res.ok) {
      const data = await res.json();
      setMessages(data.messages);
    }
  }, [conversationId]);

  // Mark as read
  const markRead = useCallback(async () => {
    await fetch(`/api/conversations/${conversationId}/read`, { method: "PATCH" });
  }, [conversationId]);

  useEffect(() => {
    fetchMessages().then(markRead);
    pollRef.current = setInterval(() => { fetchMessages(); }, 4000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchMessages, markRead]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Close emoji picker on outside click
  useEffect(() => {
    if (!showEmojiPicker) return;
    function handler(e: MouseEvent) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showEmojiPicker]);

  const send = useCallback(async () => {
    const body = input.trim();
    if (!body || sending) return;
    setSending(true);
    setInput("");
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, replyToId: replyTo?.id ?? null }),
      });
      setReplyTo(null);
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, data.message]);
      }
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  }, [conversationId, input, sending]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const handleReact = useCallback(async (messageId: string, emoji: string) => {
    const res = await fetch(`/api/messages/${messageId}/react`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji }),
    });
    if (res.ok) fetchMessages();
  }, [fetchMessages]);

  const groups = groupByDate(messages);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white shrink-0">
        {onBack && (
          <button onClick={onBack} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft className="h-5 w-5 text-gray-500" />
          </button>
        )}
        <Avatar user={other} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="font-bold text-sm truncate">{displayName(other)}</p>
          {other?.providerProfile && (
            <p className="text-xs text-gray-400 truncate">@{other.providerProfile.handle}</p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {messages.length === 0 && (
          <div className="flex flex-col items-center py-12 text-center">
            <MessageCircle className="h-10 w-10 text-gray-200 mb-3" />
            <p className="text-sm text-gray-400">No messages yet. Say hello!</p>
          </div>
        )}
        {groups.map((group) => (
          <div key={group.label} className="space-y-2">
            <div className="flex items-center gap-3 py-1">
              <div className="h-px flex-1 bg-gray-100" />
              <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">{group.label}</span>
              <div className="h-px flex-1 bg-gray-100" />
            </div>
            {group.messages.map((m) => (
              <MessageBubble
                key={m.id}
                message={m}
                isMe={m.senderId === myId}
                myId={myId}
                onReact={handleReact}
                onReply={setReplyTo}
              />
            ))}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-gray-100 bg-white shrink-0">
        {replyTo && (
          <div className="mb-2 flex items-start gap-2 rounded-xl bg-gray-50 border border-gray-200 px-3 py-2">
            <CornerUpLeft className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#E85D2F]" />
            <div className="min-w-0 flex-1 text-xs">
              <p className="font-bold text-gray-700">{replyTo.sender.name}</p>
              <p className="truncate text-gray-500">{replyTo.body}</p>
            </div>
            <button onClick={() => setReplyTo(null)} className="text-gray-400 hover:text-gray-600">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <div className="flex items-end gap-2 bg-gray-50 rounded-2xl border border-gray-200 px-3 py-2 focus-within:ring-2 focus-within:ring-[#E85D2F]/30 focus-within:border-[#E85D2F] transition-all">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowEmojiPicker((s) => !s)}
              className="p-1 text-gray-400 hover:text-[#E85D2F] transition-colors rounded-lg hover:bg-gray-100"
            >
              <Smile className="h-5 w-5" />
            </button>
            {showEmojiPicker && (
              <div ref={emojiPickerRef} className="absolute bottom-10 left-0 z-50">
                <EmojiPicker
                  data={async () => (await import("@emoji-mart/data")).default}
                  onEmojiSelect={(e: any) => {
                    setInput((prev) => prev + e.native);
                    setShowEmojiPicker(false);
                    textareaRef.current?.focus();
                  }}
                  theme="light"
                  previewPosition="none"
                  skinTonePosition="none"
                />
              </div>
            )}
          </div>

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message…"
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none min-h-[20px] max-h-[120px] overflow-y-auto"
            style={{ height: "auto" }}
            onInput={(e) => {
              const t = e.currentTarget;
              t.style.height = "auto";
              t.style.height = Math.min(t.scrollHeight, 120) + "px";
            }}
          />

          <button
            type="button"
            onClick={send}
            disabled={!input.trim() || sending}
            className="p-1.5 rounded-xl bg-[#E85D2F] text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#d04f25] transition-colors shrink-0"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="text-[10px] text-gray-300 mt-1 text-right">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyThread() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8 bg-gray-50">
      <div className="h-16 w-16 rounded-2xl bg-[#E85D2F]/10 flex items-center justify-center mb-4">
        <MessageCircle className="h-8 w-8 text-[#E85D2F]" />
      </div>
      <h2 className="text-lg font-bold text-gray-700">Your messages</h2>
      <p className="text-sm text-gray-400 mt-1 max-w-xs">Select a conversation to read and reply, or wait for a client to reach out.</p>
    </div>
  );
}

// ─── Main InboxView ───────────────────────────────────────────────────────────

export function InboxView({ myId }: { myId: string }) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [active, setActive] = useState<ConversationSummary | null>(null);
  const [mobileShowThread, setMobileShowThread] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval>>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const deepLinkId = searchParams.get("conversation");

  const fetchConversations = useCallback(async () => {
    const res = await fetch("/api/conversations");
    if (res.ok) {
      const data = await res.json();
      setConversations(data.conversations);
      // Keep active in sync with updated list
      setActive((prev) => prev ? (data.conversations.find((c: ConversationSummary) => c.id === prev.id) ?? prev) : null);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
    pollRef.current = setInterval(fetchConversations, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchConversations]);

  // Deep-link: open conversation from ?conversation= param
  useEffect(() => {
    if (!deepLinkId || conversations.length === 0) return;
    const target = conversations.find((c) => c.id === deepLinkId);
    if (target) {
      setActive(target);
      setMobileShowThread(true);
      router.replace("/dashboard/inbox");
    }
  }, [deepLinkId, conversations, router]);

  const handleSelect = (c: ConversationSummary) => {
    setActive(c);
    setMobileShowThread(true);
    // Optimistically mark as read in list
    setConversations((prev) => prev.map((x) => x.id === c.id ? { ...x, unread: false } : x));
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Conversation list — hidden on mobile when thread open */}
      <div className={cn("w-full md:w-72 lg:w-80 shrink-0", mobileShowThread ? "hidden md:flex" : "flex", "flex-col")}>
        <ConversationList
          conversations={conversations}
          activeId={active?.id ?? null}
          onSelect={handleSelect}
          myId={myId}
        />
      </div>

      {/* Thread panel */}
      <div className={cn("flex-1 min-w-0", !mobileShowThread ? "hidden md:block" : "block")}>
        {active ? (
          <MessageThread
            key={active.id}
            conversationId={active.id}
            other={active.other}
            myId={myId}
            onBack={() => setMobileShowThread(false)}
          />
        ) : (
          <EmptyThread />
        )}
      </div>
    </div>
  );
}
