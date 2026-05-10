"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Star, AlertCircle, Check } from "lucide-react";

interface Escalation {
  id: string;
  conversation: string;
  user_email: string | null;
  status: string;
  created_at: string;
}

interface Review {
  id: string;
  rating: number;
  text: string | null;
  created_at: string;
}

export default function SupportDashboard() {
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEscalation, setSelectedEscalation] = useState<Escalation | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [escalRes, reviewRes] = await Promise.all([
      supabase.from("support_escalations").select("*").order("created_at", { ascending: false }),
      supabase.from("chatbot_reviews").select("*").order("created_at", { ascending: false }),
    ]);

    if (escalRes.data) setEscalations(escalRes.data);
    if (reviewRes.data) setReviews(reviewRes.data);
    setLoading(false);
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase
      .from("support_escalations")
      .update({ status })
      .eq("id", id);
    loadData();
  };

  const avgRating = reviews.length > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Support Dashboard</h1>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-slate-700/50 border border-slate-600 rounded-2xl p-6">
            <p className="text-slate-400 text-sm mb-2">Total Escalations</p>
            <p className="text-4xl font-bold text-white">{escalations.length}</p>
            <p className="text-xs text-slate-500 mt-2">
              {escalations.filter(e => e.status === "resolved").length} resolved
            </p>
          </div>
          <div className="bg-slate-700/50 border border-slate-600 rounded-2xl p-6">
            <p className="text-slate-400 text-sm mb-2">Total Reviews</p>
            <p className="text-4xl font-bold text-white">{reviews.length}</p>
            <p className="text-xs text-amber-400 mt-2">⭐ {avgRating} avg rating</p>
          </div>
          <div className="bg-slate-700/50 border border-slate-600 rounded-2xl p-6">
            <p className="text-slate-400 text-sm mb-2">Pending</p>
            <p className="text-4xl font-bold text-orange-400">{escalations.filter(e => e.status === "pending").length}</p>
            <p className="text-xs text-slate-500 mt-2">needs follow-up</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Escalations */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-400" /> Support Escalations
            </h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {escalations.length === 0 ? (
                <p className="text-slate-400 text-sm">No escalations yet</p>
              ) : (
                escalations.map(esc => (
                  <button
                    key={esc.id}
                    onClick={() => setSelectedEscalation(esc)}
                    className="w-full text-left p-4 bg-slate-700/30 border border-slate-600 rounded-lg hover:border-orange-400/50 hover:bg-slate-700/50 transition-all group"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white truncate">{esc.user_email || "Unknown"}</p>
                        <p className="text-xs text-slate-400 mt-1">{new Date(esc.created_at).toLocaleString()}</p>
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          esc.status === "resolved"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-orange-500/20 text-orange-300"
                        }`}
                      >
                        {esc.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 line-clamp-2 group-hover:line-clamp-none">
                      {esc.conversation.substring(0, 100)}...
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Reviews */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-400" /> Reviews
            </h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {reviews.length === 0 ? (
                <p className="text-slate-400 text-sm">No reviews yet</p>
              ) : (
                reviews.map(review => (
                  <div key={review.id} className="p-3 bg-slate-700/30 border border-slate-600 rounded-lg">
                    <div className="flex gap-1 mb-2">
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star
                          key={star}
                          className="w-3.5 h-3.5"
                          fill={star <= review.rating ? "#f59e0b" : "none"}
                          stroke={star <= review.rating ? "#f59e0b" : "#94a3b8"}
                        />
                      ))}
                    </div>
                    {review.text && <p className="text-xs text-slate-300 line-clamp-2 mb-1">{review.text}</p>}
                    <p className="text-xs text-slate-500">{new Date(review.created_at).toLocaleDateString()}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Detailed View */}
        {selectedEscalation && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-96 overflow-y-auto p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">{selectedEscalation.user_email}</h3>
                  <p className="text-sm text-slate-400">{new Date(selectedEscalation.created_at).toLocaleString()}</p>
                </div>
                <button
                  onClick={() => setSelectedEscalation(null)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="bg-slate-700/30 border border-slate-600 rounded-lg p-4 mb-4 text-sm text-slate-300 font-mono whitespace-pre-wrap overflow-auto max-h-48">
                {selectedEscalation.conversation}
              </div>

              <div className="flex gap-2">
                {selectedEscalation.status === "pending" ? (
                  <button
                    onClick={() => {
                      updateStatus(selectedEscalation.id, "resolved");
                      setSelectedEscalation(null);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 rounded-lg transition-colors"
                  >
                    <Check className="w-4 h-4" /> Mark Resolved
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      updateStatus(selectedEscalation.id, "pending");
                      setSelectedEscalation(null);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-500 text-white font-medium py-2 rounded-lg transition-colors"
                  >
                    <AlertCircle className="w-4 h-4" /> Mark Pending
                  </button>
                )}
                <button
                  onClick={() => setSelectedEscalation(null)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-medium py-2 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
