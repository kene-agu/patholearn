"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, AlertCircle, Loader2 } from "lucide-react";
import clsx from "clsx";
import { useChat } from "ai/react";
import ReactMarkdown from "react-markdown";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function FloatingChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [showEscalate, setShowEscalate] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: "/api/chat/support",
    initialMessages: [],
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleEscalate = async () => {
    // Log escalation as a complaint
    await fetch("/api/chat/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          ...messages,
          {
            role: "user",
            content: "I need to escalate this to a human team member.",
          },
        ],
      }),
    });

    setShowEscalate(true);
    setTimeout(() => setShowEscalate(false), 3000);
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-br from-violet-600 to-purple-700 text-white shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-200 flex items-center justify-center z-40"
          aria-label="Open support chat"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-gradient-to-r from-violet-600/10 to-purple-700/10">
            <div>
              <h3 className="font-semibold text-white text-sm">PathLearn Support</h3>
              <p className="text-xs text-slate-400 mt-0.5">We're here to help</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
              aria-label="Close chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center px-4">
                <MessageCircle className="w-12 h-12 text-slate-600 mb-3" />
                <p className="text-slate-300 text-sm font-medium">Welcome to PathLearn Support!</p>
                <p className="text-slate-400 text-xs mt-2">
                  Ask us anything about uploading documents, using the AI tutor, flashcards, pricing, or report issues.
                </p>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={clsx(
                  "flex gap-3",
                  msg.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {msg.role === "assistant" && (
                  <div className="w-6 h-6 rounded-full bg-violet-600/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <MessageCircle className="w-3.5 h-3.5 text-violet-400" />
                  </div>
                )}
                <div
                  className={clsx(
                    "max-w-xs px-4 py-2.5 rounded-lg text-sm leading-relaxed",
                    msg.role === "user"
                      ? "bg-violet-600 text-white rounded-br-none"
                      : "bg-slate-800 text-slate-100 rounded-bl-none border border-slate-700"
                  )}
                >
                  <ReactMarkdown className="prose prose-sm prose-invert max-w-none">
                    {msg.content}
                  </ReactMarkdown>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-violet-600/20 flex items-center justify-center flex-shrink-0">
                  <Loader2 className="w-3.5 h-3.5 text-violet-400 animate-spin" />
                </div>
                <div className="bg-slate-800 text-slate-400 px-4 py-2.5 rounded-lg rounded-bl-none border border-slate-700 text-sm">
                  Thinking...
                </div>
              </div>
            )}

            {showEscalate && (
              <div className="flex gap-2 items-start p-3 bg-emerald-900/20 border border-emerald-700/50 rounded-lg">
                <AlertCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-emerald-300">
                  Your issue has been logged. Our team will review and follow up shortly.
                </p>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Escalate Button */}
          {messages.length > 0 && (
            <div className="px-4 py-2 border-t border-slate-700 bg-slate-800/50">
              <button
                onClick={handleEscalate}
                className="w-full text-xs py-2 px-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors font-medium"
              >
                Need human support?
              </button>
            </div>
          )}

          {/* Input Area */}
          <form onSubmit={handleSubmit} className="p-4 border-t border-slate-700">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ask anything..."
                value={input}
                onChange={handleInputChange}
                disabled={isLoading}
                className="flex-1 px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 disabled:opacity-50 transition-colors"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="px-3 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
