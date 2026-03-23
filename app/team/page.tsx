"use client";

import { useEffect, useState } from "react";
import { Zap, ChevronDown } from "lucide-react";

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
  uptime: string;
  tasksCompleted: number;
  isOrchestrator: boolean;
  reports: string[];
}

const STATUS_COLORS: Record<string, string> = {
  active: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  idle: "text-gray-400 bg-gray-700/30 border-gray-600/20",
  busy: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  error: "text-red-400 bg-red-500/10 border-red-500/20",
};

const CARD_BORDER: Record<string, string> = {
  emerald: "border-emerald-500/40 shadow-emerald-500/10",
  blue: "border-blue-500/40 shadow-blue-500/10",
  purple: "border-purple-500/40 shadow-purple-500/10",
  yellow: "border-yellow-500/40 shadow-yellow-500/10",
  orange: "border-orange-500/40 shadow-orange-500/10",
  red: "border-red-500/40 shadow-red-500/10",
  pink: "border-pink-500/40 shadow-pink-500/10",
};

function AgentCard({ agent, size = "normal" }: { agent: Agent; size?: "large" | "normal" | "small" }) {
  const borderColor = CARD_BORDER[agent.color] || "border-gray-700";
  const statusStyle = STATUS_COLORS[agent.status] || STATUS_COLORS.idle;
  const widthClass = size === "large" ? "w-[280px]" : size === "small" ? "w-[200px]" : "w-[240px]";

  return (
    <div className={`bg-gray-900 border ${borderColor} rounded-xl p-4 shadow-lg transition-all hover:shadow-xl ${widthClass}`}>
      {agent.isOrchestrator && (
        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 mb-2">
          <Zap className="w-3.5 h-3.5" />
          ORCHESTRATOR
        </div>
      )}

      <div className="flex items-center gap-3 mb-2">
        <div className={size === "large" ? "text-4xl" : size === "small" ? "text-2xl" : "text-3xl"}>{agent.avatar}</div>
        <div>
          <div className={`font-bold text-white ${size === "large" ? "text-lg" : "text-sm"}`}>{agent.name}</div>
          <div className={`text-gray-400 ${size === "large" ? "text-sm" : "text-xs"}`}>{agent.role}</div>
        </div>
      </div>

      <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border font-medium mb-2 ${statusStyle} ${size === "small" ? "text-[10px]" : "text-xs"}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${
          agent.status === "active" ? "bg-emerald-400 animate-pulse" :
          agent.status === "busy" ? "bg-yellow-400 animate-pulse" :
          "bg-gray-500"
        }`} />
        {agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}
      </div>

      <p className="text-xs text-gray-500 leading-relaxed mb-2 line-clamp-2">
        {agent.description}
      </p>

      {agent.currentTask && (
        <div className="p-2 bg-gray-800/50 rounded-lg border border-gray-700/50 mb-2">
          <div className="text-[10px] text-gray-600 uppercase tracking-wide mb-0.5">Active task</div>
          <div className="text-xs text-gray-300 line-clamp-2">{agent.currentTask}</div>
        </div>
      )}

      <div className="flex items-center justify-between text-xs">
        <div>
          <span className="text-gray-600">Uptime: </span>
          <span className="text-emerald-400 font-mono">{agent.uptime}</span>
        </div>
        <div>
          <span className="text-gray-600">Tasks: </span>
          <span className="text-white font-bold">{agent.tasksCompleted}</span>
        </div>
      </div>
    </div>
  );
}

function Connector({ vertical = 8 }: { vertical?: number }) {
  return (
    <div className="flex flex-col items-center">
      <div className={`w-px bg-gray-700`} style={{ height: `${vertical}px` }} />
      <ChevronDown className="w-3 h-3 text-gray-600 -mt-0.5 -mb-0.5" />
      <div className={`w-px bg-gray-700`} style={{ height: `${vertical / 2}px` }} />
    </div>
  );
}

function BranchDown({ children, count }: { children: React.ReactNode; count: number }) {
  return (
    <div className="flex flex-col items-center">
      <Connector vertical={6} />
      <div className="relative flex items-start justify-center">
        {count > 1 && (
          <div
            className="absolute top-0 h-px bg-gray-700"
            style={{ width: `${(count - 1) * 256}px` }}
          />
        )}
        <div className="flex gap-4 pt-6">
          {children}
        </div>
      </div>
    </div>
  );
}

function AgentBranch({ agent, allAgents }: { agent: Agent; allAgents: Agent[] }) {
  const directReports = allAgents.filter(a => agent.reports.includes(a.id));

  return (
    <div className="flex flex-col items-center">
      <div className="w-px h-6 bg-gray-700" />
      <AgentCard agent={agent} />
      {directReports.length > 0 && (
        <BranchDown count={directReports.length}>
          {directReports.map(sub => (
            <div key={sub.id} className="flex flex-col items-center">
              <div className="w-px h-6 bg-gray-700" />
              <AgentCard agent={sub} size="small" />
            </div>
          ))}
        </BranchDown>
      )}
    </div>
  );
}

export default function TeamPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/agents")
      .then((r) => r.json())
      .then((d) => { setAgents(d.agents || []); setLoading(false); });
  }, []);

  const orchestrator = agents.find((a) => a.isOrchestrator);
  // Direct reports to Bob (not sub-reports like Squeak/Richard)
  const directReports = orchestrator
    ? agents.filter(a => orchestrator.reports.includes(a.id))
    : [];

  if (loading) {
    return (
      <div className="p-6">
        <div className="h-8 w-48 bg-gray-800 rounded animate-pulse mb-8" />
        <div className="flex flex-col items-center gap-8">
          <div className="w-72 h-64 bg-gray-900 border border-gray-800 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 overflow-x-auto">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-white">Team</h1>
        <p className="text-sm text-gray-500 mt-0.5">AI Agent Org Chart — {agents.length} agents</p>
      </div>

      {/* Org chart */}
      <div className="flex flex-col items-center min-w-max">
        {/* Orchestrator */}
        {orchestrator && (
          <>
            <AgentCard agent={orchestrator} size="large" />

            {directReports.length > 0 && (
              <BranchDown count={directReports.length}>
                {directReports.map(agent => (
                  <AgentBranch key={agent.id} agent={agent} allAgents={agents} />
                ))}
              </BranchDown>
            )}
          </>
        )}
      </div>

      {/* Team stats */}
      <div className="mt-12 max-w-2xl mx-auto">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Team Overview</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-gray-800/50 rounded-lg">
              <div className="text-2xl font-bold text-white">{agents.length}</div>
              <div className="text-xs text-gray-500 mt-0.5">Total Agents</div>
            </div>
            <div className="text-center p-3 bg-gray-800/50 rounded-lg">
              <div className="text-2xl font-bold text-emerald-400">
                {agents.filter((a) => a.status === "active").length}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">Active Now</div>
            </div>
            <div className="text-center p-3 bg-gray-800/50 rounded-lg">
              <div className="text-2xl font-bold text-blue-400">
                {agents.reduce((s, a) => s + a.tasksCompleted, 0)}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">Tasks Done</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
