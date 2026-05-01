"use client";

import { useEffect, useState } from "react";
import { Activity, CheckSquare, Cpu, RefreshCw, Zap } from "lucide-react";

interface Agent {
  id: string;
  name: string;
  role: string;
  description: string;
  status: "active" | "idle" | "busy" | "error";
  currentTask: string | null;
  model: string;
  capabilities: string[];
  avatar: string;
  color: string;
  activeSince: string;
  tasksCompleted: number;
  isOrchestrator: boolean;
  reports: string[];
  lastActive: string | null;
}

const STATUS_STYLES: Record<string, { badge: string; dot: string }> = {
  active: { badge: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", dot: "bg-emerald-400" },
  idle: { badge: "bg-gray-700/50 text-gray-400 border-gray-600/30", dot: "bg-gray-500" },
  busy: { badge: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", dot: "bg-yellow-400" },
  error: { badge: "bg-red-500/20 text-red-400 border-red-500/30", dot: "bg-red-400" },
};

const MODEL_COLORS: Record<string, string> = {
  "claude-opus-4-6": "text-purple-400",
  "claude-sonnet-4-6": "text-blue-400",
  "claude-haiku-4-5-20251001": "text-cyan-400",
};

function formatRelativeTime(isoString: string | null): string {
  if (!isoString) return "never";
  const ms = Date.now() - new Date(isoString).getTime();
  if (ms < 60_000) return "just now";
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function AgentCard({ agent }: { agent: Agent }) {
  const style = STATUS_STYLES[agent.status] || STATUS_STYLES.idle;

  return (
    <div className={`bg-gray-900 border rounded-xl p-5 transition-all hover:shadow-lg hover:shadow-black/30 ${
      agent.isOrchestrator ? "border-emerald-500/30 hover:border-emerald-500/50" : "border-gray-800 hover:border-gray-700"
    }`}>
      {agent.isOrchestrator && (
        <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 mb-3">
          <Zap className="w-3 h-3" />
          Orchestrator
        </div>
      )}

      <div className="flex items-start gap-4">
        <div className={`text-4xl shrink-0`}>{agent.avatar}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-bold text-white">{agent.name}</h3>
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs border font-medium ${style.badge}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${style.dot} ${agent.status === "active" ? "status-pulse" : ""}`} />
              {agent.status}
            </span>
          </div>
          <div className="text-sm text-gray-400 mt-0.5">{agent.role}</div>
        </div>
      </div>

      <p className="text-sm text-gray-500 mt-3 leading-relaxed">{agent.description}</p>

      {agent.currentTask && (
        <div className="mt-3 p-2.5 bg-gray-800/50 rounded-lg border border-gray-700/50">
          <div className="text-xs text-gray-500 mb-0.5">Current task</div>
          <div className="text-xs text-gray-300">{agent.currentTask}</div>
        </div>
      )}

      {/* Capabilities */}
      <div className="flex flex-wrap gap-1.5 mt-3">
        {agent.capabilities.map((cap) => (
          <span key={cap} className="text-xs px-2 py-0.5 bg-gray-800 text-gray-400 rounded border border-gray-700">
            {cap}
          </span>
        ))}
      </div>

      {/* Last active */}
      <div className="mt-2 text-xs text-gray-600">
        Last active: {formatRelativeTime(agent.lastActive)}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-800">
        <div className="text-center">
          <div className="text-xs text-gray-600 mb-0.5">Model</div>
          <div className={`text-xs font-mono font-medium truncate ${MODEL_COLORS[agent.model] || "text-gray-400"}`}>
            {agent.model.replace("claude-", "").replace("-20251001", "")}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-600 mb-0.5">Active Since</div>
          <div className="text-xs font-mono text-emerald-400 font-medium">{agent.activeSince || "never"}</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-600 mb-0.5">Tasks Done</div>
          <div className="text-xs font-bold text-white">{agent.tasksCompleted}</div>
        </div>
      </div>
    </div>
  );
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAgents = async () => {
    setRefreshing(true);
    const res = await fetch("/api/agents");
    const d = await res.json();
    setAgents(d.agents || []);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      const res = await fetch("/api/agents");
      const d = await res.json();
      if (cancelled) return;
      setAgents(d.agents || []);
      setLoading(false);
      setRefreshing(false);
    };

    void poll();

    const intervalId = setInterval(() => { void poll(); }, 15_000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, []);

  const active = agents.filter((a) => a.status === "active").length;
  const idle = agents.filter((a) => a.status === "idle").length;
  const totalTasks = agents.reduce((sum, a) => sum + a.tasksCompleted, 0);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Agent Roster</h1>
          <p className="text-sm text-gray-500 mt-0.5">AI workforce management</p>
        </div>
        <button
          onClick={loadAgents}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition-colors border border-gray-700"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { icon: Activity, label: "Total Agents", value: String(agents.length), color: "text-white", bg: "bg-gray-700" },
          { icon: Zap, label: "Active", value: String(active), color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { icon: Cpu, label: "Idle", value: String(idle), color: "text-gray-400", bg: "bg-gray-700" },
          { icon: CheckSquare, label: "Tasks Completed", value: String(totalTasks), color: "text-blue-400", bg: "bg-blue-500/10" },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 uppercase tracking-wide">{label}</span>
              <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center`}>
                <Icon className={`w-3.5 h-3.5 ${color}`} />
              </div>
            </div>
            <div className={`text-2xl font-bold ${color}`}>{loading ? "—" : value}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-64 bg-gray-900 border border-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      )}
    </div>
  );
}
