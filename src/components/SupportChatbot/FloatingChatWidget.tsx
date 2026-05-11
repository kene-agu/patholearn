"use client";

// Support chat panel. Renders no floating button by itself.
// Open it by dispatching a `open-support-chat` window event
// (e.g. from the user dropdown menu in the Navbar).

import { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, X, Send, AlertCircle, Loader2, Star } from "lucide-react";
import clsx from "clsx";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/lib/supabase";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export const SUPPORT_OPEN_EVENT = "open-support-chat";

export default function FloatingChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [showEscalate, setShowEscalate] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [showThankYou, setShowThankYou] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setUserEmail(data.user.email);
    });
  }, []);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // Listen for open-events from anywhere in the app
  useEffect(() => {
    const handler = () => setIsOpen(true);
    window.addEventListener(SUPPORT_OPEN_EVENT, handler);
    return () => window.removeEventListener(SUPPORT_OPEN_EVENT, handler);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Track inactivity and auto-close after 10 minutes
  useEffect(() => {
    if (!isOpen) return;
    const resetTimer = () => {
      lastActivityRef.current = Date.now();
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = setTimeout(() => {
        setIsOpen(false);
      }, 10 * 60 * 1000); // 10 minutes
    };
    resetTimer();
    window.addEventListener("mousemove", resetTimer);
    window.addEventListener("keypress", resetTimer);
    return () => {
      window.removeEventListener("mousemove", resetTimer);
      window.removeEventListener("keypress", resetTimer);
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, [isOpen]);

  const sendMessage = useCallback(async (history: Message[]) => {
    setIsLoading(true);
    let assistantId = (Date.now() + 1).toString();
    let assistantContent = "";

    try {
      const response = await fetch("/api/chat/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });

      if (!response.ok || !response.body) throw new Error("Failed to get response");

      // Insert empty assistant message we'll fill as the stream arrives
      setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        assistantContent += chunk;
        setMessages((prev) => {
          const updated = [...prev];
          const idx = updated.findIndex((m) => m.id === assistantId);
          if (idx !== -1) updated[idx] = { ...updated[idx], content: assistantContent };
          return updated;
        });
      }
    } catch (err) {
      console.error("Chat error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: assistantId,
          role: "assistant",
          content: "Sorry, I hit a snag reaching the server. Please try again in a moment.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { id: Date.now().toString(), role: "user", content: input.trim() };
    const next = [...messages, userMessage];
    setMessages(next);
    setInput("");
    await sendMessage(next);
  };

  const handleEscalate = async () => {
    if (isLoading) return;
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: "I'd like to escalate this to a human team member. Please log my issue.",
    };
    const next = [...messages, userMessage];
    setMessages(next);
    await sendMessage(next);

    // Send escalation email
    await fetch("/api/chat/escalate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: next,
        userEmail: userEmail || "anonymous",
      }),
    }).catch(err => console.error("Escalation email failed:", err));

    setShowEscalate(true);
    setTimeout(() => setShowEscalate(false), 4000);
  };

  const handleSubmitReview = async () => {
    if (rating === 0) return;
    await fetch("/api/chat/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating, text: reviewText }),
    }).catch(err => console.error("Review submission failed:", err));

    setShowReview(false);
    setHasReviewed(true);
    setRating(0);
    setReviewText("");
    setShowThankYou(true);

    // Auto close after thank you
    setTimeout(() => {
      setShowThankYou(false);
      setIsOpen(false);
    }, 2000);
  };

  const handleClose = () => {
    if (!hasReviewed && messages.length > 0 && !showReview) {
      setShowReview(true);
    } else {
      setIsOpen(false);
      setShowReview(false);
      setShowThankYou(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 w-[calc(100vw-2rem)] sm:w-96 max-w-md h-[70vh] sm:h-[600px] max-h-[calc(100vh-3rem)] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl flex flex-col z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-violet-500/10 to-purple-600/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center">
            <MessageCircle className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm">PathoLearn Support</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">We're here to help</p>
          </div>
        </div>
        <button
          onClick={handleClose}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          aria-label="Close chat"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !showThankYou && (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <MessageCircle className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-slate-700 dark:text-slate-300 text-sm font-medium">Welcome to PathoLearn Support!</p>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-2 max-w-xs">
              Ask about uploading documents, the AI tutor, flashcards, pricing, or report any issue.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={clsx("flex gap-2", msg.role === "user" ? "justify-end" : "justify-start")}
          >
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-full bg-violet-100 dark:bg-violet-600/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <MessageCircle className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
              </div>
            )}
            <div
              className={clsx(
                "max-w-[80%] px-3.5 py-2 rounded-2xl text-sm leading-relaxed",
                msg.role === "user"
                  ? "bg-violet-600 text-white rounded-br-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-sm border border-slate-200 dark:border-slate-700"
              )}
            >
              {msg.role === "assistant" ? (
                <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1">
                  <ReactMarkdown>{msg.content || "…"}</ReactMarkdown>
                </div>
              ) : (
                <span className="whitespace-pre-wrap">{msg.content}</span>
              )}
            </div>
          </div>
        ))}

        {isLoading && messages[messages.length - 1]?.role === "user" && (
          <div className="flex gap-2">
            <div className="w-7 h-7 rounded-full bg-violet-100 dark:bg-violet-600/20 flex items-center justify-center flex-shrink-0">
              <Loader2 className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400 animate-spin" />
            </div>
            <div className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-3.5 py-2 rounded-2xl rounded-bl-sm border border-slate-200 dark:border-slate-700 text-sm">
              Thinking…
            </div>
          </div>
        )}

        {showEscalate && (
          <div className="flex gap-2 items-start p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700/50 rounded-lg">
            <AlertCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-emerald-700 dark:text-emerald-300">
              Your issue has been logged. Our team will review and follow up shortly.
            </p>
          </div>
        )}

        {showThankYou && (
          <div className="flex flex-col items-center justify-center h-full py-8">
            <div className="text-5xl mb-4">🙏</div>
            <p className="text-xl font-semibold text-slate-700 dark:text-slate-300">Thank you!</p>
            <p className="text-slate-500 dark:text-slate-400 mt-2">Your feedback helps us improve.</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Escalate */}
      {messages.length > 0 && !showReview && !showThankYou && (
        <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <button
            onClick={handleEscalate}
            disabled={isLoading}
            className="w-full text-xs py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition-colors font-medium disabled:opacity-50"
          >
            Need human support?
          </button>
        </div>
      )}

      {/* Review */}
      {showReview && !showThankYou && (
        <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 space-y-3">
          <p className="text-xs font-medium text-slate-700 dark:text-slate-300">How are we doing?</p>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className="w-5 h-5"
                  fill={star <= rating ? "#f59e0b" : "none"}
                  stroke={star <= rating ? "#f59e0b" : "currentColor"}
                  color={star <= rating ? "#f59e0b" : "#cbd5e1"}
                />
              </button>
            ))}
          </div>
          <textarea
            placeholder="Any feedback? (optional)"
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            className="w-full px-2 py-1.5 text-xs rounded bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 resize-none"
            rows={2}
          />
          <div className="flex gap-2">
            <button
              onClick={handleSubmitReview}
              disabled={rating === 0}
              className="flex-1 text-xs py-1.5 px-2 rounded bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-50 font-medium transition-colors"
            >
              Submit
            </button>
            <button
              onClick={() => setShowReview(false)}
              className="flex-1 text-xs py-1.5 px-2 rounded bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-medium transition-colors"
            >
              Skip
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      {!showReview && !showThankYou && (
      <form onSubmit={handleSubmit} className="p-4 border-t border-slate-200 dark:border-slate-700">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Ask anything…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            className="flex-1 px-3 py-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 disabled:opacity-50 transition-colors"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-3 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Send"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
      )}
    </div>
  );
}
