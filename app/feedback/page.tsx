"use client";

import ErrorBoundary from "@/components/ErrorBoundary";
import { useState, useEffect, useCallback } from "react";
import { Star, RefreshCw, MessageSquare, Plus, X, Trash2, CheckCircle } from "lucide-react";

interface FeedbackEntry {
  id: string;
  timestamp: number;
  agentId: string;
  agentName: string;
  taskId?: string;
  taskTitle?: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment: string;
  category: "quality" | "speed" | "accuracy" | "creativity" | "general";
  status: "pending" | "reviewed" | "actioned";
}

interface Agent {
  id: string;
  name: string;
  role: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  quality: "text-blue-400 bg-blue-400/10 border-blue-400/30",
  speed: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
  accuracy: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
  creativity: "text-purple-400 bg-purple-400/10 border-purple-400/30",
  general: "text-gray-400 bg-gray-400/10 border-gray-400/30",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "text-yellow-400",
  reviewed: "text-blue-400",
  actioned: "text-emerald-400",
};

function StarRating({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange?.(n)}
          className={`transition-colors ${onChange ? "cursor-pointer hover:scale-110" : "cursor-default"}`}
        >
          <Star
            className={`w-4 h-4 ${n <= value ? "text-yellow-400 fill-yellow-400" : "text-gray-700"}`}
          />
        </button>
      ))}
    </div>
  );
}

function FeedbackPageContent() {
  const [feedback, setFeedback] = useState<FeedbackEntry[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filterAgent, setFilterAgent] = useState("all");

  const [form, setForm] = useState({
    agentId: "",
    agentName: "",
    taskTitle: "",
    rating: 3 as 1 | 2 | 3 | 4 | 5,
    comment: "",
    category: "general" as FeedbackEntry["category"],
  });

  const fetchData = useCallback(async () => {
    try {
      const [fbRes, agentsRes] = await Promise.all([
        fetch("/api/feedback"),
        fetch("/api/agents"),
      ]);
      const fbData = (await fbRes.json()) as { feedback: FeedbackEntry[] };
      const agentsData = (await agentsRes.json()) as { agents: Agent[] };
      setFeedback(fbData.feedback || []);
      setAgents(agentsData.agents || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load feedback");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void fetchData(); }, [fetchData]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.agentName || !form.comment.trim()) return;
    setSubmitting(true);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setShowForm(false);
      setForm({ agentId: "", agentName: "", taskTitle: "", rating: 3, comment: "", category: "general" });
      void fetchData();
    } finally {
      setSubmitting(false);
    }
  }

  async function markStatus(id: string, status: FeedbackEntry["status"]) {
    await fetch("/api/feedback", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    setFeedback((prev) => prev.map((f) => (f.id === id ? { ...f, status } : f)));
  }

  async function deleteFeedback(id: string) {
    await fetch(`/api/feedback?id=${id}`, { method: "DELETE" });
    setFeedback((prev) => prev.filter((f) => f.id !== id));
  }

  const filtered = filterAgent === "all" ? feedback : feedback.filter((f) => f.agentName === filterAgent);

  const avgRating =
    feedback.length > 0
      ? (feedback.reduce((s, f) => s + f.rating, 0) / feedback.length).toFixed(1)
      : "—";

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-400" />
            Feedback
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Rate and review agent outputs</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 border border-gray-700 rounded-lg hover:bg-gray-800 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Feedback
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Total Reviews</p>
          <p className="text-2xl font-bold text-white">{feedback.length}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Avg. Rating</p>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-bold text-white">{avgRating}</p>
            <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Pending Review</p>
          <p className="text-2xl font-bold text-yellow-400">
            {feedback.filter((f) => f.status === "pending").length}
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2 mb-4">
        <select
          value={filterAgent}
          onChange={(e) => setFilterAgent(e.target.value)}
          className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-1.5 text-sm text-gray-300 focus:outline-none focus:border-emerald-500"
        >
          <option value="all">All agents</option>
          {agents.map((a) => (
            <option key={a.id} value={a.name}>{a.name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-900 border border-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <MessageSquare className="w-10 h-10 text-gray-800 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">No feedback yet</p>
          <p className="text-gray-600 text-sm mt-1">Rate agent work to help them improve.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((entry) => (
            <div key={entry.id} className="p-4 bg-gray-900 border border-gray-800 rounded-xl group hover:border-gray-700 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm font-semibold text-white">{entry.agentName}</span>
                    <StarRating value={entry.rating} />
                    <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${CATEGORY_COLORS[entry.category] || CATEGORY_COLORS.general}`}>
                      {entry.category}
                    </span>
                    <span className={`text-xs capitalize ${STATUS_COLORS[entry.status]}`}>{entry.status}</span>
                  </div>
                  {entry.taskTitle && (
                    <p className="text-xs text-gray-600 mb-1">Task: {entry.taskTitle}</p>
                  )}
                  <p className="text-sm text-gray-400">{entry.comment}</p>
                  <p className="text-xs text-gray-700 mt-2">{new Date(entry.timestamp).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  {entry.status === "pending" && (
                    <button
                      onClick={() => void markStatus(entry.id, "reviewed")}
                      className="p-1.5 text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                      title="Mark reviewed"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => void deleteFeedback(entry.id)}
                    className="p-1.5 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New feedback modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <h2 className="font-semibold text-white">New Feedback</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={(e) => void submit(e)} className="p-4 space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Agent *</label>
                <select
                  required
                  value={form.agentName}
                  onChange={(e) => {
                    const agent = agents.find((a) => a.name === e.target.value);
                    setForm({ ...form, agentName: e.target.value, agentId: agent?.id || "" });
                  }}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Select agent</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.name}>{a.name} — {a.role}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Task (optional)</label>
                <input
                  value={form.taskTitle}
                  onChange={(e) => setForm({ ...form, taskTitle: e.target.value })}
                  placeholder="Task name or description"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Rating</label>
                  <StarRating value={form.rating} onChange={(v) => setForm({ ...form, rating: v as 1 | 2 | 3 | 4 | 5 })} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value as FeedbackEntry["category"] })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    {["quality", "speed", "accuracy", "creativity", "general"].map((c) => (
                      <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Comment *</label>
                <textarea
                  required
                  value={form.comment}
                  onChange={(e) => setForm({ ...form, comment: e.target.value })}
                  placeholder="What did the agent do well or poorly?"
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : "Submit Feedback"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FeedbackPage() {
  return (
    <ErrorBoundary label="Feedback page">
      <FeedbackPageContent />
    </ErrorBoundary>
  );
}
