"use client";

import { useEffect, useState } from "react";
import { Plus, RefreshCw, Trash2, X } from "lucide-react";

interface Task {
  id: string;
  title: string;
  description?: string;
  status: "backlog" | "in-progress" | "review" | "done";
  priority: "low" | "medium" | "high" | "critical";
  project?: string;
  assignee?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

const COLUMNS: { id: Task["status"]; label: string; color: string; accent: string }[] = [
  { id: "backlog", label: "Backlog", color: "border-gray-600", accent: "bg-gray-600" },
  { id: "in-progress", label: "In Progress", color: "border-blue-500", accent: "bg-blue-500" },
  { id: "review", label: "Review", color: "border-yellow-500", accent: "bg-yellow-500" },
  { id: "done", label: "Done", color: "border-emerald-500", accent: "bg-emerald-500" },
];

const PRIORITY_COLORS: Record<string, string> = {
  low: "text-gray-400 bg-gray-700/50",
  medium: "text-blue-400 bg-blue-500/10",
  high: "text-orange-400 bg-orange-500/10",
  critical: "text-red-400 bg-red-500/10",
};

function TaskCard({
  task,
  onDelete,
  onStatusChange,
}: {
  task: Task;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: Task["status"]) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 hover:border-gray-600 transition-all group cursor-default">
      <div className="flex items-start justify-between gap-2">
        <div className="font-medium text-sm text-white leading-snug">{task.title}</div>
        <button
          onClick={() => onDelete(task.id)}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-600 hover:text-red-400 shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      {task.description && (
        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{task.description}</p>
      )}
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        {task.priority && (
          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${PRIORITY_COLORS[task.priority]}`}>
            {task.priority}
          </span>
        )}
        {task.project && (
          <span className="text-xs text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded truncate max-w-[80px]">
            {task.project}
          </span>
        )}
        {task.assignee && (
          <span className="text-xs text-emerald-400 ml-auto">{task.assignee}</span>
        )}
      </div>
      {/* Quick status change */}
      <div className="relative mt-2">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="text-xs text-gray-600 hover:text-gray-300 transition-colors"
        >
          Move to...
        </button>
        {menuOpen && (
          <div className="absolute bottom-5 left-0 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-10 py-1 w-36">
            {COLUMNS.filter((c) => c.id !== task.status).map((col) => (
              <button
                key={col.id}
                onClick={() => {
                  onStatusChange(task.id, col.id);
                  setMenuOpen(false);
                }}
                className="w-full text-left px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-700 transition-colors"
              >
                {col.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AddTaskModal({
  defaultStatus,
  onAdd,
  onClose,
}: {
  defaultStatus: Task["status"];
  onAdd: (task: Partial<Task>) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Partial<Task>>({ status: defaultStatus, priority: "medium" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title?.trim()) return;
    onAdd(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h2 className="font-semibold text-white">New Task</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <input
            autoFocus
            placeholder="Task title *"
            value={form.title || ""}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
          />
          <textarea
            placeholder="Description (optional)"
            value={form.description || ""}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={2}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 resize-none"
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={form.priority || "medium"}
              onChange={(e) => setForm({ ...form, priority: e.target.value as Task["priority"] })}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
            <select
              value={form.status || defaultStatus}
              onChange={(e) => setForm({ ...form, status: e.target.value as Task["status"] })}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
            >
              {COLUMNS.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              placeholder="Project"
              value={form.project || ""}
              onChange={(e) => setForm({ ...form, project: e.target.value })}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
            />
            <input
              placeholder="Assignee"
              value={form.assignee || ""}
              onChange={(e) => setForm({ ...form, assignee: e.target.value })}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors font-medium">
              Create Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addingTo, setAddingTo] = useState<Task["status"] | null>(null);

  const loadTasks = async () => {
    setRefreshing(true);
    const res = await fetch("/api/tasks");
    const d = await res.json();
    setTasks(d.tasks || []);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    let cancelled = false;

    const initialLoad = async () => {
      const res = await fetch("/api/tasks");
      const d = await res.json();
      if (cancelled) return;
      setTasks(d.tasks || []);
      setLoading(false);
      setRefreshing(false);
    };

    void initialLoad();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleAdd = async (partial: Partial<Task>) => {
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(partial),
    });
    const newTask = await res.json();
    setTasks((prev) => [...prev, newTask]);
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/tasks?id=${id}`, { method: "DELETE" });
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const handleStatusChange = async (id: string, status: Task["status"]) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const updated = { ...task, status };
    await fetch("/api/tasks", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });
    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="h-8 w-32 bg-gray-800 rounded animate-pulse mb-6" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-64 bg-gray-900 border border-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Task Board</h1>
          <p className="text-sm text-gray-500 mt-0.5">{tasks.length} tasks total</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadTasks}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition-colors border border-gray-700"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setAddingTo("backlog")}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Task
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 flex-1 overflow-hidden">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.id);
          return (
            <div key={col.id} className="flex flex-col bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
              {/* Column header */}
              <div className={`flex items-center justify-between px-4 py-3 border-b border-gray-800`}>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${col.accent}`} />
                  <span className="text-sm font-semibold text-white">{col.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">{colTasks.length}</span>
                  <button
                    onClick={() => setAddingTo(col.id)}
                    className="text-gray-600 hover:text-emerald-400 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {/* Cards */}
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {colTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onDelete={handleDelete}
                    onStatusChange={handleStatusChange}
                  />
                ))}
                {colTasks.length === 0 && (
                  <div className="text-center py-8 text-gray-600 text-xs">
                    No tasks
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {addingTo && (
        <AddTaskModal
          defaultStatus={addingTo}
          onAdd={handleAdd}
          onClose={() => setAddingTo(null)}
        />
      )}
    </div>
  );
}
