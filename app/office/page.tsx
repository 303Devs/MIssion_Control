"use client";

import { useEffect, useState } from "react";

interface Agent {
  id: string;
  name: string;
  role: string;
  status: "active" | "idle" | "busy" | "error";
  currentTask: string | null;
  avatar: string;
  color: string;
}

// Desk positions in the office grid
const DESK_POSITIONS: Record<string, { x: number; y: number; rotation?: number }> = {
  bob: { x: 2, y: 1 },
  coder: { x: 0, y: 3 },
  researcher: { x: 2, y: 3 },
  writer: { x: 4, y: 3 },
  analyst: { x: 1, y: 5 },
};

const STATUS_ANIM: Record<string, string> = {
  active: "animate-bounce",
  idle: "",
  busy: "animate-pulse",
  error: "animate-spin",
};

const STATUS_GLOW: Record<string, string> = {
  active: "shadow-emerald-500/40",
  idle: "shadow-gray-500/10",
  busy: "shadow-yellow-500/40",
  error: "shadow-red-500/40",
};

const PIXEL_DESK = `
██████████
█ ██████ █
█ ██████ █
█  ████  █
██████████
`;

function PixelDesk({ color }: { color: string }) {
  const colors: Record<string, string> = {
    emerald: "bg-emerald-900",
    blue: "bg-blue-900",
    purple: "bg-purple-900",
    yellow: "bg-yellow-900",
    orange: "bg-orange-900",
  };
  return (
    <div className={`w-16 h-10 rounded-sm border border-gray-700 ${colors[color] || "bg-gray-800"} flex items-center justify-center`}>
      <div className="w-12 h-6 bg-gray-900 rounded-sm border border-gray-700 flex items-center justify-center">
        <div className="w-10 h-4 bg-gray-800 rounded-sm opacity-60 flex items-center justify-center gap-0.5">
          <div className="w-1 h-1 bg-emerald-400 rounded-full opacity-80" />
          <div className="w-1 h-1 bg-blue-400 rounded-full opacity-60" />
          <div className="w-1 h-1 bg-emerald-400 rounded-full opacity-40" />
        </div>
      </div>
    </div>
  );
}

