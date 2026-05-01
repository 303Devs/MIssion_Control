"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

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
}

const STATUS_STYLES: Record<Agent["status"], string> = {
  active: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  idle: "border-gray-700 bg-gray-800/80 text-gray-400",
  busy: "border-yellow-500/30 bg-yellow-500/10 text-yellow-300",
  error: "border-red-500/30 bg-red-500/10 text-red-300",
};

function statusDot(status: Agent["status"]) {
  if (status === "active") return "bg-emerald-400";
  if (status === "busy") return "bg-yellow-400";
  if (status === "error") return "bg-red-400";
  return "bg-gray-500";
}

function AgentCard({ agent, emphasized = false }: { agent: Agent; emphasized?: boolean }) {
  return (
    <article
      className={`rounded-3xl border bg-gray-900/80 p-5 shadow-2xl shadow-black/20 ${
        emphasized ? "border-emerald-500/30" : "border-gray-800"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-gray-800 bg-gray-950 text-3xl">
            {agent.avatar}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-white">{agent.name}</h2>
              {agent.isOrchestrator && (
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300">
                  Orchestrator
                </span>
              )}
            </div>
            <p className="text-sm text-gray-400">{agent.role}</p>
            <p className="mt-1 text-xs font-mono text-gray-500">{agent.model}</p>
          </div>
        </div>
        <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${STATUS_STYLES[agent.status]}`}>
          <span className={`h-2 w-2 rounded-full ${statusDot(agent.status)} ${agent.status !== "idle" ? "status-pulse" : ""}`} />
          {agent.status}
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-gray-400">{agent.description}</p>

      <div className="mt-4 rounded-2xl border border-gray-800 bg-gray-950/60 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500">Current task</p>
        <p className="mt-2 text-sm text-gray-200">{agent.currentTask || "No active task reported."}</p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-gray-800 bg-gray-950/60 p-3">
          <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">Uptime</p>
          <p className="mt-1 text-lg font-semibold text-white">{agent.uptime}</p>
        </div>
        <div className="rounded-2xl border border-gray-800 bg-gray-950/60 p-3">
          <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">Tasks completed</p>
          <p className="mt-1 text-lg font-semibold text-white">{agent.tasksCompleted}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {agent.capabilities.map((capability) => (
          <span
            key={capability}
            className="rounded-full border border-gray-700 bg-gray-800/80 px-2.5 py-1 text-xs text-gray-300"
          >
            {capability}
          </span>
        ))}
      </div>
    </article>
  );
}

export default function TeamPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadAgents = async () => {
      try {
        const response = await fetch("/api/agents", { cache: "no-store" });
        const data = await response.json();
        if (!cancelled) {
          setAgents(data.agents || []);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadAgents();
    const interval = window.setInterval(loadAgents, 15000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const orchestrator = agents.find((agent) => agent.isOrchestrator) || null;
  const rest = agents.filter((agent) => !agent.isOrchestrator);

  return (
    <div className="min-h-full overflow-y-auto bg-gray-950 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-emerald-400">Team</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Live Agent Roster</h1>
            <p className="mt-1 text-sm text-gray-400">Real-time org view powered by `/api/agents`.</p>
          </div>
          <div className="rounded-2xl border border-gray-800 bg-gray-900/80 px-4 py-3 text-right">
            <p className="text-xs uppercase tracking-[0.22em] text-gray-500">Active now</p>
            <p className="mt-1 text-2xl font-semibold text-white">
              {agents.filter((agent) => agent.status === "active").length}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-4 lg:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-72 animate-pulse rounded-3xl bg-gray-900" />
            ))}
          </div>
        ) : (
          <div className="space-y-8">
            {orchestrator && (
              <section>
                <div className="mb-4 flex items-center gap-2 text-sm text-emerald-300">
                  <Sparkles className="h-4 w-4" />
                  <span>Orchestration layer</span>
                </div>
                <div className="max-w-2xl">
                  <AgentCard agent={orchestrator} emphasized />
                </div>
              </section>
            )}

            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Execution Team</h2>
                <p className="text-sm text-gray-500">{rest.length} agents</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {rest.map((agent) => (
                  <AgentCard key={agent.id} agent={agent} />
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
