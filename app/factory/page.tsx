"use client";

import ErrorBoundary from "@/components/ErrorBoundary";
import { useState, useEffect, useCallback } from "react";
import { Zap, Plus, RefreshCw, Send, X, CheckCircle, Clock, AlertCircle } from "lucide-react";

interface Agent {
  id: string;
  name: string;
  role: string;
  status: string;
  capabilities?: string[];
}

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  assignee?: string;
  project?: string;
  createdAt: string;
}

const PRIORITIES = ["low", "medium", "high", "critical"] as const;
type Priority = (typeof PRIORITIES)[number];

const PRIORITY_COLORS: Record<Priority, string> = {
  low: "text-gray-400 bg-gray-700/50",
  medium: "text-blue-400 bg-blue-500/10",
  high: "text-orange-400 bg-orange-500/10",
  critical: "text-red-400 bg-red-500/10",
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  "in-progress": <Clock className="w-3.5 h-3.5 text-blue-400" />,
  done: <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />,
  backlog: <AlertCircle className="w-3.5 h-3.5 text-gray-400" />,
  review: <Clock className="w-3.5 h-3.5 text-yellow-400" />,
};

function FactoryPageContent() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dispatching, setDispatching] = useState(false);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "medium" as Priority,
    assignee: "",
    project: "",
    tags: "",
  });

  const fetchData = useCallback(async () => {
    try {
      const [agentsRes, tasksRes] = await Promise.all([
        fetch("/api/agents"),
        fetch("/api/tasks"),
      ]);
      const agentsData = (await agentsRes.json()) as { agents: Agent[] };
      const tasksData = (await tasksRes.json()) as { tasks: Task[] };
      setAgents(agentsData.agents || []);
      setError(null);
      // Show most recent 10 tasks
      setRecentTasks(
        (tasksData.tasks || [])
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 10)
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    void fetchData();
    const id = setInterval(() => { void fetchData(); }, 15_000);
    return () => clearInterval(id);
  }, [fetchData]);

  async function dispatch(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setDispatching(true);

    const tags = form.tags
      ? form.tags.split(",").map((t) => t.trim()).filter(Boolean)
      : [];

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          priority: form.priority,
          assignee: form.assignee || undefined,
          project: form.project || undefined,
          tags: tags.length ? tags : undefined,
          status: "backlog",
        }),
      });

      if (res.ok) {
        setSuccess(true);
        setForm({ title: "", description: "", priority: "medium", assignee: "", project: "", tags: "" });
        setTimeout(() => setSuccess(false), 3000);
        void fetchData();
      }
    } finally {
      setDispatching(false);
    }
  }

  const activeAgents = agents.filter((a) => a.status === "active" || a.status === "busy");

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-emerald-400" />
            Task Factory
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Create and dispatch tasks to the agent workforce</p>
        </div>
        <button onClick={fetchData} className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 border border-gray-700 rounded-lg hover:bg-gray-800 transition-colors">
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Dispatch form */}
        <div className="col-span-2">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-400" />
              New Task
            </h2>

            {success && (
              <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg mb-4 text-sm text-emerald-400">
                <CheckCircle className="w-4 h-4" />
                Task dispatched successfully
              </div>
            )}

            <form onSubmit={(e) => void dispatch(e)} className="space-y-3">
              <input
                required
                autoFocus
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Task title *"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
              />
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Description — what exactly should the agent do?"
                rows={3}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 resize-none"
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Priority</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">Assign to Agent</label>
                  <select
                    value={form.assignee}
                    onChange={(e) => setForm({ ...form, assignee: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">Unassigned</option>
                    {agents.map((a) => (
                      <option key={a.id} value={a.name}>{a.name} — {a.role}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Project</label>
                  <input
                    value={form.project}
                    onChange={(e) => setForm({ ...form, project: e.target.value })}
                    placeholder="e.g. mission-control"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Tags (comma-separated)</label>
                  <input
                    value={form.tags}
                    onChange={(e) => setForm({ ...form, tags: e.target.value })}
                    placeholder="e.g. frontend, urgent"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setForm({ title: "", description: "", priority: "medium", assignee: "", project: "", tags: "" })}
                  className="px-4 py-2 text-sm text-gray-500 hover:text-gray-300 transition-colors mr-2"
                >
                  <X className="w-4 h-4" />
                </button>
                <button
                  type="submit"
                  disabled={dispatching || !form.title.trim()}
                  className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  {dispatching ? "Dispatching..." : "Dispatch Task"}
                </button>
              </div>
            </form>
          </div>

          {/* Recent tasks */}
          <div className="mt-5 bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-white mb-3">Recently Dispatched</h2>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-gray-800 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : recentTasks.length === 0 ? (
              <p className="text-sm text-gray-600 text-center py-6">No tasks yet</p>
            ) : (
              <div className="space-y-2">
                {recentTasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg">
                    {STATUS_ICON[task.status] || STATUS_ICON.backlog}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-200 truncate">{task.title}</p>
                      <p className="text-xs text-gray-600">
                        {task.assignee && <span>{task.assignee} · </span>}
                        {new Date(task.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${PRIORITY_COLORS[task.priority as Priority] || PRIORITY_COLORS.medium}`}>
                      {task.priority}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Agent status sidebar */}
        <div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <h2 className="text-sm font-semibold text-white mb-3">Agent Roster</h2>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-gray-800 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {agents.map((agent) => (
                  <button
                    key={agent.id}
                    onClick={() => setForm({ ...form, assignee: agent.name })}
                    className={`w-full text-left p-2.5 rounded-lg transition-colors border ${
                      form.assignee === agent.name
                        ? "bg-emerald-500/10 border-emerald-500/30"
                        : "bg-gray-800/50 border-transparent hover:bg-gray-800"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${
                        agent.status === "active" ? "bg-emerald-400" :
                        agent.status === "busy" ? "bg-yellow-400" : "bg-gray-600"
                      }`} />
                      <span className="text-sm text-gray-200 font-medium">{agent.name}</span>
                    </div>
                    <p className="text-xs text-gray-600 ml-4 mt-0.5">{agent.role}</p>
                  </button>
                ))}
              </div>
            )}
            {activeAgents.length > 0 && (
              <p className="text-xs text-emerald-400 mt-3 text-center">
                {activeAgents.length} agent{activeAgents.length !== 1 ? "s" : ""} ready
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FactoryPage() {
  return (
    <ErrorBoundary label="Factory page">
      <FactoryPageContent />
    </ErrorBoundary>
  );
}