function AgentDesk({ agent }: { agent: Agent }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const anim = STATUS_ANIM[agent.status] || "";
  const glow = STATUS_GLOW[agent.status] || "";

  return (
    <div
      className="flex flex-col items-center gap-1 cursor-pointer group relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Agent avatar */}
      <div className={`relative text-2xl shadow-lg ${glow} ${agent.status === "active" ? "drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]" : ""}`}>
        <div className={agent.status === "active" ? "animate-bounce" : ""}>
          {agent.avatar}
        </div>
        {/* Status indicator */}
        <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-gray-950 ${
          agent.status === "active" ? "bg-emerald-400" :
          agent.status === "busy" ? "bg-yellow-400" :
          agent.status === "error" ? "bg-red-400" :
          "bg-gray-500"
        } ${agent.status !== "idle" ? "status-pulse" : ""}`} />
      </div>

      {/* Desk */}
      <PixelDesk color={agent.color} />

      {/* Name label */}
      <div className="text-[10px] font-bold text-gray-400 font-mono">{agent.name.toUpperCase()}</div>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-10 whitespace-nowrap">
          <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs shadow-xl">
            <div className="font-semibold text-white">{agent.name}</div>
            <div className="text-gray-400">{agent.role}</div>
            <div className={`mt-1 text-xs font-medium ${
              agent.status === "active" ? "text-emerald-400" :
              agent.status === "busy" ? "text-yellow-400" :
              "text-gray-500"
            }`}>
              {agent.status.toUpperCase()}
            </div>
            {agent.currentTask && (
              <div className="text-gray-500 mt-1 max-w-[200px] whitespace-normal line-clamp-2">
                {agent.currentTask}
              </div>
            )}
          </div>
          <div className="w-2 h-2 bg-gray-800 border-r border-b border-gray-700 rotate-45 mx-auto -mt-1" />
        </div>
      )}
    </div>
  );
}

// Decorative pixel art elements
function PixelPlant() {
  return (
    <div className="flex flex-col items-center text-sm select-none">
      <div className="text-green-500">🌿</div>
      <div className="w-2 h-4 bg-amber-800 rounded-sm" />
      <div className="w-4 h-1 bg-amber-900 rounded-sm" />
    </div>
  );
}

function PixelServer() {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded p-1.5 w-10 h-14 flex flex-col gap-1">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-1">
          <div className={`w-1.5 h-1.5 rounded-full ${i === 1 ? "bg-emerald-400 status-pulse" : "bg-blue-400"}`} />
          <div className="flex-1 h-1.5 bg-gray-700 rounded" />
        </div>
      ))}
    </div>
  );
}

export default function OfficePage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [time, setTime] = useState("");

  useEffect(() => {
    fetch("/api/agents")
      .then((r) => r.json())
      .then((d) => { setAgents(d.agents || []); setLoading(false); });
  }, []);

  useEffect(() => {
    const tick = () => {
      setTime(new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const activeCount = agents.filter((a) => a.status === "active").length;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Office</h1>
          <p className="text-sm text-gray-500 mt-0.5">Mission Control HQ — AI Agent Workspace</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-500">
            <span className="text-emerald-400 font-bold">{activeCount}</span>/{agents.length} agents active
          </div>
          <div className="font-mono text-emerald-400 text-sm">{time}</div>
        </div>
      </div>

      {/* Office visualization */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {/* Office header / ceiling */}
        <div className="bg-gray-800/50 border-b border-gray-700 px-6 py-2 flex items-center justify-between">
          <div className="text-xs font-mono text-gray-500 uppercase tracking-widest">// MISSION CONTROL HQ — FLOOR 1</div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
            <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 status-pulse" />
          </div>
        </div>

        {/* Office floor */}
        <div className="relative min-h-[480px] p-8" style={{
          backgroundImage: `
            linear-gradient(rgba(31, 41, 55, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(31, 41, 55, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-600 animate-pulse text-sm font-mono">Initializing office...</div>
            </div>
          ) : (
            <>
              {/* Room label */}
              <div className="absolute top-4 left-8 text-[10px] font-mono text-gray-700 uppercase tracking-widest">
                Main Operations Floor
              </div>

              {/* Server rack in corner */}
              <div className="absolute top-8 right-8 flex flex-col items-center gap-1">
                <div className="text-[10px] font-mono text-gray-700 mb-1">SERVERS</div>
                <PixelServer />
              </div>

              {/* Plants */}
              <div className="absolute bottom-8 left-8">
                <PixelPlant />
              </div>
              <div className="absolute bottom-8 right-24">
                <PixelPlant />
              </div>

              {/* Agent desks - arranged in office layout */}
              <div className="flex flex-col items-center gap-12 pt-8">
                {/* Row 1: Orchestrator (Bob) - center */}
                <div className="flex justify-center">
                  {agents
                    .filter((a) => a.id === "bob")
                    .map((agent) => (
                      <AgentDesk key={agent.id} agent={agent} />
                    ))}
                </div>

                {/* Divider */}
                <div className="w-full max-w-lg border-t border-dashed border-gray-700 relative">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-900 px-2 text-[10px] font-mono text-gray-700">
                    TEAM AREA
                  </div>
                </div>

                {/* Row 2: Sub-agents */}
                <div className="flex justify-center gap-16">
                  {agents
                    .filter((a) => a.id !== "bob")
                    .map((agent) => (
                      <AgentDesk key={agent.id} agent={agent} />
                    ))}
                </div>
              </div>

              {/* Status board */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                <div className="bg-gray-800/80 border border-gray-700 rounded-lg px-4 py-2 flex items-center gap-4">
                  {agents.map((agent) => (
                    <div key={agent.id} className="flex items-center gap-1.5 text-[10px]">
                      <div className={`w-2 h-2 rounded-full ${
                        agent.status === "active" ? "bg-emerald-400 status-pulse" :
                        agent.status === "busy" ? "bg-yellow-400 status-pulse" :
                        "bg-gray-600"
                      }`} />
                      <span className="font-mono text-gray-400">{agent.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-6 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          Active — working on task
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-gray-500" />
          Idle — waiting for tasks
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-yellow-400" />
          Busy — high load
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-red-400" />
          Error — needs attention
        </div>
      </div>
    </div>
  );
}
